import md5File from "md5-file";
import { hash as blake3 } from "blake3";
import fs from "fs/promises";
import crypto from "crypto";
/**
 * Hash service for computing file and object hashes using different algorithms.
 *
 * Supports:
 * - MD5: Legacy algorithm (32 hex chars)
 * - BLAKE3: Fast parallel hashing (64 hex chars)
 */
export class HashService {
    constructor(algorithm = "md5") {
        this.algorithm = algorithm;
    }
    /**
     * Compute hash of a file using the specified (or default) algorithm.
     *
     * @param filePath Path to the file to hash
     * @param algo Algorithm to use (defaults to service's algorithm)
     * @returns Hex-encoded hash string
     */
    async hashFile(filePath, algo) {
        const algorithm = algo || this.algorithm;
        switch (algorithm) {
            case "md5":
                return await md5File(filePath);
            case "blake3": {
                const data = await fs.readFile(filePath);
                return blake3(data).toString("hex");
            }
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
    }
    /**
     * Compute hash of an object (for RecipeArtifact) using the specified algorithm.
     *
     * @param obj Object to hash
     * @param algo Algorithm to use (defaults to service's algorithm)
     * @returns Hex-encoded hash string
     */
    hashObject(obj, algo) {
        const algorithm = algo || this.algorithm;
        const json = JSON.stringify(obj);
        switch (algorithm) {
            case "md5":
                return crypto.createHash("md5").update(json).digest("hex");
            case "blake3": {
                return blake3(json).toString("hex");
            }
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
    }
}
//# sourceMappingURL=hash-service.js.map