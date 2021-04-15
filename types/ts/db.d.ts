import { Database, Statement } from "better-sqlite3";
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
export declare type StatementKey = keyof typeof queries;
export declare type VersionRecord = {
    version: string;
};
export declare type VersionSourcesRecord = {
    source: string;
    version: string;
};
export declare type RuleSourcesRecord = {
    key: string;
    type: string;
    identity: string;
};
export declare type RuleTargetsRecord = {
    key: string;
    type: string;
    identity: string;
};
export declare type ProducingRuleRecord = {
    rule: string;
};
export declare type ArtifactRecord = {
    key: string;
    type: string;
    identity: string;
};
export declare type StatementVerb = "get" | "run" | "all";
declare class Statements implements Record<StatementKey, Statement> {
    #private;
    __db: Database;
    __prepared: {
        [k: string]: Statement;
    };
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
    get db(): Database;
    get stmt(): Statements;
    has(targetId: string): boolean;
    hasVersion(targetId: string, version: string): boolean;
    listVersions(targetId: string): VersionRecord[];
    listVersionSources(targetId: string, version: string): VersionSourcesRecord[];
    record(targetId: string, targetVersion: string, ruleKey: string, sourceId: string, sourceVersion: string): any;
    retract(targetId: string, targetVersion: string): any;
    retractTarget(targetId: string): any;
    retractRule(ruleKey: string): any;
    listRuleSources(ruleKey: string): RuleSourcesRecord[];
    listRuleTargets(ruleKey: string): RuleTargetsRecord[];
    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    getProducingRule(target: string, version: string): string | null;
    recordArtifact(key: string, type: string, identity: string): any;
    getArtifact(key: string): ArtifactRecord;
    pruneArtifacts(): void;
    close(): Promise<void>;
    query(verb: StatementVerb, statementKey: StatementKey, data: object): any;
    get(statementKey: StatementKey, data: object): any;
    run(statementKey: StatementKey, data: object): any;
    all(statementKey: StatementKey, data: object): any;
}
export {};
//# sourceMappingURL=db.d.ts.map