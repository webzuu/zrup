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
export class Verbosity {
    constructor(verbose) {
        _Verbosity_verbose.set(this, void 0);
        __classPrivateFieldSet(this, _Verbosity_verbose, verbose, "f");
    }
    hookModuleBuilder(moduleBuilder) {
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(`Defining ${name} ${path}`);
            });
        }
    }
    hookRuleBuilder(ruleBuilder, artifactManager) {
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
            ruleBuilder.on('defining.rule', (module, rule) => {
                console.log(`Rule ${module.name}+${rule.name}`);
            });
            ruleBuilder.on('depends', (module, rule, dependency) => {
                console.log(`Depends on ${artifactManager.resolveToExternalIdentifier(dependency.artifact.identity)}`);
            });
            ruleBuilder.on('produces', (module, rule, artifact) => {
                console.log(`Produces ${artifactManager.resolveToExternalIdentifier(artifact.identity)}`);
            });
        }
    }
    hookBuild(build) {
        build.on('invoking.recipe', rule => {
            console.log(`Invoking recipe for rule ${rule.module.name}+${rule.name}`);
        });
        if (__classPrivateFieldGet(this, _Verbosity_verbose, "f")) {
            build.on('capturing.output', (job, outputFilePath) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: > ${outputFilePath}`);
            });
            // noinspection JSUnusedLocalSymbols
            build.on('spawning.command', (job, rawExec, args, child) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: spawning ${rawExec} ${[args].flat(Infinity).join(' ')}`);
            });
            build.on('spawned.command', (job, child) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: spawned ${child.spawnfile} ${child.spawnargs}`);
            });
            build.on('completed.command', (job, child) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: completed ${child.spawnfile} ${child.spawnargs}`);
            });
        }
    }
}
_Verbosity_verbose = new WeakMap();
//# sourceMappingURL=verbosity.js.map