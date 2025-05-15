import { array, boolean, optional, record, string, struct } from 'hyperval';
import findUp from "find-up";
import fs from "fs/promises";
import { RecipeArtifactFactory } from "../graph/artifact/recipe.js";
import { Project } from "../project.js";
import { Db } from "../db.js";
import { ArtifactManager } from "../graph/artifact.js";
import { FileArtifactFactory } from "../graph/artifact/file.js";
import { RuleBuilder } from "./rule-builder.js";
import { ModuleBuilder } from "./module-builder.js";
import path from "path";
import { Build } from "../build.js";
import * as util from "util";
import { Verbosity } from "./verbosity.js";
import { DependencyCycle } from "../error/dependency-cycle.js";
/***/
export class Zrup {
    constructor(projectRoot, config, request) {
        this.$request = request;
        this.$projectRoot = projectRoot;
        const { zrupDir, dataDir, channels } = this.$config = config;
        this.$project = new Project(projectRoot);
        this.$db = new Db(path.join(this.$project.path, dataDir.replace(/<zrupDir>/, zrupDir), 'state.sqlite'));
        this.$artifactManager = new ArtifactManager();
        new FileArtifactFactory(this.$artifactManager, this.$project /*, "file", "" */);
        new RecipeArtifactFactory(this.$artifactManager, this.$project);
        for (let [channel, infix] of Object.entries(channels)) {
            new FileArtifactFactory(this.$artifactManager, this.$project, channel, (infix || '').replace(/<zrupDir>/, zrupDir));
        }
        this.$verbosity = new Verbosity(request.options.verbose || false);
        this.$verbosity.hookRuleBuilder(this.$ruleBuilder = new RuleBuilder(this.$project, this.$artifactManager), this.$artifactManager);
        this.$verbosity.hookModuleBuilder(this.$moduleBuilder = new ModuleBuilder(this.$project, this.$ruleBuilder));
    }
    async run() {
        let hadError = false;
        try {
            console.log("Loading graph");
            this.$ruleBuilder.on('defined.rule', (module, rule) => {
                const targets = new Set(Object.values(rule.outputs).map(artifact => artifact.identity));
                const checked = new Set();
                const cycle = [];
                const check = (rule) => {
                    if (!rule || checked.has(rule.identity))
                        return true;
                    checked.add(rule.identity);
                    for (let [artifactKey, dependency] of Object.entries(rule.dependencies)) {
                        const artifact = dependency.artifact;
                        if (targets.has(artifact.identity) || !check(this.$project.graph.index.rule.key.get(this.$project.graph.index.output.rule.get(artifactKey) ?? ''))) {
                            cycle.unshift({ rule, artifact });
                            return false;
                        }
                    }
                    return true;
                };
                if (!check(rule))
                    throw new DependencyCycle(cycle);
            });
            await this.$moduleBuilder.loadRootModule();
            this.$ruleBuilder.finalize();
            const build = new Build(this.$project.graph, this.$db, this.$artifactManager);
            this.$verbosity.hookBuild(build, this.$artifactManager);
            console.log("Resolving artifacts");
            const requestedArtifacts = this.$request.goals.map(ref => this.$artifactManager.get(ref));
            console.log("Creating top level build jobs");
            const jobSetsPromise = Promise.all(requestedArtifacts.map(async (artifact) => await build.getJobSetForArtifact(artifact, true)));
            console.log("Running build jobs");
            const jobSets = await jobSetsPromise;
            const runs = jobSets.filter((_) => !!_).map(async (jobSet) => await jobSet.run());
            console.time('Running build jobs');
            await Promise.all(runs);
            console.timeEnd('Running build jobs');
            console.log("All done");
        }
        catch (e) {
            if (e instanceof Error) {
                console.error(util.inspect(e), e.message, e.stack);
            }
            hadError = true;
        }
        finally {
            console.log(`Number of data queries:        ${this.$db.queryCount}`);
            console.log(`Data queries took:             ${this.$db.queryTime} ms`);
        }
        if (hadError)
            process.exit(1);
    }
    static async init(absDirectory) {
        absDirectory = absDirectory || process.cwd();
        process.chdir(absDirectory);
        // noinspection HtmlUnknownTag
        const data = {
            zrupDir: ".zrup",
            dataDir: "<zrupDir>/data",
            channels: {
                internal: "<zrupDir>/channels/internal",
                tmp: "<zrupDir>/channels/tmp",
            }
        };
        const json = JSON.stringify(data, null, 4);
        await fs.writeFile(path.join(absDirectory, ".zrup.json"), json);
    }
    static async loadConfig(fromWhere) {
        const cfgPath = path.join(fromWhere, '.zrup.json');
        const json = await fs.readFile(cfgPath, 'utf-8');
        return JSON.parse(json);
    }
    static async locateRoot(cwd) {
        const foundUp = await findUp('.zrup.json', { cwd, type: 'file' });
        if (!foundUp) {
            console.error(`Couldn't locate .zrup.json in current working directory or its parents`);
            process.exit(1);
        }
        return path.dirname(foundUp);
    }
}
const schema_Config = struct({
    zrupDir: string(),
    dataDir: string(),
    channels: record(string(), string()),
    promiseLog: optional(string()),
}), schema_RequestOptions = struct({
    version: optional(boolean()),
    init: optional(boolean()),
    verbose: optional(boolean()),
}), schema_Request = struct({
    goals: array(string()),
    options: schema_RequestOptions
}), schema_Options = struct({
    goals: array(string())
});
(function (Zrup) {
    Zrup.Schema = {
        Config: schema_Config,
        RequestOptions: schema_RequestOptions,
        Request: schema_Request,
        Options: schema_Options
    };
})(Zrup || (Zrup = {}));
//# sourceMappingURL=zrup.js.map