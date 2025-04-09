var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Verbosity_verbose;
import { formatKeyValueTable } from "../util/format-key-value-table.js";
const C = (label, data) => `\n\x1b[1m${label}\x1b[0m\n${formatKeyValueTable(data, { labelSuffix: ":" })}`;
export class Verbosity {
    constructor(verbose) {
        _Verbosity_verbose.set(this, void 0);
        __classPrivateFieldSet(this, _Verbosity_verbose, verbose, "f");
    }
    hookModuleBuilder(moduleBuilder) {
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(C('MODULE DEFINED', { Name: name, Path: path }));
            });
        }
    }
    hookRuleBuilder(ruleBuilder, artifactManager) {
        const X = (id) => artifactManager.resolveToExternalIdentifier(id);
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
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
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
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
            // noinspection JSUnusedLocalSymbols
            build.on('spawning.command', (job, rawExec, args, child) => {
                console.log(C('SPAWNING COMMAND', {
                    Job: R(job),
                    Command: rawExec,
                    Args: [args].flat(Infinity).join(' ')
                }));
            });
            build.on('spawned.command', (job, rawExec, args, child) => {
                console.log(C('COMMAND SPAWNED', {
                    Job: R(job),
                    Command: child.spawnfile,
                    Args: child.spawnargs,
                    PID: child.pid
                }));
            });
            build.on('completed.command', (job, child) => {
                console.log(C('COMMAND COMPLETED', {
                    Job: R(job),
                    Command: child.spawnfile,
                    Args: child.spawnargs,
                    PID: child.pid
                }));
            });
            build.on('nonexistent.output', (job, { details, artifact }) => {
                console.log(C('NONEXISTENT OUTPUT', {
                    Job: R(job),
                    Artifact: `${artifact.identity} ${X(artifact.key)}}`,
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
_Verbosity_verbose = new WeakMap();
//# sourceMappingURL=verbosity.js.map