/// <reference types="node" />
import { RuleBuilder } from "./rule-builder.js";
/**
 *
 */
export declare namespace ModuleBuilder {
    type definerAcceptor = (nameOrDefiner: string | definer, definerOpt?: definer | undefined) => any;
    type definer = (params: DefinerParams) => any;
    type DefinerParams = {
        module: Module;
        include: includeNominator;
        rule: RuleBuilder.definerAcceptor;
        depends: RuleBuilder.artifactNominator;
        produces: RuleBuilder.artifactNominator;
        after: RuleBuilder.ruleNominator;
        to: CommandRecipe.simpleDescriptorBuilderAcceptor;
        always: RuleBuilder.flagSetter;
        also: RuleBuilder.ruleNominator;
        resolve: ModuleBuilder.resolve;
        API: ZrupAPI;
    };
    type resolve = (items: Artifact.Resolvables) => (string | ResolveArtifactResult)[];
    type includeNominator = (...includes: string[]) => Promise<string[]>;
    type Descriptor = {
        name: string;
        definer: definer;
    };
}
/***/
import { CommandRecipe } from "../build/recipe/command.js";
import { Module, ResolveArtifactResult } from "../module.js";
import { ZrupAPI } from "./zrup.js";
import EventEmitter from "events";
import { Artifact } from "../graph/artifact";
import { Project } from "../project";
export declare class ModuleBuilder extends EventEmitter {
    #private;
    constructor(project: Project, ruleBuilder: RuleBuilder);
    get project(): Project;
    define(parentModule: Module | null, path: string, name: string, definer: ModuleBuilder.definer): Promise<void>;
    private bindDefinerArgs;
    includeMany(parentModule: Module, ...subpaths: string[]): Promise<string[]>;
    loadModule(parentModule: Module, subpath: string): Promise<string>;
    loadRootModule(): Promise<void>;
    private static normalizeDefiner;
    private static describeDefiner;
    private import;
    private getSpecFileBasename;
    private resolveModuleBase;
}
//# sourceMappingURL=module-builder.d.ts.map