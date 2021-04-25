/// <reference types="node" />
import { Rule } from "../graph/rule.js";
import { Module } from "../module.js";
import { Artifact } from "../graph/artifact.js";
import { templateStringTag } from "../util/tagged-template.js";
import { ArtifactManager } from "../graph/artifact.js";
import { Recipe } from "../build/recipe.js";
import EventEmitter from "events";
import { Project } from "../project.js";
import { ModuleBuilder } from "./module-builder.js";
/**
 *
 */
export declare namespace RuleBuilder {
    /**
     * Type of function that accepts a {@link RuleBuilder.definer rule definer} callback and presumably uses it to
     * define a rule. We need this type alias to type the {@link RuleBuilder.DefinerAPI.rule rule} property of the
     * {@link RuleBuilder.DefinerAPI} interface.
     */
    type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer) => any;
    /**
     * Type of user-supplied function whose job is to define a rule using an
     * {@link RuleBuilder.DefinerAPI DefinerAPI} object passed to it.
     */
    type definer = (api: DefinerAPI) => Recipe;
    /**
     * API object for defining rules. It is passed to user-supplied {@link RuleBuilder.definer definer callbacks}.
     */
    interface DefinerAPI {
        /** The {@link Rule} instance being defined. */
        rule: Rule;
        /** {@see ModuleBuilder.DefinerAPI.depends}*/
        depends: RuleBuilder.artifactNominator;
        /** {@see ModuleBuilder.DefinerAPI.produces}*/
        produces: RuleBuilder.artifactNominator;
        /** {@see ModuleBuilder.DefinerAPI.after}*/
        after: RuleBuilder.ruleNominator;
        /** {@see ModuleBuilder.DefinerAPI.always}*/
        always: RuleBuilder.flagSetter;
        /** {@see ModuleBuilder.DefinerAPI.resolve}*/
        resolve: ModuleBuilder.resolve;
        T: templateStringTag;
    }
    /**
     * A function type that receives {@see Artifact.Resolvable artifact-resolvables} and presumably designates the
     * corresponding artifacts as relevant to the rule being built, i.e. as dependencies or outputs.
     */
    type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
    /**
     * A function type that receives rule names and presumably designates the corresponding rules as relevant to
     * the rule being built, i.e. as its after-rules or also-rules.
     */
    type ruleNominator = (...ruleRefs: string[]) => any;
    /**
     * A function type for setting a boolean option on a rule being defined.
     */
    type flagSetter = (value?: boolean) => any;
    /**
     * A function type that internally represents a {@link RuleBuilder.definer rule definer} callback with the
     * `api` parameter pre-bound.
     */
    type boundDefiner = (...args: any[]) => Recipe;
    /**
     * An object type that internally represents a rule definer associated with a rule object and ready to be invoked.
     */
    interface Declaration {
        /** The module to which the rule being defined belongs. */
        module: Module;
        /** The rule being defined. */
        rule: Rule;
        /** User-supplied {@link RuleBuilder.definer rule definer} with pre-bound `api` parameter */
        boundDefiner: RuleBuilder.boundDefiner;
    }
    /**
     * A type for representing the result of looking up a rule by name or rule {@link AID}
     */
    interface LocateResult {
        rule: Rule | null;
        resolvedRef: string;
    }
}
/***/
export declare class RuleBuilder extends EventEmitter {
    #private;
    protected readonly project: Project;
    readonly artifactManager: ArtifactManager;
    constructor(project: Project, artifactManager: ArtifactManager);
    bindDefinerAcceptor(module: Module): RuleBuilder.definerAcceptor;
    acceptDefiner(module: Module, name: string, definer: RuleBuilder.definer): void;
    acceptDefiner(module: Module, definer: RuleBuilder.definer): void;
    private createDeclaration;
    private bindDefiner;
    private bindDefinerArgs;
    depends: RuleBuilder.artifactNominator;
    produces: RuleBuilder.artifactNominator;
    after: RuleBuilder.ruleNominator;
    also: RuleBuilder.ruleNominator;
    private declareRuleEdges;
    always: RuleBuilder.flagSetter;
    requireCurrentRule(bindingName: string): Rule;
    finalize(): void;
    private defineRules;
    private indexRules;
    private addRuleEdges;
    addPrerequisiteRule(dependentRule: Rule, prerequisiteRuleRef: string): void;
    addAlsoRule(inducingRule: Rule, inducedRuleRef: string): void;
    locateRule(referentRule: Rule, anotherRuleRef: string): RuleBuilder.LocateResult;
    requireRule(referentRule: Rule, anotherRuleRef: string, errorMessage: string): Rule;
}
//# sourceMappingURL=rule-builder.d.ts.map