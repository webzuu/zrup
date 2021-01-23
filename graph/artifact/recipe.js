import {AID, Artifact, ArtifactFactory, ArtifactResolver} from "../artifact.js";
import {Rule} from "../rule.js";

export const RecipeArtifact = class RecipeArtifact extends Artifact

{
    #specPromise;
    #versionPromise;

    /**
     * @param {string} aid
     * @param {Job} job
     */
    constructor(aid, job)
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
                this.job.rule.recipe.concretizeSpecFor(this.job)
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
                    return await this.job.rule.recipe.hashSpec(await this.spec)
                })()
            )
        );
    }

    /** @param job */
    static makeFor(job)
    {
        const ref = `recipe:${job.rule.module.name}+${job.rule.name}`;
        const found = job.build.artifactManager.find(ref);
        if (found) return found;
        const result = new RecipeArtifact(
            `recipe:${job.rule.module.name}+${job.rule.name}`,
            job
        );
        job.build.artifactManager.put(result);
        return result;
    }
}

export const RecipeArtifactResolver = class RecipeArtifactResolver extends ArtifactResolver

{
    /**
     * @param {AID} aid
     * @return {string}
     */
    resolveToExternalIdentifier(aid) {
        return ''+aid;
    }

    get type() {
        return "recipe";
    }
}

export const RecipeArtifactFactory = class RecipeArtifactFactory extends ArtifactFactory

{
    /** @type {Project} */
    #project;
    /**
     * @param {ArtifactManager} manager
     * @param {Project} project
     */
    constructor(manager, project)
    {
        super(manager, RecipeArtifact, new RecipeArtifactResolver(), "recipe");
        this.#project = project;
    }

    //TODO: roadblock these - this factory is just a dummy
    prependRequiredConstructorArgs(ref, extraArgs) {
        const rule = this.#resolveRule(ref);
        if (!rule) {
            throw new Error(`Cannot resolve "${ref}" to an existing rule`);
        }
        return [rule, ...extraArgs];
    }

    /**
     * @param {Artifact~Reference} ref
     * @return {(Rule|undefined)}
     */
    #resolveRule(ref)
    {
        const inspectableProject = this.#project;
        return inspectableProject.graph.index.rule.key.get(
            Rule.computeKey(new AID(ref).withType("rule").toString())
        );
    }
}