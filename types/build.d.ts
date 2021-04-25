/// <reference types="node" />
import EventEmitter from "events";
import { JobSet } from "./build/job-set.js";
import { Job } from "./build/job.js";
import { Db } from "./db.js";
import { Artifact, ArtifactManager } from "./graph/artifact.js";
import { Dependency } from "./graph/dependency.js";
import { Graph } from "./graph.js";
import { Rule } from "./graph/rule.js";
import { Transaction } from "better-sqlite3";
export declare namespace Build {
    interface RecordedVersionInfo {
        target: string;
        version: string | null;
        sourceVersions: Record<string, string>;
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
    #private;
    readonly graph: Graph;
    readonly db: Db;
    readonly artifactManager: ArtifactManager;
    index: Build.Index;
    constructor(graph: Graph, db: Db, artifactManager: ArtifactManager);
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
    }[], job: Job): Transaction;
    recordStandardVersionInfo(job: Job): Promise<void>;
    recordArtifacts(artifacts: Artifact[]): void;
    getActualVersionInfo(artifacts: Artifact[]): Promise<Record<string, string | null>>;
    isUpToDate(job: Job): Promise<boolean>;
    cleanOutputs(job: Job): Promise<void>;
    getArtifactReliances(artifactKey: string): Record<string, Record<string, Rule>>;
    recordReliance(rule: Rule, artifact: Artifact): Promise<void>;
    getVersionReliedOn(rule: Rule, artifact: Artifact, required: boolean): string | undefined;
    formatRelianceConflictMessage(relianceInfo: Build.ArtifactRelianceInfo, artifact: Artifact, version: string, rule: Rule): string;
    requireJobForRuleKey(ruleKey: string): Job;
}
//# sourceMappingURL=build.d.ts.map