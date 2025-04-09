import {Build} from "../build.js";
import {RuleBuilder} from "./rule-builder.js";
import {ArtifactManager,Artifact} from "../graph/artifact.js";
import {ModuleBuilder} from "./module-builder.js";
import { Job } from "../build/job.js";
import RecordedVersionInfo = Build.RecordedVersionInfo;
import {formatKeyValueTable} from "../util/format-key-value-table.js";

const C = (label: string, data: Record<string, string>) => `\n\x1b[1m${label}\x1b[0m\n${formatKeyValueTable(data, {labelSuffix: ":"})}`;

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
                console.log(C('MODULE DEFINED', {Name: name, Path: path}));
            });
        }
    }

    hookRuleBuilder(ruleBuilder: RuleBuilder, artifactManager: ArtifactManager)
    {
        const X = (id: string) => artifactManager.resolveToExternalIdentifier(id);
        if (this.#verbose) {
            ruleBuilder.on('defining.rule', (module, rule) => {
                console.log(C('DEFINING RULE', {Name: rule.name, Module: module.name}));
            });
            ruleBuilder.on('depends',(module,rule,dependency) => {
                console.log(C(
                    'DEPENDENCY REGISTERED',
                    {
                        Module: module.name,
                        Rule: rule.name,
                        "Depends on": X(dependency.artifact.identity)
                    }
                ));
            });
            ruleBuilder.on('produces',(module,rule,artifact) => {
                console.log(C(
                    'TARGET REGISTERED',
                    {
                        Module: module.name,
                        Rule: rule.name,
                        Target: X(artifact.identity)
                    }
                ))
            });
        }
    }

    hookBuild(build: Build, artifactManager: ArtifactManager)
    {
        const X = (id: string) => artifactManager.resolveToExternalIdentifier(id);
        build.on('invoking.recipe',rule => {
            console.log(C(
                'RECIPE INVOKED',
                {
                    Module: rule.module.name,
                    "Rule Name": rule.name
                }
            ))
        });
        if (this.#verbose) {
            const R = (job: Job) => `${job.rule.module.name}+${job.rule.name}`;
            const A = (key: string) => artifactManager.findByKey(key);
            const L = (key: string) => A(key)?.identity || key;
            const THE = (key: string) => {
                const artifact = A(key);
                return artifact ? `${artifact.identity} ${X(artifact.identity)}` : key;
            };
            build.on('capturing.output',(job, outputFilePath) => {
                console.log(C(
                    'CAPTURING OUTPUT',
                    {
                        Job: R(job),
                        "Output Path": outputFilePath
                    }
                ))
            });
            // noinspection JSUnusedLocalSymbols
            build.on('spawning.command', (job, rawExec, args, child) =>{
                console.log(C(
                    'SPAWNING COMMAND',
                    {
                        Job: R(job),
                        Command: rawExec,
                        Args: [args].flat(Infinity).join(' ')
                    }
                ))
            });
            build.on(
                'spawned.command',
                (job, rawExec, args, child) => {
                    console.log(C(
                        'COMMAND SPAWNED',
                        {
                            Job: R(job),
                            Command: child.spawnfile,
                            Args: child.spawnargs,
                            PID: child.pid
                        }
                    ));
                }
            );
            build.on(
                'completed.command',
                (job,child) => {
                    console.log(C(
                        'COMMAND COMPLETED',
                        {
                            Job: R(job),
                            Command: child.spawnfile,
                            Args: child.spawnargs,
                            PID: child.pid
                        }
                    ));
                }
            );
            build.on(
                'nonexistent.output',
                (job, {details, artifact}: {details: string, artifact: Artifact}) => {
                    console.log(C(
                        'NONEXISTENT OUTPUT',
                        {
                            Job: R(job),
                            Artifact: `${artifact.identity} ${X(artifact.key)}}`,
                            Details: details
                        }
                    ));
                }
            );
            build.on(
                'unrecorded.output',
                (job, {details, artifact}: {details: string, artifact: Artifact}) => {
                    console.log(C(
                        'UNRECORDED OUTPUT',
                        {
                            Job: R(job),
                            Artifact: `${artifact.identity} ${X(artifact.key)}`,
                            Details: details
                        }
                    ));
                }
            );
            build.on(
                'incomplete.job',
                (job, {details}: {details: string}) => {
                    console.log(C(
                        'INCOMPLETE JOB',
                        {
                            Job: R(job),
                            Details: details
                        }
                    ));
                }
            );
            build.on(
                'dirty.output',
                (
                    job,
                    { details, rec, act }
                    : { details: string, rec: RecordedVersionInfo, act: string | null }
                ) => {
                    console.log(C(
                        'DIRTY OUTPUT',
                        {
                            Job: R(job),
                            Artifact: THE(rec.target),
                            "Recorded Version": rec.version || "null",
                            "Current Version": act || "null",
                            Details: details
                        }
                    ))
                }
            );
            build.on(
                'changed.source',
                (
                    job,
                    {details, source, rec, act}
                    : { details: string, source: Artifact, rec: RecordedVersionInfo, act: string | null }
                ) => {
                    console.log(C(
                        'CHANGED DEPENDENCY',
                        {
                            Job: R(job),
                            Target: THE(rec.target),
                            Dependency: THE(source.key),
                            "Recorded Version": rec.sourceVersions[source.key] || "null",
                            "Current Version": act || "null",
                            Details: details
                        }
                    ))
                }
            );
            build.on(
                'missing.records',
                (
                    job,
                    { details, rec }
                    : { details: string, rec: RecordedVersionInfo }
                ) => {
                    console.log(C(
                        'MISSING BUILD RECORDS',
                        {
                            Job: R(job),
                            Target: L(rec.target),
                            Details: details
                        }
                    ))
                }
            );
        }
    }
}