import * as findUp from "find-up";
import fs from "fs/promises";
import {Project} from "../project";
import {Db} from "../db";
import {ArtifactManager} from "../graph/artifact";
import {FileArtifactFactory} from "../graph/artifact/file";
import {RuleBuilder} from "./rule-builder";
import {ModuleBuilder} from "./module-builder";
import path from "path";
import {Build} from "../build";
import * as util from "util";

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

    /** @type

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
     * @param {Zrup~Config} [config]
     */
    constructor(projectRoot, config)
    {
        this.#projectRoot = projectRoot;
        const {zrupDir,dataDir,channels} = this.#config = config || Zrup.loadConfig(this.#projectRoot);
        this.#project = new Project(projectRoot);
        this.#db = new Db(path.join(this.#project.path, dataDir.replace(/<zrupDir>/,zrupDir)));
        this.#artifactManager = new ArtifactManager();
        new FileArtifactFactory(this.#artifactManager, this.#project /*, "file", "" */);
        for(let [channel, infix] in Object.entries(channels)) {
            new FileArtifactFactory(
                this.#artifactManager,
                this.#project,
                channel,
                infix.replace(/<zrupDir>/,zrupDir)
            )
        }
        this.#ruleBuilder = new RuleBuilder(this.#project, this.#artifactManager);
        this.#moduleBuilder = new ModuleBuilder(this.#project, this.#ruleBuilder);
    }

    /**
     * @param {Zrup~Options} options
     * @return {Promise<void>}
     */
    async run(options) {

        try {
            const build = new Build(this.#project.graph, this.#db, this.#artifactManager);
            console.log("Resolving artifacts");
            const requestedArtifacts = options.goals.map(ref => this.#artifactManager.get(ref));
            console.log("Creating top level build jobs");
            const jobs = Promise.all(requestedArtifacts.map(async artifact => await build.getJobForArtifact(artifact)));
            console.log("Running build jobs");
            const runs = jobs.map(async job => await job.run());
            await Promise.all(runs);
            console.log("All done");
        }
        catch(e) {
            console.err(util.inspect(e));
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
        return JSON.parse(await fs.readFile(path.join(fromWhere,'.zrup.json'),'utf-8'));
    }

    static async locateRoot(cwd)
    {
        await findUp('.zrup.json', {cwd, type: file});
    }
}

