import {BuildError} from "./error.js";
import {Dependency} from "../graph/dependency.js";
import {AID} from "../graph/artifact.js";

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
        this.build = build;
        this.rule = rule;
        this.recipeInvoked = false;
        this.promise = null;
        this.finished = false;
        this.recipeInvoked = false;
        this.dependencies = [];
        this.outputs = [];
        this.dynamicOutputs = [];
        this.error = null;
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
        await this.prepare();
        await Promise.all(this.dependencies.map(dependency => this.ensureDependency(dependency)));
        if (!await this.build.isUpToDate(this)) {
            this.recipeInvoked = true;
            await this.rule.recipe.executeFor(this);
            await this.detectRewritesAfterUse();
            await this.build.recordVersionInfo(this);
        }
    }

    async prepare()
    {
        if (this.#prepared) return;
        this.#prepared = true;
        this.preCollectOutputs();
        await this.collectDependencies();
    }

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



    async collectDependencies()
    {
        const dependencies = {};

        for(let dependency of Object.values(this.rule.dependencies)) {
            dependencies[dependency.artifact.key] = dependency;
        }

        const dynamicDependencies =
            (await this.build.db.listRuleSources(this.rule.key))
                .filter(record => !(record.key in dependencies))
                .map(record => this.artifactFromRecord(record))
                .map(artifact => new Dependency(artifact, Dependency.ABSENT_STATE));

        for(let dependency of dynamicDependencies) {
            dependencies[dependency.artifact.key] = dependency;
        }

        this.dependencies = Object.values(dependencies);
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
