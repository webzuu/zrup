import { Build } from "../build.js";
import { RuleBuilder } from "./rule-builder.js";
import { ArtifactManager } from "../graph/artifact.js";
import { ModuleBuilder } from "./module-builder.js";
export declare class Verbosity {
    #private;
    constructor(verbose: boolean);
    hookModuleBuilder(moduleBuilder: ModuleBuilder): void;
    hookRuleBuilder(ruleBuilder: RuleBuilder, artifactManager: ArtifactManager): void;
    hookBuild(build: Build): void;
}
//# sourceMappingURL=verbosity.d.ts.map