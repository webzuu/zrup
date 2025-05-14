import { Build } from "../build.js";
import { RuleBuilder } from "./rule-builder.js";
import { ArtifactManager } from "../graph/artifact.js";
import { ModuleBuilder } from "./module-builder.js";
export declare class Verbosity {
    private readonly $verbose;
    constructor(verbose: boolean);
    hookModuleBuilder(moduleBuilder: ModuleBuilder): void;
    hookRuleBuilder(ruleBuilder: RuleBuilder, artifactManager: ArtifactManager): void;
    hookBuild(build: Build, artifactManager: ArtifactManager): void;
}
//# sourceMappingURL=verbosity.d.ts.map