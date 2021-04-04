import {uniqueAdd} from "./util/indexing.js";
import {Rule} from "./graph/rule.js";

interface GraphIndex
{
    output: {
        rule: Map<string, string>;
    };
    rule: {
        key: Map<string, Rule>;
    };
}

export class Graph
{
    protected rule_seq: number;
    index: GraphIndex;
    constructor()
    {
        this.rule_seq=1;
        this.index = {
            rule: {
                key: new Map()
            },
            output: {
                rule: new Map()
            }
        }
    }

    addRule(rule : Rule)
    {
        if (rule.key in this.index.rule.key) return;
        uniqueAdd(this.index.rule.key, rule.key, rule);
        this.indexRule(rule);
    }

    indexRule(rule : Rule)
    {
        for(let output of Object.values(rule.outputs)) this.index.output.rule.set(output.key, rule.key);
    }
}