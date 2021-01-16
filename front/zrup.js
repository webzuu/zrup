import findUp from "find-up";
import fs from "fs/promises";
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
import {ChildProcess} from "child_process";

/**
 * @typedef {Object.<string,*>} Zrup~Config
 * @property {string} zrupDir
 * @property {string} dataDir
 * @property {Object.<string, string>} channels
 */

/**
 * @typedef {Object.<string,*>} Zrup~Options
 * @property {string[]} goals
 */

/***/
export class Zrup
{
    /** @type {string} */
    #projectRoot

    /** @type {Zrup~Config} */
    #config;

    /** @type {Project} */
    #project

    /** @type {Db} */
    #db

    /** @type {ArtifactManager} */
    #artifactManager

    /** @type {RuleBuilder} */
    #ruleBuilder

    /** @type {ModuleBuilder} */
    #moduleBuilder

    /**
     * @param {string} projectRoot
     * @param {Zrup~Config} config
     */
    constructor(projectRoot, config) {
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
        this.#ruleBuilder = new RuleBuilder(this.#project, this.#artifactManager);
        this.#moduleBuilder = new ModuleBuilder(this.#project, this.#ruleBuilder);

        this.#moduleBuilder.on('defined.module', (module, path, name) => {
            console.log(`Defining ${name} ${path}`);
        });

        this.#ruleBuilder.on('defining.rule', (module, rule) => {
            console.log(`Rule ${module.name}+${rule.name}`);
        });

        this.#ruleBuilder.on('depends',(module,rule,dependency) => {
            console.log(`Depends on ${this.#artifactManager.resolveToExternalIdentifier(dependency.artifact.identity)}`);
        });

        this.#ruleBuilder.on('produces',(module,rule,artifact) => {
            console.log(`Produces ${this.#artifactManager.resolveToExternalIdentifier(artifact.identity)}`);
        })
    }


    /**
     * @param {Zrup~Options} options
     * @return {Promise<void>}
     */
    async run(options) {

        try {
            console.log("Loading graph");
            await this.#moduleBuilder.loadRootModule();
            this.#ruleBuilder.finalize();
            const build = new Build(this.#project.graph, this.#db, this.#artifactManager);

            build.on('invoking.recipe',rule => {
                console.log(`Invoking recipe for rule ${rule.module.name}+${rule.name}`);
            });

            build.on('capturing.output',(job, outputFilePath) => {
                console.log(`${job.rule.module.name}+${job.rule.name}: > ${outputFilePath}`);
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

            console.log("Resolving artifacts");
            const requestedArtifacts = options.goals.map(ref => this.#artifactManager.get(ref));
            console.log("Creating top level build jobs");
            const jobsPromise = Promise.all(requestedArtifacts.map(async artifact => await build.getJobForArtifact(artifact)));
            console.log("Running build jobs");
            const jobs = await jobsPromise;
            const runs = jobs.map(async job => await job.run());
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
    static async init(absDirectory)
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
    static async loadConfig(fromWhere)
    {
        const cfgPath = path.join(fromWhere,'.zrup.json');
        const json = await fs.readFile(cfgPath,'utf-8');
        return JSON.parse(json);
    }

    /**
     * @param cwd
     * @return {Promise<string>}
     */
    static async locateRoot(cwd)
    {
        return path.dirname(await findUp('.zrup.json', {cwd, type: 'file'}));
    }
}

