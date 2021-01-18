import EventEmitter from "events";
import {Rule} from "../graph/rule.js";
import {Module, resolveArtifacts} from "../module.js";
import {AID} from "../graph/artifact.js";
import {Dependency} from "../graph/dependency.js";
import {reassemble} from "../util/tagged-template.js";

/**
 * @callback RuleBuilder~definerAcceptor
 * @param {RuleBuilder~definer} definer
 */

/**
 * @callback RuleBuilder~definer
 * @param {RuleBuilder~DefinerParams} params
 * @return {Recipe}
 */

/**
 * @typedef RuleBuilder~DefinerParams
 * @type {object}
 * @property {Rule} rule
 * @property {RuleBuilder~artifactNominator} depends
 * @property {RuleBuilder~artifactNominator} produces
 * @property {RuleBuilder~ruleNominator} after
 * @property {templateStringTag} T
 *
 */

/**
 * @callback RuleBuilder~artifactNominator
 * @param {...Artifact~Reference} artifactRefs
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

/***/
export const RuleBuilder = class RuleBuilder extends EventEmitter

{
    /** @type {Project} */
    #project;

    /** @type {ArtifactManager} */
    #artifactManager;

    /** @type {RuleBuilder~Declaration[]} */
    #declarations = [];

    /** @type {{ [string]: string[]}} */
    #afterEdges = {};

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
     * @param {RuleBuilder~definer|string} nameOrDefiner
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
        const resolve = resolveArtifacts.bind(null, this.#artifactManager, module);
        const T = reassemble.bind(null, resolve);
        return {
            rule,
            depends: this.depends,
            produces: this.produces,
            after: this.after,
            resolve,
            T
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
        const dependentRule = this.requireCurrentRule('after'), module = dependentRule.module;
        this.#afterEdges[dependentRule.key] = (this.#afterEdges[dependentRule.key] || []).concat(prerequisiteRuleRefs);
        for(let ref of prerequisiteRuleRefs) this.emit('after', module, dependentRule, ref);
    }

    always = (value) => {
        this.requireCurrentRule('always').always = true === value;
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
        for(let {rule} of this.#declarations) {
            this.project.graph.indexRule(rule);
        }
        for(let ruleKey in this.#afterEdges) {
            const dependentRule = this.project.graph.index.rule.key.get(ruleKey);
            if (!dependentRule) {
                //TODO: throw something meaningful instead of ignoring silently, this shouldn't happen!
                continue;
            }
            for(let prerequisiteRuleRef of this.#afterEdges[ruleKey]) {
                this.addPrerequisiteRule(dependentRule, prerequisiteRuleRef)
            }
        }
    }

    /**
     *
     * @param {Rule} dependentRule
     * @param {string} prerequisiteRuleRef
     */
    addPrerequisiteRule(dependentRule, prerequisiteRuleRef)
    {
        const parsedResolvedRef = Object.assign(
            {
                module: dependentRule.module.name,
                ref: (u=>u)()
            },
            AID.parse(prerequisiteRuleRef),
            {
                type: "rule"
            }
        );
        const resolvedRefString = AID.descriptorToString(parsedResolvedRef);
        const prerequisiteRuleKey = Rule.computeKey(resolvedRefString);
        const prerequisiteRule = this.project.graph.index.rule.key.get(prerequisiteRuleKey);
        if (!prerequisiteRule) {
            throw new Error(
                `${resolvedRefString} required as prerequisite for ${dependentRule.identity} was not found in the graph`
            );
        }
        dependentRule.after[prerequisiteRuleKey]=prerequisiteRule;
    }
}
