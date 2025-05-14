import { AID, Artifact, ArtifactFactory, ArtifactResolver } from "../artifact.js";
import { Rule } from "../rule.js";
import { UnsupportedOperation } from "../../error/unsupported-operation.js";
import throwThe from "../../util/throw-error.js";
export class RecipeArtifact extends Artifact {
    async rm() {
        throw new UnsupportedOperation(RecipeArtifact.name, 'rm');
    }
    constructor(aid, job) {
        super(aid);
        this.$specPromise = null;
        this.$versionPromise = null;
        this.job = job;
    }
    get exists() {
        return Promise.resolve(true);
    }
    get spec() {
        return (this.$specPromise
            ||
                (this.$specPromise
                    =
                        this.job.rule.validRecipe.concretizeSpecFor(this.job)));
    }
    get version() {
        return (this.$versionPromise
            ||
                (this.$versionPromise
                    =
                        (async () => {
                            return await this.job.rule.validRecipe.hashSpec(await this.spec);
                        })()));
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
        this.$project = project;
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
        const inspectableProject = this.$project;
        return inspectableProject.graph.index.rule.key.get(Rule.computeKey(new AID('' + ref).withType("rule").toString()));
    }
}
//# sourceMappingURL=recipe.js.map