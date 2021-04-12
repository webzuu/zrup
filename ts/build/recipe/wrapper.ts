export namespace WrapperRecipe {
    export type Described = { descriptor?: string };
    export type parachronousCallback = Described & ((job: Job) => Promise<void>);
    export type aroundCallback = Described & ((job: Job, proceed: parachronousCallback) => Promise<void> & Described);
    export type Parameters = {
        recipe?: Recipe,
        before?: parachronousCallback,
        around?: aroundCallback,
        after?: parachronousCallback
    }
    export type Spec = Required<Parameters> & {
        recipeSpec: Record<string,any>,
        recipeHash: string
    }
    export type SpecDescription = {
        recipe: string,
        before: string,
        around: string,
        after: string
    }
}

import {NopRecipe, Recipe} from "../recipe.js";
import {Job} from "../job.js";

/***/
export class WrapperRecipe extends Recipe
{
    readonly #params : Required<WrapperRecipe.Parameters>;

    constructor(params: WrapperRecipe.Parameters) {
        super();
        this.#params = {
            recipe: params.recipe || new NopRecipe(),
            before: params.before || (
                async() => {}
            ),
            around: params.around || (
                async (job: Job, proceed: WrapperRecipe.parachronousCallback) => { await proceed(job); }
            ),
            after: params.after || (
                async() => {}
            )
        }
    }

    async concretizeSpecFor(job: Job): Promise<WrapperRecipe.Spec> {
        const recipe = this.#params.recipe;
        if (!recipe) throw new Error("Wrapper recipe must have a wrappee set before its spec can be concretized");
        const
            recipeSpec = await recipe.concretizeSpecFor(job),
            recipeHash = await recipe.hashSpec(recipeSpec)
        return {
            ...this.#params,
            ...{ recipeSpec, recipeHash }
        }
    }

    describeSpec(spec: WrapperRecipe.Spec): WrapperRecipe.SpecDescription {
        return {
            recipe: spec.recipeHash,
            before: spec.before.descriptor || spec.before.toString(),
            around: spec.around.descriptor || spec.around.toString(),
            after: spec.after.descriptor || spec.after.toString()
        }
    }

    async executeFor(job: Job, spec: WrapperRecipe.Spec): Promise<void> {
        const {recipe, before, around, after} = spec;
        await before(job);
        await around(job, recipe.executeFor.bind(recipe, job, spec.recipeSpec));
        await after(job);
    }
}
