import { Artifact } from "../graph/artifact.js";
export declare function obtainArtifactReferenceFrom(resolvable: Artifact.Resolvable): string;
export interface NodeJSError extends Error {
    code?: string;
}
export declare function flattenResolvables(resolvables: Artifact.Resolvables[]): Artifact.Resolvable[];
export declare function isNodeError(e: any): e is NodeJSError;
//# sourceMappingURL=casts.d.ts.map