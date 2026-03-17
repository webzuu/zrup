import EventEmitter from "events";
import { JobSet } from "./build/job-set.js";
import { Job } from "./build/job.js";
import { Db } from "./db.js";
import { Artifact, ArtifactManager } from "./graph/artifact.js";
import { Dependency } from "./graph/dependency.js";
import { Graph } from "./graph.js";
import { Rule } from "./graph/rule.js";
import { Transaction } from "better-sqlite3";
import { HashService } from "./hash/hash-service.js";
export declare namespace Build {
    interface RecordedVersionInfo {
        target: string;
        version: string | null;
        targetAlgorithm: string | null;
        sourceVersions: Record<string, string>;
        sourceAlgorithms: Record<string, string | null>;
    }
    interface Index {
        rule: {
            job: Map<string, Job>;
            jobSet: Map<string, JobSet>;
        };
    }
    type RuleIndex = Record<string, Rule>;
    type ArtifactRelianceInfo = Record<string, RuleIndex>;
}
/**
 * Class that manages transient information necessary to fulfill a particular build request.
 */
export declare class Build extends EventEmitter {
    readonly graph: Graph;
    readonly db: Db;
    readonly artifactManager: ArtifactManager;
    readonly hashService: HashService;
    private $whichRulesReliedOnArtifactVersion;
    private $whichArtifactVersionDidRuleRelyOn;
    private $triplesNeedingMigration;
    index: Build.Index;
    constructor(graph: Graph, db: Db, artifactManager: ArtifactManager, hashService: HashService);
    getJobFor(dependency: Dependency, require?: boolean): Promise<Job | null>;
    getJobSetFor(dependency: Dependency, require?: boolean): Promise<(JobSet | null)>;
    getJobForArtifact(artifact: Artifact, require?: boolean): Promise<Job | null>;
    getJobSetForArtifact(artifact: Artifact, require?: boolean): Promise<(JobSet | null)>;
    getJobForRuleKey(ruleKey: string | null): Job | null;
    getJobSetForRuleKey(ruleKey: string | null): JobSet | null;
    getAlsoJobSetForRuleKey(ruleKey: string | null): JobSet | null;
    getRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<(string | null)>;
    requireRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<string>;
    getRecordedVersionInfo: (output: Artifact) => Promise<Build.RecordedVersionInfo>;
    recordVersionInfo(job: Job, dependencies: Dependency[], outputs: Artifact[]): Promise<void>;
    createRecordVersionInfoTransaction(outputInfos: {
        output: Artifact;
        version: string;
    }[], depInfos: {
        dependency: Dependency;
        version: string;
    }[], job: Job, algorithm: string): Transaction;
    recordStandardVersionInfo(job: Job): Promise<void>;
    recordArtifacts(artifacts: Artifact[]): void;
    getActualVersionInfo(artifacts: Artifact[], algorithms?: Record<string, string>): Promise<Record<string, string | null>>;
    isUpToDate(job: Job): Promise<boolean>;
    cleanOutputs(job: Job): Promise<void>;
    getArtifactReliances(artifactKey: string): Record<string, Record<string, Rule>>;
    recordReliance(rule: Rule, artifact: Artifact): Promise<void>;
    getVersionReliedOn(rule: Rule, artifact: Artifact, required: boolean): string | undefined;
    formatRelianceConflictMessage(relianceInfo: Build.ArtifactRelianceInfo, artifact: Artifact, version: string, rule: Rule): string;
    requireJobForRuleKey(ruleKey: string): Job;
    /**
     * Execute hash algorithm migration for tracked (source, target) pairs.
     * Computes new hashes for artifacts and batch-updates database records.
     */
    executeHashMigration(): Promise<void>;
}
//# sourceMappingURL=build.d.ts.map