var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _params;
import { NopRecipe, Recipe } from "../recipe.js";
/***/
export class WrapperRecipe extends Recipe {
    constructor(params) {
        super();
        _params.set(this, void 0);
        __classPrivateFieldSet(this, _params, {
            recipe: params.recipe || new NopRecipe(),
            before: params.before || (async () => { }),
            around: params.around || (async (job, proceed) => { await proceed(job); }),
            after: params.after || (async () => { })
        });
    }
    async concretizeSpecFor(job) {
        const recipe = __classPrivateFieldGet(this, _params).recipe;
        if (!recipe)
            throw new Error("Wrapper recipe must have a wrappee set before its spec can be concretized");
        const recipeSpec = await recipe.concretizeSpecFor(job), recipeHash = await recipe.hashSpec(recipeSpec);
        return {
            ...__classPrivateFieldGet(this, _params),
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
_params = new WeakMap();
//# sourceMappingURL=wrapper.js.map