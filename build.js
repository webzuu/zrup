import md5 from "md5";
import {Job} from "./build/job.js";
import {BuildError} from "./build/error.js";

export class Build {

    #built;
    #reliedUpon;
    /**
     *
     * @param {Graph} graph
     * @param {Db} db
     * @param {ArtifactManager} artifactManager
     */
    constructor(graph, db, artifactManager)
    {
        this.graph = graph;
        this.db = db;
        this.artifactManager = artifactManager;
        this.index = {
            rule: {
                job: new Map()
            }
        }
        this.#built = {};
        this.#reliedUpon = {};
    }

    /**
     * @param {Dependency} dependency
     * @return {Promise<Job>}
     */
    async getJobFor(dependency)
    {
        return this.getJobForArtifact(dependency.artifact);
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
     *
     * @param {string|null} ruleKey
     * @return {Job|null}
     */
    getJobForRule(ruleKey)
    {
        if (!ruleKey) return null;
        if (!this.index.rule.job.has(ruleKey)) {
            this.index.rule.job.set(ruleKey, new Job(this, this.graph.index.rule.key.get(ruleKey)));
        }
        return this.index.rule.job.get(ruleKey);
    }

    /**
     *
     * @param {Artifact} artifact
     * @param {string|null|undefined} [version]
     * @return {Promise<string|null>}
     */
    async getRuleForArtifact(artifact, version)
    {
        //TODO: either utilize sqlite caching or centralize this through ArtifactManager
        const key = artifact.key;
        let ruleKey = this.graph.index.output.rule.get(key);
        if (ruleKey) return ruleKey;
        ruleKey = await this.db.getProducingRule(key, "undefined"===typeof version ? await artifact.version : version);
        if (ruleKey) return ruleKey;
        return null;
    }

    /**
     *
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
        const versionSourcesResult = await this.db.listVersionSources(output.key, version);
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
        await this.recordArtifacts(job);
        await Promise.all([...job.outputs,...job.dynamicOutputs].map(output => (async () => {
            await this.db.retractTarget(output.key);
            const outputVersion = await output.version;
            await Promise.all(job.dependencies.map(dep => (async () => {
                await this.db.record(
                    output.key,
                    outputVersion,
                    job.rule.key,
                    dep.artifact.key,
                    await dep.artifact.version //TODO: use reliance data here instead of recomputing
                );
            })()));
        })()));
    }

    /**
     * @param {Job} job
     * @return {Promise<void>}
     */
    async recordArtifacts(job)
    {
        const allArtifacts = [
            ...job.outputs,
            ...job.dynamicOutputs,
            ...job.dependencies.map(dep => dep.artifact)
        ];
        const runningQueries = allArtifacts.map(artifact => (async () =>{
            await this.db.recordArtifact(artifact.key, artifact.type, artifact.identity);
        })());
        await Promise.all(runningQueries);
    }

    /**
     *
     * @param {Rule} rule
     * @return {Promise<object>}
     */
    async getActualVersionInfo(rule)
    {
        const actualSourceVersions = {};
        await Promise.all(
            Object.values(rule.dependencies).map(
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
        const rule = job.rule;
        if (rule.always) return false;
        await job.prepare();
        const outputs = job.outputs;
        const allOutputsExist =
            (await Promise.all(outputs.map(artifact => artifact.exists)))
                .reduce((previous, current) => previous && current, true);
        if (!allOutputsExist) return false;
        const [recordedSourceVersionsByOutput, actualSourceVersions] =
            await Promise.all([
                Promise.all(outputs.map(this.getRecordedVersionInfo.bind(this))),
                this.getActualVersionInfo(rule)
            ]);
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
        for(let version of Object.getOwnPropertyNames(this.#reliedUpon[artifactKey] || {}))
        {
            result[version] = Object.assign({},this.#reliedUpon[artifactKey][version]);
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
            this.#reliedUpon[artifact.key]
            || (this.#reliedUpon[artifact.key] = {})
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