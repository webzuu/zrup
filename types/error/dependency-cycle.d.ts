import { Rule } from "../graph/rule.js";
import { Artifact } from "../graph/artifact.js";
export declare class DependencyCycle extends Error {
    chain: Array<{
        rule: Rule;
        artifact: Artifact;
    }>;
    constructor(chain: {
        rule: Rule;
        artifact: Artifact;
    }[]);
}
//# sourceMappingURL=dependency-cycle.d.ts.map