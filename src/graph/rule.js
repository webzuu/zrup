import md5 from "md5";

/**
 * @property {Artifact[]} dependencies
 * @property {Artifact[]} outputs
 * @property {Recipe} recipe
 */
export default class Rule {

    /**
     * @param {Graph} graph
     * @param {Recipe | null} recipe
     */
    constructor(graph, recipe) {
        this.dependencies = [];
        this.outputs = [];
        this.recipe = recipe;
        this.key = null;
        graph.addRule(this);
    }
}