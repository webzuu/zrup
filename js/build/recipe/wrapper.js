import { NopRecipe, Recipe } from "../recipe.js";
/***/
export class WrapperRecipe extends Recipe {
    constructor(params) {
        super();
        this.$params = {
            recipe: params.recipe || new NopRecipe(),
            before: params.before || (async () => { }),
            around: params.around || (async (job, proceed) => { await proceed(job); }),
            after: params.after || (async () => { })
        };
    }
    async concretizeSpecFor(job) {
        const recipe = this.$params.recipe;
        if (!recipe)
            throw new Error("Wrapper recipe must have a wrappee set before its spec can be concretized");
        const recipeSpec = await recipe.concretizeSpecFor(job), recipeHash = await recipe.hashSpec(recipeSpec);
        return {
            ...this.$params,
            ...{ recipeSpec, recipeHash }
        };
    }
    describeSpec(spec) {
        return {
            recipe: spec.recipeHash,
            before: spec.before.descriptor || spec.before.toString(),
            around: spec.around.descriptor || spec.around.toString(),
            after: spec.after.descriptor || spec.after.toString()
        };
    }
    async executeFor(job, spec) {
        const { recipe, before, around, after } = spec;
        await before(job);
        await around(job, recipe.executeFor.bind(recipe, job, spec.recipeSpec));
        await after(job);
    }
}
//# sourceMappingURL=wrapper.js.map