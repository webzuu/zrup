import md5 from "md5";
import { Dependency } from "./dependency.js";
export class Rule {
    constructor(module, name) {
        this.$module = module;
        this.$name = name.replace(/\W/g, '-');
        this.$label = name;
        this.$recipe = null;
        this.outputs = {};
        this.dependencies = {};
        this.also = {};
        this.after = {};
        this.always = false;
    }
    get module() {
        return this.$module;
    }
    get name() {
        return this.$name;
    }
    get identity() {
        return `rule:${this.module.name}+${this.name}`;
    }
    get recipe() {
        return this.$recipe;
    }
    get validRecipe() {
        const result = this.recipe;
        if (!result)
            throw new Error(`Attempt to access recipe property that wasn't set`);
        return result;
    }
    set recipe(recipe) {
        if (this.$recipe) {
            throw new Error(`Attempt to ${recipe ? "reassign" : "unset"} the recipe of ${this.label}`);
        }
        this.$recipe = recipe;
    }
    static computeKey(identityString) {
        return md5(JSON.stringify({ identity: identityString }));
    }
    get key() {
        return Rule.computeKey(this.identity);
    }
    set label(label) {
        this.$label = label;
    }
    get label() {
        return this.$label || this.formatDefaultLabel();
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
    formatLogTag() {
        const outputs = Object.values(this.outputs);
        switch (outputs.length) {
            case 0:
                return `[${this.module.pathFromRoot}][${this.$label || this.identity}]`;
            case 1:
                return `[${this.module.pathFromRoot}]->[${outputs[0].label}]`;
            default: return `[${this.module.pathFromRoot}]->[${outputs[0].label} ...]`;
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
//# sourceMappingURL=rule.js.map