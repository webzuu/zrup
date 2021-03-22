import EventEmitter from "events";
import {BuildError} from "./build/error.js";
import {JobSet} from "./build/job-set.js";
import {Job} from "./build/job.js";
import {Db} from "./db.js";
import {Artifact, ArtifactManager} from "./graph/artifact.js";
import {Dependency} from "./graph/dependency.js";

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
    }

    /**
     * @param {Dependency} dependency
     * @param {boolean} [require]
     * @return {Promise<Job>}
     */
    async getJobFor(dependency,require = false)
    {
        return await this.getJobForArtifact(dependency.artifact, require);
    }

    /**
     * @param {Dependency} dependency
     * @param {boolean} [require]
     * @return {Promise<(JobSet|null)>}
     */
    async getJobSetFor(dependency, require=false)
    {
        return await this.getJobSetForArtifact(dependency.artifact,require);
    }

    /**
     * @param {Artifact} artifact
     * @param {boolean} [require]
     * @return {Promise<Job|null>}
     */
    async getJobForArtifact(artifact,require=false)
    {
        return this.getJobForRuleKey(
            await (
                true === require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    /**
     * @param {Artifact} artifact
     * @param {boolean} [require]
     * @return {Promise<(JobSet|null)>}
     */
    async getJobSetForArtifact(artifact, require = false)
    {
        return this.getJobSetForRuleKey(
            await (
                true === require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    /**
     * @param {string|null} ruleKey
     * @return {Job|null}
     */
    getJobForRuleKey(ruleKey)
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
     * @return {(JobSet | null)}
     */
    getJobSetForRuleKey(ruleKey)
    {
        if (!ruleKey) return null;
        const mainJob = this.getJobForRuleKey(ruleKey);
        if (!mainJob) return null;
        return new JobSet(mainJob);
    }

    getAlsoJobSetForRuleKey(ruleKey)
    {
        if (!ruleKey) return null;
        const rule = this.graph.index.rule.key.get(ruleKey);
        let jobSet = new JobSet();
        for (let alsoRule of Object.values(rule.also || {})) {
            jobSet = jobSet.union(this.getJobSetForRuleKey(alsoRule.key));
        }
        return jobSet;
    }

    /**
     * @param {Artifact} artifact
     * @param {(string|null|undefined)} [version]
     * @return {Promise<(string|null)>}
     */
    async getRuleKeyForArtifact(artifact, version)
    {
        if(false === artifact.caps.canBuild) return null
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
     * @param {Artifact} artifact
     * @param {(string|null|undefined)} [version]
     * @return {Promise<string>}
     */
    async requireRuleKeyForArtifact(artifact, version)
    {
        const ruleKey = await this.getRuleKeyForArtifact(artifact, version);
        if (null===ruleKey) {
            throw new BuildError(
                `No rule to build requested ${artifact.identity}`
            );
        }
        return ruleKey;
    }

    /**
     * @param {Artifact} output
     * @return {Promise<object>}
     */
    async getRecordedVersionInfo(output)
    {
        const nonresult = {
            target: output.key,
            version: null,
            sourceVersions: {}
        }
        if (!(await output.exists)) return nonresult;
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
     * @param {Dependency[]} dependencies
     * @param {Artifact[]} outputs
     * @return {Promise<void>}
     */
    async recordVersionInfo(job, dependencies,outputs)
    {
        const depInfos = dependencies.map((dependency) => ({
           dependency: dependency,
            version: this.getVersionReliedOn(job.rule, dependency.artifact, true)
        }));
        const outputInfos = await Promise.all(outputs.map(async output => ({
            output,
            version: await output.version
        })));
        const transaction = this.createRecordVersionInfoTransaction(outputInfos, depInfos, job);
        transaction();
    }

    /**
     * @param {{output: Artifact, version: string}[]} outputInfos
     * @param {{dependency: Dependency, version: string}[]} depInfos
     * @param {Job} job
     */
    createRecordVersionInfoTransaction(outputInfos, depInfos, job) {
        return this.db.db.transaction(() => {
            this.recordArtifacts([
                ...outputInfos.map(_ => _.output),
                ...depInfos.map(_ => _.dependency.artifact)
            ]);
            for (let outputInfo of outputInfos) {
                const outputVersion = outputInfo.version;
                for (let depInfo of depInfos) {
                    this.db.record(
                        outputInfo.output.key,
                        outputVersion,
                        job.rule.key,
                        depInfo.dependency.artifact.key,
                        depInfo.version
                    );
                }
            }
        });
    }

    async recordStandardVersionInfo(job)
    {
        await this.recordVersionInfo(
            job,
            [...job.dependencies],
            [...job.outputs,...job.dynamicOutputs]
        );
    }

    /** @param {Artifact[]} artifacts */
    recordArtifacts(artifacts)
    {
        for (let artifact of artifacts) this.db.recordArtifact(
            artifact.key, artifact.type, artifact.identity
        );
    }

    /**
     *
     * @param {Artifact[]} artifacts
     * @return {Promise<object>}
     */
    async getActualVersionInfo(artifacts)
    {
        const actualSourceVersions = {};
        const unique = {};
        const artifactsUnique = [...new Set(artifacts).values()];
        await Promise.all(
            artifactsUnique.map(
                async (artifact) => {
                    actualSourceVersions[artifact.key] =
                        (await artifact.exists) ? (await artifact.version) : null;
                }
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
        if (rule.always) {
            return false;
        }
        const outputs = job.outputs;
        let outputRecords = this.db.listRuleTargets(rule.key);
        const recordedOutputs = outputRecords.map(output => this.artifactManager.get(output.identity));
        const recordedOutputsByKey = {}; for(let o of recordedOutputs) recordedOutputsByKey[o.key] = o;
        const allOutputs = [...new Set([...outputs, ...recordedOutputs]).values()];
        const allOutputsExistAndHaveBuildRecords =
            (await Promise.all(allOutputs.map(
                async artifact => (await artifact.exists) && (artifact.key in recordedOutputsByKey)
            ))).reduce((previous, current) => previous && current, true);
        if (!allOutputsExistAndHaveBuildRecords) {
            return false;
        }
        const [recordedSourceVersionsByOutput, actualSourceVersions, actualOutputVersions] = await Promise.all([
            Promise.all(allOutputs.map(this.getRecordedVersionInfo.bind(this))),
            this.getActualVersionInfo([...job.dependencies, ...job.recordedDependencies].map(d => d.artifact)),
            this.getActualVersionInfo(allOutputs)
        ]);
        for(let recordedVersionsInfo of recordedSourceVersionsByOutput) {

            if (actualOutputVersions[recordedVersionsInfo.target] !== recordedVersionsInfo.version) {
                return false;
            }
            const recordedSourceKeys = Object.keys(recordedVersionsInfo.sourceVersions);
            let hadRecordedSources = false;
            for(let recordedSourceKey of recordedSourceKeys) {
                hadRecordedSources = true;
                if (
                    recordedVersionsInfo.sourceVersions[recordedSourceKey]
                    !== actualSourceVersions[recordedSourceKey]
                ) {
                    return false;
                }
            }
            if (!hadRecordedSources) return false;
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