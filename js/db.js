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
var _Db_db, _Db_dbPromise, _Db_stmt;
import { sleep } from "sleepjs";
import fsi from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BetterSqlite3 from "better-sqlite3";
import semver from "semver";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Run database migrations
 */
async function runMigrations(db) {
    // Get current schema version
    const currentVersionRow = db.prepare("SELECT value FROM schema_meta WHERE key = 'version'").get();
    const currentVersion = currentVersionRow?.value || "0.0.0";
    // Find all migration files
    const migrationsDir = path.join(__dirname, 'db/migrations');
    if (!fsi.existsSync(migrationsDir))
        return;
    const migrationFiles = fsi.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js') && f !== 'migration.js')
        .sort(); // Lexicographic sort ensures numeric prefix order
    // Load and filter migrations
    const migrations = [];
    for (const file of migrationFiles) {
        const modulePath = path.join(migrationsDir, file);
        const module = await import(modulePath);
        const migration = module.migration;
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
            }
            else {
                migration.migrate(db);
            }
            // Update schema version
            db.prepare("UPDATE schema_meta SET value = ? WHERE key = 'version'")
                .run(migration.version);
        });
        transaction();
    }
}
async function openDb(filename) {
    let db;
    try {
        fsi.mkdirSync(path.dirname(filename), { mode: 0o755, recursive: true });
        db = new BetterSqlite3(filename);
    }
    catch (e) {
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
    has: 'SELECT COUNT(*) AS c FROM states WHERE target = @target',
    hasVersion: 'SELECT COUNT(*) AS c FROM states WHERE target = @target AND target_version = @version',
    listVersions: 'SELECT target_version AS version FROM states WHERE target = @target',
    listVersionSources: 'SELECT source, source_version AS version, source_algorithm AS algorithm, target_algorithm FROM states WHERE target = @target AND target_version = @version',
    record: `
        INSERT INTO states (target, target_version, target_algorithm, rule, source, source_version, source_algorithm)
        VALUES (@target, @targetVersion, @targetAlgorithm, @rule, @source, @sourceVersion, @sourceAlgorithm)
        ON CONFLICT(target,target_version,source) DO UPDATE SET
            source_version = @sourceVersion,
            source_algorithm = @sourceAlgorithm,
            target_algorithm = @targetAlgorithm
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
        this.__db = db;
        this.$getter = __statementGetter.bind(this);
    }
    get has() { return this.$getter("has"); }
    get hasVersion() { return this.$getter("hasVersion"); }
    get listVersions() { return this.$getter("listVersions"); }
    get listVersionSources() { return this.$getter("listVersionSources"); }
    get record() { return this.$getter("record"); }
    get retract() { return this.$getter("retract"); }
    get retractTarget() { return this.$getter("retractTarget"); }
    get retractRule() { return this.$getter("retractRule"); }
    get listRuleSources() { return this.$getter("listRuleSources"); }
    get listRuleTargets() { return this.$getter("listRuleTargets"); }
    get getProducingRule() { return this.$getter("getProducingRule"); }
    get recordArtifact() { return this.$getter("recordArtifact"); }
    get getArtifact() { return this.$getter("getArtifact"); }
    get pruneArtifacts() { return this.$getter("pruneArtifacts"); }
}
export class Db {
    constructor(dbFilePath) {
        _Db_db.set(this, void 0);
        _Db_dbPromise.set(this, void 0);
        _Db_stmt.set(this, void 0);
        this.dbFilePath = dbFilePath;
        __classPrivateFieldSet(this, _Db_db, null, "f");
        __classPrivateFieldSet(this, _Db_dbPromise, null, "f");
        __classPrivateFieldSet(this, _Db_stmt, null, "f");
        this.queryCount = 0;
        this.queryTime = 0;
    }
    async getDb() {
        if (!__classPrivateFieldGet(this, _Db_db, "f")) {
            if (!__classPrivateFieldGet(this, _Db_dbPromise, "f")) {
                __classPrivateFieldSet(this, _Db_dbPromise, openDb(this.dbFilePath), "f");
            }
            __classPrivateFieldSet(this, _Db_db, await __classPrivateFieldGet(this, _Db_dbPromise, "f"), "f");
            __classPrivateFieldSet(this, _Db_stmt, new Statements(__classPrivateFieldGet(this, _Db_db, "f")), "f");
        }
        return __classPrivateFieldGet(this, _Db_db, "f");
    }
    get db() {
        if (!__classPrivateFieldGet(this, _Db_db, "f")) {
            throw new Error("Database not initialized. Call getDb() first or use async methods.");
        }
        return __classPrivateFieldGet(this, _Db_db, "f");
    }
    async getStmt() {
        if (!__classPrivateFieldGet(this, _Db_stmt, "f")) {
            __classPrivateFieldSet(this, _Db_stmt, new Statements(await this.getDb()), "f");
        }
        return __classPrivateFieldGet(this, _Db_stmt, "f");
    }
    get stmt() {
        if (!__classPrivateFieldGet(this, _Db_stmt, "f")) {
            throw new Error("Statements not initialized. Call getStmt() first or use async methods.");
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
    record(targetId, targetVersion, targetAlgorithm, ruleKey, sourceId, sourceVersion, sourceAlgorithm) {
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
    /**
     * Migrate state records to use new hash algorithm.
     * Updates version and algorithm columns for all states matching (source, target) pairs.
     * Rule is queried from states table.
     */
    async migrateStateRecords(pairs, newHashes, newAlgorithm) {
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
        let result;
        let start = performance.now();
        try {
            result = prepared[verb](data);
        }
        catch (e) {
            throw e;
        }
        finally {
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
_Db_db = new WeakMap(), _Db_dbPromise = new WeakMap(), _Db_stmt = new WeakMap();
//# sourceMappingURL=db.js.map