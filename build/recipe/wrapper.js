/**
 * @callback WrapperRecipe~parachronousCallback
 * @param {Job} job
 * @return {Promise<void>}
 */

/**
 * @callback WrapperRecipe~aroundCallback
 * @param {Job} job
 * @param {WrapperRecipe~parachronousCallback} proceed
 * @return {Promise<void>}
 */


/**
 * @typedef {Object.<string,*>} WrapperRecipe~Parameters
 * @property {Recipe} [recipe]
 * @property {WrapperRecipe~parachronousCallback} [before]
 * @property {WrapperRecipe~aroundCallback} [around]
 * @property {WrapperRecipe~parachronousCallback} [after]
 */

import {NopRecipe, Recipe} from "../recipe.js";

export class WrapperRecipe extends Recipe
{
    /** @type {WrapperRecipe~Parameters} */
    #params;

    /** @param {WrapperRecipe~Parameters} params */
    constructor(params) {
        super();
        this.#params = Object.assign(
            {
                /** @type {WrapperRecipe~parachronousCallback} */
                before: async (job) => {},
                /** @type {WrapperRecipe~aroundCallback} */
                around: (job, proceed) => proceed(),
                /** @type {WrapperRecipe~parachronousCallback} */
                after: async(job) => {}
            },
            params
        );
        if (!this.#params.recipe) this.#params.recipe = new NopRecipe();
    }


    set job(job) {
        super.job = this.#params.recipe.job = job;
    }

    async computeConfigFor(job) {
        return Object.assign({},this.#params,{recipeHash: await this.#params.recipe.hash});
    }


    describeState(state) {
        return {
            recipe: state.recipeHash,
            before: state.before.descriptor || state.before.toString(),
            around: state.around.descriptor || state.around.toString(),
            after: state.after.descriptor || state.after.toString()
        }
    }

    /**
     * @param {WrapperRecipe~Parameters} config
     * @return {Promise<void>}
     */
    async executeWithConfig(config) {
        const {recipe, before, around, after} = config;
        await before(this.job);
        await around(this.job, recipe.execute.bind(recipe, this.job));
        await after(this.job);
    }
}
