import { md5, blake3, createMD5, createBLAKE3 } from "hash-wasm";
import fs from "fs";
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
            case "md5": {
                const hasher = await createMD5();
                const stream = fs.createReadStream(filePath);
                for await (const chunk of stream) {
                    hasher.update(chunk);
                }
                return hasher.digest('hex');
            }
            case "blake3": {
                const hasher = await createBLAKE3();
                const stream = fs.createReadStream(filePath);
                for await (const chunk of stream) {
                    hasher.update(chunk);
                }
                return hasher.digest('hex');
            }
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
    }
    /**
     * Normalize an object for hashing by recursively sorting keys.
     * This ensures order-independent hashes like the old object-hash library.
     */
    normalizeForHash(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.normalizeForHash(item));
        }
        const sorted = {};
        for (const key of Object.keys(obj).sort()) {
            sorted[key] = this.normalizeForHash(obj[key]);
        }
        return sorted;
    }
    /**
     * Compute hash of an object (for RecipeArtifact) using the specified algorithm.
     *
     * @param obj Object to hash
     * @param algo Algorithm to use (defaults to service's algorithm)
     * @returns Hex-encoded hash string
     */
    async hashObject(obj, algo) {
        const algorithm = algo || this.algorithm;
        const normalized = this.normalizeForHash(obj);
        const json = JSON.stringify(normalized);
        switch (algorithm) {
            case "md5":
                return await md5(json);
            case "blake3":
                return await blake3(json);
            default:
                throw new Error(`Unsupported hash algorithm: ${algorithm}`);
        }
    }
}
//# sourceMappingURL=hash-service.js.map