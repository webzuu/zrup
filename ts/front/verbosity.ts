import {Build} from "../build.js";
import {RuleBuilder} from "./rule-builder.js";
import {ArtifactManager,Artifact} from "../graph/artifact.js";
import {ModuleBuilder} from "./module-builder.js";
import { Job } from "../build/job.js";
import RecordedVersionInfo = Build.RecordedVersionInfo;

export class Verbosity {

    readonly #verbose: boolean;

    constructor(verbose: boolean)
    {
        this.#verbose = verbose;
    }

    hookModuleBuilder(moduleBuilder: ModuleBuilder)
    {
        if (this.#verbose) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(`Defining ${name} ${path}`);
            });
        }
    }

    hookRuleBuilder(ruleBuilder: RuleBuilder, artifactManager: ArtifactManager)
    {
        if (this.#verbose) {
            ruleBuilder.on('defining.rule', (module, rule) => {
                console.log(`Rule ${module.name}+${rule.name}`);
            });
            ruleBuilder.on('depends',(module,rule,dependency) => {
                console.log(`Depends on ${artifactManager.resolveToExternalIdentifier(dependency.artifact.identity)}`);
            });
            ruleBuilder.on('produces',(module,rule,artifact) => {
                console.log(`Produces ${artifactManager.resolveToExternalIdentifier(artifact.identity)}`);
            });
        }
    }

    hookBuild(build: Build, artifactManager: ArtifactManager)
    {
        build.on('invoking.recipe',rule => {
            console.log(`Invoking recipe for rule ${rule.module.name}+${rule.name}`);
        });
        if (this.#verbose) {
            const R = (job: Job) => `${job.rule.module.name}+${job.rule.name}`
            const L = (key: string) => artifactManager.findByKey(key)?.label || key;
            build.on('capturing.output',(job, outputFilePath) => {
                console.log(`${R(job)}: > ${outputFilePath}`);
            });
            // noinspection JSUnusedLocalSymbols
            build.on('spawning.command', (job, rawExec, args, child) =>{
                console.log(`${R(job)}: spawning ${rawExec} ${[args].flat(Infinity).join(' ')}`)
            });
            build.on(
                'spawned.command',
                (job, rawExec, args, child) => {
                    console.log(`${R(job)}: spawned ${child.spawnfile} ${child.spawnargs}`);
                }
            );
            build.on(
                'completed.command',
                (job,child) => {
                    console.log(`${R(job)}: completed ${child.spawnfile} ${child.spawnargs}`);
                }
            );
            build.on(
                'nonexistent.output',
                (job, {details, artifact}: {details: string, artifact: Artifact}) => {
                    console.log(`${R(job)}: ${details} ${artifact.key}`);
                }
            );
            build.on(
                'unrecorded.output',
                (job, {details, artifact}: {details: string, artifact: Artifact}) => {
                    console.log(`${R(job)}: ${details} ${artifact.key}`);
                }
            );
            build.on(
                'incomplete.job',
                (job, {details}: {details: string}) => {
                    console.log(`${R(job)}: ${details}`);
                }
            );
            build.on(
                'dirty.output',
                (
                    job,
                    {
                        details,
                        rec,
                        act
                    }:{
                        details: string,
                        rec: RecordedVersionInfo
                        act: string | null
                    }
                ) => {
                    console.log(`${R(job)}: ${L(rec.target)} ${details} from ${rec.version} to ${act}`);
                }
            );
            build.on(
                'changed.source',
                (
                    job,
                    {
                        details,
                        sourceKey,
                        rec,
                        actualVersion
                    } : {
                        details: string,
                        sourceKey: string,
                        rec: RecordedVersionInfo,
                        actualVersion: string | null
                    }
                ) => {
                    console.log(`${R(job)}: ${details}: ${L(rec.target)} built from ${L(sourceKey)} in version ${rec.sourceVersions[sourceKey]}, but current version is ${actualVersion}`);
                }
            );
            build.on(
                'missing.records',
                (
                    job,
                    {
                        details,
                        rec
                    } : {
                        details: string,
                        rec: RecordedVersionInfo
                    }
                ) => {
                    console.log(`${R(job)}: ${details} ${L(rec.target)}`);
                }
            );
        }

    }
}