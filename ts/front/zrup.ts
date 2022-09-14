import {array, boolean, HyperVal, optional, record, string, struct} from 'hyperval';

import findUp from "find-up";
import fs from "fs/promises";
import {JobSet} from "../build/job-set.js";
import {RecipeArtifactFactory} from "../graph/artifact/recipe.js";
import {Project} from "../project.js";
import {Db} from "../db.js";
import {ArtifactManager} from "../graph/artifact.js";
import {FileArtifactFactory} from "../graph/artifact/file.js";
import {RuleBuilder} from "./rule-builder.js";
import {ModuleBuilder} from "./module-builder.js";
import path from "path";
import {Build} from "../build.js";
import * as util from "util";
import {Verbosity} from "./verbosity.js";
import Config = Zrup.Config;

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
        this.#verbosity = new Verbosity(request.options.verbose || false);
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

    static async init(absDirectory: string): Promise<void>
    {
        absDirectory = absDirectory || process.cwd();
        process.chdir(absDirectory);
        // noinspection HtmlUnknownTag
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

    static async loadConfig(fromWhere: string): Promise<Config>
    {
        const cfgPath = path.join(fromWhere,'.zrup.json');
        const json = await fs.readFile(cfgPath,'utf-8');
        return JSON.parse(json);
    }

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

const
    schema_Config = struct({
        zrupDir: string(),
        dataDir: string(),
        channels: record(string(), string())
    }),
    schema_RequestOptions = struct({
        version: string(),
        init: optional(boolean()),
        verbose: optional(boolean())
    }),
    schema_Request = struct({
        goals: array(string()),
        options: schema_RequestOptions
    }),
    schema_Options = struct({
        goals: array(string())
    });

export namespace Zrup {
    export type Config = HyperVal<typeof schema_Config>;
    export type RequestOptions = HyperVal<typeof schema_RequestOptions>;
    export type Request = HyperVal<typeof schema_Request>;
    export type Options = HyperVal<typeof schema_Options>;
    export const Schema : {
        Config: typeof schema_Config,
        RequestOptions: typeof schema_RequestOptions,
        Request: typeof schema_Request,
        Options: typeof schema_Options
    } = {
        Config: schema_Config,
        RequestOptions: schema_RequestOptions,
        Request: schema_Request,
        Options: schema_Options
    };
}

