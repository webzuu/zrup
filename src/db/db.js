import sqlite3 from "sqlite3";
import { open } from "sqlite";
import sleep from "simple-async-sleep";

async function openDb(filename)
{
    let db
    try {
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
    await db.exec(`CREATE INDEX IF NOT EXISTS rule ON states(rule)`);
    await db.exec(
        `CREATE TABLE IF NOT EXISTS artifacts (
            key CHAR(32) PRIMARY KEY,
            artifact_type VARCHAR(96),
            identity VARCHAR(1024)
        )`
    );
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS artifact_type_identity ON artifacts(artifact_type, identity)`);
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

export default class Db {
    #db;
    #stmt;

    constructor(dbFilePath)
    {
        this.dbFilePath = dbFilePath;
        this.#db = null;
        this.#stmt = null;
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
        // noinspection JSUnresolvedVariable
        const queryResult = (await (await this.stmt).has.get({
            '@target': targetId
        }));
        return queryResult.c > 0;
    }
    async hasVersion(targetId, version)
    {
        // noinspection JSUnresolvedVariable
        return (await (await this.stmt).hasVersion.get({
            '@target': targetId,
            '@version': version
        })).c > 0;
    }
    async listVersions(targetId)
    {
        return (await (await this.stmt).listVersions.all({
            '@target': targetId
        }));
    }
    async listVersionSources(targetId, version)
    {
        return await (await this.stmt).listVersionSources.all({
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
        return (await (await this.stmt).record.run({
            '@target': targetId,
            '@targetVersion': targetVersion,
            '@rule': ruleKey,
            '@source': sourceId,
            '@sourceVersion': sourceVersion
        }));
    }
    async retract(targetId, targetVersion)
    {
        return (await (await this.stmt).retract.run({
            '@target': targetId,
            '@version': targetVersion
        }));
    }
    async retractTarget(targetId)
    {
        return (await (await this.stmt).retractTarget.run({
            '@target': targetId
        }));
    }
    async retractRule(ruleKey)
    {
        return (await (await this.stmt).retractRule.run({
            '@rule': ruleKey
        }));
    }
    async recordArtifact(key, type, identity)
    {
        return (await (await this.stmt).recordArtifact.run({
            '@key': key,
            '@type': type,
            '@identity': identity
        }));
    }
    async getArtifact(key)
    {
        return (await (await this.stmt).getArtifact.get({
            '@key': key
        })) || null;
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
}