export type HashAlgorithm = "md5" | "blake3";
/**
 * Hash service for computing file and object hashes using different algorithms.
 *
 * Supports:
 * - MD5: Legacy algorithm (32 hex chars)
 * - BLAKE3: Fast parallel hashing (64 hex chars)
 */
export declare class HashService {
    readonly algorithm: HashAlgorithm;
    constructor(algorithm?: HashAlgorithm);
    /**
     * Compute hash of a file using the specified (or default) algorithm.
     *
     * @param filePath Path to the file to hash
     * @param algo Algorithm to use (defaults to service's algorithm)
     * @returns Hex-encoded hash string
     */
    hashFile(filePath: string, algo?: HashAlgorithm): Promise<string>;
    /**
     * Compute hash of an object (for RecipeArtifact) using the specified algorithm.
     *
     * @param obj Object to hash
     * @param algo Algorithm to use (defaults to service's algorithm)
     * @returns Hex-encoded hash string
     */
    hashObject(obj: any, algo?: HashAlgorithm): string;
}
//# sourceMappingURL=hash-service.d.ts.map