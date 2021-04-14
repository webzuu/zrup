var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _specPromise, _versionPromise, _project;
import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact";
import { Rule } from "../rule";
import { UnsupportedOperation } from "../../error/unsupported-operation";
import throwThe from "../../util/throw-error";
export class RecipeArtifact extends Artifact {
    constructor(aid, job) {
        super(aid);
        _specPromise.set(this, null);
        _versionPromise.set(this, null);
        this.job = job;
    }
    async rm() {
        throw new UnsupportedOperation(RecipeArtifact.name, 'rm');
    }
    get exists() {
        return Promise.resolve(true);
    }
    get spec() {
        return (__classPrivateFieldGet(this, _specPromise) ||
            (__classPrivateFieldSet(this, _specPromise, this.job.rule.validRecipe.concretizeSpecFor(this.job))));
    }
    get version() {
        return (__classPrivateFieldGet(this, _versionPromise) ||
            (__classPrivateFieldSet(this, _versionPromise, (async () => {
                return await this.job.rule.validRecipe.hashSpec(await this.spec);
            })())));
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
_specPromise = new WeakMap(), _versionPromise = new WeakMap();
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
        _project.set(this, void 0);
        __classPrivateFieldSet(this, _project, project);
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
        const inspectableProject = __classPrivateFieldGet(this, _project);
        return inspectableProject.graph.index.rule.key.get(Rule.computeKey(new AID('' + ref).withType("rule").toString()));
    }
}
_project = new WeakMap();
//# sourceMappingURL=recipe.js.map