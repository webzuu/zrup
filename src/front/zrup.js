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
var _request, _projectRoot, _config, _project, _db, _artifactManager, _ruleBuilder, _moduleBuilder, _verbosity;
import { struct, array, string, record, boolean, optional } from 'hyperval';
import findUp from "find-up";
import fs from "fs/promises";
import { JobSet } from "../build/job-set.js";
import { Job } from "../build/job.js";
import { NopRecipe, Recipe } from "../build/recipe.js";
import { CommandRecipe } from "../build/recipe/command.js";
import { DelayedRecipe } from "../build/recipe/delayed.js";
import { WrapperRecipe } from "../build/recipe/wrapper.js";
import { MockArtifact, MockFileFactory } from "../graph/artifact/mock.js";
import { RecipeArtifact, RecipeArtifactFactory, RecipeArtifactResolver } from "../graph/artifact/recipe.js";
import { Project } from "../project.js";
import { Db } from "../db.js";
import { AID, Artifact, ArtifactFactory, ArtifactManager } from "../graph/artifact.js";
import { FileArtifact, FileArtifactFactory, FileArtifactResolver } from "../graph/artifact/file.js";
import { RuleBuilder } from "./rule-builder.js";
import { ModuleBuilder } from "./module-builder.js";
import path from "path";
import { Build } from "../build.js";
import * as util from "util";
import { Verbosity } from "./verbosity.js";
import { resolveArtifacts } from "../module.js";
import { Rule } from "../graph/rule.js";
import { Dependency } from "../graph/dependency.js";
/***/
export class Zrup {
    constructor(projectRoot, config, request) {
        _request.set(this, void 0);
        _projectRoot.set(this, void 0);
        _config.set(this, void 0);
        _project.set(this, void 0);
        _db.set(this, void 0);
        _artifactManager.set(this, void 0);
        _ruleBuilder.set(this, void 0);
        _moduleBuilder.set(this, void 0);
        _verbosity.set(this, void 0);
        __classPrivateFieldSet(this, _request, request);
        __classPrivateFieldSet(this, _projectRoot, projectRoot);
        const { zrupDir, dataDir, channels } = __classPrivateFieldSet(this, _config, config);
        __classPrivateFieldSet(this, _project, new Project(projectRoot));
        __classPrivateFieldSet(this, _db, new Db(path.join(__classPrivateFieldGet(this, _project).path, dataDir.replace(/<zrupDir>/, zrupDir), 'state.sqlite')));
        __classPrivateFieldSet(this, _artifactManager, new ArtifactManager());
        new FileArtifactFactory(__classPrivateFieldGet(this, _artifactManager), __classPrivateFieldGet(this, _project));
        new RecipeArtifactFactory(__classPrivateFieldGet(this, _artifactManager), __classPrivateFieldGet(this, _project));
        for (let [channel, infix] of Object.entries(channels)) {
            new FileArtifactFactory(__classPrivateFieldGet(this, _artifactManager), __classPrivateFieldGet(this, _project), channel, (infix || '').replace(/<zrupDir>/, zrupDir));
        }
        __classPrivateFieldSet(this, _verbosity, new Verbosity(request.options.verbose || false));
        __classPrivateFieldGet(this, _verbosity).hookRuleBuilder(__classPrivateFieldSet(this, _ruleBuilder, new RuleBuilder(__classPrivateFieldGet(this, _project), __classPrivateFieldGet(this, _artifactManager))), __classPrivateFieldGet(this, _artifactManager));
        __classPrivateFieldGet(this, _verbosity).hookModuleBuilder(__classPrivateFieldSet(this, _moduleBuilder, new ModuleBuilder(__classPrivateFieldGet(this, _project), __classPrivateFieldGet(this, _ruleBuilder))));
    }
    async run() {
        try {
            console.log("Loading graph");
            await __classPrivateFieldGet(this, _moduleBuilder).loadRootModule();
            __classPrivateFieldGet(this, _ruleBuilder).finalize();
            const build = new Build(__classPrivateFieldGet(this, _project).graph, __classPrivateFieldGet(this, _db), __classPrivateFieldGet(this, _artifactManager));
            __classPrivateFieldGet(this, _verbosity).hookBuild(build);
            console.log("Resolving artifacts");
            const requestedArtifacts = __classPrivateFieldGet(this, _request).goals.map(ref => __classPrivateFieldGet(this, _artifactManager).get(ref));
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
            console.error(util.inspect(e), e.message, e.stack);
        }
        finally {
            console.log(`Number of data queries:        ${__classPrivateFieldGet(this, _db).queryCount}`);
            console.log(`Data queries took:             ${__classPrivateFieldGet(this, _db).queryTime} ms`);
        }
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
_request = new WeakMap(), _projectRoot = new WeakMap(), _config = new WeakMap(), _project = new WeakMap(), _db = new WeakMap(), _artifactManager = new WeakMap(), _ruleBuilder = new WeakMap(), _moduleBuilder = new WeakMap(), _verbosity = new WeakMap();
const schema_Config = struct({
    zrupDir: string(),
    dataDir: string(),
    channels: record(string(), string())
}), schema_RequestOptions = struct({
    version: string(),
    init: optional(boolean()),
    verbose: optional(boolean())
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
export class ZrupAPI {
    constructor() {
        this.Artifact = Artifact;
        this.AID = AID;
        this.FileArtifact = FileArtifact;
        this.RecipeArtifact = RecipeArtifact;
        this.MockArtifact = MockArtifact;
        this.Dependency = Dependency;
        this.ArtifactManager = ArtifactManager;
        this.ArtifactFactory = ArtifactFactory;
        this.FileArtifactFactory = FileArtifactFactory;
        this.FileArtifactResolver = FileArtifactResolver;
        this.RecipeArtifactFactory = RecipeArtifactFactory;
        this.RecipeArtifactResolver = RecipeArtifactResolver;
        this.MockFileFactory = MockFileFactory;
        this.Db = Db;
        this.Build = Build;
        this.Job = Job;
        this.JobSet = JobSet;
        this.Rule = Rule;
        this.Recipe = Recipe;
        this.NopRecipe = NopRecipe;
        this.CommandRecipe = CommandRecipe;
        this.WrapperRecipe = WrapperRecipe;
        this.DelayedRecipe = DelayedRecipe;
        this.ModuleBuilder = ModuleBuilder;
        this.RuleBuilder = RuleBuilder;
        this.Zrup = Zrup;
        this.resolveArtifacts = resolveArtifacts;
    }
}
//# sourceMappingURL=zrup.js.map