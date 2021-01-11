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

    async executeFor(job) {
        const {recipe, before, around, after} = this.#params;
        await before(job);
        await around(job, recipe.executeFor.bind(recipe, job));
        await after(job);
    }
}
