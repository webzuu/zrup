import { formatKeyValueTable } from "../util/format-key-value-table.js";
const C = (label, data) => `\n\x1b[1m${label}\x1b[0m\n${formatKeyValueTable(data, { labelSuffix: ":" })}`;
export class Verbosity {
    constructor(verbose) {
        this.$verbose = verbose;
    }
    hookModuleBuilder(moduleBuilder) {
        if (this.$verbose) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(C('MODULE DEFINED', { Name: name, Path: path }));
            });
        }
    }
    hookRuleBuilder(ruleBuilder, artifactManager) {
        const X = (id) => artifactManager.resolveToExternalIdentifier(id);
        if (this.$verbose) {
            ruleBuilder.on('defining.rule', (module, rule) => {
                console.log(C('DEFINING RULE', { Name: rule.name, Module: module.name }));
            });
            ruleBuilder.on('depends', (module, rule, dependency) => {
                console.log(C('DEPENDENCY REGISTERED', {
                    Module: module.name,
                    Rule: rule.name,
                    "Depends on": X(dependency.artifact.identity)
                }));
            });
            ruleBuilder.on('produces', (module, rule, artifact) => {
                console.log(C('TARGET REGISTERED', {
                    Module: module.name,
                    Rule: rule.name,
                    Target: X(artifact.identity)
                }));
            });
        }
    }
    hookBuild(build, artifactManager) {
        const X = (id) => artifactManager.resolveToExternalIdentifier(id);
        build.on('invoking.recipe', rule => {
            console.log(C('RECIPE INVOKED', {
                Module: rule.module.name,
                "Rule Name": rule.name
            }));
        });
        if (this.$verbose) {
            let concurrency = 0;
            const R = (job) => `${job.rule.module.name}+${job.rule.name}`;
            const A = (key) => artifactManager.findByKey(key);
            const L = (key) => A(key)?.identity || key;
            const THE = (key) => {
                const artifact = A(key);
                return artifact ? `${artifact.identity} ${X(artifact.identity)}` : key;
            };
            build.on('capturing.output', (job, outputFilePath) => {
                console.log(C('CAPTURING OUTPUT', {
                    Job: R(job),
                    "Output Path": outputFilePath
                }));
            });
            build.on('spawned.command', (job, rawExec, args, child) => {
                console.log(C('COMMAND SPAWNED', {
                    Job: R(job),
                    Command: child.spawnfile,
                    Args: child.spawnargs,
                    PID: child.pid,
                    "Recipes running": String(++concurrency),
                }));
            });
            build.on('completed.command', (job, child) => {
                console.log(C('COMMAND COMPLETED', {
                    Job: R(job),
                    Command: child.spawnfile,
                    Args: child.spawnargs,
                    PID: child.pid,
                    "Recipes running": String(--concurrency),
                }));
            });
            build.on('nonexistent.output', (job, { details, artifact }) => {
                console.log(C('NONEXISTENT OUTPUT', {
                    Job: R(job),
                    Artifact: `${artifact.identity} ${X(artifact.key)}`,
                    Details: details
                }));
            });
            build.on('unrecorded.output', (job, { details, artifact }) => {
                console.log(C('UNRECORDED OUTPUT', {
                    Job: R(job),
                    Artifact: `${artifact.identity} ${X(artifact.key)}`,
                    Details: details
                }));
            });
            build.on('incomplete.job', (job, { details }) => {
                console.log(C('INCOMPLETE JOB', {
                    Job: R(job),
                    Details: details
                }));
            });
            build.on('dirty.output', (job, { details, rec, act }) => {
                console.log(C('DIRTY OUTPUT', {
                    Job: R(job),
                    Artifact: THE(rec.target),
                    "Recorded Version": rec.version || "null",
                    "Current Version": act || "null",
                    Details: details
                }));
            });
            build.on('changed.source', (job, { details, source, rec, act }) => {
                console.log(C('CHANGED DEPENDENCY', {
                    Job: R(job),
                    Target: THE(rec.target),
                    Dependency: THE(source.key),
                    "Recorded Version": rec.sourceVersions[source.key] || "null",
                    "Current Version": act || "null",
                    Details: details
                }));
            });
            build.on('unchanged.source', (job, { details, source, rec, act }) => {
                console.log(C('UNCHANGED DEPENDENCY', {
                    Job: R(job),
                    Target: THE(rec.target),
                    Dependency: THE(source.key),
                    "Recorded Version": rec.sourceVersions[source.key] || "null",
                    "Current Version": act || "null",
                    Details: details
                }));
            });
            build.on('missing.records', (job, { details, rec }) => {
                console.log(C('MISSING BUILD RECORDS', {
                    Job: R(job),
                    Target: L(rec.target),
                    Details: details
                }));
            });
        }
    }
}
//# sourceMappingURL=verbosity.js.map