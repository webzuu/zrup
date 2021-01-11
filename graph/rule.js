import md5 from "md5";
import {Module} from "../module";
import {Dependency} from "./dependency";

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

    /** @type {Module} */
    #module;

    /** @type {string|null} */
    #name;

    /** @type {string|null} */
    #label;

    /** @type {Recipe|null} */
    #recipe;

    /**
     * @param {Module} module
     * @param {string} name
     */
    constructor(module, name)
    {
        this.#module = module;
        this.#name = name;
        this.#label = `${name}`;
        this.#recipe = null;
        this.outputs = {};
        this.dependencies = {};
        this.after = {};
        this.always = false;
    }

    /** @return {Module} */
    get module()
    {
        return this.#module;
    }

    /** @return {string|null} */
    get name()
    {
        return this.#name;
    }

    /** @return {string} */
    get identity()
    {
        return `rule:${this.module.name}+${this.name}`;
    }

    /** @return {Recipe|null} */
    get recipe()
    {
        return this.#recipe;
    }

    /** @param {Recipe|null} recipe */
    set recipe(recipe)
    {
        if (this.#recipe) {
            throw new Error(`Attempt to ${recipe ? "reassign" : "unset"} the recipe of ${this.label}`);
        }
        this.#recipe = recipe;
    }

    /**
     * @param {string} identityString
     * @return {string}
     */
    static computeKey(identityString)
    {
        return md5(JSON.stringify({identity: identityString}));
    }

    /** @return {string} */
    get key()
    {
        return Rule.computeKey(this.identity);
    }

    /** @param {string|null} label */
    set label(label)
    {
        this.#label = label;
    }

    /** @return {string} */
    get label()
    {
        return this.#label || this.formatDefaultLabel();
    }

    /** @return {string} */
    formatDefaultLabel()
    {
        const outputs = Object.values(this.outputs);
        switch (outputs.length) {
            case 0: return `rule "${this.identity}"`;
            case 1: return `rule for building "${outputs[0].label}"`;
            default: return `rule for building "${outputs[0].label}" (and more)`;
        }
    }

    /**
     * @param {Artifact} artifact
     * @param {number|undefined} [whenAbsent]
     * @return {Dependency}
     */
    addDependency(artifact, whenAbsent)
    {
        let dependency = this.dependencies[artifact.key];
        if (!dependency || whenAbsent !== Dependency.ABSENT_STATE) {
            this.dependencies[artifact.key] = dependency = new Dependency(
                artifact,
                whenAbsent === Dependency.ABSENT_STATE ? Dependency.ABSENT_STATE : Dependency.ABSENT_VIOLATION
            );
        }
        return dependency;
    }

    /**
     * @param {Artifact} artifact
     */
    addOutput(artifact)
    {
        return (
            this.outputs[artifact.key]
            || (this.outputs[artifact.key] = artifact)
        );
    }
}