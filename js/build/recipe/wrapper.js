var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _WrapperRecipe_params;
import { NopRecipe, Recipe } from "../recipe.js";
/***/
export class WrapperRecipe extends Recipe {
    constructor(params) {
        super();
        _WrapperRecipe_params.set(this, void 0);
        __classPrivateFieldSet(this, _WrapperRecipe_params, {
            recipe: params.recipe || new NopRecipe(),
            before: params.before || (async () => { }),
            around: params.around || (async (job, proceed) => { await proceed(job); }),
            after: params.after || (async () => { })
        }, "f");
    }
    async concretizeSpecFor(job) {
        const recipe = __classPrivateFieldGet(this, _WrapperRecipe_params, "f").recipe;
        if (!recipe)
            throw new Error("Wrapper recipe must have a wrappee set before its spec can be concretized");
        const recipeSpec = await recipe.concretizeSpecFor(job), recipeHash = await recipe.hashSpec(recipeSpec);
        return {
            ...__classPrivateFieldGet(this, _WrapperRecipe_params, "f"),
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
_WrapperRecipe_params = new WeakMap();
//# sourceMappingURL=wrapper.js.map