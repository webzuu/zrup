import md5 from "md5";
import {JobSet} from "./build/job-set.js";
import {Job} from "./build/job.js";
import {BuildError} from "./build/error.js";
import {Dependency} from "./graph/dependency.js";
import EventEmitter from "events";

export const Build = class Build extends EventEmitter  {

    #built;
    #whichRulesReliedOnArtifactVersion = {};
    #whichArtifactVersionDidRuleRelyOn = {};
    /**
     *
     * @param {Graph} graph
     * @param {Db} db
     * @param {ArtifactManager} artifactManager
     */
    constructor(graph, db, artifactManager)
    {
        super();
        this.graph = graph;
        this.db = db;
        this.artifactManager = artifactManager;
        this.index = {
            rule: {
                job: new Map(),
                jobSet: new Map()
            }
        }
        this.#built = {};
        this.#whichRulesReliedOnArtifactVersion = {};
    }

    /**
     * @param {Dependency} dependency
     * @return {Promise<Job>}
     */
    async getJobFor(dependency)
    {
        return await this.getJobForArtifact(dependency.artifact);
    }

    /**
     * @param {Dependency} dependency
     * @return {Promise<(JobSet|null)>}
     */
    async getJobSetFor(dependency)
    {
        return await this.getJobSetForArtifact(dependency.artifact);
    }

    /**
     * @param {Artifact} artifact
     * @return {Promise<Job|null>}
     */
    async getJobForArtifact(artifact)
    {
        return this.getJobForRule(await this.getRuleForArtifact(artifact));
    }

    /**
     * @param {Artifact} artifact
     * @return {Promise<(JobSet|null)>}
     */
    async getJobSetForArtifact(artifact)
    {
        return await this.getJobSetForRule(await this.getRuleForArtifact(artifact));
    }

    /**
     * @param {string|null} ruleKey
     * @return {Job|null}
     */
    getJobForRule(ruleKey)
    {
        if (!ruleKey) return null;
        if (!this.index.rule.job.has(ruleKey)) {
            const job = new Job(this, this.graph.index.rule.key.get(ruleKey));
            job.rule.recipe.job=job;
            this.index.rule.job.set(
                ruleKey,
                job
            );
        }
        return this.index.rule.job.get(ruleKey);
    }

    /**
     * @param {string|null} ruleKey
     * @return {Promise<JobSet | null>}
     */
    async getJobSetForRule(ruleKey)
    {
        if (!ruleKey) return null;
        const mainJob = this.getJobForRule(ruleKey);
        if (!mainJob) return null;
        const jobSet = new JobSet();
        jobSet.add(mainJob);
        const rule = this.graph.index.rule.key.get(ruleKey);
        await Promise.all(
            Object.values(rule.also || {}).map(
                async artifact => jobSet.merge(await this.getJobSetForArtifact(artifact))
            )
        );
        return jobSet;
    }

    /**
     *
     * @param {Artifact} artifact
     * @param {string|null|undefined} [version]
     * @return {Promise<string|null>}
     */
    async getRuleForArtifact(artifact, version)
    {
        if(false === artifact.caps.canBuild) return null
        //TODO: either utilize sqlite caching or centralize this through ArtifactManager
        const key = artifact.key;
        let ruleKey = this.graph.index.output.rule.get(key);
        if (ruleKey) return ruleKey;
        ruleKey = this.db.getProducingRule(key, "undefined"===typeof version ? await artifact.version : version);
        if (!this.graph.index.rule.key.has(ruleKey)) {
            //This may be a rule that no longer exists in the graph!
            return null;
        }
        if (ruleKey) return ruleKey;
        return null;
    }

    /**
     * @param {Artifact} output
     * @return {Promise<object>}
     */
    async getRecordedVersionInfo(output)
    {
        if (!(await output.exists)) return {
            target: output.key,
            version: null,
            sourceVersions: {}
        };
        const version = await output.version;
        const versionSourcesResult = this.db.listVersionSources(output.key, version);
        const sourceVersions = {};
        for(let row of versionSourcesResult) {
            sourceVersions[row.source] = row.version;
        }
        return {
            target: output.key,
            version,
            sourceVersions
        };
    }

    /**
     *
     * @param {Job} job
     * @return {Promise<void>}
     */
    async recordVersionInfo(job)
    {
        const outputInfos = await Promise.all([...job.outputs, ...job.dynamicOutputs].map(async output => ({
            output,
            version: await output.version
        })));
        const transaction = this.db.db.transaction(() => {
            this.recordArtifacts(job);
            for (let info of outputInfos) {
                this.db.retractTarget(info.output.key);
                const outputVersion = info.version;
                for (let dep of job.dependencies) {
                    this.db.record(
                        info.output.key,
                        outputVersion,
                        job.rule.key,
                        dep.artifact.key,
                        this.getVersionReliedOn(job.rule, dep.artifact, true)
                    );
                }
            }
        });
        // noinspection JSValidateTypes
        transaction();
    }

    /** @param {Job} job */
    recordArtifacts(job)
    {
        const artifacts = [
            ...job.outputs,
            ...job.dynamicOutputs,
            ...job.dependencies.map(dep => dep.artifact)
        ];
        for (let artifact of artifacts) this.db.recordArtifact(
            artifact.key, artifact.type, artifact.identity
        );
    }

    /**
     *
     * @param {Dependency[]} dependencies
     * @return {Promise<object>}
     */
    async getActualVersionInfo(dependencies)
    {
        const actualSourceVersions = {};
        await Promise.all(
            dependencies.map(
                dependency => (async () => {
                    actualSourceVersions[dependency.artifact.key] =
                        (await dependency.artifact.exists) ? (await dependency.artifact.version) : null;
                })()
            )
        );
        return actualSourceVersions;
    }

    /**
     *
     * @param {Job} job
     * @return {Promise<boolean>}
     */
    async isUpToDate(job)
    {
        job.prepare();
        const rule = job.rule;
        if (rule.always) return false;
        const outputs = job.outputs;
        const allOutputsExist =
            (await Promise.all(outputs.map(artifact => artifact.exists)))
                .reduce((previous, current) => previous && current, true);
        if (!allOutputsExist) return false;
        const [recordedSourceVersionsByOutput, actualSourceVersions] = await Promise.all([
            Promise.all(outputs.map(this.getRecordedVersionInfo.bind(this))),
            this.getActualVersionInfo(job.dependencies)
        ])
        const actualSourceKeys = Object.getOwnPropertyNames(actualSourceVersions).sort();
        const actualSourceKeyHash = md5(JSON.stringify(actualSourceKeys));
        for(let recordedVersionsInfo of recordedSourceVersionsByOutput) {
            const recordedSourceKeys = Object.getOwnPropertyNames(recordedVersionsInfo.sourceVersions).sort();
            const recordedSourceKeyHash = md5(JSON.stringify(recordedSourceKeys));
            if (recordedSourceKeyHash !== actualSourceKeyHash) return false;
            for(let key of recordedSourceKeys) {
                if (recordedVersionsInfo.sourceVersions[key] !== actualSourceVersions[key]) return false;
            }
        }
        return true;
    }

    /**
     *
     * @param {string} artifactKey
     */
    getArtifactReliances(artifactKey)
    {
        const result = {};
        for(let version of Object.getOwnPropertyNames(this.#whichRulesReliedOnArtifactVersion[artifactKey] || {}))
        {
            result[version] = Object.assign({},this.#whichRulesReliedOnArtifactVersion[artifactKey][version]);
        }
        return result;
    }

    /**
     * @param {Rule} rule
     * @param {Artifact} artifact
     * @return {Promise<void>}
     */
    async recordReliance(rule, artifact)
    {
        const reliancesByVersion = (
            this.#whichRulesReliedOnArtifactVersion[artifact.key]
            || (this.#whichRulesReliedOnArtifactVersion[artifact.key] = {})
        );

        const version = await artifact.version;

        if (version in reliancesByVersion) {
            reliancesByVersion[version][rule.key] = rule;
        }
        else if (Object.getOwnPropertyNames(reliancesByVersion).length > 0) {
            throw new BuildError(this.formatRelianceConflictMessage(
                reliancesByVersion,
                artifact,
                version,
                rule
            ));
        }
        else {
            reliancesByVersion[version] = { [rule.key]: rule };
        }

        const reliancesByRule = (
            this.#whichArtifactVersionDidRuleRelyOn[rule.key]
            || (this.#whichArtifactVersionDidRuleRelyOn[rule.key] = {})
        );
        reliancesByRule[artifact.key] = version;
    }

    /**
     * @param {Rule} rule
     * @param {Artifact} artifact
     * @param {boolean} required
     * @return {(string|undefined)}
     */
    getVersionReliedOn(rule, artifact, required)
    {
        let result;
        if (rule.key in this.#whichArtifactVersionDidRuleRelyOn) {
            result = this.#whichArtifactVersionDidRuleRelyOn[rule.key][artifact.key];
        }
        if (!result && true===required) {
            throw new BuildError(
                `Internal error: unrecorded reliance info for rule ${rule.label} on ${artifact.identity} was requested`
            )
        }
        return result;
    }

    /**
     * @typedef {Object.<string, Rule>} Build~RuleIndex
     */

    /**
     * @typedef {Object.<string, Build~RuleIndex>} Build~ArtifactRelianceInfo
     */

    /**
     * @param {Build~ArtifactRelianceInfo} relianceInfo
     * @param artifact
     * @param version
     * @param rule
     */
    formatRelianceConflictMessage(relianceInfo, artifact, version, rule)
    {
        let msg = (
            `Build conflict: ${rule.label} relied on ${artifact.label}@${version}, but previous reliances`
            +` on different versions were recorded:`
        );
        for (let previousVersion in Object.getOwnPropertyNames(relianceInfo))
        {
            msg += "\n" + `@${version} was relied upon by:`
            msg += "\n\t" + (
                Object.values(relianceInfo[previousVersion])
                    .map(_ => _.label)
                    .join("\n\t")
            )
        }
        return msg;
    }
}