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
    export type definerAcceptor = (
        nameOrDefiner: string|definer,
        definerOpt?: definer
    ) => any;
    export type definer = (params: DefinerParams) => Recipe;
    export type DefinerParams = {
        rule: Rule,
        depends: RuleBuilder.artifactNominator,
        produces: RuleBuilder.artifactNominator,
        after: RuleBuilder.ruleNominator,
        always: RuleBuilder.flagSetter,
        resolve: ModuleBuilder.resolve,
        T: templateStringTag
    }
    export type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
    export type ruleNominator = (...ruleRefs: string[]) => any;
    export type flagSetter = (value?: boolean) => any;
    export type boundDefiner = (...args: any[]) => Recipe;
    export type Declaration = {
        module: Module,
        rule: Rule,
        boundDefiner: RuleBuilder.boundDefiner
    }
    export type LocateResult = {
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

    private bindDefinerArgs(module: Module, rule: Rule): RuleBuilder.DefinerParams {
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
