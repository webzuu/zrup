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
var _module, _name, _label, _recipe;
import md5 from "md5";
import { Dependency } from "./dependency";
/**
 * @callback BuilderCallback
 * @this {Rule}
 * @param {Graph|undefined} graph,
 * @param {Recipe|undefined} recipe
 */
/**
 * @property {Object.<string,Dependency>} dependencies
 * @property {Object.<string,Artifact>} outputs
 * @property {Object.<string,Rule>} after - Rules that are order-only dependencies
 * @property {boolean} always
 */
export class Rule {
    constructor(module, name) {
        _module.set(this, void 0);
        _name.set(this, void 0);
        _label.set(this, void 0);
        _recipe.set(this, void 0);
        __classPrivateFieldSet(this, _module, module);
        __classPrivateFieldSet(this, _name, name.replace(/\W/g, '-'));
        __classPrivateFieldSet(this, _label, name);
        __classPrivateFieldSet(this, _recipe, null);
        this.outputs = {};
        this.dependencies = {};
        this.also = {};
        this.after = {};
        this.always = false;
    }
    get module() {
        return __classPrivateFieldGet(this, _module);
    }
    get name() {
        return __classPrivateFieldGet(this, _name);
    }
    get identity() {
        return `rule:${this.module.name}+${this.name}`;
    }
    get recipe() {
        return __classPrivateFieldGet(this, _recipe);
    }
    get validRecipe() {
        const result = this.recipe;
        if (!result)
            throw new Error(`Attempt to access recipe property that wasn't set`);
        return result;
    }
    set recipe(recipe) {
        if (__classPrivateFieldGet(this, _recipe)) {
            throw new Error(`Attempt to ${recipe ? "reassign" : "unset"} the recipe of ${this.label}`);
        }
        __classPrivateFieldSet(this, _recipe, recipe);
    }
    static computeKey(identityString) {
        return md5(JSON.stringify({ identity: identityString }));
    }
    get key() {
        return Rule.computeKey(this.identity);
    }
    set label(label) {
        __classPrivateFieldSet(this, _label, label);
    }
    get label() {
        return __classPrivateFieldGet(this, _label) || this.formatDefaultLabel();
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
_module = new WeakMap(), _name = new WeakMap(), _label = new WeakMap(), _recipe = new WeakMap();
//# sourceMappingURL=rule.js.map