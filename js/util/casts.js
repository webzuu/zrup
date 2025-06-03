import { AID, Artifact } from "../graph/artifact.js";
import { Dependency } from "../graph/dependency.js";
import inspect from "object-inspect";
export function obtainArtifactReferenceFrom(resolvable) {
    if ("string" === typeof resolvable)
        return resolvable;
    if (resolvable instanceof Artifact)
        return resolvable.identity;
    if (resolvable instanceof Dependency)
        return resolvable.artifact.identity;
    if (resolvable instanceof AID)
        return resolvable.toString();
    if (resolvable)
        return resolvable.artifact.identity;
    throw new Error(`Value ${inspect(resolvable)} passed to obtainArtifactReferenceFrom cannot be converted to artifact reference`);
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