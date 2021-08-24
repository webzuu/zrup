var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _RecipeArtifact_specPromise, _RecipeArtifact_versionPromise, _RecipeArtifactFactory_project;
import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact.js";
import { Rule } from "../rule.js";
import { UnsupportedOperation } from "../../error/unsupported-operation.js";
import throwThe from "../../util/throw-error.js";
export class RecipeArtifact extends Artifact {
    constructor(aid, job) {
        super(aid);
        _RecipeArtifact_specPromise.set(this, null);
        _RecipeArtifact_versionPromise.set(this, null);
        this.job = job;
    }
    async rm() {
        throw new UnsupportedOperation(RecipeArtifact.name, 'rm');
    }
    get exists() {
        return Promise.resolve(true);
    }
    get spec() {
        return (__classPrivateFieldGet(this, _RecipeArtifact_specPromise, "f")
            ||
                (__classPrivateFieldSet(this, _RecipeArtifact_specPromise, this.job.rule.validRecipe.concretizeSpecFor(this.job), "f")));
    }
    get version() {
        return (__classPrivateFieldGet(this, _RecipeArtifact_versionPromise, "f")
            ||
                (__classPrivateFieldSet(this, _RecipeArtifact_versionPromise, (async () => {
                    return await this.job.rule.validRecipe.hashSpec(await this.spec);
                })(), "f")));
    }
    static makeFor(job) {
        const ref = `recipe:${job.rule.module.name}+${job.rule.name}`;
        const found = job.build.artifactManager.find(ref);
        if (found)
            return found instanceof RecipeArtifact ? found : throwThe(new Error(`Internal error: "${ref}" did resolve, but not to an instance of RecipeArtifact`));
        const result = new RecipeArtifact(ref, job);
        job.build.artifactManager.put(result);
        return result;
    }
}
_RecipeArtifact_specPromise = new WeakMap(), _RecipeArtifact_versionPromise = new WeakMap();
export class RecipeArtifactResolver extends ArtifactResolver {
    resolveToExternalIdentifier(aid) {
        return '' + aid;
    }
    get type() {
        return "recipe";
    }
}
export class RecipeArtifactFactory extends ArtifactFactory {
    constructor(manager, project) {
        super(manager, RecipeArtifact, new RecipeArtifactResolver(), "recipe");
        _RecipeArtifactFactory_project.set(this, void 0);
        __classPrivateFieldSet(this, _RecipeArtifactFactory_project, project, "f");
    }
    //TODO: roadblock these - this factory is just a dummy
    prependRequiredConstructorArgs(ref, extraArgs) {
        const rule = this.resolveRule(ref);
        return [
            rule || throwThe(new Error(`Cannot resolve "${ref}" to an existing rule`)),
            ...extraArgs
        ];
    }
    resolveRule(ref) {
        const inspectableProject = __classPrivateFieldGet(this, _RecipeArtifactFactory_project, "f");
        return inspectableProject.graph.index.rule.key.get(Rule.computeKey(new AID('' + ref).withType("rule").toString()));
    }
}
_RecipeArtifactFactory_project = new WeakMap();
//# sourceMappingURL=recipe.js.map