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
var _DelayedRecipe_recipe, _DelayedRecipe_delay_milliseconds;
import { Recipe } from "../recipe.js";
export class DelayedRecipe extends Recipe {
    constructor(recipe, delay_milliseconds) {
        super();
        _DelayedRecipe_recipe.set(this, void 0);
        _DelayedRecipe_delay_milliseconds.set(this, void 0);
        __classPrivateFieldSet(this, _DelayedRecipe_recipe, recipe, "f");
        __classPrivateFieldSet(this, _DelayedRecipe_delay_milliseconds, delay_milliseconds, "f");
    }
    async concretizeSpecFor(job) {
        const recipeSpec = await __classPrivateFieldGet(this, _DelayedRecipe_recipe, "f").concretizeSpecFor(job), recipeHash = await __classPrivateFieldGet(this, _DelayedRecipe_recipe, "f").hashSpec(recipeSpec);
        return {
            recipe: __classPrivateFieldGet(this, _DelayedRecipe_recipe, "f"),
            delay_milliseconds: __classPrivateFieldGet(this, _DelayedRecipe_delay_milliseconds, "f"),
            recipeSpec, recipeHash
        };
    }
    describeSpec(spec) {
        return {
            recipe: spec.recipeHash,
            delay_milliseconds: spec.delay_milliseconds
        };
    }
    async executeFor(job, spec) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                spec.recipe.executeFor(job, spec.recipeSpec)
                    .then((...v) => { resolve(...v); })
                    .catch((...e) => { reject(...e); });
            }, parseInt(spec.delay_milliseconds + '', 10));
        });
    }
}
_DelayedRecipe_recipe = new WeakMap(), _DelayedRecipe_delay_milliseconds = new WeakMap();
//# sourceMappingURL=delayed.js.map