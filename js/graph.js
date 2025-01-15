import { uniqueAdd } from "./util/indexing.js";
import RuleError from "./error/rule-error.js";
export class Graph {
    constructor() {
        this.rule_seq = 1;
        this.index = {
            rule: {
                key: new Map()
            },
            output: {
                rule: new Map()
            }
        };
    }
    addRule(rule) {
        if (rule.key in this.index.rule.key)
            return;
        try {
            uniqueAdd(this.index.rule.key, rule.key, rule);
            this.indexRule(rule);
        }
        catch (e) {
            throw new RuleError(rule, e instanceof Error ? e : undefined);
        }
    }
    indexRule(rule) {
        for (let output of Object.values(rule.outputs))
            this.index.output.rule.set(output.key, rule.key);
    }
}
//# sourceMappingURL=graph.js.map