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

/**
 * @typedef {WrapperRecipe~Parameters} WrapperRecipe~Spec
 * @property {Object} recipeSpec
 * @property {string} recipeHash
 */

/**
 * @typedef {Object.<string,string>} WrapperRecipe~SpecDescription
 * @property {string} recipe
 * @property {string} before
 * @property {string} around
 * @property {string} after
 */

/***/
import {NopRecipe, Recipe} from "../recipe.js";
import {Job} from "../job.js";

/***/
export const WrapperRecipe = class WrapperRecipe extends Recipe

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

    /**
     * @param {Job} job
     * @return {Promise<WrapperRecipe~Spec>}
     */
    async concretizeSpecFor(job) {
        const spec = {};
        spec.recipeSpec = await this.#params.recipe.concretizeSpecFor(job);
        spec.recipeHash = await this.#params.recipe.hashSpec(spec.recipeSpec);
        return {
            ...this.#params,
            ...spec
        }
    }

    /**
     * @param {WrapperRecipe~Spec} spec
     * @return {WrapperRecipe~SpecDescription}
     */
    describeSpec(spec) {
        return {
            recipe: spec.recipeHash,
            before: spec.before.descriptor || spec.before.toString(),
            around: spec.around.descriptor || spec.around.toString(),
            after: spec.after.descriptor || spec.after.toString()
        }
    }

    /**
     * @param {Job} job
     * @param {WrapperRecipe~Spec} spec
     * @return {Promise<void>}
     */
    async executeFor(job, spec) {
        const {recipe, before, around, after} = spec;
        await before(job);
        await around(job, recipe.executeFor.bind(recipe, job, spec.recipeSpec));
        await after(job);
    }
}
