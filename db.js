import Database from "better-sqlite3";
const {Statement} = Database;
import sleep from "simple-async-sleep";
import fsi from "fs";
import path from "path";
import {performance} from "perf_hooks"

/**
 * @param {string} filename
 * @return {Database}
 */
function openDb(filename)
{
    let db
    try {
        fsi.mkdirSync(path.dirname(filename),{mode: 0o755, recursive:true});
        db = new Database(filename);
    }
    catch(e) {
        throw e;
    }
    ensureSchema(db);
    db.exec("PRAGMA journal_mode = MEMORY");
    db.exec("PRAGMA synchronous = OFF");
    return db;
}

function ensureSchema(db)
{
    db.exec(
        `CREATE TABLE IF NOT EXISTS states (
            target CHAR(32),
            target_version CHAR(32),
            rule CHAR(32),
            source CHAR(32),
            source_version CHAR(32)
        )`
    );
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS target_version_source ON states(target, target_version, source)`);
    db.exec(`CREATE INDEX IF NOT EXISTS source ON states(source)`)
    db.exec(`CREATE INDEX IF NOT EXISTS target ON states(target)`)
    db.exec(`CREATE INDEX IF NOT EXISTS rule ON states(rule)`);
    db.exec(
        `CREATE TABLE IF NOT EXISTS artifacts (
            key CHAR(32) PRIMARY KEY,
            artifact_type VARCHAR(96),
            identity VARCHAR(1024)
        )`
    );
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS artifact_type_identity ON artifacts(artifact_type, identity)`);
    db.exec(
        'CREATE TRIGGER IF NOT EXISTS multiple_generating_rules_check ' +
        'BEFORE INSERT ON states ' +
        'BEGIN\n' +
        '    SELECT RAISE(FAIL, "only one rule can create a particular version of a target")\n' +
        '    FROM states\n' +
        '    WHERE target = NEW.target\n' +
        '        AND target_version = NEW.target_version\n' +
        '        AND rule != NEW.rule;\n' +
        'END\n'
    );
}

const sql = {
    has:
        'SELECT COUNT(*) AS c FROM states WHERE target = @target',
    hasVersion:
        'SELECT COUNT(*) AS c FROM states WHERE target = @target AND target_version = @version',
    listVersions:
        'SELECT target_version AS version FROM states WHERE target = @target',
    listVersionSources:
        'SELECT source, source_version AS version FROM states WHERE target = @target AND target_version = @version',
    record:
        'INSERT INTO states (target, target_version, rule, source, source_version)'
        + ' VALUES (@target, @targetVersion, @rule, @source, @sourceVersion)'
        + ' ON CONFLICT(target,target_version,source) DO'
        + ' UPDATE SET source_version = @sourceVersion',
    retract:
        'DELETE FROM states WHERE target = @target AND target_version = @version',
    retractTarget:
        'DELETE FROM states WHERE target = @target',
    retractRule:
        'DELETE FROM states WHERE rule = @rule',
    listRuleSources:
        'SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity' +
        ' FROM states' +
        ' INNER JOIN artifacts' +
        ' ON artifacts.key = states.source' +
        ' WHERE states.rule = @rule',
    listRuleTargets:
        'SELECT DISTINCT artifacts.key, artifacts.artifact_type as type, artifacts.identity' +
        ' FROM states' +
        ' INNER JOIN artifacts' +
        ' ON artifacts.key = states.target' +
        ' WHERE states.rule = @rule',
    getProducingRule:
        `SELECT DISTINCT rule FROM states WHERE target=@target AND target_version=@version`,
    recordArtifact:
        'INSERT OR IGNORE INTO artifacts (key, artifact_type, identity)'
        + ' VALUES (@key, @type, @identity)',
    getArtifact:
        'SELECT key, artifact_type AS type, identity FROM artifacts WHERE key = @key',
    pruneArtifacts:
        'DELETE FROM artifacts'
        +' WHERE NOT EXISTS ('
        +'    SELECT 1 FROM states WHERE states.source = artifacts.key OR states.target = artifacts.key'
        +' )'
}

class Statements
{
    /** @type {Database} */
    __db;

    __prepared = {};

    /** @param {Database} db */
    constructor(db)
    {
        this.__db=db;
    }
}

for (let queryName of Object.getOwnPropertyNames(sql)) {
    Object.defineProperty(Statements.prototype, queryName, {
        get: function() {
            // noinspection JSUnresolvedVariable
            return (
                this.__db[queryName]
                || (this.__prepared[queryName] = this.__db.prepare(sql[queryName])
                )
            );
        }
    })
}

export const Db = class Db  {

    /** @type {Database} */
    #db;

    /** @type {Statements} */
    #stmt;

    constructor(dbFilePath)
    {
        this.dbFilePath = dbFilePath;
        this.#db = null;
        this.#stmt = null;
        this.queryCount = 0;
        this.queryTime = 0;
    }

    /** @return {Database} */
    get db()
    {
        if (!this.#db) {
            this.#db = openDb(this.dbFilePath);
            this.#stmt = new Statements(this.#db);
        }
        return this.#db;
    }

    /** @return {Statements} */
    get stmt()
    {
        if (!this.#db) {
            this.#db = openDb(this.dbFilePath);
            this.#stmt = new Statements(this.#db);
        }
        return this.#stmt;
    }

    has(targetId)
    {
        const queryResult = this.get('has', {
            target: targetId
        });
        // noinspection JSUnresolvedVariable
        return queryResult.c > 0;
    }
    hasVersion(targetId, version)
    {
        const countResponse = this.get('hasVersion',{
            target: targetId,
            version
        });
        // noinspection JSUnresolvedVariable
        return countResponse.c > 0;
    }
    listVersions(targetId)
    {
        return this.all('listVersions',{
            target: targetId
        });
    }
    listVersionSources(targetId, version)
    {
        return this.all('listVersionSources',{
            target: targetId,
            version
        });
    }

    /**
     *
     * @param {string} targetId
     * @param {string} targetVersion
     * @param {string} ruleKey
     * @param {string} sourceId
     * @param {string} sourceVersion
     * @return {*}
     */
    record(targetId, targetVersion, ruleKey, sourceId, sourceVersion)
    {
        return this.run('record', {
            target: targetId,
            targetVersion,
            rule: ruleKey,
            source: sourceId,
            sourceVersion
        });
    }
    retract(targetId, targetVersion)
    {
        return this.run('retract', {
            target: targetId,
            version: targetVersion
        });
    }
    retractTarget(targetId)
    {
        return this.run('retractTarget',{
            target: targetId
        });
    }
    retractRule(ruleKey)
    {
        return this.run('retractRule',{
            rule: ruleKey
        });
    }

    /**
     * @param {string} ruleKey
     * @return {Object}
     */
    listRuleSources(ruleKey)
    {
        return this.all('listRuleSources', {
            rule: ruleKey
        });
    }

    /**
     * @param {string} ruleKey
     * @return {object[]}
     */
    listRuleTargets(ruleKey)
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
    getProducingRule(target, version)
    {
        /** @type {object|null} */
        const result = this.get('getProducingRule',{target, version});
        return result && result.rule;
    }

    recordArtifact(key, type, identity)
    {
        return this.run('recordArtifact', {key, type, identity});
    }

    /**
     * @param key
     * @return {Promise<Db~ArtifactRecord|null>}
     */
    getArtifact(key)
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

    query(verb, statementKey, data)
    {
        const statements = this.stmt;
        const prepared = statements[statementKey];
        let result, start;
        try {
            start = performance.now();
            result = prepared[verb](data);
        }
        catch(e) {
            throw e;
        }
        finally {
            this.queryTime += performance.now()-start;
            ++this.queryCount;
        }
        return result;
    }

    /**
     * @param statementKey
     * @param data
     * @return {(Object|null)}
     */
    get(statementKey, data)
    {
        return this.query('get', statementKey, data);
    }

    run(statementKey, data)
    {
        return this.query('run', statementKey, data);
    }

    /**
     * @param statementKey
     * @param data
     * @return {Object[]}
     */
    all(statementKey, data)
    {
        return this.query('all', statementKey, data);
    }
}

/**
 * @typedef {Object} Db~ArtifactRecord
 * @property {string} key
 * @property {string} type
 * @property {string} identity
 */
