import { Rule } from "../graph/rule.js";
import { resolveArtifacts } from "../module.js";
import { AID } from "../graph/artifact.js";
import { Dependency } from "../graph/dependency.js";
import { reassemble } from "../util/tagged-template.js";
import EventEmitter from "events";
import { flattenResolvables, obtainArtifactReferenceFrom } from "../util/casts.js";
import { DependencyCycle } from "../error/dependency-cycle.js";
/***/
export class RuleBuilder extends EventEmitter {
    constructor(project, artifactManager) {
        super();
        this.$declarations = [];
        this.$afterEdges = {};
        this.$alsoEdges = {};
        this.$currentRule = null;
        this.depends = (...resolvables) => {
            const rule = this.requireCurrentRule('depends'), module = rule.module;
            return flattenResolvables(resolvables).map(obtainArtifactReferenceFrom).map((ref) => {
                const artifact = this.artifactManager.get(new AID(ref + '').withDefaults({ module: module.name }));
                const dependency = rule.addDependency(artifact, Dependency.ABSENT_VIOLATION);
                this.emit("depends", module, rule, dependency);
                return dependency;
            });
        };
        this.produces = (...resolvables) => {
            const rule = this.requireCurrentRule('produces'), module = rule.module;
            return flattenResolvables(resolvables).map(obtainArtifactReferenceFrom).map((ref) => {
                const artifact = this.artifactManager.get(new AID(ref + '').withDefaults({ module: module.name }));
                rule.addOutput(artifact);
                this.emit("produces", module, rule, artifact);
                return artifact;
            });
        };
        this.after = (...prerequisiteRuleRefs) => {
            this.declareRuleEdges(this.$afterEdges, 'after', ...prerequisiteRuleRefs);
        };
        this.also = (...peerRuleRefs) => {
            this.declareRuleEdges(this.$alsoEdges, 'also', ...peerRuleRefs);
        };
        this.always = (value) => {
            this.requireCurrentRule('always').always = false !== value;
        };
        this.project = project;
        this.artifactManager = artifactManager;
    }
    bindDefinerAcceptor(module) {
        return this.acceptDefiner.bind(this, module);
    }
    acceptDefiner(module, nameOrDefiner, definerWhenNameGiven) {
        const haveName = "string" === typeof nameOrDefiner, name = haveName ? nameOrDefiner : nameOrDefiner.name, definer = haveName ? definerWhenNameGiven : nameOrDefiner, rule = new Rule(module, name);
        this.project.graph.addRule(rule);
        this.$declarations.push(this.createDeclaration(module, rule, definer));
        this.emit('declared.rule', module, rule);
    }
    createDeclaration(module, rule, definer) {
        return {
            module,
            rule,
            boundDefiner: this.bindDefiner(module, rule, definer)
        };
    }
    bindDefiner(module, rule, definer) {
        return definer.bind(null, this.bindDefinerArgs(module, rule));
    }
    bindDefinerArgs(module, rule) {
        const resolve = resolveArtifacts.bind(null, this.artifactManager, module, false);
        return {
            rule,
            depends: this.depends,
            produces: this.produces,
            after: this.after,
            always: this.always,
            resolve,
            T: reassemble.bind(null, (v) => resolve(v).toString())
        };
    }
    declareRuleEdges(dictionary, edgeKind, ...ruleRefs) {
        const ruleFrom = this.requireCurrentRule(edgeKind), module = ruleFrom.module;
        dictionary[ruleFrom.key] = [
            ...(dictionary[ruleFrom.key] || []),
            ...ruleRefs
        ];
        for (let ref of ruleRefs)
            this.emit(edgeKind, module, ruleFrom, ref);
    }
    requireCurrentRule(bindingName) {
        if (!this.$currentRule) {
            throw new Error(`DSL error: ${bindingName}() cannot be used outside of rule definition callback, even though `
                + 'it is passed to the module definition callback in order to minimize boilerplate');
        }
        return this.$currentRule;
    }
    finalize() {
        this.defineRules();
        this.indexRules();
        this.addRuleEdges(this.$afterEdges, 'addPrerequisiteRule');
        this.addRuleEdges(this.$alsoEdges, 'addAlsoRule');
        this.validate();
    }
    validate() {
        const nodes = new Map(this.artifactManager.allReferences.map(ref => [
            this.artifactManager.get(ref).identity,
            {
                artifact: this.artifactManager.get(ref),
                color: 'white',
                depth: 0
            }
        ]));
        const check = (node, path = []) => {
            node.depth = path.length;
            path.push(node);
            if (node.color === 'white') {
                node.color = 'gray';
                const ruleKey = this.project.graph.index.output.rule.get(node.artifact.key);
                if (!ruleKey) {
                    node.color = 'black';
                    return;
                }
                const rule = this.project.graph.index.rule.key.get(ruleKey);
                if (!rule) {
                    node.color = 'black';
                    return;
                }
                for (let dependency of Object.values(rule.dependencies)) {
                    const artifact = dependency.artifact;
                    const artifactNode = nodes.get(artifact.identity);
                    if (!artifactNode)
                        continue;
                    artifactNode.via = rule;
                    check(artifactNode, path);
                }
                node.color = 'black';
            }
            else if (node.color === 'gray') {
                const cycle = path.slice(node.depth).map(({ artifact, via }) => {
                    if (!via) {
                        throw new Error('Internal error: cycle detection failed');
                    }
                    return {
                        artifact, rule: via
                    };
                });
                throw new DependencyCycle(cycle);
            }
        };
        for (let node of nodes.values()) {
            if (node.color === 'white') {
                check(node);
            }
        }
    }
    defineRules() {
        for (let { rule, boundDefiner, module } of this.$declarations) {
            this.emit('defining.rule', module, rule);
            this.$currentRule = rule;
            try {
                rule.recipe = boundDefiner();
                this.emit('defined.rule', module, rule);
            }
            finally {
                this.$currentRule = null;
            }
        }
    }
    indexRules() {
        for (let { rule } of this.$declarations) {
            this.project.graph.indexRule(rule);
        }
    }
    addRuleEdges(graphlet, edgeAdderFunctionName) {
        for (let ruleKey of Object.getOwnPropertyNames(graphlet)) {
            const thisRule = this.project.graph.index.rule.key.get(ruleKey);
            if (!thisRule) {
                //TODO: throw something meaningful instead of ignoring silently, this shouldn't happen!
                continue;
            }
            const otherRuleRefs = graphlet[ruleKey];
            if (otherRuleRefs) {
                for (let otherRuleRef of otherRuleRefs) {
                    this[edgeAdderFunctionName](thisRule, otherRuleRef);
                }
            }
        }
    }
    addPrerequisiteRule(dependentRule, prerequisiteRuleRef) {
        const prerequisiteRule = this.requireRule(dependentRule, prerequisiteRuleRef, '{1} required as prerequisite for {2} was not found in the graph');
        dependentRule.after[prerequisiteRule.key] = prerequisiteRule;
    }
    addAlsoRule(inducingRule, inducedRuleRef) {
        const inducedRule = this.requireRule(inducingRule, inducedRuleRef, '{1} required as also-rule for {2} was not found in the graph');
        inducingRule.addAlso(inducedRule);
    }
    locateRule(referentRule, anotherRuleRef) {
        const parsedResolvedRef = Object.assign({
            module: referentRule.module.name,
            ref: ''
        }, AID.parse(anotherRuleRef) || {}, {
            type: "rule"
        });
        const resolvedRef = AID.descriptorToString(parsedResolvedRef);
        const ruleKey = Rule.computeKey(resolvedRef);
        const rule = this.project.graph.index.rule.key.get(ruleKey) || null;
        return { rule, resolvedRef };
    }
    requireRule(referentRule, anotherRuleRef, errorMessage) {
        const { rule, resolvedRef } = this.locateRule(referentRule, anotherRuleRef);
        if (null === rule) {
            throw new Error(errorMessage.replace('{requested}', resolvedRef).replace('{referring}', referentRule.identity));
        }
        return rule;
    }
}
//# sourceMappingURL=rule-builder.js.map