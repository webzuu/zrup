const inspect = Symbol.for('nodejs.util.inspect.custom');
export class BuildError extends Error {
    constructor(message, reason) {
        super(message);
        this.reason = reason;
    }
    getBuildTraceAsString() {
        let trace = this.message;
        if (this.reason instanceof BuildError)
            trace = trace + "\n" + `because ${this.reason.getBuildTraceAsString()}`;
        else if (this.reason instanceof Error)
            trace = trace + "\n" + `because ${this.reason.message}\n${this.reason.stack}`;
        return trace;
    }
    [inspect]() {
        return this.getBuildTraceAsString();
    }
    // noinspection JSUnusedLocalSymbols
    static formatRuleFailure(rule, e) {
        return (`Rule ${rule.label} defined in module ${rule.module.name} in file ${rule.module.pathFromRoot} failed to build`);
    }
}
export class TargetCollision extends Error {
    constructor(artifact, previousRule, previousVersion, offendingRule, offendingVersion) {
        super(`Rule collision: ${offendingRule.label} in module ${offendingRule.module.name} in file ${offendingRule.module.pathFromRoot} produced ${artifact.label}` +
            ` after it was already produced by ${previousRule.label} in module ${previousRule.module.name} in file ${previousRule.module.pathFromRoot}`);
        this.artifact = artifact;
        this.previousRule = previousRule;
        this.previousVersion = previousVersion;
        this.offendingRule = offendingRule;
        this.offendingVersion = offendingVersion;
    }
}
//# sourceMappingURL=error.js.map