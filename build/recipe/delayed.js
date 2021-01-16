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

    set job(job) {
        super.job = this.#recipe.job = job;
    }

    async computeConfigFor(job) {
        return {
            recipe: this.#recipe,
            recipeHash: await this.#recipe.hash,
            delay_milliseconds: this.#delay_milliseconds
        };
    }

    describeState(state) {
        return {
            recipe: state.recipeHash,
            delayed_milliseconds: state.delay_milliseconds
        };
    }

    async executeWithConfig(config) {
        return new Promise((resolve, reject) => {
            setTimeout(
                () => {
                    config.recipe.execute()
                        .then(
                            (...v) => { resolve(...v); }
                        )
                        .catch(
                            (...e) => { reject(...e); }
                        );
                },
                parseInt(config.delay_milliseconds+'',10)
            );
        });
    }
}