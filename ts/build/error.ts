import {Rule} from "../graph/rule.js";
import {Artifact} from "../graph/artifact.js";

const inspect = Symbol.for('nodejs.util.inspect.custom');

export class BuildError extends Error
{
    reason: Error | undefined;
    constructor(message : string, reason?: Error) {
        super(message);
        this.reason = reason;
    }

    getBuildTraceAsString()
    {
        let trace = this.message;
        if (this.reason instanceof BuildError) trace = trace + "\n"+`because ${this.reason.getBuildTraceAsString()}`;
        else if (this.reason instanceof Error) trace = trace + "\n"+`because ${this.reason.message}\n${this.reason.stack}`;
        return trace;
    }

    [inspect]()
    {
        return this.getBuildTraceAsString();
    }

    // noinspection JSUnusedLocalSymbols
    static formatRuleFailure(rule : Rule, e: Error)
    {
        return (
            `Rule ${rule.label} failed to build`
        )
    }
}

export class TargetCollision extends Error

{
    constructor(
        public artifact: Artifact,
        public previousRule: Rule,
        public previousVersion: string,
        public offendingRule: Rule,
        public offendingVersion: string
    )
    {
        super(
            `Rule collision: ${offendingRule.label} produced ${artifact.label}` +
            ` after it was already produced by ${previousRule.label}`
        );
    }
}