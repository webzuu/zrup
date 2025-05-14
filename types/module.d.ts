import { Artifact, ArtifactManager } from "./graph/artifact.js";
import { Project } from "./project.js";
export declare class Module {
    private $project;
    private readonly $parent;
    private readonly $name?;
    private $path;
    private readonly $absolutePath;
    private $exports;
    constructor(parent: Module | null, path: string, name?: string);
    get project(): Project | null;
    get validProject(): Project;
    get parent(): Module | null;
    get pathFromRoot(): string;
    get name(): string;
    get absolutePath(): string;
    resolve(ref: Artifact.Reference): string;
    export(exports: Record<string, any>): void;
    get exports(): Record<string, any>;
    static createRoot(project: Project, name: string): Module;
}
export interface ResolveArtifactResult {
    toString(): string;
    artifact: Artifact;
}
export declare function resolveArtifacts(artifactManager: ArtifactManager, module: Module, skipStrings: boolean, ...refs: Artifact.Resolvables[]): (string | ResolveArtifactResult)[];
//# sourceMappingURL=module.d.ts.map