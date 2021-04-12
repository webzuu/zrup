import findUp from "find-up";
import fs from "fs/promises";
import {JobSet} from "../build/job-set";
import {Job} from "../build/job";
import {NopRecipe, Recipe} from "../build/recipe";
import {CommandRecipe} from "../build/recipe/command";
import {DelayedRecipe} from "../build/recipe/delayed";
import {WrapperRecipe} from "../build/recipe/wrapper";
import {MockArtifact, MockFileFactory} from "../graph/artifact/mock";
import {RecipeArtifact, RecipeArtifactFactory, RecipeArtifactResolver} from "../graph/artifact/recipe";
import {Project} from "../project";
import {Db} from "../db";
import {AID, Artifact, ArtifactFactory, ArtifactManager} from "../graph/artifact";
import {FileArtifact, FileArtifactFactory, FileArtifactResolver} from "../graph/artifact/file";
import {RuleBuilder} from "./rule-builder";
import {ModuleBuilder} from "./module-builder";
import path from "path";
import {Build} from "../build";
import * as util from "util";
import {Verbosity} from "./verbosity";
import {resolveArtifacts} from "../module";
import {Rule} from "../graph/rule";

export namespace Zrup {
    export type Config = {
        zrupDir: string,
        dataDir: string,
        channels: Record<string,string>
    }
    export type RequestOptions = {
        init: boolean,
        verbose: boolean
    }
    export type Request = {
        goals: string[],
        options: RequestOptions
    }
    export type Options = {
        goals: string[]
    }
}

/***/
export class Zrup

{
    #request: Zrup.Request;

    #projectRoot: string;

    #config: Zrup.Config;

    readonly #project: Project;

    readonly #db: Db;

    readonly #artifactManager: ArtifactManager;

    readonly #ruleBuilder: RuleBuilder;

    #moduleBuilder: ModuleBuilder;

    #verbosity: Verbosity;


    constructor(projectRoot: string, config: Zrup.Config, request: Zrup.Request) {
        this.#request = request;
        this.#projectRoot = projectRoot;
        const {zrupDir, dataDir, channels} = this.#config = config;
        this.#project = new Project(projectRoot);
        this.#db = new Db(path.join(
            this.#project.path,
            dataDir.replace(/<zrupDir>/, zrupDir),
            'state.sqlite'
        ));
        this.#artifactManager = new ArtifactManager();
        new FileArtifactFactory(this.#artifactManager, this.#project /*, "file", "" */);
        new RecipeArtifactFactory(this.#artifactManager, this.#project);
        for (let [channel, infix] of Object.entries(channels)) {
            new FileArtifactFactory(
                this.#artifactManager,
                this.#project,
                channel,
                (infix || '').replace(/<zrupDir>/, zrupDir)
            )
        }
        this.#verbosity = new Verbosity(request.options.verbose);
        this.#verbosity.hookRuleBuilder(
            this.#ruleBuilder = new RuleBuilder(this.#project, this.#artifactManager),
            this.#artifactManager
        );
        this.#verbosity.hookModuleBuilder(
            this.#moduleBuilder = new ModuleBuilder(this.#project, this.#ruleBuilder)
        );
    }

    async run() {

        try {
            console.log("Loading graph");
            await this.#moduleBuilder.loadRootModule();
            this.#ruleBuilder.finalize();
            const build = new Build(this.#project.graph, this.#db, this.#artifactManager);
            this.#verbosity.hookBuild(build);
            console.log("Resolving artifacts");
            const requestedArtifacts = this.#request.goals.map(ref => this.#artifactManager.get(ref));
            console.log("Creating top level build jobs");
            const jobSetsPromise = Promise.all(
                requestedArtifacts.map(async artifact => await build.getJobSetForArtifact(artifact,true))
            );
            console.log("Running build jobs");
            const jobSets = await jobSetsPromise;
            const runs = jobSets.filter((_) : _ is JobSet => !!_).map(async jobSet => await jobSet.run());
            console.time('Running build jobs');
            await Promise.all(runs);
            console.timeEnd('Running build jobs');
            console.log("All done");
        }
        catch(e) {
            console.error(util.inspect(e), e.message, e.stack);
        }
        finally {
            console.log(`Number of data queries:        ${this.#db.queryCount}`);
            console.log(`Data queries took:             ${this.#db.queryTime} ms`);
        }
    }

    /**
     * @param {string} [absDirectory]
     * @return {Promise<void>}
     */
    static async init(absDirectory: string): Promise<void>
    {
        absDirectory = absDirectory || process.cwd();
        process.chdir(absDirectory);
        const data = {
            zrupDir: ".zrup",
            dataDir: "<zrupDir>/data",
            channels: {
                internal:           "<zrupDir>/channels/internal",
                tmp:                "<zrupDir>/channels/tmp",
            }
        }
        const json = JSON.stringify(data, null, 4);
        await fs.writeFile(path.join(absDirectory,".zrup.json"),json);
    }

    /**
     *
     * @param {string} fromWhere
     * @return {Promise<void>}
     */
    static async loadConfig(fromWhere: string): Promise<void>
    {
        const cfgPath = path.join(fromWhere,'.zrup.json');
        const json = await fs.readFile(cfgPath,'utf-8');
        return JSON.parse(json);
    }

    /**
     * @param cwd
     * @return {Promise<string>}
     */
    static async locateRoot(cwd: string): Promise<string>
    {
        const foundUp = await findUp('.zrup.json', {cwd, type: 'file'});
        if (!foundUp) {
            console.error(`Couldn't locate .zrup.json in current working directory or its parents`);
            process.exit(1);
        }
        return path.dirname(foundUp);
    }
}

export class ZrupAPI
{
    Artifact = Artifact;
        AID = AID;
        FileArtifact = FileArtifact;
        RecipeArtifact = RecipeArtifact;
        MockArtifact = MockArtifact

    ArtifactManager = ArtifactManager;

    ArtifactFactory = ArtifactFactory;
        FileArtifactFactory = FileArtifactFactory;
            FileArtifactResolver = FileArtifactResolver;
        RecipeArtifactFactory = RecipeArtifactFactory;
            RecipeArtifactResolver = RecipeArtifactResolver;
        MockFileFactory = MockFileFactory;

    Db = Db;

    Build = Build;
        Job = Job;
        JobSet = JobSet;
        Rule = Rule;
        Recipe = Recipe;
            NopRecipe = NopRecipe;
            CommandRecipe = CommandRecipe;
            WrapperRecipe = WrapperRecipe;
            DelayedRecipe = DelayedRecipe;

    ModuleBuilder = ModuleBuilder;
    RuleBuilder = RuleBuilder;
    Zrup = Zrup;
    resolveArtifacts = resolveArtifacts;
}
