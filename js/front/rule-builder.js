var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _declarations, _afterEdges, _alsoEdges, _currentRule;
import { Rule } from "../graph/rule.js";
import { resolveArtifacts } from "../module.js";
import { AID } from "../graph/artifact.js";
import { Dependency } from "../graph/dependency.js";
import { reassemble } from "../util/tagged-template.js";
import EventEmitter from "events";
import { obtainArtifactReferenceFrom } from "../util/casts.js";
/***/
export class RuleBuilder extends EventEmitter {
    constructor(project, artifactManager) {
        super();
        _declarations.set(this, []);
        _afterEdges.set(this, {});
        _alsoEdges.set(this, {});
        _currentRule.set(this, null);
        this.depends = (...resolvables) => {
            const rule = this.requireCurrentRule('depends'), module = rule.module;
            return resolvables.flat(Infinity).map(obtainArtifactReferenceFrom).map((ref) => {
                const artifact = this.artifactManager.get(new AID(ref + '').withDefaults({ module: module.name }));
                const dependency = rule.addDependency(artifact, Dependency.ABSENT_VIOLATION);
                this.emit("depends", module, rule, dependency);
                return dependency;
            });
        };
        this.produces = (...resolvables) => {
            const rule = this.requireCurrentRule('produces'), module = rule.module;
            return resolvables.flat(Infinity).map(obtainArtifactReferenceFrom).map((ref) => {
                const artifact = this.artifactManager.get(new AID(ref + '').withDefaults({ module: module.name }));
                rule.addOutput(artifact);
                this.emit("produces", module, rule, artifact);
                return artifact;
            });
        };
        this.after = (...prerequisiteRuleRefs) => {
            this.declareRuleEdges(__classPrivateFieldGet(this, _afterEdges), 'after', ...prerequisiteRuleRefs);
        };
        this.also = (...peerRuleRefs) => {
            this.declareRuleEdges(__classPrivateFieldGet(this, _alsoEdges), 'also', ...peerRuleRefs);
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
        __classPrivateFieldGet(this, _declarations).push(this.createDeclaration(module, rule, definer));
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
        if (!__classPrivateFieldGet(this, _currentRule)) {
            throw new Error(`DSL error: ${bindingName}() cannot be used outside of rule definition callback, even though `
                + 'it is passed to the module definition callback in order to minimize boilerplate');
        }
        return __classPrivateFieldGet(this, _currentRule);
    }
    finalize() {
        this.defineRules();
        this.indexRules();
        this.addRuleEdges(__classPrivateFieldGet(this, _afterEdges), 'addPrerequisiteRule');
        this.addRuleEdges(__classPrivateFieldGet(this, _alsoEdges), 'addAlsoRule');
    }
    defineRules() {
        for (let { rule, boundDefiner, module } of __classPrivateFieldGet(this, _declarations)) {
            this.emit('defining.rule', module, rule);
            __classPrivateFieldSet(this, _currentRule, rule);
            try {
                rule.recipe = boundDefiner();
                this.emit('defined.rule', module, rule);
            }
            finally {
                __classPrivateFieldSet(this, _currentRule, null);
            }
        }
    }
    indexRules() {
        for (let { rule } of __classPrivateFieldGet(this, _declarations)) {
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
_declarations = new WeakMap(), _afterEdges = new WeakMap(), _alsoEdges = new WeakMap(), _currentRule = new WeakMap();
//# sourceMappingURL=rule-builder.js.map