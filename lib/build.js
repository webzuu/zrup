import {SourceRecipe} from "@zrup/build/recipe";
import {SourceRule} from "@zrup/graph/rule";
import md5 from "md5";
import {Job} from "@zrup/build/job";

export class Build {

    #sourceRecipe;
    /**
     *
     * @param {Graph} graph
     * @param {Db} db
     */
    constructor(graph, db)
    {
        this.graph = graph;
        this.db = db;
        this.index = {
            rule: {
                job: new Map()
            }
        }
        this.#sourceRecipe =  new SourceRecipe();
    }

    /**
     * @param {Dependency} dependency
     * @return {Job}
     */
    getJobFor(dependency)
    {
        const ruleKey =
            this.graph.index.output.rule.get(dependency.artifact.key)
            || (new SourceRule(this.graph, this.#sourceRecipe, dependency.artifact)).key;
        return this.getJobForRule(ruleKey);
    }

    /**
     * @param {Artifact} artifact
     * @return {Job}
     */
    getJobForArtifact(artifact)
    {
        const ruleKey = this.graph.index.output.rule.get(artifact.key);
        return this.getJobForRule(ruleKey);
    }

    /**
     *
     * @param {string} ruleKey
     * @return {Job}
     */
    getJobForRule(ruleKey)
    {
        if (!this.index.rule.job.has(ruleKey)) {
            this.index.rule.job.set(ruleKey, new Job(this, this.graph.index.rule.key.get(ruleKey)));
        }
        return this.index.rule.job.get(ruleKey);
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
        await Promise.all(job.outputs.map(target => (async () => {
            await this.db.retractTarget(target.key);
            await this.db.recordArtifact(target.key, target.type, target.identity);
            const targetVersion = await target.version;
            await Promise.all(job.dependencies.map(dep => (async () => {
                await this.db.recordArtifact(dep.artifact.key, dep.artifact.type, dep.artifact.identity);
                await this.db.record(target.key, targetVersion, job.rule.key, dep.artifact.key, await dep.artifact.version);
            })()));
        })()));
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
            rule.dependencies.map(
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
        if (rule instanceof SourceRule) return false;
        const allOutputsExist =
            (await Promise.all(rule.outputs.map(artifact => (async () => await artifact.exists)())))
                .reduce((previous, current) => previous && current, true);
        if (!allOutputsExist) return false;
        const [recordedSourceVersionsByOutput, actualSourceVersions] =
            await Promise.all([
                Promise.all(rule.outputs.map(this.getRecordedVersionInfo.bind(this))),
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
}