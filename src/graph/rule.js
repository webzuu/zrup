/**
 * @property {Artifact[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Recipe} recipe
 */
export default class Rule {

    /**
     * @param {Graph} graph
     * @param {Recipe | null} recipe
     * @param builder
     */
    constructor(graph, recipe,builder) {
        /**
         *
         * @type {Artifact[]}
         */
        this.dependencies = [];
        /**
         *
         * @type {Artifact[]}
         */
        this.outputs = [];
        this.recipe = recipe;
        this.key = null;
        builder(this,graph,recipe);
        graph.addRule(this);
    }
}

export class SourceRule extends Rule
{
    /**
     *
     * @param {Graph} graph
     * @param {SourceRecipe} sourceRecipe
     * @param {Artifact} sourceArtifact
     */
    constructor(graph, sourceRecipe, sourceArtifact)
    {
        super(graph, sourceRecipe, me => { me.outputs.push(sourceArtifact); });
    }
}