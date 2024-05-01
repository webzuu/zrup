import {AID, Artifact} from "../graph/artifact.js";
import {Dependency} from "../graph/dependency.js";

export function obtainArtifactReferenceFrom(resolvable : Artifact.Resolvable) : string {
    if ("string" === typeof resolvable) return resolvable;
    if (resolvable instanceof Artifact) return resolvable.identity;
    if (resolvable instanceof Dependency) return resolvable.artifact.identity;
    if (resolvable instanceof AID) return resolvable.toString();
    if (null!==resolvable) return resolvable.artifact.identity;
    throw new Error("Object passed to obtainArtifactReferenceFrom cannot be converted to artifact reference");
}

export interface NodeJSError extends Error {
    code?: string
}

export function flattenResolvables(resolvables: Artifact.Resolvables[]): Artifact.Resolvable[] {
    let result: Artifact.Resolvable[] = [];
    for (let i = 0; i < resolvables.length; i++) {
        if (Array.isArray(resolvables[i])) {
            result = result.concat(flattenResolvables(resolvables[i] as Artifact.Resolvables[]));
        } else {
            result.push(resolvables[i] as Artifact.Resolvable);
        }
    }
    return result;
}

export function isNodeError(e: any) : e is NodeJSError {
    return e instanceof Error && 'string' === typeof (e as any).code;
}