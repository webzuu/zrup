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
    type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer) => any;
    type definer = (params: DefinerParams) => Recipe;
    type DefinerParams = {
        rule: Rule;
        depends: RuleBuilder.artifactNominator;
        produces: RuleBuilder.artifactNominator;
        after: RuleBuilder.ruleNominator;
        always: RuleBuilder.flagSetter;
        resolve: ModuleBuilder.resolve;
        T: templateStringTag;
    };
    type artifactNominator = (...resolvables: Artifact.Resolvables[]) => any;
    type ruleNominator = (...ruleRefs: string[]) => any;
    type flagSetter = (value?: boolean) => any;
    type boundDefiner = (...args: any[]) => Recipe;
    type Declaration = {
        module: Module;
        rule: Rule;
        boundDefiner: RuleBuilder.boundDefiner;
    };
    type LocateResult = {
        rule: Rule | null;
        resolvedRef: string;
    };
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