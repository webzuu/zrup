import md5 from "md5";

/**
 * @property {Dependency[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Recipe} recipe
 * @property {string|null} identity
 */
export class Rule {

    /**
     * @param {Graph} graph
     * @param {Recipe | null} recipe
     * @param builderCallback
     */
    constructor(graph, recipe, builderCallback)
    {
        this.outputs = [];
        this.dependencies = [];
        this.recipe = recipe;
        this.identity = null;
        builderCallback(this, graph, recipe);
        graph.addRule(this);
    }

    get key()
    {
        return null===this.identity ? null : md5(JSON.stringify(`rule ${this.identity}`));
    }
}

export class SourceRule extends Rule
{
    /**
     * @param {Graph} graph
     * @param {SourceRecipe} sourceRecipe
     * @param {Artifact} sourceArtifact
     */
    constructor(graph, sourceRecipe, sourceArtifact)
    {
        super(graph, sourceRecipe, me => {
            me.outputs.push(sourceArtifact);
            me.identity = `source(${sourceArtifact.key})`;
        });
    }
}