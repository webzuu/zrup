/**
 * Migration 001: Add hash algorithm support
 *
 * Extends the states table to track which hash algorithm was used for each version.
 * Also extends version columns from CHAR(32) to CHAR(64) to support BLAKE3 hashes.
 *
 * Changes:
 * - target_version: CHAR(32) → CHAR(64)
 * - source_version: CHAR(32) → CHAR(64)
 * - Adds target_algorithm VARCHAR(16) (NULL = MD5 for backward compat)
 * - Adds source_algorithm VARCHAR(16) (NULL = MD5)
 */
export const migration = {
    newVersion: "0.1.0",
    migrate: `
        -- Create new states table with extended columns
        CREATE TABLE states_new (
            target CHAR(32),
            target_version CHAR(64),
            target_algorithm VARCHAR(16),
            rule CHAR(32),
            source CHAR(32),
            source_version CHAR(64),
            source_algorithm VARCHAR(16)
        );

        -- Copy existing data (algorithm will be NULL = MD5)
        INSERT INTO states_new (target, target_version, rule, source, source_version)
        SELECT target, target_version, rule, source, source_version FROM states;

        -- Replace old table
        DROP TABLE states;
        ALTER TABLE states_new RENAME TO states;

        -- Recreate indexes
        CREATE UNIQUE INDEX target_version_source ON states(target, target_version, source);
        CREATE INDEX source ON states(source);
        CREATE INDEX target ON states(target);
        CREATE INDEX rule ON states(rule);
        CREATE INDEX idx_target_algorithm ON states(target, target_algorithm);
        CREATE INDEX idx_source_algorithm ON states(source, source_algorithm);

        -- Recreate trigger
        CREATE TRIGGER multiple_generating_rules_check BEFORE INSERT ON states
        BEGIN
            SELECT RAISE(FAIL, 'only one rule can create a particular version of a target')
            FROM states
            WHERE target = NEW.target
            AND target_version = NEW.target_version
            AND rule != NEW.rule;
        END;
    `
};
//# sourceMappingURL=001-hash-algorithms.js.map