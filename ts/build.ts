import EventEmitter from "events";
import {BuildError} from "./build/error.js";
import {JobSet} from "./build/job-set.js";
import {Job} from "./build/job.js";
import {Db} from "./db.js";
import {Artifact, ArtifactManager} from "./graph/artifact.js";
import {Dependency} from "./graph/dependency.js";
import {Graph} from "./graph";
import throwThe from "./util/throw-error";
import {Rule} from "./graph/rule";

interface BuildIndex {
    rule : {
        job : Map<string, Job>,
        jobSet: Map<string, JobSet>
    }
}

type WhichRulesReliedOnArtifactVersion = Record<string, Build.ArtifactRelianceInfo>;
type WhichArtifactVersionDidRuleRelyOn = Record<string, Record<string, string>>;
type RecordedVersionInfo = {
    target: string,
    version: string | null,
    sourceVersions: Record<string, string>
}

export namespace Build {

    export type RuleIndex = Record<string, Rule>;
    export type ArtifactRelianceInfo = Record<string, RuleIndex>;
}

/**
 * Class that manages transient information necessary to fulfill a particular build request.
 */
export class Build extends EventEmitter  {


    #whichRulesReliedOnArtifactVersion : WhichRulesReliedOnArtifactVersion = {};
    #whichArtifactVersionDidRuleRelyOn : WhichArtifactVersionDidRuleRelyOn = {};
    public index : BuildIndex;

    constructor(
        public readonly graph: Graph,
        public readonly db: Db,
        public readonly artifactManager: ArtifactManager
    )
    {
        super();
        this.index = {
            rule: {
                job: new Map<string, Job>(),
                jobSet: new Map<string, JobSet>()
            }
        }
    }

    async getJobFor(dependency: Dependency, require: boolean = false): Promise<Job | null>
    {
        return await this.getJobForArtifact(dependency.artifact, require);
    }

    async getJobSetFor(dependency: Dependency, require: boolean = false): Promise<(JobSet | null)>
    {
        return await this.getJobSetForArtifact(dependency.artifact,require);
    }

    async getJobForArtifact(artifact: Artifact, require: boolean = false): Promise<Job | null>
    {
        return this.getJobForRuleKey(
            await (
                require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    async getJobSetForArtifact(artifact: Artifact, require: boolean = false): Promise<(JobSet | null)>
    {
        return this.getJobSetForRuleKey(
            await (
                require
                    ? this.requireRuleKeyForArtifact(artifact)
                    : this.getRuleKeyForArtifact(artifact)
            )
        );
    }

    getJobForRuleKey(ruleKey: string | null): Job | null
    {
        if (!ruleKey) return null;
        if (!this.index.rule.job.has(ruleKey)) {
            const job = new Job(
                this,
                this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(
                    `Internal error: rule with key ${ruleKey} was not present in the graph`
                ))
            );
            this.index.rule.job.set(
                ruleKey,
                job
            );
        }
        return this.index.rule.job.get(ruleKey) || null;
    }

    getJobSetForRuleKey(ruleKey: string | null): JobSet | null
    {
        if (!ruleKey) return null;
        const mainJob = this.getJobForRuleKey(ruleKey);
        if (!mainJob) return null;
        return new JobSet(mainJob);
    }

    getAlsoJobSetForRuleKey(ruleKey : string | null) : JobSet | null
    {
        if (!ruleKey) return null;
        const rule : Rule = this.graph.index.rule.key.get(ruleKey) || throwThe(new BuildError(
            `Internal error: requested an also-job set for rule with key "${ruleKey}", `+
            `but a rule with that key was not found in the graph`
        ));
        let jobSet = new JobSet();
        for (let alsoRule of Object.values(rule.also || {})) {
            jobSet = jobSet.union(this.getJobSetForRuleKey(alsoRule.key));
        }
        return jobSet;
    }

    async getRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<(string | null)>
    {
        if(!artifact.caps.canBuild) return null;
        const key = artifact.key;
        let ruleKey = this.graph.index.output.rule.get(key);
        if (ruleKey) return ruleKey;
        ruleKey = this.db.getProducingRule(key, "undefined"===typeof version ? await artifact.version : version) || undefined;
        if (ruleKey && this.graph.index.rule.key.has(ruleKey)) {
            return ruleKey;
        }
        return null;
    }

    async requireRuleKeyForArtifact(artifact: Artifact, version?: string): Promise<string>
    {
        const ruleKey = await this.getRuleKeyForArtifact(artifact, version);
        if (null===ruleKey) {
            throw new BuildError(
                `No rule to build requested ${artifact.identity}`
            );
        }
        return ruleKey;
    }

    getRecordedVersionInfo = async (output: Artifact): Promise<RecordedVersionInfo> => {
        const nonresult = {
            target: output.key,
            version: null,
            sourceVersions: {}
        }
        if (!(await output.exists)) return nonresult;
        const version = await output.version;
        const versionSourcesResult = this.db.listVersionSources(output.key, version as string);
        const sourceVersions : Record<string, string> = {};
        for(let row of versionSourcesResult) {
            sourceVersions[row.source] = row.version;
        }
        return {
            target: output.key,
            version,
            sourceVersions
        };
    };

    async recordVersionInfo(job: Job, dependencies: Dependency[], outputs: Artifact[]): Promise<void>
    {
        type RecordedDepInfo = { dependency: Dependency; version: string };
        const depInfos: RecordedDepInfo[] = dependencies.map((dependency) => ({
            dependency: dependency,
            version: this.getVersionReliedOn(job.rule, dependency.artifact, true)
        })).filter( (v) : v is RecordedDepInfo => !!v.version);
        const outputInfos = await Promise.all(outputs.map(async output => ({
            output,
            version: await output.version
        })));
        const transaction = this.createRecordVersionInfoTransaction(outputInfos, depInfos, job);
        transaction();
    }

    createRecordVersionInfoTransaction(
        outputInfos: { output: Artifact; version: string; }[],
        depInfos: { dependency: Dependency; version: string; }[],
        job: Job
    ) {
        return this.db.db.transaction(() => {
            this.recordArtifacts([
                ...outputInfos.map(_ => _.output),
                ...depInfos.map(_ => _.dependency.artifact)
            ]);
            for (let outputInfo of outputInfos) {
                const outputVersion = outputInfo.version;
                for (let depInfo of depInfos) {
                    this.db.record(
                        outputInfo.output.key,
                        outputVersion,
                        job.rule.key,
                        depInfo.dependency.artifact.key,
                        depInfo.version
                    );
                }
            }
        });
    }

    async recordStandardVersionInfo(job : Job)
    {
        await this.recordVersionInfo(
            job,
            [...job.dependencies],
            [...job.outputs,...job.dynamicOutputs]
        );
    }

    recordArtifacts(artifacts: Artifact[])
    {
        for (let artifact of artifacts) this.db.recordArtifact(
            artifact.key, artifact.type, artifact.identity
        );
    }

    async getActualVersionInfo(artifacts: Artifact[]): Promise<Record<string, string|null>>
    {
        const actualSourceVersions : Record<string, string|null> = {};
        const artifactsUnique = [...new Set(artifacts).values()];
        await Promise.all(
            artifactsUnique.map(
                async (artifact) => {
                    actualSourceVersions[artifact.key] =
                        (await artifact.exists) ? (await artifact.version) : null;
                }
            )
        );
        return actualSourceVersions;
    }

    async isUpToDate(job: Job): Promise<boolean>
    {
        job.prepare();
        const rule = job.rule;
        if (rule.always) {
            return false;
        }
        const outputs = job.outputs;
        let outputRecords = this.db.listRuleTargets(rule.key);
        const recordedOutputs = outputRecords.map(output => this.artifactManager.get(output.identity));
        const recordedOutputsByKey : Record<string, Artifact> = {};
        for(let o of recordedOutputs) recordedOutputsByKey[o.key] = o;
        const allOutputs = [...new Set([...outputs, ...recordedOutputs]).values()];
        const allOutputsExistAndHaveBuildRecords =
            (await Promise.all(allOutputs.map(
                async artifact => (await artifact.exists) && (artifact.key in recordedOutputsByKey)
            ))).reduce((previous, current) => previous && current, true);
        if (!allOutputsExistAndHaveBuildRecords) {
            return false;
        }
        const [recordedSourceVersionsByOutput, actualSourceVersions, actualOutputVersions] = await Promise.all([
            Promise.all(allOutputs.map(this.getRecordedVersionInfo)),
            this.getActualVersionInfo([...job.dependencies, ...job.recordedDependencies].map(d => d.artifact)),
            this.getActualVersionInfo(allOutputs)
        ]);
        for(let recordedVersionsInfo of recordedSourceVersionsByOutput) {

            if (actualOutputVersions[recordedVersionsInfo.target] !== recordedVersionsInfo.version) {
                return false;
            }
            const recordedSourceKeys = Object.keys(recordedVersionsInfo.sourceVersions);
            let hadRecordedSources = false;
            for(let recordedSourceKey of recordedSourceKeys) {
                hadRecordedSources = true;
                if (
                    recordedVersionsInfo.sourceVersions[recordedSourceKey]
                    !== actualSourceVersions[recordedSourceKey]
                ) {
                    return false;
                }
            }
            if (!hadRecordedSources) return false;
        }
        return true;
    }

    async cleanOutputs(job: Job): Promise<void>
    {
        let outputRecords = this.db.listRuleTargets(job.rule.key);
        await Promise.all(outputRecords.map(async output => {
            const outputArtifact = this.artifactManager.get(output.identity);
            if ('function' === typeof outputArtifact.rm) {
                await outputArtifact.rm();
            }
        }));
    }

    getArtifactReliances(artifactKey: string) : Record<string, Record<string, Rule>>
    {
        const result : Record<string, Record<string, Rule>> = {};
        for(let version of Object.getOwnPropertyNames(this.#whichRulesReliedOnArtifactVersion[artifactKey] || {}))
        {
            result[version] = Object.assign({},this.#whichRulesReliedOnArtifactVersion[artifactKey][version]);
        }
        return result;
    }

    async recordReliance(rule: Rule, artifact: Artifact): Promise<void>
    {
        const reliancesByVersion : Record<string, Record<string, Rule>> = (
            this.#whichRulesReliedOnArtifactVersion[artifact.key]
            || (this.#whichRulesReliedOnArtifactVersion[artifact.key] = {})
        );

        const version = await artifact.version;

        if (version in reliancesByVersion) {
            reliancesByVersion[version][rule.key] = rule;
        }
        else if (Object.getOwnPropertyNames(reliancesByVersion).length > 0) {
            throw new BuildError(this.formatRelianceConflictMessage(
                reliancesByVersion,
                artifact,
                version,
                rule
            ));
        }
        else {
            reliancesByVersion[version] = { [rule.key]: rule };
        }

        const reliancesByRule = (
            this.#whichArtifactVersionDidRuleRelyOn[rule.key]
            || (this.#whichArtifactVersionDidRuleRelyOn[rule.key] = {})
        );
        reliancesByRule[artifact.key] = version;
    }

    getVersionReliedOn(rule: Rule, artifact: Artifact, required: boolean): string | undefined
    {
        let result;
        if (rule.key in this.#whichArtifactVersionDidRuleRelyOn) {
            result = this.#whichArtifactVersionDidRuleRelyOn[rule.key][artifact.key];
        }
        if (!result && required) {
            throw new BuildError(
                `Internal error: unrecorded reliance info for rule ${rule.label} on ${artifact.identity} was requested`
            )
        }
        return result;
    }

    formatRelianceConflictMessage(
        relianceInfo: Build.ArtifactRelianceInfo,
        artifact : Artifact,
        version : string,
        rule : Rule
    )
    {
        let msg = (
            `Build conflict: ${rule.label} relied on ${artifact.label}@${version}, but previous reliances`
            +` on different versions were recorded:`
        );
        for (let previousVersion in Object.getOwnPropertyNames(relianceInfo))
        {
            msg += "\n" + `@${version} was relied upon by:`
            msg += "\n\t" + (
                Object.values(relianceInfo[previousVersion])
                    .map(_ => _.label)
                    .join("\n\t")
            )
        }
        return msg;
    }

    requireJobForRuleKey(ruleKey: string) : Job{
        return this.getJobForRuleKey(ruleKey) || throwThe(new Error(
            `Internal error: unable to obtain build job for rule with key ${ruleKey}`
        ));
    }
}