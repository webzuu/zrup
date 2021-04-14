import { AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver } from "../artifact.js";
import { Module } from "../../module.js";
import { Project } from "../../project.js";
export declare class FileArtifact extends Artifact {
    #private;
    constructor(ref: Artifact.Reference, resolvedPath: string);
    get exists(): Promise<boolean>;
    get version(): Promise<string>;
    get contents(): Promise<string>;
    getContents(): Promise<string>;
    rm(): Promise<void>;
    truncate(): Promise<void>;
    append(str: string): Promise<void>;
    putContents(contents: string): Promise<void>;
    get caps(): Artifact.Caps;
}
export declare class FileArtifactResolver extends ArtifactResolver {
    #private;
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
    #private;
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