var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _verbose;
export class Verbosity {
    constructor(verbose) {
        _verbose.set(this, void 0);
        __classPrivateFieldSet(this, _verbose, verbose);
    }
    hookModuleBuilder(moduleBuilder) {
        if (__classPrivateFieldGet(this, _verbose)) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(`Defining ${name} ${path}`);
            });
        }
    }
    hookRuleBuilder(ruleBuilder, artifactManager) {
        if (__classPrivateFieldGet(this, _verbose)) {
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
        if (__classPrivateFieldGet(this, _verbose)) {
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
_verbose = new WeakMap();
//# sourceMappingURL=verbosity.js.map