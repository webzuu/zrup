import {RecipeArtifact} from "../graph/artifact/recipe.js";
import {BuildError} from "./error.js";
import {Dependency} from "../graph/dependency.js";
import {AID} from "../graph/artifact.js";
import {Build} from "../build.js";

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
export class Job {

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
        /** @type {Object|null} */
        this.recipeSpec = null;
        this.promise = null;
        this.finished = false;
        this.recipeInvoked = false;
        this.outputs = [];
        this.dynamicOutputs = [];
        this.error = null;
        /** @type {(Job|null)} */
        this.requestedBy = null;
        this.dependencies = [
            new Dependency(RecipeArtifact.makeFor(this), Dependency.ABSENT_VIOLATION)
        ];
        this.recordedDependencies = [];
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
            this.dependencies.push(
                new Dependency(
                    this.build.artifactManager.get(`recipe:${this.rule.module.name}+${this.rule.name}`),
                    Dependency.ABSENT_STATE
                )
            );
        }
        catch(e) {
            throw new BuildError(BuildError.formatRuleFailure(this.rule, e), e);
        }
        finally {
            this.promise = null;
            this.finished = true;
        }
        return this;
    }

    /**
     * The main build algorithm
     * @return {Promise<void>}
     */
    async #work()
    {
        this.prepare();
        await Promise.all(this.getMergedDependencies().map(async dependency => await this.ensureDependency(dependency)));
        if (!await this.build.isUpToDate(this)) {
            const recipeArtifact = this.build.artifactManager.get(`recipe:${this.rule.module.name}+${this.rule.name}`);
            this.build.emit('invoking.recipe',this.rule);
            this.recipeInvoked = true;
            await this.rule.recipe.executeFor(this, await recipeArtifact.spec);
            this.build.emit('invoked.recipe',this.rule);
            await this.detectRewritesAfterUse();
            await this.build.recordVersionInfo(this);
        }
    }

    getMergedDependencies() {
        const merged = {};
        for(let dep of [...this.recordedDependencies, ...this.dependencies]) {
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

    /**
     * @param {Dependency} dependency
     * @return {Promise<void>}
     */
    async ensureDependency(dependency)
    {
        const artifact = dependency.artifact;
        /** @type {Job|null} */
        const buildJob = await this.build.getJobForArtifact(artifact);
        const rule = buildJob ? buildJob.rule : null;
        if (buildJob) {
            if (!buildJob.requestedBy) buildJob.requestedBy = this;
            await buildJob.run(); //May throw, will be handled up the call chain
        }
        if (
            dependency.whenAbsent === Dependency.ABSENT_VIOLATION
            && !await artifact.exists
        ) {
            if (buildJob) {
                throw new BuildError(
                    `Rule "${rule.label}" silently failed to build required ${artifact.identity}`
                );
            }
            else {
                throw new BuildError(
                    `No rule to build required ${artifact.identity}`
                );
            }
        }
        await this.build.recordReliance(this.rule, dependency.artifact);
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

   preCollectOutputs()
   {
       this.outputs = Object.values(this.rule.outputs);
   }
}
