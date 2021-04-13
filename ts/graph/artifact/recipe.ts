import {AID, Artifact, ArtifactFactory, ArtifactManager, ArtifactResolver} from "../artifact";
import {Rule} from "../rule";
import {UnsupportedOperation} from "../../error/unsupported-operation";
import {Job} from "../../build/job";
import {Project} from "../../project";
import throwThe from "../../util/throw-error";

export class RecipeArtifact extends Artifact

{
    #specPromise : Promise<Object>|null = null;
    #versionPromise : Promise<string>|null = null;
    public readonly job: Job;

    async rm(): Promise<void> {
        throw new UnsupportedOperation(RecipeArtifact.name, 'rm');
    }

    constructor(aid : Artifact.Reference, job : Job)
    {
        super(aid);
        this.job = job;
    }

    get exists()
    {
        return Promise.resolve(true);
    }

    get spec() {
        return (
            this.#specPromise
            ||
            (
                this.#specPromise
                =
                this.job.rule.validRecipe.concretizeSpecFor(this.job)
            )
        );
    }

    get version()
    {
        return (
            this.#versionPromise
            ||
            (
                this.#versionPromise
                =
                (async () => {
                    return await this.job.rule.validRecipe.hashSpec(await this.spec)
                })()
            )
        );
    }

    static makeFor(job : Job) : RecipeArtifact
    {
        const ref = `recipe:${job.rule.module.name}+${job.rule.name}`;
        const found = job.build.artifactManager.find(ref);
        if (found) return found instanceof RecipeArtifact ? found : throwThe(new Error(
            `Internal error: "${ref}" did resolve, but not to an instance of RecipeArtifact`
        ));
        const result = new RecipeArtifact(ref, job);
        job.build.artifactManager.put(result);
        return result;
    }
}

export class RecipeArtifactResolver extends ArtifactResolver
{
    resolveToExternalIdentifier(aid: AID): string {
        return ''+aid;
    }

    get type() : string {
        return "recipe";
    }
}

export class RecipeArtifactFactory extends ArtifactFactory

{
    readonly #project: Project;

    constructor(manager: ArtifactManager, project: Project)
    {
        super(manager, RecipeArtifact, new RecipeArtifactResolver(), "recipe");
        this.#project = project;
    }

    //TODO: roadblock these - this factory is just a dummy
    prependRequiredConstructorArgs(ref : Artifact.Reference, extraArgs : any[]) : [Rule, ...any] {
        const rule = this.resolveRule(ref);
        return [
            rule || throwThe(new Error(`Cannot resolve "${ref}" to an existing rule`)),
            ...extraArgs
        ];
    }

    private resolveRule(ref : Artifact.Reference): (Rule | undefined) {
        const inspectableProject = this.#project;
        return inspectableProject.graph.index.rule.key.get(
            Rule.computeKey(new AID(''+ref).withType("rule").toString())
        );
    }
}