import { Migration } from "../migration.js";
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
export declare const migration: Migration;
//# sourceMappingURL=001-hash-algorithms.d.ts.map