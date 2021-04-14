var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _whichRulesReliedOnArtifactVersion, _whichArtifactVersionDidRuleRelyOn;
import EventEmitter from "events";
import { BuildError } from "./build/error.js";
import { JobSet } from "./build/job-set.js";
import { Job } from "./build/job.js";
import throwThe from "./util/throw-error";
/**
 * Class that manages transient information necessary to fulfill a particular build request.
 */
export class Build extends EventEmitter {
    constructor(graph, db, artifactManager) {
        super();
        this.graph = graph;
        this.db = db;
        this.artifactManager = artifactManager;
        _whichRulesReliedOnArtifactVersion.set(this, {});
        _whichArtifactVersionDidRuleRelyOn.set(this, {});
        this.getRecordedVersionInfo = async (output) => {
            const nonresult = {
                target: output.key,
                version: null,
                sourceVersions: {}
            };
            if (!(await output.exists))
                return nonresult;
            const version = await output.version;
            const versionSourcesResult = this.db.listVersionSources(output.key, version);
            const sourceVersions = {};
            for (let row of versionSourcesResult) {
                sourceVersions[row.source] = row.version;
            }
            return {
                target: output.key,
                version,
                sourceVersions
            };
        };
        this.index = {
            rule: {
                job: new Map(),
                jobSet: new Map()
            }
        };
    }
    async getJobFor(dependency, require = false) {
        return await this.getJobForArtifact(dependency.artifact, require);
    }
    async getJobSetFor(dependency, require = false) {
        return await this.getJobSetForArtifact(dependency.artifact, require);
    }
    async getJobForArtifact(artifact, require = false) {
        return this.getJobForRuleKey(await (require
            ? this.requireRuleKeyForArtifact(artifact)
            : this.getRuleKeyForArtifact(artifact)));
    }
    async getJobSetForArtifact(artifact, require = false) {
        return this.getJobSetForRuleKey(await (require
            ? this.requireRuleKeyForArtifact(artifact)
            : this.getRuleKeyForArtifact(artifact)));
    }
    getJobForRuleKey(ruleKey) {
        if (!ruleKey)
            return null;
        if (!this.index.rule.job.has(ruleKey)) {
            const job = new Job(this, this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(`Internal error: rule with key ${ruleKey} was not present in the graph`)));
            this.index.rule.job.set(ruleKey, job);
        }
        return this.index.rule.job.get(ruleKey) || null;
    }
    getJobSetForRuleKey(ruleKey) {
        if (!ruleKey)
            return null;
        const mainJob = this.getJobForRuleKey(ruleKey);
        if (!mainJob)
            return null;
        return new JobSet(mainJob);
    }
    getAlsoJobSetForRuleKey(ruleKey) {
        if (!ruleKey)
            return null;
        const rule = this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(`Internal error: requested an also-job set for rule with key "${ruleKey}", ` +
            `but a rule with that key was not found in the graph`));
        let jobSet = new JobSet();
        for (let alsoRule of Object.values(rule.also || {})) {
            jobSet = jobSet.union(this.getJobSetForRuleKey(alsoRule.key));
        }
        return jobSet;
    }
    async getRuleKeyForArtifact(artifact, version) {
        if (!artifact.caps.canBuild)
            return null;
        const key = artifact.key;
        let ruleKey = this.graph.index.output.rule.get(key);
        if (ruleKey)
            return ruleKey;
        ruleKey = this.db.getProducingRule(key, "undefined" === typeof version ? await artifact.version : version) || undefined;
        if (ruleKey && this.graph.index.rule.key.has(ruleKey)) {
            return ruleKey;
        }
        return null;
    }
    async requireRuleKeyForArtifact(artifact, version) {
        const ruleKey = await this.getRuleKeyForArtifact(artifact, version);
        if (null === ruleKey) {
            throw new BuildError(`No rule to build requested ${artifact.identity}`);
        }
        return ruleKey;
    }
    async recordVersionInfo(job, dependencies, outputs) {
        const depInfos = dependencies.map((dependency) => ({
            dependency: dependency,
            version: this.getVersionReliedOn(job.rule, dependency.artifact, true)
        })).filter((v) => !!v.version);
        const outputInfos = await Promise.all(outputs.map(async (output) => ({
            output,
            version: await output.version
        })));
        const transaction = this.createRecordVersionInfoTransaction(outputInfos, depInfos, job);
        transaction();
    }
    createRecordVersionInfoTransaction(outputInfos, depInfos, job) {
        return this.db.db.transaction(() => {
            this.recordArtifacts([
                ...outputInfos.map(_ => _.output),
                ...depInfos.map(_ => _.dependency.artifact)
            ]);
            for (let outputInfo of outputInfos) {
                const outputVersion = outputInfo.version;
                for (let depInfo of depInfos) {
                    this.db.record(outputInfo.output.key, outputVersion, job.rule.key, depInfo.dependency.artifact.key, depInfo.version);
                }
            }
        });
    }
    async recordStandardVersionInfo(job) {
        await this.recordVersionInfo(job, [...job.dependencies], [...job.outputs, ...job.dynamicOutputs]);
    }
    recordArtifacts(artifacts) {
        for (let artifact of artifacts)
            this.db.recordArtifact(artifact.key, artifact.type, artifact.identity);
    }
    async getActualVersionInfo(artifacts) {
        const actualSourceVersions = {};
        const artifactsUnique = [...new Set(artifacts).values()];
        await Promise.all(artifactsUnique.map(async (artifact) => {
            actualSourceVersions[artifact.key] =
                (await artifact.exists) ? (await artifact.version) : null;
        }));
        return actualSourceVersions;
    }
    async isUpToDate(job) {
        job.prepare();
        const rule = job.rule;
        if (rule.always) {
            return false;
        }
        const outputs = job.outputs;
        let outputRecords = this.db.listRuleTargets(rule.key);
        const recordedOutputs = outputRecords.map(output => this.artifactManager.get(output.identity));
        const recordedOutputsByKey = {};
        for (let o of recordedOutputs)
            recordedOutputsByKey[o.key] = o;
        const allOutputs = [...new Set([...outputs, ...recordedOutputs]).values()];
        const allOutputsExistAndHaveBuildRecords = (await Promise.all(allOutputs.map(async (artifact) => (await artifact.exists) && (artifact.key in recordedOutputsByKey)))).reduce((previous, current) => previous && current, true);
        if (!allOutputsExistAndHaveBuildRecords) {
            return false;
        }
        const [recordedSourceVersionsByOutput, actualSourceVersions, actualOutputVersions] = await Promise.all([
            Promise.all(allOutputs.map(this.getRecordedVersionInfo)),
            this.getActualVersionInfo([...job.dependencies, ...job.recordedDependencies].map(d => d.artifact)),
            this.getActualVersionInfo(allOutputs)
        ]);
        for (let recordedVersionsInfo of recordedSourceVersionsByOutput) {
            if (actualOutputVersions[recordedVersionsInfo.target] !== recordedVersionsInfo.version) {
                return false;
            }
            const recordedSourceKeys = Object.keys(recordedVersionsInfo.sourceVersions);
            let hadRecordedSources = false;
            for (let recordedSourceKey of recordedSourceKeys) {
                hadRecordedSources = true;
                if (recordedVersionsInfo.sourceVersions[recordedSourceKey]
                    !== actualSourceVersions[recordedSourceKey]) {
                    return false;
                }
            }
            if (!hadRecordedSources)
                return false;
        }
        return true;
    }
    async cleanOutputs(job) {
        let outputRecords = this.db.listRuleTargets(job.rule.key);
        await Promise.all(outputRecords.map(async (output) => {
            const outputArtifact = this.artifactManager.get(output.identity);
            if ('function' === typeof outputArtifact.rm) {
                await outputArtifact.rm();
            }
        }));
    }
    getArtifactReliances(artifactKey) {
        const result = {};
        const artifactReliances = __classPrivateFieldGet(this, _whichRulesReliedOnArtifactVersion)[artifactKey] || {};
        for (let version of Object.getOwnPropertyNames(artifactReliances)) {
            result[version] = Object.assign({}, artifactReliances[version]);
        }
        return result;
    }
    async recordReliance(rule, artifact) {
        const reliancesByVersion = (__classPrivateFieldGet(this, _whichRulesReliedOnArtifactVersion)[artifact.key]
            || (__classPrivateFieldGet(this, _whichRulesReliedOnArtifactVersion)[artifact.key] = {}));
        const version = await artifact.version;
        const versionReliances = reliancesByVersion[version];
        if (versionReliances) {
            versionReliances[rule.key] = rule;
        }
        else if (Object.getOwnPropertyNames(reliancesByVersion).length > 0) {
            throw new BuildError(this.formatRelianceConflictMessage(reliancesByVersion, artifact, version, rule));
        }
        else {
            reliancesByVersion[version] = { [rule.key]: rule };
        }
        const reliancesByRule = (__classPrivateFieldGet(this, _whichArtifactVersionDidRuleRelyOn)[rule.key]
            || (__classPrivateFieldGet(this, _whichArtifactVersionDidRuleRelyOn)[rule.key] = {}));
        reliancesByRule[artifact.key] = version;
    }
    getVersionReliedOn(rule, artifact, required) {
        const result = __classPrivateFieldGet(this, _whichArtifactVersionDidRuleRelyOn)?.[rule.key]?.[artifact.key];
        if (!result && required) {
            throw new BuildError(`Internal error: unrecorded reliance info for rule ${rule.label} on ${artifact.identity} was requested`);
        }
        return result;
    }
    formatRelianceConflictMessage(relianceInfo, artifact, version, rule) {
        let msg = (`Build conflict: ${rule.label} relied on ${artifact.label}@${version}, but previous reliances`
            + ` on different versions were recorded:`);
        for (let previousVersion of Object.getOwnPropertyNames(relianceInfo)) {
            msg += "\n" + `@${version} was relied upon by:`;
            msg += "\n\t" + (Object.values(relianceInfo[previousVersion] || {})
                .map(_ => _.label)
                .join("\n\t"));
        }
        return msg;
    }
    requireJobForRuleKey(ruleKey) {
        return this.getJobForRuleKey(ruleKey) || throwThe(new Error(`Internal error: unable to obtain build job for rule with key ${ruleKey}`));
    }
}
_whichRulesReliedOnArtifactVersion = new WeakMap(), _whichArtifactVersionDidRuleRelyOn = new WeakMap();
//# sourceMappingURL=build.js.map