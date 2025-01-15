export default class RuleError extends Error {
    constructor(rule, previous) {
        const message = previous ? previous.message.split("\n") : [];
        super([
            `Error in rule ${rule.name}`,
            `   defined in module ${rule.module.name}`,
            `   in file ${rule.module.pathFromRoot}`,
            ...message.map(line => `        ${line}`)
        ].join("\n"));
        this.rule = rule;
        this.previous = previous;
    }
}
//# sourceMappingURL=rule-error.js.map