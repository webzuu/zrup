import EventEmitter from "events";
import { BuildError } from "./build/error.js";
import { JobSet } from "./build/job-set.js";
import { Job } from "./build/job.js";
import { Artifact } from "./graph/artifact.js";
import throwThe from "./util/throw-error.js";
/**
 * Class that manages transient information necessary to fulfill a particular build request.
 */
export class Build extends EventEmitter {
    constructor(graph, db, artifactManager, hashService) {
        super();
        this.graph = graph;
        this.db = db;
        this.artifactManager = artifactManager;
        this.hashService = hashService;
        this.$whichRulesReliedOnArtifactVersion = {};
        this.$whichArtifactVersionDidRuleRelyOn = {};
        this.$triplesNeedingMigration = [];
        this.getRecordedVersionInfo = async (output) => {
            const nonresult = {
                target: output.key,
                version: null,
                targetAlgorithm: null,
                sourceVersions: {},
                sourceAlgorithms: {}
            };
            if (!(await output.exists))
                return nonresult;
            // Get ALL recorded versions for this target (not filtered by version yet)
            const allVersions = this.db.listVersions(output.key);
            const firstVersion = allVersions[0];
            if (!firstVersion)
                return nonresult;
            // Use the first recorded version (typically there's only one)
            const recordedVersion = firstVersion.version;
            const versionSourcesResult = this.db.listVersionSources(output.key, recordedVersion);
            const sourceVersions = {};
            const sourceAlgorithms = {};
            let targetAlgorithm = null;
            for (let row of versionSourcesResult) {
                sourceVersions[row.source] = row.version;
                sourceAlgorithms[row.source] = row.algorithm;
                // Target algorithm is the same for all rows - get from first
                if (!targetAlgorithm && versionSourcesResult.length > 0) {
                    targetAlgorithm = row.target_algorithm;
                }
            }
            return {
                target: output.key,
                version: recordedVersion,
                targetAlgorithm,
                sourceVersions,
                sourceAlgorithms
            };
        };
        this.index = {
            rule: {
                job: new Map(),
                jobSet: new Map()
            }
        };
        // Set hash service on Artifact for version computation
        Artifact.setHashService(hashService);
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
        const algorithm = this.hashService.algorithm;
        const depInfos = dependencies.map((dependency) => ({
            dependency: dependency,
            version: this.getVersionReliedOn(job.rule, dependency.artifact, true)
        })).filter((v) => !!v.version);
        const outputInfos = await Promise.all(outputs.map(async (output) => ({
            output,
            version: await output.version
        })));
        const transaction = this.createRecordVersionInfoTransaction(outputInfos, depInfos, job, algorithm);
        transaction();
    }
    createRecordVersionInfoTransaction(outputInfos, depInfos, job, algorithm) {
        return this.db.db.transaction(() => {
            this.recordArtifacts([
                ...outputInfos.map(_ => _.output),
                ...depInfos.map(_ => _.dependency.artifact)
            ]);
            for (let outputInfo of outputInfos) {
                this.db.retractTarget(outputInfo.output.key);
                const outputVersion = outputInfo.version;
                for (let depInfo of depInfos) {
                    this.db.record(outputInfo.output.key, outputVersion, algorithm, job.rule.key, depInfo.dependency.artifact.key, depInfo.version, algorithm);
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
    async getActualVersionInfo(artifacts, algorithms) {
        const actualVersions = {};
        await Promise.all([...new Set(artifacts).values()].map(async (artifact) => {
            if (!(await artifact.exists)) {
                actualVersions[artifact.key] = null;
            }
            else {
                const algorithm = algorithms?.[artifact.key];
                actualVersions[artifact.key] = algorithm
                    ? await artifact.getVersionUsing(algorithm)
                    : await artifact.version;
            }
        }));
        return actualVersions;
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
        const allOutputsExistAndHaveBuildRecords = (await Promise.all(allOutputs.map(async (artifact) => {
            if (!await artifact.exists) {
                this.emit("nonexistent.output", job, {
                    details: "output does not exist",
                    artifact
                });
                return false;
            }
            if (!(artifact.key in recordedOutputsByKey)) {
                this.emit("unrecorded.output", job, {
                    details: "output exists but there is no build record",
                    artifact
                });
                return false;
            }
            return true;
        }))).reduce((previous, current) => previous && current, true);
        if (!allOutputsExistAndHaveBuildRecords) {
            this.emit("incomplete.job", job, {
                details: "missing or unrecorded outputs (see prior messages)"
            });
            return false;
        }
        const dependencyArtifacts = [...new Set([...job.dependencies, ...job.recordedDependencies].map(d => d.artifact)).values()];
        const dependencyArtifactsByKey = {};
        for (let d of dependencyArtifacts)
            dependencyArtifactsByKey[d.key] = d;
        // Get recorded version info first to extract algorithms
        const recordedSourceVersionsByOutput = await Promise.all(allOutputs.map(this.getRecordedVersionInfo));
        // Build algorithm maps: use recorded algorithm for comparison, track if different from current
        const sourceAlgorithms = {};
        const targetAlgorithms = {};
        const currentAlgorithm = this.hashService.algorithm;
        for (let recordedInfo of recordedSourceVersionsByOutput) {
            // Map target algorithm
            const targetAlgo = recordedInfo.targetAlgorithm || 'md5';
            targetAlgorithms[recordedInfo.target] = targetAlgo;
            // Map source algorithms
            for (let sourceKey of Object.keys(recordedInfo.sourceVersions)) {
                const sourceAlgo = recordedInfo.sourceAlgorithms[sourceKey] || 'md5';
                sourceAlgorithms[sourceKey] = sourceAlgo;
            }
        }
        // Compute actual versions using SAME algorithms as recorded (for accurate comparison)
        const [actualSourceVersions, actualOutputVersions] = await Promise.all([
            this.getActualVersionInfo(dependencyArtifacts, sourceAlgorithms),
            this.getActualVersionInfo(allOutputs, targetAlgorithms)
        ]);
        const dependencyKeySet = new Set(Object.keys(dependencyArtifactsByKey));
        for (let recordedVersionsInfo of recordedSourceVersionsByOutput) {
            if (actualOutputVersions[recordedVersionsInfo.target] !== recordedVersionsInfo.version) {
                this.emit("dirty.output", job, {
                    details: "output was modified externally",
                    rule: job.rule,
                    output: recordedOutputsByKey[recordedVersionsInfo.target],
                    rec: recordedVersionsInfo,
                    act: actualOutputVersions[recordedVersionsInfo.target],
                });
                return false;
            }
            else {
                this.emit("clean.output", job, {
                    details: "output matches last recorded version",
                    rule: job.rule,
                    output: recordedOutputsByKey[recordedVersionsInfo.target],
                    rec: recordedVersionsInfo,
                    act: actualOutputVersions[recordedVersionsInfo.target],
                });
            }
            const recordedSourceKeys = Object.keys(recordedVersionsInfo.sourceVersions);
            const recordedSourceKeySet = new Set(recordedSourceKeys);
            const requiredButNotRecorded = dependencyKeySet.difference(recordedSourceKeySet);
            if (requiredButNotRecorded.size > 0) {
                this.emit("missing.records", job, {
                    details: "some required source versions were not recorded for target",
                    rule: job.rule,
                    output: recordedOutputsByKey[recordedVersionsInfo.target],
                    rec: recordedVersionsInfo,
                    act: actualSourceVersions,
                    missing: requiredButNotRecorded
                });
                return false;
            }
            const recordedButNotRequired = recordedSourceKeySet.difference(dependencyKeySet);
            if (recordedButNotRequired.size > 0) {
                this.emit("extraneous.records", job, {
                    details: "some source versions were recorded but not required for target",
                    rule: job.rule,
                    output: recordedOutputsByKey[recordedVersionsInfo.target],
                    rec: recordedVersionsInfo,
                    act: actualSourceVersions,
                    unrecorded: recordedButNotRequired
                });
                return false;
            }
            let hadRecordedSources = false;
            for (let recordedSourceKey of recordedSourceKeys) {
                hadRecordedSources = true;
                if (recordedVersionsInfo.sourceVersions[recordedSourceKey]
                    !== actualSourceVersions[recordedSourceKey]) {
                    this.emit("changed.source", job, {
                        details: "source was modified",
                        rule: job.rule,
                        output: recordedOutputsByKey[recordedVersionsInfo.target],
                        source: dependencyArtifactsByKey[recordedSourceKey],
                        rec: recordedVersionsInfo,
                        act: actualSourceVersions[recordedSourceKey],
                    });
                    return false;
                }
                else {
                    this.emit("unchanged.source", job, {
                        details: "source matches the build record for target",
                        rule: job.rule,
                        output: recordedOutputsByKey[recordedVersionsInfo.target],
                        source: dependencyArtifactsByKey[recordedSourceKey],
                        rec: recordedVersionsInfo,
                        act: actualSourceVersions[recordedSourceKey],
                    });
                }
            }
            if (!hadRecordedSources) {
                this.emit("missing.records", job, {
                    details: "no source versions were recorded for target",
                    rule: job.rule,
                    output: recordedOutputsByKey[recordedVersionsInfo.target],
                    rec: recordedVersionsInfo
                });
                return false;
            }
            // Job is up-to-date: track triples with old algorithms for migration
            // ONLY track here (after determining up-to-date) to avoid race with recordVersionInfo()
            const targetNeedsMigration = (recordedVersionsInfo.targetAlgorithm || 'md5') !== currentAlgorithm;
            for (let recordedSourceKey of recordedSourceKeys) {
                const sourceNeedsMigration = (recordedVersionsInfo.sourceAlgorithms[recordedSourceKey] || 'md5') !== currentAlgorithm;
                if (targetNeedsMigration || sourceNeedsMigration) {
                    this.$triplesNeedingMigration.push({
                        source: recordedSourceKey,
                        rule: job.rule.key,
                        target: recordedVersionsInfo.target
                    });
                }
            }
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
        const artifactReliances = this.$whichRulesReliedOnArtifactVersion[artifactKey] || {};
        for (let version of Object.getOwnPropertyNames(artifactReliances)) {
            result[version] = Object.assign({}, artifactReliances[version]);
        }
        return result;
    }
    async recordReliance(rule, artifact) {
        const reliancesByVersion = (this.$whichRulesReliedOnArtifactVersion[artifact.key]
            || (this.$whichRulesReliedOnArtifactVersion[artifact.key] = {}));
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
        const reliancesByRule = (this.$whichArtifactVersionDidRuleRelyOn[rule.key]
            || (this.$whichArtifactVersionDidRuleRelyOn[rule.key] = {}));
        reliancesByRule[artifact.key] = version;
    }
    getVersionReliedOn(rule, artifact, required) {
        const result = this.$whichArtifactVersionDidRuleRelyOn?.[rule.key]?.[artifact.key];
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
    /**
     * Execute hash algorithm migration for tracked (source, target) pairs.
     * Computes new hashes for artifacts and batch-updates database records.
     */
    async executeHashMigration() {
        if (this.$triplesNeedingMigration.length === 0) {
            return;
        }
        // Deduplicate pairs (source, target)
        const pairSet = new Set();
        const pairs = [];
        for (let item of this.$triplesNeedingMigration) {
            const key = `${item.source}|${item.target}`;
            if (!pairSet.has(key)) {
                pairSet.add(key);
                pairs.push({ source: item.source, target: item.target });
            }
        }
        console.log(`Migrating ${pairs.length} state record pairs to ${this.hashService.algorithm} algorithm...`);
        // Extract unique artifact keys
        const artifactKeys = new Set();
        for (let pair of pairs) {
            artifactKeys.add(pair.source);
            artifactKeys.add(pair.target);
        }
        // Compute new hashes for each unique artifact
        const newHashes = {};
        await Promise.all([...artifactKeys].map(async (key) => {
            const artifact = this.artifactManager.findByKey(key);
            if (artifact && await artifact.exists) {
                newHashes[key] = await artifact.getVersionUsing(this.hashService.algorithm);
            }
        }));
        // Batch update database records
        await this.db.migrateStateRecords(pairs, newHashes, this.hashService.algorithm);
        console.log(`Migration complete: ${pairs.length} record pairs updated`);
    }
}
//# sourceMappingURL=build.js.map