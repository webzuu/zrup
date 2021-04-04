import {sleep} from "sleepjs";
import fsi from "fs";
import path from "path";
import {performance} from "perf_hooks"

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import BetterSqlite3, {Database, Statement} from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



function openDb(filename: string) : Database
{
    let db: Database;
    try {
        fsi.mkdirSync(path.dirname(filename),{mode: 0o755, recursive:true});
        db = new BetterSqlite3(filename);
    }
    catch(e) {
        throw e;
    }
    db.exec(fsi.readFileSync(path.join(__dirname, 'sql/schema.sql'), 'utf-8'));
    db.exec("PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;");
    return db;
}

export type StatementKey =
    "has"
    | "hasVersion" | "listVersions" | "listVersionSources"
    | "record" | "retract" | "retractTarget" | "retractRule"
    | "listRuleSources" | "listRuleTargets" | "getProducingRule"
    | "recordArtifact" | "getArtifact" | "pruneArtifacts"
;

const queries : {[k: string]: string}= {};
queries.has =
    'SELECT COUNT(*) AS c FROM states WHERE target = @target';
queries.hasVersion =
    'SELECT COUNT(*) AS c FROM states WHERE target = @target AND target_version = @version';

export type VersionRecord = {version: string};
queries.listVersions =
    'SELECT target_version AS version FROM states WHERE target = @target';

export type VersionSourcesRecord = { source: string, version: string };
queries.listVersionSources =
    'SELECT source, source_version AS version FROM states WHERE target = @target AND target_version = @version';

queries.record = `
    INSERT INTO states (target, target_version, rule, source, source_version)
    VALUES (@target, @targetVersion, @rule, @source, @sourceVersion)
    ON CONFLICT(target,target_version,source) DO UPDATE SET source_version = @sourceVersion
`;
queries.retract =
    'DELETE FROM states WHERE target = @target AND target_version = @version';
queries.retractTarget =
    'DELETE FROM states WHERE target = @target';
queries.retractRule =
    'DELETE FROM states WHERE rule = @rule';

export type RuleSourcesRecord = {key: string, type: string, identity: string};
queries.listRuleSources = `
    SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity
    FROM states
        INNER JOIN artifacts ON artifacts.key = states.source
    WHERE states.rule = @rule
`;

export type RuleTargetsRecord = {key: string, type: string, identity: string};
queries.listRuleTargets= `
    SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity
    FROM states
        INNER JOIN artifacts ON artifacts.key = states.target
    WHERE states.rule = @rule
`;

export type ProducingRuleRecord = {rule: string};
queries.getProducingRule =
    `SELECT DISTINCT rule FROM states WHERE target=@target AND target_version=@version`;

queries.recordArtifact = `
    INSERT OR IGNORE INTO artifacts (key, artifact_type, identity)
    VALUES (@key, @type, @identity)
`;

export type ArtifactRecord = {key: string, type: string, identity: string};
queries.getArtifact = 'SELECT key, artifact_type AS type, identity FROM artifacts WHERE key = @key';

queries.pruneArtifacts =`
    DELETE FROM artifacts
    WHERE NOT EXISTS (
        SELECT 1 FROM states WHERE states.source = artifacts.key OR states.target = artifacts.key
    )
`;

function __statementGetter(this: Statements, key: StatementKey) : Statement
{
    return (
        this.__prepared[key]
        || (this.__prepared[key] = this.__db.prepare(queries[key]))
    );
}

export type StatementVerb = "get" | "run" | "all";

class Statements implements Record<StatementKey, Statement>
{
    __db : Database;
    __prepared : {[k:string] : Statement} = {};
    readonly #getter : (key: StatementKey) => any;

    constructor(db : Database)
    {
        this.__db=db;
        this.#getter = __statementGetter.bind(this);
    }

    get has() : Statement { return this.#getter("has"); }
    get hasVersion() : Statement { return this.#getter("hasVersion"); }
    get listVersions() : Statement { return this.#getter("listVersions"); }
    get listVersionSources() : Statement { return this.#getter("listVersionSources"); }
    get record() : Statement { return this.#getter("record"); }
    get retract() : Statement { return this.#getter("retract"); }
    get retractTarget() : Statement { return this.#getter("retractTarget"); }
    get retractRule() : Statement { return this.#getter("retractRule"); }
    get listRuleSources() : Statement { return this.#getter("listRuleSources"); }
    get listRuleTargets() : Statement { return this.#getter("listRuleTargets"); }
    get getProducingRule() : Statement { return this.#getter("getProducingRule"); }
    get recordArtifact() : Statement { return this.#getter("recordArtifact"); }
    get getArtifact() : Statement { return this.#getter("getArtifact"); }
    get pruneArtifacts() : Statement { return this.#getter("pruneArtifacts"); }
}

export class Db {

    #db : Database|null;
    #stmt : Statements|null;

    public dbFilePath: string;
    public queryCount: number;
    public queryTime: number;

    constructor(dbFilePath : string)
    {
        this.dbFilePath = dbFilePath;
        this.#db = null;
        this.#stmt = null;
        this.queryCount = 0;
        this.queryTime = 0;
    }

    get db() : Database
    {
        if (!this.#db) {
            this.#db = openDb(this.dbFilePath);
        }
        return this.#db;
    }

    get stmt() : Statements
    {
        if (!this.#stmt) {
            this.#stmt = new Statements(this.db);
        }
        return this.#stmt;
    }

    has(targetId: string) : boolean
    {
        const queryResult = this.get('has', {
            target: targetId
        });
        return queryResult.c > 0;
    }

    hasVersion(targetId: string, version : string) : boolean
    {
        const countResponse = this.get('hasVersion',{
            target: targetId,
            version
        });
        // noinspection JSUnresolvedVariable
        return countResponse.c > 0;
    }

    listVersions(targetId: string) : VersionRecord[]
    {
        return this.all('listVersions',{
            target: targetId
        });
    }

    listVersionSources(targetId: string, version: string) : VersionSourcesRecord[]
    {
        return this.all('listVersionSources',{
            target: targetId,
            version
        });
    }

    record(targetId: string, targetVersion: string, ruleKey: string, sourceId: string, sourceVersion: string)
    {
        return this.run('record', {
            target: targetId,
            targetVersion,
            rule: ruleKey,
            source: sourceId,
            sourceVersion
        });
    }

    retract(targetId: string, targetVersion: string)
    {
        return this.run('retract', {
            target: targetId,
            version: targetVersion
        });
    }

    retractTarget(targetId: string)
    {
        return this.run('retractTarget',{
            target: targetId
        });
    }

    retractRule(ruleKey: string)
    {
        return this.run('retractRule',{
            rule: ruleKey
        });
    }

    listRuleSources(ruleKey: string) : RuleSourcesRecord[]
    {
        return this.all('listRuleSources', {
            rule: ruleKey
        });
    }

    listRuleTargets(ruleKey: string) : RuleTargetsRecord[]
    {
        return this.all('listRuleTargets',{
            rule: ruleKey
        });
    }

    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    getProducingRule(target: string, version: string) : string|null
    {
        const result : ProducingRuleRecord = this.get('getProducingRule',{target, version});
        return result && result.rule;
    }

    recordArtifact(key: string, type: string, identity: string)
    {
        return this.run('recordArtifact', {key, type, identity});
    }

    getArtifact(key:string) : ArtifactRecord
    {
        return this.get('getArtifact',{key}) || null;
    }

    pruneArtifacts() {
        this.run('pruneArtifacts',{});
    }

    async close() {
        if (!this.#db) return;
        const dbObj = this.#db;
        let success=false;
        for(let i=5; i; --i) {
            try {
                await dbObj.close();
                success=true;
            }
            catch(e) {
                await sleep(1000);
            }
            if (success) break;
        }
        //last chance to throw the error
        if (!success) {
            await dbObj.close();
        }
        this.#db = null;
        this.#stmt = null;
    }

    query(verb: StatementVerb, statementKey: StatementKey, data : object)
    {
        const statements = this.stmt;
        const prepared = statements[statementKey];
        let result, start : number;
        try {
            start = performance.now();
            result = prepared[verb](data);
        }
        catch(e) {
            throw e;
        }
        finally {
            // @ts-ignore
            this.queryTime += performance.now()-start;
            ++this.queryCount;
        }
        return result;
    }

    get(statementKey: StatementKey, data : object)
    {
        return this.query('get', statementKey, data);
    }

    run(statementKey : StatementKey, data : object)
    {
        return this.query('run', statementKey, data);
    }

    all(statementKey : StatementKey, data : object)
    {
        return this.query('all', statementKey, data);
    }
}
