import md5 from "md5";
import {Module} from "../module";
import {Dependency} from "./dependency";
import {Artifact} from "./artifact";
import {Recipe} from "../build/recipe";


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

export class Rule  {

    readonly #module                : Module;

    readonly #name                  : string;

    #label                          : string | null;

    #recipe                         : Recipe | null;
    public outputs                  : Record<string, Artifact>;
    public dependencies             : Record<string, Dependency>;
    public also                     : Record<string, Rule>;
    public after                    : Record<string, Rule>;
    public always                   : boolean;

    constructor(module : Module, name : string)
    {
        this.#module = module;
        this.#name = name.replace(/\W/g, '-');
        this.#label = name;
        this.#recipe = null;
        this.outputs = {};
        this.dependencies = {};
        this.also = {};
        this.after = {};
        this.always = false;
    }

    get module() : Module
    {
        return this.#module;
    }

    get name() : string
    {
        return this.#name;
    }

    get identity() : string
    {
        return `rule:${this.module.name}+${this.name}`;
    }

    get recipe() : Recipe | null
    {
        return this.#recipe;
    }

    get validRecipe() : Recipe
    {
        const result = this.recipe;
        if (!result) throw new Error(`Attempt to access recipe property that wasn't set`);
        return result;
    }

    set recipe(recipe : Recipe|null)
    {
        if (this.#recipe) {
            throw new Error(`Attempt to ${recipe ? "reassign" : "unset"} the recipe of ${this.label}`);
        }
        this.#recipe = recipe;
    }

    static computeKey(identityString : string) : string
    {
        return md5(JSON.stringify({identity: identityString}));
    }

    get key() : string
    {
        return Rule.computeKey(this.identity);
    }

    set label(label : string|null)
    {
        this.#label = label;
    }

    get label() : string|null
    {
        return this.#label || this.formatDefaultLabel();
    }

    formatDefaultLabel() : string
    {
        const outputs = Object.values(this.outputs);
        switch (outputs.length) {
            case 0: return `rule "${this.identity}"`;
            case 1: return `rule for building "${outputs[0].label}"`;
            default: return `rule for building "${outputs[0].label}" (and more)`;
        }
    }

    addDependency(artifact : Artifact, whenAbsent : Dependency.Absent) : Dependency
    {
        let dependency = this.dependencies[artifact.key];
        if (!dependency || whenAbsent !== Dependency.Absent.State) {
            this.dependencies[artifact.key] = dependency = new Dependency(
                artifact,
                whenAbsent
            );
        }
        return dependency;
    }

    addAlso(rule : Rule)
    {
        this.also[rule.key] = rule;
    }

    addOutput(artifact : Artifact)
    {
        return (
            this.outputs[artifact.key]
            || (this.outputs[artifact.key] = artifact)
        );
    }
}