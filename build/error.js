export class BuildError extends Error
{
    constructor(message, previous) {
        super(message);
        this.previous = previous;
    }

    getBuildTraceAsString()
    {
        let trace = this.message;
        if (this.previous instanceof BuildError) trace = trace + "\n"+`because ${this.previous.getBuildTraceAsString()}`;
        else if (this.previous instanceof Error) trace = trace + "\n"+`because ${this.previous.message}\n${this.previous.stack}`;
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