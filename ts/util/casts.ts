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
