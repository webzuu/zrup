import { Rule } from "./graph/rule.js";
interface GraphIndex {
    output: {
        rule: Map<string, string>;
    };
    rule: {
        key: Map<string, Rule>;
    };
}
export declare class Graph {
    protected rule_seq: number;
    index: GraphIndex;
    constructor();
    addRule(rule: Rule): void;
    indexRule(rule: Rule): void;
}
export {};
//# sourceMappingURL=graph.d.ts.map