/**
 * @property {Artifact[]} dependencies
 * @property {Recipe} recipe
 */
export default class Rule {

    constructor() {
        this.dependencies = [];
        this.recipe = null;
    }
}