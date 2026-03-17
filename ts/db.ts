import {sleep} from "sleepjs";
import fsi from "fs";
import path from "path";
import {performance} from "perf_hooks"

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import BetterSqlite3 from "better-sqlite3";
import type {Database, Statement} from "better-sqlite3";
import semver from "semver";
import type {Migration} from "./db/migration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations
 */
async function runMigrations(db: Database): Promise<void> {
    // Get current schema version
    const currentVersionRow = db.prepare(
        "SELECT value FROM schema_meta WHERE key = 'version'"
    ).get() as {value: string} | undefined;
    const currentVersion = currentVersionRow?.value || "0.0.0";

    // Find all migration files
    const migrationsDir = path.join(__dirname, 'db/migrations');
    if (!fsi.existsSync(migrationsDir)) return;

    const migrationFiles = fsi.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js') && f !== 'migration.js')
        .sort();  // Lexicographic sort ensures numeric prefix order

    // Load and filter migrations
    const migrations: Array<{ version: string; migrate: string | ((db: Database) => void) }> = [];

    for (const file of migrationFiles) {
        const modulePath = path.join(migrationsDir, file);
        const module = await import(modulePath);
        const migration: Migration = module.migration;

        if (semver.gt(migration.newVersion, currentVersion)) {
            migrations.push({
                version: migration.newVersion,
                migrate: migration.migrate
            });
        }
    }

    // Sort by semver
    migrations.sort((a, b) => semver.compare(a.version, b.version));

    // Run migrations (framework manages transaction and version update)
    for (const migration of migrations) {
        console.log(`Running migration to ${migration.version}...`);

        const transaction = db.transaction(() => {
            // Execute migration
            if (typeof migration.migrate === 'string') {
                db.exec(migration.migrate);
            } else {
                migration.migrate(db);
            }

            // Update schema version
            db.prepare("UPDATE schema_meta SET value = ? WHERE key = 'version'")
                .run(migration.version);
        });

        transaction();
    }
}

async function openDb(filename: string) : Promise<Database>
{
    let db: Database;
    try {
        fsi.mkdirSync(path.dirname(filename),{mode: 0o755, recursive:true});
        db = new BetterSqlite3(filename);
    }
    catch(e) {
        throw e;
    }

    // Load base schema
    db.exec(fsi.readFileSync(path.join(__dirname, 'sql/schema.sql'), 'utf-8'));

    // Run migrations
    await runMigrations(db);

    // Set pragmas
    db.exec("PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;");
    return db;
}

const queries = {
    has:
        'SELECT COUNT(*) AS c FROM states WHERE target = @target',
    hasVersion:
        'SELECT COUNT(*) AS c FROM states WHERE target = @target AND target_version = @version',
    listVersions:
        'SELECT target_version AS version FROM states WHERE target = @target',
    listVersionSources:
        'SELECT source, source_version AS version, source_algorithm AS algorithm, target_algorithm FROM states WHERE target = @target AND target_version = @version',
    record: `
        INSERT INTO states (target, target_version, target_algorithm, rule, source, source_version, source_algorithm)
        VALUES (@target, @targetVersion, @targetAlgorithm, @rule, @source, @sourceVersion, @sourceAlgorithm)
        ON CONFLICT(target,target_version,source) DO UPDATE SET
            source_version = @sourceVersion,
            source_algorithm = @sourceAlgorithm,
            target_algorithm = @targetAlgorithm
    `,
    retract:
        'DELETE FROM states WHERE target = @target AND target_version = @version',
    retractTarget:
        'DELETE FROM states WHERE target = @target',
    retractRule:
        'DELETE FROM states WHERE rule = @rule',
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
    getProducingRule:
        `SELECT DISTINCT rule FROM states WHERE target=@target AND target_version=@version`,
    recordArtifact: `
        INSERT OR IGNORE INTO artifacts (key, artifact_type, identity)
        VALUES (@key, @type, @identity)
    `,
    getArtifact:
        'SELECT key, artifact_type AS type, identity FROM artifacts WHERE key = @key',
    pruneArtifacts: `
        DELETE FROM artifacts
        WHERE NOT EXISTS (
            SELECT 1 FROM states WHERE states.source = artifacts.key OR states.target = artifacts.key
        )
    `
};

export type StatementKey = keyof typeof queries;


export type VersionRecord = {version: string};
export type VersionSourcesRecord = { source: string, version: string, algorithm: string | null, target_algorithm: string | null };
export type RuleSourcesRecord = {key: string, type: string, identity: string};
export type RuleTargetsRecord = {key: string, type: string, identity: string};
export type ProducingRuleRecord = {rule: string};
export type ArtifactRecord = {key: string, type: string, identity: string};


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
    private readonly $getter : (key: StatementKey) => any;

    constructor(db : Database)
    {
        this.__db=db;
        this.$getter = __statementGetter.bind(this);
    }

    get has() : Statement { return this.$getter("has"); }
    get hasVersion() : Statement { return this.$getter("hasVersion"); }
    get listVersions() : Statement { return this.$getter("listVersions"); }
    get listVersionSources() : Statement { return this.$getter("listVersionSources"); }
    get record() : Statement { return this.$getter("record"); }
    get retract() : Statement { return this.$getter("retract"); }
    get retractTarget() : Statement { return this.$getter("retractTarget"); }
    get retractRule() : Statement { return this.$getter("retractRule"); }
    get listRuleSources() : Statement { return this.$getter("listRuleSources"); }
    get listRuleTargets() : Statement { return this.$getter("listRuleTargets"); }
    get getProducingRule() : Statement { return this.$getter("getProducingRule"); }
    get recordArtifact() : Statement { return this.$getter("recordArtifact"); }
    get getArtifact() : Statement { return this.$getter("getArtifact"); }
    get pruneArtifacts() : Statement { return this.$getter("pruneArtifacts"); }
}

export class Db {

    #db : Database|null;
    #dbPromise : Promise<Database>|null;
    #stmt : Statements|null;

    public dbFilePath: string;
    public queryCount: number;
    public queryTime: number;

    constructor(dbFilePath : string)
    {
        this.dbFilePath = dbFilePath;
        this.#db = null;
        this.#dbPromise = null;
        this.#stmt = null;
        this.queryCount = 0;
        this.queryTime = 0;
    }

    async getDb() : Promise<Database>
    {
        if (!this.#db) {
            if (!this.#dbPromise) {
                this.#dbPromise = openDb(this.dbFilePath);
            }
            this.#db = await this.#dbPromise;
            this.#stmt = new Statements(this.#db);
        }
        return this.#db;
    }

    get db() : Database
    {
        if (!this.#db) {
            throw new Error("Database not initialized. Call getDb() first or use async methods.");
        }
        return this.#db;
    }

    async getStmt() : Promise<Statements>
    {
        if (!this.#stmt) {
            this.#stmt = new Statements(await this.getDb());
        }
        return this.#stmt;
    }

    get stmt() : Statements
    {
        if (!this.#stmt) {
            throw new Error("Statements not initialized. Call getStmt() first or use async methods.");
        }
        return this.#stmt;
    }

    has(targetId: string) : boolean
    {
        const queryResult = this.get<{c: number}>('has', {
            target: targetId
        });
        return queryResult!.c > 0;
    }

    hasVersion(targetId: string, version : string) : boolean
    {
        const countResponse = this.get<{c: number}>('hasVersion',{
            target: targetId,
            version
        });
        return countResponse!.c > 0;
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

    record(
        targetId: string,
        targetVersion: string,
        targetAlgorithm: string,
        ruleKey: string,
        sourceId: string,
        sourceVersion: string,
        sourceAlgorithm: string
    )
    {
        return this.run('record', {
            target: targetId,
            targetVersion,
            targetAlgorithm,
            rule: ruleKey,
            source: sourceId,
            sourceVersion,
            sourceAlgorithm
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
    getProducingRule(target: string, version: string) : string | undefined
    {
        const result = this.get<ProducingRuleRecord>('getProducingRule',{target, version});
        return result && result.rule;
    }

    recordArtifact(key: string, type: string, identity: string)
    {
        return this.run('recordArtifact', {key, type, identity});
    }

    getArtifact(key:string) : ArtifactRecord | null
    {
        return this.get<ArtifactRecord>('getArtifact',{key}) || null;
    }

    pruneArtifacts() {
        this.run('pruneArtifacts',{});
    }

    /**
     * Migrate state records to use new hash algorithm.
     * Updates version and algorithm columns for all states matching (source, target) pairs.
     * Rule is queried from states table.
     */
    async migrateStateRecords(
        pairs: Array<{source: string; target: string}>,
        newHashes: Record<string, string>,
        newAlgorithm: string
    ): Promise<void> {
        const transaction = this.db.transaction(() => {
            const updateStmt = this.db.prepare(`
                UPDATE states
                SET target_version = @targetVersion,
                    target_algorithm = @targetAlgorithm,
                    source_version = @sourceVersion,
                    source_algorithm = @sourceAlgorithm
                WHERE target = @target
                  AND source = @source
            `);

            for (let pair of pairs) {
                const targetVersion = newHashes[pair.target];
                const sourceVersion = newHashes[pair.source];

                if (targetVersion && sourceVersion) {
                    updateStmt.run({
                        target: pair.target,
                        source: pair.source,
                        targetVersion,
                        targetAlgorithm: newAlgorithm,
                        sourceVersion,
                        sourceAlgorithm: newAlgorithm
                    });
                }
            }
        });

        transaction();
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

    query<T>(verb: StatementVerb, statementKey: StatementKey, data : object): T
    {
        const statements = this.stmt;
        const prepared = statements[statementKey];
        let result: T;
        let start: number = performance.now();
        try {
            result = prepared[verb](data) as T;
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

    get<T>(statementKey: StatementKey, data : object): T | undefined
    {
        return this.query<T | undefined>('get', statementKey, data);
    }

    run(statementKey : StatementKey, data : object): BetterSqlite3.RunResult
    {
        return this.query<BetterSqlite3.RunResult>('run', statementKey, data);
    }

    all<T>(statementKey : StatementKey, data : object): T[]
    {
        return this.query<T[]>('all', statementKey, data);
    }
}
