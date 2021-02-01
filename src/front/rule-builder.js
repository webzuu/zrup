import {Rule} from "../graph/rule.js";
import {Module, resolveArtifacts} from "../module.js";
import {AID, Artifact} from "../graph/artifact.js";
import {Dependency} from "../graph/dependency.js";
import {reassemble} from "../util/tagged-template.js";

import {ArtifactManager} from "../graph/artifact.js";
import {Recipe} from "../build/recipe.js";
import EventEmitter from "events";

/**
 * @callback RuleBuilder~definerAcceptor
 * @param {(string|RuleBuilder~definer)} nameOrDefiner
 * @param {RuleBuilder~definer} [definerIfNameGiven]
 */

/**
 * @callback RuleBuilder~definer
 * @param {RuleBuilder~DefinerParams} params
 * @return {Recipe}
 */

/**
 * @typedef {Object.<string,*>} RuleBuilder~DefinerParams
 * @property {Rule} rule
 * @property {RuleBuilder~artifactNominator} depends
 * @property {RuleBuilder~artifactNominator} produces
 * @property {RuleBuilder~ruleNominator} after
 * @property {RuleBuilder~flagSetter} always
 * @property {templateStringTag} T
 */

/**
 * @callback RuleBuilder~artifactNominator
 * @param {...Artifact~References} artifactRefs
 */

/**
 * @callback RuleBuilder~ruleNominator
 * @param {...string} ruleRefs
 */

/**
 * @callback RuleBuilder~flagSetter
 * @param {boolean} [value]
 */

/**
 * @callback RuleBuilder~boundDefiner
 * @return {Recipe}
 */

/**
 * @typedef {Object} RuleBuilder~Declaration
 * @property {Module} module
 * @property {Rule} rule
 * @property {RuleBuilder~boundDefiner} boundDefiner
 */

/**
 * @callback RuleBuilder~resolve
 * @param {Artifact~Resolvables} items
 * @return [string]
 */

/**
 * @typedef RuleBuilder~LocateResult
 * @extends {Object}
 * @property {(Rule|null)} rule,
 * @property {string} resolvedRef
 */

/***/
let self;
export const RuleBuilder = self = class RuleBuilder extends EventEmitter
{
    /** @type {Project} */
    #project;

    /** @type {ArtifactManager} */
    #artifactManager;

    /** @type {RuleBuilder~Declaration[]} */
    #declarations = [];

    /** @type {Object.<string,string[]>} */
    #afterEdges = {};

    /** @type {Object.<string,string[]>} */
    #alsoEdges = {};

    /** @type {(Rule|null)} */
    #currentRule;

    /**
     * @param {Project} project
     * @param {ArtifactManager} artifactManager
     */
    constructor(project, artifactManager)
    {
        super();
        this.#project = project;
        this.#artifactManager = artifactManager;
    }

    get project()
    {
        return this.#project;
    }

    /**
     * @param {Module} module
     * @return {RuleBuilder~definerAcceptor}
     */
    bindDefinerAcceptor(module)
    {
        return this.acceptDefiner.bind(this, module);
    }

    /**
     * @param {Module} module
     * @param {(RuleBuilder~definer|string)} nameOrDefiner
     * @param {RuleBuilder~definer|undefined} [definerWhenNameGiven]
     */
    acceptDefiner(module, nameOrDefiner, definerWhenNameGiven)
    {
        const name = "string" === typeof nameOrDefiner ? nameOrDefiner: nameOrDefiner.name;
        const definer = "string" === typeof nameOrDefiner ? definerWhenNameGiven : nameOrDefiner;
        const rule = new Rule(module, name);
        this.project.graph.addRule(rule);
        this.#declarations.push(this.#createDeclaration(module, rule, definer));
        this.emit('declared.rule', module, rule);
    }

    /**
     * @param {Module} module
     * @param {Rule} rule
     * @param {RuleBuilder~definer} definer
     * @return {RuleBuilder~Declaration}
     */
    #createDeclaration(module, rule, definer)
    {
        return {
            module,
            rule,
            boundDefiner: this.#bindDefiner(module, rule, definer)
        };
    }

    /**
     * @param {Module} module
     * @param {Rule} rule
     * @param {RuleBuilder~definer} definer
     * @return {RuleBuilder~boundDefiner}
     */
    #bindDefiner(module, rule, definer)
    {
        return definer.bind(null, this.#bindDefinerArgs(module, rule));
    }

    /**
     * @param {Module} module
     * @param {Rule} rule
     * @return {RuleBuilder~DefinerParams}
     */
    #bindDefinerArgs(module, rule)
    {
        return {
            rule,
            depends: this.depends,
            produces: this.produces,
            after: this.after,
            always: this.always,
            resolve: this.resolve,
            T: reassemble.bind(null, this.resolve)
        }
    }

    /** @type {RuleBuilder~artifactNominator} */
    depends = (...artifactRefs) =>
    {
        const rule = this.requireCurrentRule('depends'), module = rule.module;
        const result = [];
        for (let ref of artifactRefs.flat()) {
            const artifact = this.#artifactManager.get(new AID(ref+'').withDefaults({ module: module.name }));
            const dependency = rule.addDependency(artifact, Dependency.ABSENT_VIOLATION);
            result.push(dependency);
            this.emit("depends", module, rule, dependency);
        }
        return result;
    }

    /** @type {RuleBuilder~artifactNominator} */
    produces = (...artifactRefs) =>
    {
        const rule = this.requireCurrentRule('produces'), module = rule.module;
        const result = [];
        for(let ref of artifactRefs.flat()) {
            const artifact = this.#artifactManager.get(new AID(ref+'').withDefaults({ module: module.name }))
            rule.addOutput(artifact);
            result.push(artifact);
            this.emit("produces", module, rule, artifact);
        }
        return result;
    }

    /** @type {RuleBuilder~ruleNominator} */
    after = (...prerequisiteRuleRefs) =>
    {
        this.#declareRuleEdges(this.#afterEdges, 'after', ...prerequisiteRuleRefs);
    }

    /** @type {RuleBuilder~ruleNominator} */
    also = (...peerRuleRefs) =>
    {
        this.#declareRuleEdges(this.#alsoEdges, 'also', ...peerRuleRefs);
    }

    /**
     * @param {Object.<string,string[]>} dictionary
     * @param {string} edgeKind
     * @param {...string} ruleRefs
     */
    #declareRuleEdges(dictionary, edgeKind, ...ruleRefs)
    {
        const ruleFrom = this.requireCurrentRule(edgeKind), module = ruleFrom.module;
        dictionary[ruleFrom.key] = [
            ...(dictionary[ruleFrom.key] || []),
            ...ruleRefs
        ]
        for(let ref of ruleRefs) this.emit(edgeKind, module, ruleFrom, ref);
    }

    /** @type {RuleBuilder~flagSetter} */
    always = (value) => {
        this.requireCurrentRule('always').always = false !== value;
    }

    /** @type {RuleBuilder~resolve} */
    resolve = (...items) => {
        const rule = this.requireCurrentRule('resolve'), module = rule.module;
        return resolveArtifacts(this.#artifactManager, module, false, ...items);
    }

    /**
     * @param {string} bindingName
     * @return {Rule}
     */
    requireCurrentRule(bindingName)
    {
        if (!this.#currentRule) {
            throw new Error(
                `DSL error: ${bindingName}() cannot be used outside of rule definition callback, even though `
                +'it is passed to the module definition callback in order to minimize boilerplate'
            );
        }
        return this.#currentRule;
    }

    finalize()
    {
        this.#defineRules();
        this.#indexRules();
        this.#addRuleEdges(this.#afterEdges, 'addPrerequisiteRule');
        this.#addRuleEdges(this.#alsoEdges, 'addAlsoRule');
    }

    #defineRules()
    {
        for(let {rule, boundDefiner, module} of this.#declarations) {
            this.emit('defining.rule',module,rule);
            this.#currentRule = rule;
            try {
                rule.recipe = boundDefiner();
                this.emit('defined.rule',module,rule);
            }
            finally {
                this.#currentRule = null;
            }
        }
    }

    #indexRules()
    {
        for(let {rule} of this.#declarations) {
            this.project.graph.indexRule(rule);
        }
    }

    /**
     *
     * @param {Object.<string,string[]>} graphlet
     * @param edgeAdderFunctionName
     */
    #addRuleEdges(graphlet, edgeAdderFunctionName)
    {
        for(let ruleKey of Object.getOwnPropertyNames(graphlet)) {
            const thisRule = this.project.graph.index.rule.key.get(ruleKey);
            if (!thisRule) {
                //TODO: throw something meaningful instead of ignoring silently, this shouldn't happen!
                continue;
            }
            for(let otherRuleRef of graphlet[ruleKey]) {
                this[edgeAdderFunctionName](thisRule, otherRuleRef);
            }
        }
    }

    /**
     * @param {Rule} dependentRule
     * @param {string} prerequisiteRuleRef
     */
    addPrerequisiteRule(dependentRule, prerequisiteRuleRef)
    {
        const prerequisiteRule = this.requireRule(
            dependentRule,
            prerequisiteRuleRef,
            '{1} required as prerequisite for {2} was not found in the graph'
        )
        dependentRule.after[prerequisiteRule.key]=prerequisiteRule;
    }


    /**
     * @param {Rule} inducingRule
     * @param {string} inducedRuleRef
     */
    addAlsoRule(inducingRule, inducedRuleRef)
    {
        const inducedRule = this.requireRule(
            inducingRule,
            inducedRuleRef,
            '{1} required as also-rule for {2} was not found in the graph'
        );
        inducingRule.addAlso(inducedRule);
    }

    /**
     * @param {Rule} referentRule
     * @param {string} anotherRuleRef
     * @return {RuleBuilder~LocateResult}
     */
    locateRule(referentRule, anotherRuleRef)
    {
        const parsedResolvedRef = Object.assign(
            {
                module: referentRule.module.name,
                ref: undefined
            },
            AID.parse(anotherRuleRef),
            {
                type: "rule"
            }
        );
        const resolvedRef = AID.descriptorToString(parsedResolvedRef);
        const ruleKey = Rule.computeKey(resolvedRef);
        const rule = this.project.graph.index.rule.key.get(ruleKey) || null;
        return {rule, resolvedRef};
    }

    /**
     * @param {Rule} referentRule
     * @param {string} anotherRuleRef
     * @param {string} errorMessage
     * @return {Rule}
     */
    requireRule(referentRule, anotherRuleRef, errorMessage)
    {
        const {rule, resolvedRef} = this.locateRule(referentRule, anotherRuleRef);
        if (null === rule) {
            throw new Error(errorMessage.replace('{requested}', resolvedRef).replace('{referring}', referentRule.identity));
        }
        return rule;
    }
}
