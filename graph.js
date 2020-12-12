import md5 from "md5";
import Multimap from "multimap";
import inspect from "inspect";
import {uniqueAdd} from "@zrup/util/indexing";

export class Graph
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
        if (!rule.identity) rule.identity = `${this.rule_seq++}`;
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
        for(let output of rule.outputs) this.index.output.rule.set(output.key, rule.key);
    }

    /**
     *
     * @param {Artifact} artifact
     * @return {Rule|null}
     */
    getRuleFor(artifact)
    {
        const ruleKey = this.index.output.rule.get(artifact.key);
        if (!ruleKey) return null;
        const rule = this.index.rule.key.get(ruleKey);
        if (!rule) {
            throw (`Corrupted graph: no rule with key ${ruleKey} for building ${artifact.label}`);
        }
        return rule;
    }
}