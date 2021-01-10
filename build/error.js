export class BuildError extends Error
{
    /**
     * @param {string} message
     * @param {Error} [reason]
     */
    constructor(message, reason) {
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

    /**
     * @param {Rule} rule
     * @param {Error} e
     */
    static formatRuleFailure(rule, e)
    {
        return (
            `Rule ${rule.label} failed to build`
        )
    }
}

export class TargetCollision extends Error
{
    artifact;
    previousRule;
    previousVersion;
    offendingRule;
    offendingVersion;
    /**
     *
     * @param {Artifact} artifact
     * @param {Rule} previousRule
     * @param {string} previousVersion
     * @param {Rule} offendingRule
     * @param {string} offendingVersion
     */
    constructor(artifact, previousRule, previousVersion, offendingRule, offendingVersion)
    {
        super(
            `Rule collision: ${offendingRule.label} produced ${artifact.label}` +
            ` after it was already produced by ${previousRule.label}`
        );
        this.artifact = artifact;
        this.previousRule = previousRule;
        this.previousVersion = previousVersion;
        this.offendingRule = offendingRule;
        this.offendingVersion = offendingVersion;
    }
}