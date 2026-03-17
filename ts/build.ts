import EventEmitter from "events";
import {BuildError} from "./build/error.js";
import {JobSet} from "./build/job-set.js";
import {Job} from "./build/job.js";
import {Db} from "./db.js";
import {Artifact, ArtifactManager} from "./graph/artifact.js";
import {Dependency} from "./graph/dependency.js";
import {Graph} from "./graph.js";
import throwThe from "./util/throw-error.js";
import {Rule} from "./graph/rule.js";
import {Transaction} from "better-sqlite3";
import {HashService} from "./hash/hash-service.js";
import {FileArtifact} from "./graph/artifact/file.js";

type WhichRulesReliedOnArtifactVersion = Record<string, Build.ArtifactRelianceInfo>;
type WhichArtifactVersionDidRuleRelyOn = Record<string, Record<string, string>>;

export namespace Build {

    export interface RecordedVersionInfo {
        target: string,
        version: string | null,
        targetAlgorithm: string | null,  // null = MD5
        sourceVersions: Record<string, string>,
        sourceAlgorithms: Record<string, string | null>  // null = MD5
    }
    export interface Index {
        rule : {
            job : Map<string, Job>,
            jobSet: Map<string, JobSet>
        }
    }
    export type RuleIndex = Record<string, Rule>;
    export type ArtifactRelianceInfo = Record<string, RuleIndex>;
}

/**
 * Class that manages transient information necessary to fulfill a particular build request.
 */
export class Build extends EventEmitter  {

    private $whichRulesReliedOnArtifactVersion : WhichRulesReliedOnArtifactVersion = {};
    private $whichArtifactVersionDidRuleRelyOn : WhichArtifactVersionDidRuleRelyOn = {};
    private $triplesNeedingMigration: Array<{
        source: string;  // artifact key
        rule: string;    // rule key
        target: string;  // artifact key
    }> = [];
    public index : Build.Index;

    constructor(
        public readonly graph: Graph,
        public readonly db: Db,
        public readonly artifactManager: ArtifactManager,
        public readonly hashService: HashService
    )
    {
        super();
        this.index = {
            rule: {
                job: new Map<string, Job>(),
                jobSet: new Map<string, JobSet>()
            }
        }

        // Set hash service on Artifact for version computation
        Artifact.setHashService(hashService);
    }

    async getJobFor(dependency: Dependency, require: boolean = false): Promise<Job | null>
    {
        return await this.getJobForArtifact(dependency.artifact, require);
    }

    async getJobSetFor(dependency: Dependency, require: boolean = false): Promise<(JobSet | null)>
    {
        return await this.getJobSetForArtifact(dependency.artifact,require);
    }

    async getJobForArtifact(artifact: Artifact, require: boolean = false): Promise<Job | null>
    {
        return this.getJobForRuleKey(
            await (
                require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    async getJobSetForArtifact(artifact: Artifact, require: boolean = false): Promise<(JobSet | null)>
    {
        return this.getJobSetForRuleKey(
            await (
                require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    getJobForRuleKey(ruleKey: string | null): Job | null
    {
        if (!ruleKey) return null;
        if (!this.index.rule.job.has(ruleKey)) {
            const job = new Job(
                this,
                this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(
                    `Internal error: rule with key ${ruleKey} was not present in the graph`
                ))
            );
            this.index.rule.job.set(
                ruleKey,
                job
            );
        }
        return this.index.rule.job.get(ruleKey) || null;
    }

    getJobSetForRuleKey(ruleKey: string | null): JobSet | null
    {
        if (!ruleKey) return null;
        const mainJob = this.getJobForRuleKey(ruleKey);
        if (!mainJob) return null;
        return new JobSet(mainJob);
    }

    getAlsoJobSetForRuleKey(ruleKey : string | null) : JobSet | null
    {
        if (!ruleKey) return null;
        const rule : Rule = this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(
            `Internal error: requested an also-job set for rule with key "${ruleKey}", `+
            `but a rule with that key was not found in the graph`
        ));
        let jobSet = new JobSet();
        for (let alsoRule of Object.values(rule.also || {})) {
            jobSet = jobSet.union(this.getJobSetForRuleKey(alsoRule.key));
        }
        return jobSet;
    }

    async getRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<(string | null)>
    {
        if(!artifact.caps.canBuild) return null;
        const key = artifact.key;
        let ruleKey = this.graph.index.output.rule.get(key);
        if (ruleKey) return ruleKey;
        ruleKey = this.db.getProducingRule(key, "undefined"===typeof version ? await artifact.version : version) || undefined;
        if (ruleKey && this.graph.index.rule.key.has(ruleKey)) {
            return ruleKey;
        }
        return null;
    }

    async requireRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<string>
    {
        const ruleKey = await this.getRuleKeyForArtifact(artifact, version);
        if (null===ruleKey) {
            throw new BuildError(
                `No rule to build requested ${artifact.identity}`
            );
        }
        return ruleKey;
    }

    getRecordedVersionInfo = async (output: Artifact): Promise<Build.RecordedVersionInfo> => {
        const nonresult = {
            target: output.key,
            version: null,
            targetAlgorithm: null,
            sourceVersions: {},
            sourceAlgorithms: {}
        }
        if (!(await output.exists)) return nonresult;

        // Get ALL recorded versions for this target (not filtered by version yet)
        const allVersions = this.db.listVersions(output.key);
        const firstVersion = allVersions[0];
        if (!firstVersion) return nonresult;

        // Use the first recorded version (typically there's only one)
        const recordedVersion = firstVersion.version;
        const versionSourcesResult = this.db.listVersionSources(output.key, recordedVersion);
        const sourceVersions : Record<string, string> = {};
        const sourceAlgorithms : Record<string, string | null> = {};
        let targetAlgorithm: string | null = null;

        for(let row of versionSourcesResult) {
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

    async recordVersionInfo(job: Job, dependencies: Dependency[], outputs: Artifact[]): Promise<void>
    {
        const algorithm = this.hashService.algorithm;

        type RecordedDepInfo = { dependency: Dependency; version: string };
        const depInfos: RecordedDepInfo[] = dependencies.map((dependency) => ({
            dependency: dependency,
            version: this.getVersionReliedOn(job.rule, dependency.artifact, true)
        })).filter( (v) : v is RecordedDepInfo => !!v.version);
        const outputInfos = await Promise.all(outputs.map(async output => ({
            output,
            version: await output.version
        })));
        const transaction = this.createRecordVersionInfoTransaction(outputInfos, depInfos, job, algorithm);
        transaction();
    }

    createRecordVersionInfoTransaction(
        outputInfos: { output: Artifact; version: string; }[],
        depInfos: { dependency: Dependency; version: string; }[],
        job: Job,
        algorithm: string
    ) : Transaction {
        return this.db.db.transaction(() => {
            this.recordArtifacts([
                ...outputInfos.map(_ => _.output),
                ...depInfos.map(_ => _.dependency.artifact)
            ]);
            for (let outputInfo of outputInfos) {
                this.db.retractTarget(outputInfo.output.key);
                const outputVersion = outputInfo.version;
                for (let depInfo of depInfos) {
                    this.db.record(
                        outputInfo.output.key,
                        outputVersion,
                        algorithm,
                        job.rule.key,
                        depInfo.dependency.artifact.key,
                        depInfo.version,
                        algorithm
                    );
                }
            }
        });
    }

    async recordStandardVersionInfo(job : Job)
    {
        await this.recordVersionInfo(
            job,
            [...job.dependencies],
            [...job.outputs,...job.dynamicOutputs]
        );
    }

    recordArtifacts(artifacts: Artifact[])
    {
        for (let artifact of artifacts) this.db.recordArtifact(
            artifact.key, artifact.type, artifact.identity
        );
    }

    async getActualVersionInfo(
        artifacts: Artifact[],
        algorithms?: Record<string, string>
    ): Promise<Record<string, string|null>>
    {
        const actualVersions : Record<string, string|null> = {};
        await Promise.all(
            [...new Set(artifacts).values()].map(
                async (artifact) => {
                    if (!(await artifact.exists)) {
                        actualVersions[artifact.key] = null;
                    } else {
                        const algorithm = algorithms?.[artifact.key];
                        actualVersions[artifact.key] = algorithm
                            ? await artifact.getVersionUsing(algorithm)
                            : await artifact.version;
                    }
                }
            )
        );
        return actualVersions;
    }

    async isUpToDate(job: Job): Promise<boolean>
    {
        job.prepare();
        const rule = job.rule;
        if (rule.always) {
            return false;
        }
        const outputs = job.outputs;
        let outputRecords = this.db.listRuleTargets(rule.key);
        const recordedOutputs = outputRecords.map(output => this.artifactManager.get(output.identity));
        const recordedOutputsByKey : Record<string, Artifact> = {};
        for(let o of recordedOutputs) recordedOutputsByKey[o.key] = o;
        const allOutputs = [...new Set([...outputs, ...recordedOutputs]).values()];
        const allOutputsExistAndHaveBuildRecords =
            (await Promise.all(allOutputs.map(
                async artifact => {
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
                }
            ))).reduce((previous, current) => previous && current, true);
        if (!allOutputsExistAndHaveBuildRecords) {
            this.emit("incomplete.job", job, {
                details: "missing or unrecorded outputs (see prior messages)"
            });
            return false;
        }
        const dependencyArtifacts = [...new Set([...job.dependencies, ...job.recordedDependencies].map(d => d.artifact)).values()];
        const dependencyArtifactsByKey : Record<string, Artifact> = {};
        for(let d of dependencyArtifacts) dependencyArtifactsByKey[d.key] = d;

        // Get recorded version info first to extract algorithms
        const recordedSourceVersionsByOutput = await Promise.all(allOutputs.map(this.getRecordedVersionInfo));

        // Build algorithm maps: use recorded algorithm for comparison, track if different from current
        const sourceAlgorithms: Record<string, string> = {};
        const targetAlgorithms: Record<string, string> = {};
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
        for(let recordedVersionsInfo of recordedSourceVersionsByOutput) {
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
            for(let recordedSourceKey of recordedSourceKeys) {
                hadRecordedSources = true;
                if (
                    recordedVersionsInfo.sourceVersions[recordedSourceKey]
                    !== actualSourceVersions[recordedSourceKey]
                ) {
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

    async cleanOutputs(job: Job): Promise<void>
    {
        let outputRecords = this.db.listRuleTargets(job.rule.key);
        await Promise.all(outputRecords.map(async output => {
            const outputArtifact = this.artifactManager.get(output.identity);
            if ('function' === typeof outputArtifact.rm) {
                await outputArtifact.rm();
            }
        }));
    }

    getArtifactReliances(artifactKey: string) : Record<string, Record<string, Rule>>
    {
        const result : Record<string, Record<string, Rule>> = {};
        const artifactReliances = this.$whichRulesReliedOnArtifactVersion[artifactKey] || {};
        for(let version of Object.getOwnPropertyNames(artifactReliances))
        {
            result[version] = Object.assign({},artifactReliances[version]);
        }
        return result;
    }

    async recordReliance(rule: Rule, artifact: Artifact): Promise<void>
    {
        const reliancesByVersion : Record<string, Record<string, Rule>> = (
            this.$whichRulesReliedOnArtifactVersion[artifact.key]
            || (this.$whichRulesReliedOnArtifactVersion[artifact.key] = {})
        );

        const version = await artifact.version;

        const versionReliances = reliancesByVersion[version];
        if (versionReliances) {
            versionReliances[rule.key] = rule;
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
            this.$whichArtifactVersionDidRuleRelyOn[rule.key]
            || (this.$whichArtifactVersionDidRuleRelyOn[rule.key] = {})
        );
        reliancesByRule[artifact.key] = version;
    }

    getVersionReliedOn(rule: Rule, artifact: Artifact, required: boolean): string | undefined
    {
        const result = this.$whichArtifactVersionDidRuleRelyOn?.[rule.key]?.[artifact.key];
        if (!result && required) {
            throw new BuildError(
                `Internal error: unrecorded reliance info for rule ${rule.label} on ${artifact.identity} was requested`
            )
        }
        return result;
    }

    formatRelianceConflictMessage(
        relianceInfo: Build.ArtifactRelianceInfo,
        artifact : Artifact,
        version : string,
        rule : Rule
    )
    {
        let msg = (
            `Build conflict: ${rule.label} relied on ${artifact.label}@${version}, but previous reliances`
            +` on different versions were recorded:`
        );
        for (let previousVersion of Object.getOwnPropertyNames(relianceInfo))
        {
            msg += "\n" + `@${version} was relied upon by:`
            msg += "\n\t" + (
                Object.values(relianceInfo[previousVersion] || {})
                    .map(_ => _.label)
                    .join("\n\t")
            )
        }
        return msg;
    }

    requireJobForRuleKey(ruleKey: string) : Job{
        return this.getJobForRuleKey(ruleKey) || throwThe(new Error(
            `Internal error: unable to obtain build job for rule with key ${ruleKey}`
        ));
    }

    /**
     * Execute hash algorithm migration for tracked (source, target) pairs.
     * Computes new hashes for artifacts and batch-updates database records.
     */
    async executeHashMigration(): Promise<void> {
        if (this.$triplesNeedingMigration.length === 0) {
            return;
        }

        // Deduplicate pairs (source, target)
        const pairSet = new Set<string>();
        const pairs: Array<{source: string; target: string}> = [];
        for (let item of this.$triplesNeedingMigration) {
            const key = `${item.source}|${item.target}`;
            if (!pairSet.has(key)) {
                pairSet.add(key);
                pairs.push({source: item.source, target: item.target});
            }
        }

        console.log(`Migrating ${pairs.length} state record pairs to ${this.hashService.algorithm} algorithm...`);

        // Extract unique artifact keys
        const artifactKeys = new Set<string>();
        for (let pair of pairs) {
            artifactKeys.add(pair.source);
            artifactKeys.add(pair.target);
        }

        // Compute new hashes for each unique artifact
        const newHashes: Record<string, string> = {};
        await Promise.all(
            [...artifactKeys].map(async (key) => {
                const artifact = this.artifactManager.findByKey(key);
                if (artifact && await artifact.exists) {
                    newHashes[key] = await artifact.getVersionUsing(this.hashService.algorithm);
                }
            })
        );

        // Batch update database records
        await this.db.migrateStateRecords(
            pairs,
            newHashes,
            this.hashService.algorithm
        );

        console.log(`Migration complete: ${pairs.length} record pairs updated`);
    }
}