import { Rule } from "../graph/rule.js";
import { Artifact } from "../graph/artifact.js";
declare const inspect: unique symbol;
export declare class BuildError extends Error {
    reason: Error | undefined;
    constructor(message: string, reason?: Error);
    getBuildTraceAsString(): string;
    [inspect](): string;
    static formatRuleFailure(rule: Rule, e: Error): string;
}
export declare class TargetCollision extends Error {
    artifact: Artifact;
    previousRule: Rule;
    previousVersion: string;
    offendingRule: Rule;
    offendingVersion: string;
    constructor(artifact: Artifact, previousRule: Rule, previousVersion: string, offendingRule: Rule, offendingVersion: string);
}
export {};
//# sourceMappingURL=error.d.ts.map