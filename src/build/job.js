import {RecipeArtifact} from "../graph/artifact/recipe.js";
import {BuildError} from "./error.js";
import {Dependency} from "../graph/dependency.js";
import {AID} from "../graph/artifact.js";
import {Build} from "../build.js";
import {FileArtifact} from "../graph/artifact/file.js";
import {Artifact} from "../graph/artifact.js";
import {JobSet} from "./job-set.js";
import {resolveArtifacts} from "../module.js";

/**
 * @property {Build} build
 * @property {Rule} rule
 * @property {Promise<Job>|null} promise
 * @property {boolean} finished
 * @property {Dependency[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Artifact[]} dynamicOutputs
 * @property {Error} error
 */
export const Job = class Job  {

    #prepared = false;

    /**
     * @param {Build} build
     * @param {Rule} rule
     */
    constructor(build, rule)
    {
        /** @type {Build} */
        this.build = build;
        /** @type {Rule} */
        this.rule = rule;
        this.recipeInvoked = false;
        /** @type {RecipeArtifact|null} */
        this.recipeArtifact = null;
        this.promise = null;
        this.finished = false;
        this.recipeInvoked = false;
        this.outputs = [];
        this.dynamicOutputs = [];
        this.error = null;
        /** @type {(Job|null)} */
        this.requestedBy = null;
        this.dependencies = [
            new Dependency(this.recipeArtifact = RecipeArtifact.makeFor(this), Dependency.ABSENT_VIOLATION)
        ];
        this.recordedDependencies = [];
        this.dependencyQueue = [];
    }

    async run()
    {
        try {
            if (this.finished) return this;
            return await (this.promise || (this.promise = this.#guardedWork()));
        }
        catch(e) {
            throw e; //debug final wrapped error here
        }
    }

    async #guardedWork() {
        try {
            await this.#work();
            this.finished = true;
            await this.#also();
            this.promise = null;
        }
        catch(e) {
            throw new BuildError(BuildError.formatRuleFailure(this.rule, e), e);
        }
        finally {
        }
        return this;
    }

    async #also() {
        const alsoJobSet = this.build.getAlsoJobSetForRuleKey(this.rule.key);
        if (alsoJobSet.jobs.length > 0) {
            await alsoJobSet.run();
        }
    }

    /**
     * The main build algorithm
     * @return {Promise<void>}
     */
    async #work()
    {
        this.prepare();
        const spec = await this.recipeArtifact.spec;
        await this.build.recordReliance(this.rule, this.recipeArtifact);
        const jobSet = await this.#getPrerequisiteJobSet();
        await jobSet.run();
        const mergedDependencies = this.#getMergedDependencies();
        await Promise.all(mergedDependencies.map(this.verifyBuiltDependency));
        await Promise.all(mergedDependencies.map(
            async dependency => await this.build.recordReliance(this.rule, dependency.artifact)
        ));
        if (!await this.build.isUpToDate(this)) {
            this.build.emit('cleaning.outputs',this.rule);
            await this.build.cleanOutputs(this);
            this.build.emit('invoking.recipe',this.rule);
            this.recipeInvoked = true;
            this.build.db.retractRule(this.rule.key);
            try {
                await this.rule.recipe.executeFor(this, spec);
            }
            finally {
                process.stdout.write(this.rule.recipe.consoleOutput);
            }
            this.build.emit('invoked.recipe',this.rule);
            await this.detectRewritesAfterUse();
            await this.build.recordStandardVersionInfo(this);
        }
    }


    verifyBuiltDependency = async dependency =>
    {
        const ruleKey = await this.build.getRuleKeyForArtifact(dependency.artifact);
        const rule = ruleKey ? this.build.graph.index.rule.key.get(ruleKey) : null;
        if (!(await dependency.artifact.exists)) {
            if (rule) {
                throw new BuildError(
                    `${rule.identity} silently failed to build ${dependency.artifact.identity}`
                )
            }
            else if (dependency.whenAbsent === Dependency.ABSENT_VIOLATION) {
                throw new BuildError(
                    `No rule to build required ${dependency.artifact.identity}`
                );
            }
        }
    }

    /**
     * @returns {Promise<Object.<string,string>>}
     */
    async #getPrerequisiteRuleKeysToDependencyType() {
        const result = {};

        const mergedDeps = this.#getMergedDependencies();

        // https://youtrack.jetbrains.com/issue/WEB-49389
        // noinspection JSIncompatibleTypesComparison
        const dependencyRuleKeys = (await Promise.all(
            mergedDeps.map(async dep => await this.build.getRuleKeyForArtifact(dep.artifact))
        )).filter(_ => null !== _);

        const afterRuleKeys = Object.keys(this.rule.after || {});

        for(let ruleKey of dependencyRuleKeys) result[ruleKey] = "dependency";
        for(let ruleKey of afterRuleKeys) result[ruleKey] = "after";
        return result;
    }

    /**
     * @returns {Promise<JobSet>}
     */
    async #getPrerequisiteJobSet() {
        let jobSet = new JobSet();
        const ruleKeysToDependencyType = await this.#getPrerequisiteRuleKeysToDependencyType();
        for(let ruleKey of Object.keys(ruleKeysToDependencyType)) {
            jobSet = jobSet.union(
                ruleKeysToDependencyType[ruleKey] === "dependency"
                    ? this.build.getJobSetForRuleKey(ruleKey)
                    : new JobSet(this.build.getJobForRuleKey(ruleKey))
            );
        }
        return jobSet;
    }

    /**
     * @returns {Dependency[]}
     */
    #getMergedDependencies() {
        const merged = {};
        for(let dep of [
            ...this.recordedDependencies,
            ...this.dependencies
        ]) {
            const key = dep.artifact.key;
            if (merged.hasOwnProperty(key)) {
                if (merged[key] === dep) {
                    continue;
                }
                if (
                    merged[key].whenAbsent === Dependency.ABSENT_STATE
                    && dep.whenAbsent !== Dependency.ABSENT_STATE
                ) {
                    merged[key]=dep;
                    continue;
                }
                if(merged[key].whenAbsent !== dep.whenAbsent) {
                    throw new Error("Non-existence policy conflict between two dependencies on the same artifact");
                }
            }
            merged[key] = dep;
        }
        return Object.values(merged);
    }

    prepare()
    {
        if (this.#prepared) return;
        this.#prepared = true;
        this.preCollectOutputs();
        this.collectDependencies();
    }

    //TODO: test this mechanism!
    async detectRewritesAfterUse()
    {
        const rewritesAfterUse = (
            (await Promise.all(this.dynamicOutputs.map(output => this.detectRewriteAfterUse(output))))
                .filter(msg => msg !== null)
                .join("\n")
        );
        if (rewritesAfterUse.length > 0) {
            throw new BuildError(rewritesAfterUse);
        }
    }

    /**
     * @param {Artifact} outputArtifact
     * @return {Promise<string|null>}
     */
    async detectRewriteAfterUse(outputArtifact)
    {
        const reliancesByVersion = this.build.getArtifactReliances(outputArtifact.key);
        let versionAfterRewrite = null;
        const versions = Object.keys(reliancesByVersion);
        const violations = {};
        let violationsFound = false;
        if(versions.length > 0)
        {
            versionAfterRewrite = await outputArtifact.version;
            for(let version of versions) {
                if (version !== versionAfterRewrite) {
                    violationsFound = true;
                    violations[version] = (
                        Object.values(reliancesByVersion[version])
                            .map(rule => rule.label)
                    );
                }
            }
        }
        if (violationsFound) {
            let msg = `Rewrite after use: ${this.rule.label} wrote ${outputArtifact.identity}, but`;
            for(let version in violations) {
                msg += "\n\t" + `version ${version} had previously been relied on by:`;
                msg += "\n\t" + violations[version].join("\n\t");
            }
            return msg;
        }
        return null;
    }

    collectDependencies()
    {
        const
            dependencies = {},
            recordedDependencies = {};

        for(let dependency of Object.values(this.rule.dependencies)) {
            dependencies[dependency.artifact.key] = dependency;
        }

        const dependencyRecords =
            this.build.db.listRuleSources(this.rule.key)
                .filter(record => !(record.key in dependencies))
                .map(record => this.artifactFromRecord(record))
                .map(artifact => new Dependency(artifact, Dependency.ABSENT_STATE));

        for(let dependency of dependencyRecords) {
            recordedDependencies[dependency.artifact.key] = dependency;
        }

        this.dependencies = [...this.dependencies, ...Object.values(dependencies)];
        this.recordedDependencies = Object.values(recordedDependencies);
   }

    /**
     * @param record
     * @return {Artifact}
     */
   artifactFromRecord(record)
   {
       return this.build.artifactManager.get(new AID(record.identity).withType(record.type));
   }

   get artifacts()
   {
       return [
           ...this.outputs,
           ...this.dynamicOutputs,
           ...this.dependencies.map(_ => _.artifact)
       ];
   }

   preCollectOutputs()
   {
       this.outputs = Object.values(this.rule.outputs);
   }

    /**
     * @param {Artifact~Reference} ref
     * @returns {Promise<Object[]>}
     */
   async readAutoDependenciesFile(ref)
   {
       return await Promise.all(
           (await this.readVersionFileList(ref))
               .map(async ([version, ref]) => ({
                   version,
                   dependency: new Dependency(this.build.artifactManager.get(ref), Dependency.ABSENT_STATE)
               }))
       );
   }

    /**
     * @param {Artifact~Reference} ref
     * @returns {Promise<Object[]>}
     */
   async readAutoOutputsFile(ref)
   {
       return await Promise.all(
           (await this.readVersionFileList(ref))
               .map(async ([version, ref]) => ({
                   version,
                   output: this.build.artifactManager.get(ref)
               }))
       );
   }

   async readVersionFileList(ref, artifactType="file")
   {
       const resolveResult = resolveArtifacts(
           this.build.artifactManager,
           this.rule.module,
           false,
           ref
       );
       if (
           resolveResult.length < 1
           || !(resolveResult[0].artifact instanceof FileArtifact)
       ) {
           throw new Error(`${ref} does not refer to a file artifact`);
       }
       const artifact = resolveResult[0].artifact;
       // noinspection UnnecessaryLocalVariableJS
       const debugResult = (
           (await artifact.contents)
               .trim()
               .split("\n")
               .map(_ => _.trim())
               .filter(_ => _ !== '')
               .map(_ => {
                   let [version, ...ref] = _.split(' ');
                   ref = ref.join(' ').trim();
                   return [
                       version,
                       `${artifactType}:${this.rule.module.name}+${ref}`
                   ];
               })
       );
       return debugResult;
   }
}
