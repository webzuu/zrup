import {AID, Artifact, ArtifactFactory, ArtifactResolver} from "../artifact.js";
import {Rule} from "../rule.js";

export class RecipeArtifact extends Artifact
{
    /**
     *
     * @param {Artifact~Reference} aid
     * @param {Rule} rule
     */
    constructor(aid, rule)
    {
        super(aid);
        this.rule = rule;
    }

    get exists()
    {
        return Promise.resolve(true);
    }

    get version()
    {
        return Promise.resolve(this.rule.recipe.hash);
    }
}

export class RecipeArtifactResolver extends ArtifactResolver
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

export class RecipeArtifactFactory extends ArtifactFactory
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