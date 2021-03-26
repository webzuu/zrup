import {uniqueAdd} from "./util/indexing.js";
import {Rule} from "./graph/rule.js";

export const Graph = class Graph

{
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

    /**
     * @param {Rule} rule
     */
    addRule(rule)
    {
        if (rule.key in this.index.rule.key) return;
        uniqueAdd(this.index.rule.key, rule.key, rule);
        this.indexRule(rule);
    }

    /**
     *
     * @param {Rule} rule
     */
    indexRule(rule)
    {
        for(let output of Object.values(rule.outputs)) this.index.output.rule.set(output.key, rule.key);
    }
}