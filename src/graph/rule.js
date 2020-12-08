/**
 * @property {Artifact[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Recipe} recipe
 */
import md5 from "md5";

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