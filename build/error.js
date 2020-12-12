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
     */
    static formatRuleFailure(rule)
    {
        const firstTarget = rule.outputs[0];
        let msg = `${firstTarget.label}`;
        if (rule.outputs.length > 1) msg = msg + " (and more)";
        msg = msg + " failed to build";
        return msg;
    }
}