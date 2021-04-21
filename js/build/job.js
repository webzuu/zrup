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
var _prepared;
import { RecipeArtifact } from "../graph/artifact/recipe.js";
import { BuildError } from "./error.js";
import { Dependency } from "../graph/dependency.js";
import { AID } from "../graph/artifact.js";
import { FileArtifact } from "../graph/artifact/file.js";
import { JobSet } from "./job-set.js";
import { resolveArtifacts } from "../module.js";
/**
 *
 */
export class Job {
    constructor(build, rule) {
        this.build = build;
        this.rule = rule;
        _prepared.set(this, false);
        this.recipeInvoked = false;
        this.promise = null;
        this.finished = false;
        this.outputs = [];
        this.dynamicOutputs = [];
        this.error = null;
        this.requestedBy = null;
        this.dependencies = [];
        this.recordedDependencies = [];
        this.verifyBuiltDependency = async (dependency) => {
            const ruleKey = await this.build.getRuleKeyForArtifact(dependency.artifact);
            const rule = ruleKey ? this.build.graph.index.rule.key.get(ruleKey) : null;
            if (!(await dependency.artifact.exists)) {
                if (rule) {
                    throw new BuildError(`${rule.identity} silently failed to build ${dependency.artifact.identity}`);
                }
                else if (dependency.whenAbsent === Dependency.ABSENT_VIOLATION) {
                    throw new BuildError(`No rule to build required ${dependency.artifact.identity}`);
                }
            }
        };
        this.recipeArtifact = RecipeArtifact.makeFor(this);
        this.dependencies.push(new Dependency(this.recipeArtifact, Dependency.ABSENT_VIOLATION));
    }
    async run() {
        try {
            if (this.finished)
                return this;
            return await (this.promise || (this.promise = this.guardedWork()));
        }
        catch (e) {
            throw e; //debug final wrapped error here
        }
    }
    async guardedWork() {
        try {
            await this.work();
            this.finished = true;
            await this.also();
            this.promise = null;
        }
        catch (e) {
            throw new BuildError(BuildError.formatRuleFailure(this.rule, e), e);
        }
        finally {
        }
        return this;
    }
    async also() {
        const alsoJobSet = this.build.getAlsoJobSetForRuleKey(this.rule.key);
        if (alsoJobSet && alsoJobSet.jobs.length > 0) {
            await alsoJobSet.run();
        }
    }
    /**
     * The main build algorithm
     */
    async work() {
        this.prepare();
        const spec = await this.recipeArtifact.spec;
        await this.build.recordReliance(this.rule, this.recipeArtifact);
        const jobSet = await this.getPrerequisiteJobSet();
        await jobSet.run();
        const mergedDependencies = this.getMergedDependencies();
        await Promise.all(mergedDependencies.map(this.verifyBuiltDependency));
        await Promise.all(mergedDependencies.map(async (dependency) => await this.build.recordReliance(this.rule, dependency.artifact)));
        if (!await this.build.isUpToDate(this)) {
            this.build.emit('cleaning.outputs', this.rule);
            await this.build.cleanOutputs(this);
            this.build.emit('invoking.recipe', this.rule);
            this.recipeInvoked = true;
            this.build.db.retractRule(this.rule.key);
            try {
                await this.rule.validRecipe.executeFor(this, spec);
            }
            finally {
                process.stdout.write(this.rule.validRecipe.consoleOutput);
            }
            this.build.emit('invoked.recipe', this.rule);
            await this.detectRewritesAfterUse();
            await this.build.recordStandardVersionInfo(this);
        }
    }
    async getPrerequisiteRuleKeysToDependencyType() {
        const result = {};
        const mergedDeps = this.getMergedDependencies();
        const dependencyRuleKeys = (await Promise.all(mergedDeps.map(async (dep) => await this.build.getRuleKeyForArtifact(dep.artifact)))).filter((_) => null !== _);
        const afterRuleKeys = Object.keys(this.rule.after || {});
        for (let ruleKey of dependencyRuleKeys)
            result[ruleKey] = "dependency";
        for (let ruleKey of afterRuleKeys)
            result[ruleKey] = "after";
        return result;
    }
    /**
     * @returns {Promise<JobSet>}
     */
    async getPrerequisiteJobSet() {
        let jobSet = new JobSet();
        const ruleKeysToDependencyType = await this.getPrerequisiteRuleKeysToDependencyType();
        for (let ruleKey of Object.keys(ruleKeysToDependencyType)) {
            jobSet = jobSet.union(ruleKeysToDependencyType[ruleKey] === "dependency"
                ? this.build.getJobSetForRuleKey(ruleKey)
                : new JobSet(this.build.requireJobForRuleKey(ruleKey)));
        }
        return jobSet;
    }
    getMergedDependencies() {
        const merged = {};
        const concatenated = [
            ...this.recordedDependencies,
            ...this.dependencies
        ];
        for (let dep of concatenated) {
            const key = dep.artifact.key;
            const mergedDep = merged[key];
            if (merged[key] === dep)
                continue;
            if (!mergedDep) {
                merged[key] = dep;
                continue;
            }
            if (mergedDep.whenAbsent === Dependency.ABSENT_STATE
                && dep.whenAbsent !== Dependency.ABSENT_STATE) {
                merged[key] = dep;
                continue;
            }
            if (mergedDep.whenAbsent !== dep.whenAbsent) {
                throw new Error("Non-existence policy conflict between two dependencies on the same artifact");
            }
            merged[key] = dep;
        }
        return Object.values(merged);
    }
    prepare() {
        if (__classPrivateFieldGet(this, _prepared))
            return;
        __classPrivateFieldSet(this, _prepared, true);
        this.preCollectOutputs();
        this.collectDependencies();
    }
    //TODO: test this mechanism!
    async detectRewritesAfterUse() {
        const rewritesAfterUse = ((await Promise.all(this.dynamicOutputs.map(output => this.detectRewriteAfterUse(output))))
            .filter(msg => msg !== null)
            .join("\n"));
        if (rewritesAfterUse.length > 0) {
            throw new BuildError(rewritesAfterUse);
        }
    }
    async detectRewriteAfterUse(outputArtifact) {
        const reliancesByVersion = this.build.getArtifactReliances(outputArtifact.key);
        let versionAfterRewrite = null;
        const versions = Object.keys(reliancesByVersion);
        const violations = {};
        let violationsFound = false;
        if (versions.length > 0) {
            versionAfterRewrite = await outputArtifact.version;
            for (let version of versions) {
                if (version !== versionAfterRewrite) {
                    violationsFound = true;
                    violations[version] = (Object.values(reliancesByVersion[version] ?? {})
                        .map(rule => rule.label));
                }
            }
        }
        if (violationsFound) {
            let msg = `Rewrite after use: ${this.rule.label} wrote ${outputArtifact.identity}, but`;
            for (let version of Object.keys(violations)) {
                msg += "\n\t" + `version ${version} had previously been relied on by:`;
                msg += "\n\t" + (violations[version] ?? []).join("\n\t");
            }
            return msg;
        }
        return null;
    }
    collectDependencies() {
        const dependencies = {}, recordedDependencies = {};
        for (let dependency of Object.values(this.rule.dependencies)) {
            dependencies[dependency.artifact.key] = dependency;
        }
        const dependencyRecords = this.build.db.listRuleSources(this.rule.key)
            .filter(record => !(record.key in dependencies))
            .map(record => this.artifactFromRecord(record))
            .map(artifact => new Dependency(artifact, Dependency.ABSENT_STATE));
        for (let dependency of dependencyRecords) {
            recordedDependencies[dependency.artifact.key] = dependency;
        }
        this.dependencies = [...this.dependencies, ...Object.values(dependencies)];
        this.recordedDependencies = Object.values(recordedDependencies);
    }
    artifactFromRecord(record) {
        return this.build.artifactManager.get(new AID(record.identity).withType(record.type));
    }
    get artifacts() {
        return [
            ...this.outputs,
            ...this.dynamicOutputs,
            ...this.dependencies.map(_ => _.artifact)
        ];
    }
    preCollectOutputs() {
        this.outputs = Object.values(this.rule.outputs);
    }
    async readAutoDependenciesFile(ref) {
        return await Promise.all((await this.readVersionFileList(ref))
            .map(async ([version, ref]) => ({
            version,
            dependency: new Dependency(this.build.artifactManager.get(ref), Dependency.ABSENT_STATE)
        })));
    }
    async readAutoOutputsFile(ref) {
        return await Promise.all((await this.readVersionFileList(ref))
            .map(async ([version, ref]) => ({
            version,
            output: this.build.artifactManager.get(ref)
        })));
    }
    async readVersionFileList(ref, artifactType = "file") {
        const resolveResult = resolveArtifacts(this.build.artifactManager, this.rule.module, false, ref);
        if (resolveResult.length < 1
            || 'string' === typeof resolveResult[0]
            || 'object' !== typeof resolveResult[0]
            || !(resolveResult[0].artifact instanceof FileArtifact)) {
            throw new Error(`${ref} does not refer to a file artifact`);
        }
        const artifact = resolveResult[0].artifact;
        // noinspection UnnecessaryLocalVariableJS
        const debugResult = ((await artifact.contents)
            .trim()
            .split("\n")
            .map(_ => _.trim())
            .filter(_ => _ !== '')
            .map((_, n) => {
            const matches = _.match(/^([0-9A-Fa-f]{32}) [ *](.*)$/);
            if (Array.isArray(matches)) {
                const [line, version, refField] = matches;
                if (undefined !== version && undefined !== refField) {
                    return [
                        version,
                        `${artifactType}:${this.rule.module.name}+${refField}`
                    ];
                }
            }
            throw new Error(`In file ${ref} at line ${n + 1} - invalid filelist line "${_}"`);
        }));
        return debugResult;
    }
}
_prepared = new WeakMap();
//# sourceMappingURL=job.js.map