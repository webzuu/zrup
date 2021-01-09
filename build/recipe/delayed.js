import {Recipe} from "../recipe";

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
    async executeFor(job) {
        return new Promise((resolve, reject) => {
            setTimeout(
                () => {
                    this.#recipe.executeFor(job)
                        .then(
                            (...v) => { resolve(...v); }
                        )
                        .catch(
                            (...e) => { reject(...e); }
                        );
                }
            );
        });
    }
}