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
var _recipe, _delay_milliseconds;
import { Recipe } from "../recipe.js";
export class DelayedRecipe extends Recipe {
    constructor(recipe, delay_milliseconds) {
        super();
        _recipe.set(this, void 0);
        _delay_milliseconds.set(this, void 0);
        __classPrivateFieldSet(this, _recipe, recipe);
        __classPrivateFieldSet(this, _delay_milliseconds, delay_milliseconds);
    }
    async concretizeSpecFor(job) {
        const recipeSpec = await __classPrivateFieldGet(this, _recipe).concretizeSpecFor(job), recipeHash = await __classPrivateFieldGet(this, _recipe).hashSpec(recipeSpec);
        return {
            recipe: __classPrivateFieldGet(this, _recipe),
            delay_milliseconds: __classPrivateFieldGet(this, _delay_milliseconds),
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
_recipe = new WeakMap(), _delay_milliseconds = new WeakMap();
//# sourceMappingURL=delayed.js.map