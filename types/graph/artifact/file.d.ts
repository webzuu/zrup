import { AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver } from "../artifact.js";
import { Module } from "../../module.js";
import { Project } from "../../project.js";
export declare class FileArtifact extends Artifact {
    private readonly $resolvedPath;
    private $versionCache;
    constructor(ref: Artifact.Reference, resolvedPath: string);
    get exists(): Promise<boolean>;
    /**
     * Get version using the default (configured) hash algorithm.
     * Caches the promise to avoid redundant hashing.
     */
    get version(): Promise<string>;
    /**
     * Explicitly set the version when we know it (e.g., after rebuilding).
     * Purges cache and stores single entry with configured algorithm.
     * Caller must wrap the value in a Promise.
     */
    set version(versionPromise: Promise<string>);
    /**
     * Get version using a specific hash algorithm.
     * Used during migration to compute versions with different algorithms.
     * Caches per algorithm to avoid redundant computation.
     * Cache entries are invalidated when artifact is rebuilt.
     *
     * @param algorithm Algorithm to use
     */
    getVersionUsing(algorithm: string): Promise<string>;
    private computeVersion;
    get contents(): Promise<string>;
    getContents(): Promise<string>;
    rm(): Promise<void>;
    truncate(): Promise<void>;
    append(str: string): Promise<void>;
    putContents(contents: string): Promise<void>;
    get caps(): Artifact.Caps;
}
export declare class FileArtifactResolver extends ArtifactResolver {
    private $project;
    private readonly $infix;
    private readonly $type;
    constructor(project: Project, infix?: string, type?: string);
    normalize(aid: AID): AID;
    resolveToExternalIdentifier(aid: AID): string;
    resolveModule(aid: AID): {
        statedModule: Module;
        closestModule: (Module | null);
    };
    isInfixed(path: string): boolean;
    applyInfix(path: string): string;
    removeInfix(path: string): string;
    findClosestModule(externalIdentifier: string): Module | null;
    get type(): string;
    get treeInfix(): string;
    get treePrefix(): string;
}
export declare class FileArtifactFactory extends ArtifactFactory {
    private $project;
    constructor(manager: ArtifactManager, project: Project, type?: string, infix?: string);
    get fileResolver(): FileArtifactResolver;
    prependRequiredConstructorArgs(ref: Artifact.Reference, extraArgs: string[]): string[];
    findClosestModule(externalIdentifier: string): Module | null;
    isInfixed(path: string): boolean;
    applyInfix(path: string): string;
    removeInfix(path: string): string;
    get treeInfix(): string;
    get treePrefix(): string;
}
//# sourceMappingURL=file.d.ts.map