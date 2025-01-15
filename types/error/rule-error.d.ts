import { Rule } from "../graph/rule";
export default class RuleError extends Error {
    rule: Rule;
    previous?: Error | undefined;
    constructor(rule: Rule, previous?: Error | undefined);
}
//# sourceMappingURL=rule-error.d.ts.map