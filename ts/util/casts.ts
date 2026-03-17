import {AID, Artifact} from "../graph/artifact.js";
import {Dependency} from "../graph/dependency.js";
import inspect from "object-inspect";


export function obtainArtifactReferenceFrom(resolvable : Artifact.Resolvable) : string {
    const _r: unknown = resolvable; // preserved before TS narrows resolvable to never
    if ("string" === typeof resolvable) return resolvable;
    if (resolvable instanceof Artifact) return resolvable.identity;
    if (resolvable instanceof Dependency) return resolvable.artifact.identity;
    if (resolvable instanceof AID) return resolvable.toString();

    // ResolveArtifactResult or similar object with .artifact property
    if (resolvable && typeof resolvable === 'object' && 'artifact' in resolvable) {
        return resolvable.artifact.identity;
    }

    // Build safe error message — _r is unknown here because JS callers may pass garbage
    const typeInfo = typeof _r;
    const constructorInfo = (typeof _r === 'object' && _r !== null)
        ? ` (constructor: ${Object.getPrototypeOf(_r)?.constructor?.name ?? 'unknown'})`
        : '';
    let valuePreview = '';
    try {
        const inspected = inspect(_r);
        valuePreview = inspected.length > 200 ? inspected.slice(0, 200) + '...[truncated]' : inspected;
    } catch (e) {
        valuePreview = '[inspect failed]';
    }

    throw new Error(`Value cannot be normalized to artifact reference. Type: ${typeInfo}${constructorInfo}. Preview: ${valuePreview}. Expected: string, Artifact, Dependency, AID, or ResolveArtifactResult.`);
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