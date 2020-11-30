import {SourceRecipe} from "@zrup/build/recipe";
import {SourceRule} from "@zrup/graph/rule";
import md5 from "md5";
import Job from "@zrup/build/job";


export default class Build {

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

    getJobFor(artifact)
    {
        const ruleKey =
            this.graph.index.output.rule.get(artifact.key)
            || (new SourceRule(this.graph, this.#sourceRecipe, artifact)).key;
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
     * @param {Rule} rule
     * @return {Promise<void>}
     */
    async recordVersionInfo(rule)
    {
        await Promise.all(rule.outputs.map(target => (async () => {
            await this.db.retractTarget(target.key);
            await Promise.all(rule.dependencies.map(dep => (async () => {
                await this.db.record(target.key, await target.version, dep.key, await dep.version);
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
                    actualSourceVersions[dependency.key] = (await dependency.exists) ? (await dependency.version) : null;
                })()
            )
        );
        return actualSourceVersions;
    }

    /**
     *
     * @param {Rule} rule
     * @return {Promise<boolean>}
     */
    async isUpToDate(rule)
    {
        if (rule instanceof SourceRule) return false;
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