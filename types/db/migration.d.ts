import { Database } from "better-sqlite3";
/**
 * Database migration interface.
 *
 * Migrations are discovered and run automatically by the migration runner.
 * Each migration should be in a separate file with numeric prefix (e.g., 001-description.ts).
 */
export interface Migration {
    /**
     * The semver version this migration upgrades the schema to.
     */
    newVersion: string;
    /**
     * The migration logic.
     *
     * - If string: SQL to execute via db.exec()
     * - If function: Custom migration logic with database access
     *
     * The framework wraps execution in a transaction and updates schema_meta.version automatically.
     */
    migrate: string | ((db: Database) => void);
}
//# sourceMappingURL=migration.d.ts.map