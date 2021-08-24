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
var _Rule_module, _Rule_name, _Rule_label, _Rule_recipe;
import md5 from "md5";
import { Dependency } from "./dependency.js";
export class Rule {
    constructor(module, name) {
        _Rule_module.set(this, void 0);
        _Rule_name.set(this, void 0);
        _Rule_label.set(this, void 0);
        _Rule_recipe.set(this, void 0);
        __classPrivateFieldSet(this, _Rule_module, module, "f");
        __classPrivateFieldSet(this, _Rule_name, name.replace(/\W/g, '-'), "f");
        __classPrivateFieldSet(this, _Rule_label, name, "f");
        __classPrivateFieldSet(this, _Rule_recipe, null, "f");
        this.outputs = {};
        this.dependencies = {};
        this.also = {};
        this.after = {};
        this.always = false;
    }
    get module() {
        return __classPrivateFieldGet(this, _Rule_module, "f");
    }
    get name() {
        return __classPrivateFieldGet(this, _Rule_name, "f");
    }
    get identity() {
        return `rule:${this.module.name}+${this.name}`;
    }
    get recipe() {
        return __classPrivateFieldGet(this, _Rule_recipe, "f");
    }
    get validRecipe() {
        const result = this.recipe;
        if (!result)
            throw new Error(`Attempt to access recipe property that wasn't set`);
        return result;
    }
    set recipe(recipe) {
        if (__classPrivateFieldGet(this, _Rule_recipe, "f")) {
            throw new Error(`Attempt to ${recipe ? "reassign" : "unset"} the recipe of ${this.label}`);
        }
        __classPrivateFieldSet(this, _Rule_recipe, recipe, "f");
    }
    static computeKey(identityString) {
        return md5(JSON.stringify({ identity: identityString }));
    }
    get key() {
        return Rule.computeKey(this.identity);
    }
    set label(label) {
        __classPrivateFieldSet(this, _Rule_label, label, "f");
    }
    get label() {
        return __classPrivateFieldGet(this, _Rule_label, "f") || this.formatDefaultLabel();
    }
    formatDefaultLabel() {
        const outputs = Object.values(this.outputs);
        switch (outputs.length) {
            case 0:
                return `rule "${this.identity}"`;
            case 1:
                return `rule for building "${outputs[0].label}"`;
            default: return `rule for building "${outputs[0].label}" (and more)`;
        }
    }
    addDependency(artifact, whenAbsent) {
        let dependency = this.dependencies[artifact.key];
        if (!dependency || whenAbsent !== Dependency.Absent.State) {
            this.dependencies[artifact.key] = dependency = new Dependency(artifact, whenAbsent);
        }
        return dependency;
    }
    addAlso(rule) {
        this.also[rule.key] = rule;
    }
    addOutput(artifact) {
        return (this.outputs[artifact.key]
            || (this.outputs[artifact.key] = artifact));
    }
}
_Rule_module = new WeakMap(), _Rule_name = new WeakMap(), _Rule_label = new WeakMap(), _Rule_recipe = new WeakMap();
//# sourceMappingURL=rule.js.map