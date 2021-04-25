import {Rule} from "../graph/rule.js";
import {Module, resolveArtifacts} from "../module.js";
import {AID, Artifact} from "../graph/artifact.js";
import {Dependency} from "../graph/dependency.js";
import {reassemble, templateStringTag} from "../util/tagged-template.js";
import {ArtifactManager} from "../graph/artifact.js";
import {Recipe} from "../build/recipe.js";
import EventEmitter from "events";
import {Project} from "../project.js";
import {ModuleBuilder} from "./module-builder.js";
import {obtainArtifactReferenceFrom} from "../util/casts.js";

/**
 *
 */
export namespace RuleBuilder {
    /**
     * Type of function that accepts a {@link RuleBuilder.definer rule definer} callback and presumably uses it to
     * define a rule. We need this type alias to type the {@link RuleBuilder.DefinerAPI.rule rule} property of the
     * {@link RuleBuilder.DefinerAPI} interface.
     */
    export type definerAcceptor = (
        nameOrDefiner: string|definer,
        definerOpt?: definer
    ) => any;

    /**
     * Type of user-supplied function whose job is to define a rule using an
     * {@link RuleBuilder.DefinerAPI DefinerAPI} object passed to it.
     */
    export type definer = (api: DefinerAPI) => Recipe;

    /**
     * API object for defining rules. It is passed to user-supplied {@link RuleBuilder.definer definer callbacks}.
     */
    export interface DefinerAPI {
        /** The {@link Rule} instance being defined. */
        rule: Rule,
        /** {@see ModuleBuilder.DefinerAPI.depends}*/
        depends: RuleBuilder.artifactNominator,
        /** {@see ModuleBuilder.DefinerAPI.produces}*/
        produces: RuleBuilder.artifactNominator,
        /** {@see ModuleBuilder.DefinerAPI.after}*/
        after: RuleBuilder.ruleNominator,
        /** {@see ModuleBuilder.DefinerAPI.always}*/
        always: RuleBuilder.flagSetter,
        /** {@see ModuleBuilder.DefinerAPI.resolve}*/
        resolve: ModuleBuilder.resolve,
        T: templateStringTag
    }

    /**
     * A function type that receives {@see Artifact.Resolvable artifact-resolvables} and presumably designates the
     * corresponding artifacts as relevant to the rule being built, i.e. as dependencies or outputs.
     */
    export type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
    /**
     * A function type that receives rule names and presumably designates the corresponding rules as relevant to
     * the rule being built, i.e. as its after-rules or also-rules.
     */
    export type ruleNominator = (...ruleRefs: string[]) => any;
    /**
     * A function type for setting a boolean option on a rule being defined.
     */
    export type flagSetter = (value?: boolean) => any;
    /**
     * A function type that internally represents a {@link RuleBuilder.definer rule definer} callback with the
     * `api` parameter pre-bound.
     */
    export type boundDefiner = (...args: any[]) => Recipe;
    /**
     * An object type that internally represents a rule definer associated with a rule object and ready to be invoked.
     */
    export interface Declaration {
        /** The module to which the rule being defined belongs. */
        module: Module,
        /** The rule being defined. */
        rule: Rule,
        /** User-supplied {@link RuleBuilder.definer rule definer} with pre-bound `api` parameter */
        boundDefiner: RuleBuilder.boundDefiner
    }
    /**
     * A type for representing the result of looking up a rule by name or rule {@link AID}
     */
    export interface LocateResult {
        rule: Rule|null,
        resolvedRef: string
    }
}

type KeysMatching<T, V> = {[K in keyof T]-?: T[K] extends V ? K : never}[keyof T];

/***/
export class RuleBuilder extends EventEmitter
{
    protected readonly project: Project;

    readonly artifactManager: ArtifactManager;

    #declarations: RuleBuilder.Declaration[] = [];

    #afterEdges : Record<string, string[]> = {};

    #alsoEdges : Record<string, string[]> = {};

    #currentRule: Rule|null = null;

    constructor(project: Project, artifactManager: ArtifactManager)
    {
        super();
        this.project = project;
        this.artifactManager = artifactManager;
    }

    bindDefinerAcceptor(module: Module): RuleBuilder.definerAcceptor
    {
        return this.acceptDefiner.bind(this, module) as RuleBuilder.definerAcceptor;
    }

    public acceptDefiner(module: Module, name: string, definer: RuleBuilder.definer) : void;
    public acceptDefiner(module: Module, definer: RuleBuilder.definer) : void;
    public acceptDefiner(module: Module, nameOrDefiner: any, definerWhenNameGiven?: any) : void
    {
        const
            haveName            = "string" === typeof nameOrDefiner,
            name                = haveName ? nameOrDefiner: nameOrDefiner.name,
            definer             = haveName ? definerWhenNameGiven : nameOrDefiner,
            rule                = new Rule(module, name);

        this.project.graph.addRule(rule);
        this.#declarations.push(this.createDeclaration(module, rule, definer));
        this.emit('declared.rule', module, rule);
    }

    private createDeclaration(module: Module, rule: Rule, definer: RuleBuilder.definer): RuleBuilder.Declaration {
        return {
            module,
            rule,
            boundDefiner: this.bindDefiner(module, rule, definer)
        };
    }

    private bindDefiner(module: Module, rule: Rule, definer: RuleBuilder.definer): RuleBuilder.boundDefiner {
        return definer.bind(null, this.bindDefinerArgs(module, rule));
    }

    private bindDefinerArgs(module: Module, rule: Rule): RuleBuilder.DefinerAPI {
        const resolve : ModuleBuilder.resolve = resolveArtifacts.bind(null, this.artifactManager, module, false);
        return {
            rule,
            depends: this.depends,
            produces: this.produces,
            after: this.after,
            always: this.always,
            resolve,
            T: reassemble.bind(null, (v: any) => resolve(v).toString())
        }
    }

    depends : RuleBuilder.artifactNominator = (...resolvables: Artifact.Resolvables[]) : Dependency[] =>
    {
        const rule = this.requireCurrentRule('depends'), module = rule.module;
        return resolvables.flat(Infinity).map(obtainArtifactReferenceFrom).map((ref : string) : Dependency => {
            const artifact = this.artifactManager.get(new AID(ref+'').withDefaults({ module: module.name }));
            const dependency = rule.addDependency(artifact, Dependency.ABSENT_VIOLATION);
            this.emit("depends", module, rule, dependency);
            return dependency;
        });
    }

    produces : RuleBuilder.artifactNominator = (...resolvables: Artifact.Resolvables[]) : Artifact[] =>
    {
        const rule = this.requireCurrentRule('produces'), module = rule.module;
        return resolvables.flat(Infinity).map(obtainArtifactReferenceFrom).map((ref : string) : Artifact => {
            const artifact = this.artifactManager.get(new AID(ref+'').withDefaults({ module: module.name }))
            rule.addOutput(artifact);
            this.emit("produces", module, rule, artifact);
            return artifact;
        });
    }

    after : RuleBuilder.ruleNominator = (...prerequisiteRuleRefs: string[]) : void =>
    {
        this.declareRuleEdges(this.#afterEdges, 'after', ...prerequisiteRuleRefs);
    }

    also : RuleBuilder.ruleNominator = (...peerRuleRefs: string[]) : void =>
    {
        this.declareRuleEdges(this.#alsoEdges, 'also', ...peerRuleRefs);
    }

    private declareRuleEdges(dictionary: Record<string, string[]>, edgeKind: string, ...ruleRefs: string[])
    {
        const ruleFrom = this.requireCurrentRule(edgeKind), module = ruleFrom.module;
        dictionary[ruleFrom.key] = [
            ...(dictionary[ruleFrom.key] || []),
            ...ruleRefs
        ]
        for(let ref of ruleRefs) this.emit(edgeKind, module, ruleFrom, ref);
    }

    always : RuleBuilder.flagSetter = (value?: boolean) => {
        this.requireCurrentRule('always').always = false !== value;
    }

    requireCurrentRule(bindingName: string) : Rule
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
        this.defineRules();
        this.indexRules();
        this.addRuleEdges(this.#afterEdges, 'addPrerequisiteRule');
        this.addRuleEdges(this.#alsoEdges, 'addAlsoRule');
    }

    private defineRules() {
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

    private indexRules() {
        for(let {rule} of this.#declarations) {
            this.project.graph.indexRule(rule);
        }
    }

    private addRuleEdges(
        graphlet: Record<string, string[]>,
        edgeAdderFunctionName: KeysMatching<RuleBuilder, (rule: Rule, otherRuleRef: string) => void>
    ) {
        for(let ruleKey of Object.getOwnPropertyNames(graphlet)) {
            const thisRule = this.project.graph.index.rule.key.get(ruleKey);
            if (!thisRule) {
                //TODO: throw something meaningful instead of ignoring silently, this shouldn't happen!
                continue;
            }
            const otherRuleRefs : string[] | undefined = graphlet[ruleKey];
            if (otherRuleRefs) {
                for(let otherRuleRef of otherRuleRefs) {
                    this[edgeAdderFunctionName](thisRule, otherRuleRef);
                }
            }
        }
    }

    addPrerequisiteRule(dependentRule: Rule, prerequisiteRuleRef: string)
    {
        const prerequisiteRule = this.requireRule(
            dependentRule,
            prerequisiteRuleRef,
            '{1} required as prerequisite for {2} was not found in the graph'
        )
        dependentRule.after[prerequisiteRule.key]=prerequisiteRule;
    }


    addAlsoRule(inducingRule: Rule, inducedRuleRef: string)
    {
        const inducedRule = this.requireRule(
            inducingRule,
            inducedRuleRef,
            '{1} required as also-rule for {2} was not found in the graph'
        );
        inducingRule.addAlso(inducedRule);
    }

    locateRule(referentRule: Rule, anotherRuleRef: string): RuleBuilder.LocateResult
    {
        const parsedResolvedRef : Artifact.Descriptor = Object.assign(
            {
                module: referentRule.module.name,
                ref: ''
            },
            AID.parse(anotherRuleRef) || {},
            {
                type: "rule"
            }
        );
        const resolvedRef = AID.descriptorToString(parsedResolvedRef);
        const ruleKey = Rule.computeKey(resolvedRef);
        const rule = this.project.graph.index.rule.key.get(ruleKey) || null;
        return {rule, resolvedRef};
    }

    requireRule(referentRule: Rule, anotherRuleRef: string, errorMessage: string): Rule
    {
        const {rule, resolvedRef} = this.locateRule(referentRule, anotherRuleRef);
        if (null === rule) {
            throw new Error(errorMessage.replace('{requested}', resolvedRef).replace('{referring}', referentRule.identity));
        }
        return rule;
    }
}
