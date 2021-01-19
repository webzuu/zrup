export const Verbosity = class Verbosity {

    /** @type {boolean} */
    #verbose;

    /** @param {boolean} verbose */
    constructor(verbose)
    {
        this.#verbose = verbose;
    }

    /** @param {ModuleBuilder} moduleBuilder */
    hookModuleBuilder(moduleBuilder)
    {
        if (this.#verbose) {
            moduleBuilder.on('defined.module', (module, path, name) => {
                console.log(`Defining ${name} ${path}`);
            });
        }
    }

    /**
     * @param {RuleBuilder} ruleBuilder
     * @param {ArtifactManager} artifactManager
     */
    hookRuleBuilder(ruleBuilder, artifactManager)
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

    /** @param {Build} build */
    hookBuild(build)
    {
        build.on('invoking.recipe',rule => {
            console.log(`Invoking recipe for rule ${rule.module.name}+${rule.name}`);
        });
        if (this.#verbose) {
            build.on('capturing.output',(job, outputFilePath) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: > ${outputFilePath}`);
            });
            build.on('spawning.command', (job, rawExec, args, child) =>{
                console.log(`${job.rule.module.name}+${job.rule.name}: spawning ${rawExec} ${[args].flat().join(' ')}`)
            });
            build.on(
                'spawned.command',
                (job,child) => {
                    console.log(`${job.rule.module.name}+${job.rule.name}: spawned ${child.spawnfile} ${child.spawnargs}`);
                }
            );
            build.on(
                'completed.command',
                (job,child) => {
                    console.log(`${job.rule.module.name}+${job.rule.name}: completed ${child.spawnfile} ${child.spawnargs}`);
                }
            );
        }
    }
};