import BetterSqlite3 from "better-sqlite3";
import type { Database, Statement } from "better-sqlite3";
declare const queries: {
    has: string;
    hasVersion: string;
    listVersions: string;
    listVersionSources: string;
    record: string;
    retract: string;
    retractTarget: string;
    retractRule: string;
    listRuleSources: string;
    listRuleTargets: string;
    getProducingRule: string;
    recordArtifact: string;
    getArtifact: string;
    pruneArtifacts: string;
};
export type StatementKey = keyof typeof queries;
export type VersionRecord = {
    version: string;
};
export type VersionSourcesRecord = {
    source: string;
    version: string;
    algorithm: string | null;
    target_algorithm: string | null;
};
export type RuleSourcesRecord = {
    key: string;
    type: string;
    identity: string;
};
export type RuleTargetsRecord = {
    key: string;
    type: string;
    identity: string;
};
export type ProducingRuleRecord = {
    rule: string;
};
export type ArtifactRecord = {
    key: string;
    type: string;
    identity: string;
};
export type StatementVerb = "get" | "run" | "all";
declare class Statements implements Record<StatementKey, Statement> {
    __db: Database;
    __prepared: {
        [k: string]: Statement;
    };
    private readonly $getter;
    constructor(db: Database);
    get has(): Statement;
    get hasVersion(): Statement;
    get listVersions(): Statement;
    get listVersionSources(): Statement;
    get record(): Statement;
    get retract(): Statement;
    get retractTarget(): Statement;
    get retractRule(): Statement;
    get listRuleSources(): Statement;
    get listRuleTargets(): Statement;
    get getProducingRule(): Statement;
    get recordArtifact(): Statement;
    get getArtifact(): Statement;
    get pruneArtifacts(): Statement;
}
export declare class Db {
    #private;
    dbFilePath: string;
    queryCount: number;
    queryTime: number;
    constructor(dbFilePath: string);
    getDb(): Promise<Database>;
    get db(): Database;
    getStmt(): Promise<Statements>;
    get stmt(): Statements;
    has(targetId: string): boolean;
    hasVersion(targetId: string, version: string): boolean;
    listVersions(targetId: string): VersionRecord[];
    listVersionSources(targetId: string, version: string): VersionSourcesRecord[];
    record(targetId: string, targetVersion: string, targetAlgorithm: string, ruleKey: string, sourceId: string, sourceVersion: string, sourceAlgorithm: string): BetterSqlite3.RunResult;
    retract(targetId: string, targetVersion: string): BetterSqlite3.RunResult;
    retractTarget(targetId: string): BetterSqlite3.RunResult;
    retractRule(ruleKey: string): BetterSqlite3.RunResult;
    listRuleSources(ruleKey: string): RuleSourcesRecord[];
    listRuleTargets(ruleKey: string): RuleTargetsRecord[];
    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    getProducingRule(target: string, version: string): string | undefined;
    recordArtifact(key: string, type: string, identity: string): BetterSqlite3.RunResult;
    getArtifact(key: string): ArtifactRecord | null;
    pruneArtifacts(): void;
    /**
     * Migrate state records to use new hash algorithm.
     * Updates version and algorithm columns for all states matching (source, target) pairs.
     * Rule is queried from states table.
     */
    migrateStateRecords(pairs: Array<{
        source: string;
        target: string;
    }>, newHashes: Record<string, string>, newAlgorithm: string): Promise<void>;
    close(): Promise<void>;
    query<T>(verb: StatementVerb, statementKey: StatementKey, data: object): T;
    get<T>(statementKey: StatementKey, data: object): T | undefined;
    run(statementKey: StatementKey, data: object): BetterSqlite3.RunResult;
    all<T>(statementKey: StatementKey, data: object): T[];
}
export {};
//# sourceMappingURL=db.d.ts.map