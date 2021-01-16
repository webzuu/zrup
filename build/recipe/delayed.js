import {Recipe} from "../recipe.js";

export class DelayedRecipe extends Recipe
{
    /** @type {Recipe} */
    #recipe;

    /** @type {number} */
    #delay_milliseconds;

    /**
     * @param {Recipe} recipe
     * @param {number} delay_milliseconds
     */
    constructor(recipe, delay_milliseconds)
    {
        super();
        this.#recipe = recipe;
        this.#delay_milliseconds = delay_milliseconds;
    }

    async resolveSpecFor(job) {
        const descriptor = {}
        descriptor.recipeSpec = await this.#recipe.resolveSpecFor(job);
        descriptor.recipeHash = await this.#recipe.hashSpec(descriptor.recipeSpec);
        return Object.assign(descriptor,{
            recipe: this.#recipe,
            delay_milliseconds: this.#delay_milliseconds
        });
    }

    describeSpec(spec) {
        return {
            recipe: spec.recipeHash,
            delayed_milliseconds: spec.delay_milliseconds
        };
    }

    async executeFor(job, spec) {
        return new Promise((resolve, reject) => {
            setTimeout(
                () => {
                    spec.recipe.executeFor(job, spec.recipeSpec)
                        .then(
                            (...v) => { resolve(...v); }
                        )
                        .catch(
                            (...e) => { reject(...e); }
                        );
                },
                parseInt(spec.delay_milliseconds+'',10)
            );
        });
    }
}