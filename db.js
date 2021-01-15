import sqlite3 from "sqlite3";
import { open, Database, Statement } from "sqlite";
import sleep from "simple-async-sleep";
import fs from "fs/promises";
import path from "path";
import {performance} from "perf_hooks"

/**
 * @typedef {Promise<Database<sqlite3.Database,sqlite3.Statement>>} DbPromise
 */

async function openDb(filename)
{
    let db
    try {
        await fs.mkdir(path.dirname(filename),{mode: 0o755, recursive:true});
        db = await open({ filename, driver: sqlite3.Database });
    }
    catch(e) {
        throw e;
    }
    await db.exec("PRAGMA journal_mode = WAL");
    await ensureSchema(db);
    return db;
}

async function ensureSchema(db)
{
    await db.exec(
        `CREATE TABLE IF NOT EXISTS states (
            target CHAR(32),
            target_version CHAR(32),
            rule CHAR(32),
            source CHAR(32),
            source_version CHAR(32)
        )`
    );
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS target_version_source ON states(target, target_version, source)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS source ON states(source)`)
    await db.exec(`CREATE INDEX IF NOT EXISTS target ON states(target)`)
    await db.exec(`CREATE INDEX IF NOT EXISTS rule ON states(rule)`);
    await db.exec(
        `CREATE TABLE IF NOT EXISTS artifacts (
            key CHAR(32) PRIMARY KEY,
            artifact_type VARCHAR(96),
            identity VARCHAR(1024)
        )`
    );
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS artifact_type_identity ON artifacts(artifact_type, identity)`);
    await db.exec(
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

/**
 *
 * @param {Database} db
 * @return {Promise<object>}
 */
async function prepareStatements(db)
{
    const statements = {
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
    };
    await Promise.all(Object.getOwnPropertyNames(statements).map(async stmt => {
         statements[stmt] = await db.prepare(statements[stmt]);
    }));
    return statements;
}

export class Db {

    /** @type {DbPromise} */
    #db;

    /** @type {Promise<Object>} */
    #stmt;

    constructor(dbFilePath)
    {
        this.dbFilePath = dbFilePath;
        this.#db = null;
        this.#stmt = null;
        this.queryCount = 0;
        this.queryTime = 0;
    }

    /**
     * @return {Promise<Database>}
     */
    get db()
    {
        const asyncGetter = async _ => {
            if (!this.#db) {
                this.#db = openDb(this.dbFilePath);
            }
            return (await this.#db);
        }
        return asyncGetter();
    }

    get stmt()
    {
        const asyncGetter = async () => {
            const db = await this.db;
            if (!this.#stmt) {
                this.#stmt = prepareStatements(db);
            }
            return (await this.#stmt);
        }
        return asyncGetter();
    }

    async has(targetId)
    {
        const queryResult = await this.get('has', {
            '@target': targetId
        });
        // noinspection JSUnresolvedVariable
        return queryResult.c > 0;
    }
    async hasVersion(targetId, version)
    {
        const countResponse = await this.get('hasVersion',{
            '@target': targetId,
            '@version': version
        });
        // noinspection JSUnresolvedVariable
        return countResponse.c > 0;
    }
    async listVersions(targetId)
    {
        return await this.all('listVersions',{
            '@target': targetId
        });
    }
    async listVersionSources(targetId, version)
    {
        return await this.all('listVersionSources',{
            '@target': targetId,
            '@version': version
        });
    }

    /**
     *
     * @param {string} targetId
     * @param {string} targetVersion
     * @param {string} ruleKey
     * @param {string} sourceId
     * @param {string} sourceVersion
     * @return {Promise<*>}
     */
    async record(targetId, targetVersion, ruleKey, sourceId, sourceVersion)
    {
        return await this.run('record', {
            '@target': targetId,
            '@targetVersion': targetVersion,
            '@rule': ruleKey,
            '@source': sourceId,
            '@sourceVersion': sourceVersion
        });
    }
    async retract(targetId, targetVersion)
    {
        return await this.run('retract', {
            '@target': targetId,
            '@version': targetVersion
        });
    }
    async retractTarget(targetId)
    {
        return await this.run('retractTarget',{
            '@target': targetId
        });
    }
    async retractRule(ruleKey)
    {
        return await this.run('retractRule',{
            '@rule': ruleKey
        });
    }

    /**
     * @param {string} ruleKey
     * @return {Promise<object[]>}
     */
    async listRuleSources(ruleKey)
    {
        return await this.all('listRuleSources', {
            '@rule': ruleKey
        });
    }

    /**
     * @param {string} ruleKey
     * @return {Promise<object[]>}
     */
    async listRuleTargets(ruleKey)
    {
        return await this.all('listRuleTargets',{
            '@rule': ruleKey
        });
    }

    /**
     *
     * @param {string} target
     * @param {string} version
     * @return {Promise<string|null>}
     */
    async getProducingRule(target, version)
    {
        /** @type {object|null} */
        const result = await this.get('getProducingRule',{
            '@target': target,
            '@version': version
        });
        return result && result.rule;
    }

    async recordArtifact(key, type, identity)
    {
        return await this.run('recordArtifact',{
            '@key': key,
            '@type': type,
            '@identity': identity
        });
    }

    /**
     * @param key
     * @return {Promise<Db~ArtifactRecord|null>}
     */
    async getArtifact(key)
    {
        return await this.get('getArtifact',{
            '@key': key
        }) || null;
    }

    async pruneArtifacts() {
        await (await this.stmt).pruneArtifacts.run();
    }

    async close() {
        if (!this.#db) return;
        const statements = await this.#stmt;
        if (statements) for (let stmt of Object.getOwnPropertyNames(statements)) {
            await statements[stmt].finalize();
        }
        const dbObj = await this.#db;
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
    }

    async query(verb, statementKey, data)
    {
        const statements = await this.stmt;
        const prepared = statements[statementKey];
        let result, start;
        try {
            start = performance.now();
            result = await prepared[verb](data);
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
     * @return {Promise<Object>|null}
     */
    async get(statementKey, data)
    {
        return await this.query('get', statementKey, data);
    }

    async run(statementKey, data)
    {
        return await this.query('run', statementKey, data);
    }

    /**
     * @param statementKey
     * @param data
     * @return {Promise<Object[]>}
     */
    async all(statementKey, data)
    {
        return await this.query('all', statementKey, data);
    }
}

/**
 * @typedef {Object} Db~ArtifactRecord
 * @property {string} key
 * @property {string} type
 * @property {string} identity
 */
