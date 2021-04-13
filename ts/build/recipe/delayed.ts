import {Recipe} from "../recipe.js";
import {Job} from "../job.js";

export namespace DelayedRecipe {
    export type Parameters = {
        recipe?: Recipe,
        delay_milliseconds?: number
    }
    export type Spec = Required<Parameters> & {
        recipeSpec: Record<string,any>,
        recipeHash: string
    }
    export type SpecDescriptor = {
        recipe: string,
        delay_milliseconds: number
    }
}

export class DelayedRecipe extends Recipe
{
    readonly #recipe : Recipe;

    readonly #delay_milliseconds: number;

    constructor(recipe: Recipe, delay_milliseconds: number)
    {
        super();
        this.#recipe = recipe;
        this.#delay_milliseconds = delay_milliseconds;
    }

    async concretizeSpecFor(job: Job) : Promise<DelayedRecipe.Spec> {
        const
            recipeSpec = await this.#recipe.concretizeSpecFor(job),
            recipeHash = await this.#recipe.hashSpec(recipeSpec);
        return {
            recipe: this.#recipe,
            delay_milliseconds: this.#delay_milliseconds,
            recipeSpec, recipeHash
        }
    }

    describeSpec(spec : DelayedRecipe.Spec) : DelayedRecipe.SpecDescriptor {
        return {
            recipe: spec.recipeHash,
            delay_milliseconds: spec.delay_milliseconds
        };
    }

    async executeFor(job: Job, spec: DelayedRecipe.Spec) : Promise<void> {
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