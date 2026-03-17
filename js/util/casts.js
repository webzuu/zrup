import { AID, Artifact } from "../graph/artifact.js";
import { Dependency } from "../graph/dependency.js";
import inspect from "object-inspect";
export function obtainArtifactReferenceFrom(resolvable) {
    const _r = resolvable; // preserved before TS narrows resolvable to never
    if ("string" === typeof resolvable)
        return resolvable;
    if (resolvable instanceof Artifact)
        return resolvable.identity;
    if (resolvable instanceof Dependency)
        return resolvable.artifact.identity;
    if (resolvable instanceof AID)
        return resolvable.toString();
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
    }
    catch (e) {
        valuePreview = '[inspect failed]';
    }
    throw new Error(`Value cannot be normalized to artifact reference. Type: ${typeInfo}${constructorInfo}. Preview: ${valuePreview}. Expected: string, Artifact, Dependency, AID, or ResolveArtifactResult.`);
}
export function flattenResolvables(resolvables) {
    let result = [];
    for (let i = 0; i < resolvables.length; i++) {
        if (Array.isArray(resolvables[i])) {
            result = result.concat(flattenResolvables(resolvables[i]));
        }
        else {
            result.push(resolvables[i]);
        }
    }
    return result;
}
export function isNodeError(e) {
    return e instanceof Error && 'string' === typeof e.code;
}
//# sourceMappingURL=casts.js.map