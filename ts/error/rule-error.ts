import { Rule } from "../graph/rule";

export default class RuleError extends Error
{
    constructor(public rule: Rule, public previous?: Error)
    {
        const message = previous ? previous.message.split("\n") : [];
        super([
            `Error in rule ${rule.name}`,
            `   defined in module ${rule.module.name}`,
            `   in file ${rule.module.pathFromRoot}`,
            ...message.map(line => `        ${line}`)
        ].join("\n"));
    }
}