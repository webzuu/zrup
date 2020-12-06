/**
 * @property {Artifact[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Recipe} recipe
 */
export default class Rule {

    /**
     * @param {Graph} graph
     * @param {Recipe | null} recipe
     * @param builderCallback
     */
    constructor(graph, recipe,builderCallback)
    {
        /** @type {Artifact[]} */
        this.outputs = [];
        /** @type {Dependency[]} */
        this.dependencies = [];
        /** @type {Recipe} */
        this.recipe = recipe;
        /** @type {string|null} */
        this.key = null;
        builderCallback(this, graph, recipe);
        graph.addRule(this);
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
        super(graph, sourceRecipe, me => { me.outputs.push(sourceArtifact); });
    }
}