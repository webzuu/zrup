var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Statements_getter, _Db_db, _Db_stmt;
import { sleep } from "sleepjs";
import fsi from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BetterSqlite3 from "better-sqlite3";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
function openDb(filename) {
    let db;
    try {
        fsi.mkdirSync(path.dirname(filename), { mode: 0o755, recursive: true });
        db = new BetterSqlite3(filename);
    }
    catch (e) {
        throw e;
    }
    db.exec(fsi.readFileSync(path.join(__dirname, 'sql/schema.sql'), 'utf-8'));
    db.exec("PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;");
    return db;
}
const queries = {
    has: 'SELECT COUNT(*) AS c FROM states WHERE target = @target',
    hasVersion: 'SELECT COUNT(*) AS c FROM states WHERE target = @target AND target_version = @version',
    listVersions: 'SELECT target_version AS version FROM states WHERE target = @target',
    listVersionSources: 'SELECT source, source_version AS version FROM states WHERE target = @target AND target_version = @version',
    record: `
        INSERT INTO states (target, target_version, rule, source, source_version)
        VALUES (@target, @targetVersion, @rule, @source, @sourceVersion)
        ON CONFLICT(target,target_version,source) DO UPDATE SET source_version = @sourceVersion
    `,
    retract: 'DELETE FROM states WHERE target = @target AND target_version = @version',
    retractTarget: 'DELETE FROM states WHERE target = @target',
    retractRule: 'DELETE FROM states WHERE rule = @rule',
    listRuleSources: `
        SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity
        FROM states
            INNER JOIN artifacts ON artifacts.key = states.source
        WHERE states.rule = @rule
    `,
    listRuleTargets: `
        SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity
        FROM states
            INNER JOIN artifacts ON artifacts.key = states.target
        WHERE states.rule = @rule
    `,
    getProducingRule: `SELECT DISTINCT rule FROM states WHERE target=@target AND target_version=@version`,
    recordArtifact: `
        INSERT OR IGNORE INTO artifacts (key, artifact_type, identity)
        VALUES (@key, @type, @identity)
    `,
    getArtifact: 'SELECT key, artifact_type AS type, identity FROM artifacts WHERE key = @key',
    pruneArtifacts: `
        DELETE FROM artifacts
        WHERE NOT EXISTS (
            SELECT 1 FROM states WHERE states.source = artifacts.key OR states.target = artifacts.key
        )
    `
};
function __statementGetter(key) {
    return (this.__prepared[key]
        || (this.__prepared[key] = this.__db.prepare(queries[key])));
}
class Statements {
    constructor(db) {
        this.__prepared = {};
        _Statements_getter.set(this, void 0);
        this.__db = db;
        __classPrivateFieldSet(this, _Statements_getter, __statementGetter.bind(this), "f");
    }
    get has() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "has"); }
    get hasVersion() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "hasVersion"); }
    get listVersions() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "listVersions"); }
    get listVersionSources() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "listVersionSources"); }
    get record() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "record"); }
    get retract() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "retract"); }
    get retractTarget() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "retractTarget"); }
    get retractRule() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "retractRule"); }
    get listRuleSources() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "listRuleSources"); }
    get listRuleTargets() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "listRuleTargets"); }
    get getProducingRule() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "getProducingRule"); }
    get recordArtifact() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "recordArtifact"); }
    get getArtifact() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "getArtifact"); }
    get pruneArtifacts() { return __classPrivateFieldGet(this, _Statements_getter, "f").call(this, "pruneArtifacts"); }
}
_Statements_getter = new WeakMap();
export class Db {
    constructor(dbFilePath) {
        _Db_db.set(this, void 0);
        _Db_stmt.set(this, void 0);
        this.dbFilePath = dbFilePath;
        __classPrivateFieldSet(this, _Db_db, null, "f");
        __classPrivateFieldSet(this, _Db_stmt, null, "f");
        this.queryCount = 0;
        this.queryTime = 0;
    }
    get db() {
        if (!__classPrivateFieldGet(this, _Db_db, "f")) {
            __classPrivateFieldSet(this, _Db_db, openDb(this.dbFilePath), "f");
        }
        return __classPrivateFieldGet(this, _Db_db, "f");
    }
    get stmt() {
        if (!__classPrivateFieldGet(this, _Db_stmt, "f")) {
            __classPrivateFieldSet(this, _Db_stmt, new Statements(this.db), "f");
        }
        return __classPrivateFieldGet(this, _Db_stmt, "f");
    }
    has(targetId) {
        const queryResult = this.get('has', {
            target: targetId
        });
        return queryResult.c > 0;
    }
    hasVersion(targetId, version) {
        const countResponse = this.get('hasVersion', {
            target: targetId,
            version
        });
        // noinspection JSUnresolvedVariable
        return countResponse.c > 0;
    }
    listVersions(targetId) {
        return this.all('listVersions', {
            target: targetId
        });
    }
    listVersionSources(targetId, version) {
        return this.all('listVersionSources', {
            target: targetId,
            version
        });
    }
    record(targetId, targetVersion, ruleKey, sourceId, sourceVersion) {
        return this.run('record', {
            target: targetId,
            targetVersion,
            rule: ruleKey,
            source: sourceId,
            sourceVersion
        });
    }
    retract(targetId, targetVersion) {
        return this.run('retract', {
            target: targetId,
            version: targetVersion
        });
    }
    retractTarget(targetId) {
        return this.run('retractTarget', {
            target: targetId
        });
    }
    retractRule(ruleKey) {
        return this.run('retractRule', {
            rule: ruleKey
        });
    }
    listRuleSources(ruleKey) {
        return this.all('listRuleSources', {
            rule: ruleKey
        });
    }
    listRuleTargets(ruleKey) {
        return this.all('listRuleTargets', {
            rule: ruleKey
        });
    }
    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    getProducingRule(target, version) {
        const result = this.get('getProducingRule', { target, version });
        return result && result.rule;
    }
    recordArtifact(key, type, identity) {
        return this.run('recordArtifact', { key, type, identity });
    }
    getArtifact(key) {
        return this.get('getArtifact', { key }) || null;
    }
    pruneArtifacts() {
        this.run('pruneArtifacts', {});
    }
    async close() {
        if (!__classPrivateFieldGet(this, _Db_db, "f"))
            return;
        const dbObj = __classPrivateFieldGet(this, _Db_db, "f");
        let success = false;
        for (let i = 5; i; --i) {
            try {
                await dbObj.close();
                success = true;
            }
            catch (e) {
                await sleep(1000);
            }
            if (success)
                break;
        }
        //last chance to throw the error
        if (!success) {
            await dbObj.close();
        }
        __classPrivateFieldSet(this, _Db_db, null, "f");
        __classPrivateFieldSet(this, _Db_stmt, null, "f");
    }
    query(verb, statementKey, data) {
        const statements = this.stmt;
        const prepared = statements[statementKey];
        let result, start;
        try {
            start = performance.now();
            result = prepared[verb](data);
        }
        catch (e) {
            throw e;
        }
        finally {
            // @ts-ignore
            this.queryTime += performance.now() - start;
            ++this.queryCount;
        }
        return result;
    }
    get(statementKey, data) {
        return this.query('get', statementKey, data);
    }
    run(statementKey, data) {
        return this.query('run', statementKey, data);
    }
    all(statementKey, data) {
        return this.query('all', statementKey, data);
    }
}
_Db_db = new WeakMap(), _Db_stmt = new WeakMap();
//# sourceMappingURL=db.js.map