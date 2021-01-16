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
                before: async () => {},
                /** @type {WrapperRecipe~aroundCallback} */
                around: async (job, proceed) => { await proceed(); },
                /** @type {WrapperRecipe~parachronousCallback} */
                after: async() => {}
            },
            params
        );
        if (!this.#params.recipe) this.#params.recipe = new NopRecipe();
    }

    async resolveSpecFor(job) {
        const descriptor = {};
        descriptor.recipeSpec = await this.#params.recipe.resolveSpecFor(job);
        descriptor.recipeHash = await this.#params.recipe.hashSpec(descriptor.recipeSpec);
        return Object.assign({},this.#params,descriptor);
    }

    describeSpec(state) {
        return {
            recipe: state.recipeHash,
            before: state.before.descriptor || state.before.toString(),
            around: state.around.descriptor || state.around.toString(),
            after: state.after.descriptor || state.after.toString()
        }
    }

    /**
     * @param {Job} job
     * @param {WrapperRecipe~Parameters} spec
     * @return {Promise<void>}
     */
    async executeFor(job, spec) {
        const {recipe, before, around, after} = spec;
        await before(job);
        await around(job, recipe.executeFor.bind(recipe, job, spec.recipeSpec));
        await after(job);
    }
}
