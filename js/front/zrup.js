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
var _Zrup_request, _Zrup_projectRoot, _Zrup_config, _Zrup_project, _Zrup_db, _Zrup_artifactManager, _Zrup_ruleBuilder, _Zrup_moduleBuilder, _Zrup_verbosity;
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
/***/
export class Zrup {
    constructor(projectRoot, config, request) {
        _Zrup_request.set(this, void 0);
        _Zrup_projectRoot.set(this, void 0);
        _Zrup_config.set(this, void 0);
        _Zrup_project.set(this, void 0);
        _Zrup_db.set(this, void 0);
        _Zrup_artifactManager.set(this, void 0);
        _Zrup_ruleBuilder.set(this, void 0);
        _Zrup_moduleBuilder.set(this, void 0);
        _Zrup_verbosity.set(this, void 0);
        __classPrivateFieldSet(this, _Zrup_request, request, "f");
        __classPrivateFieldSet(this, _Zrup_projectRoot, projectRoot, "f");
        const { zrupDir, dataDir, channels } = __classPrivateFieldSet(this, _Zrup_config, config, "f");
        __classPrivateFieldSet(this, _Zrup_project, new Project(projectRoot), "f");
        __classPrivateFieldSet(this, _Zrup_db, new Db(path.join(__classPrivateFieldGet(this, _Zrup_project, "f").path, dataDir.replace(/<zrupDir>/, zrupDir), 'state.sqlite')), "f");
        __classPrivateFieldSet(this, _Zrup_artifactManager, new ArtifactManager(), "f");
        new FileArtifactFactory(__classPrivateFieldGet(this, _Zrup_artifactManager, "f"), __classPrivateFieldGet(this, _Zrup_project, "f") /*, "file", "" */);
        new RecipeArtifactFactory(__classPrivateFieldGet(this, _Zrup_artifactManager, "f"), __classPrivateFieldGet(this, _Zrup_project, "f"));
        for (let [channel, infix] of Object.entries(channels)) {
            new FileArtifactFactory(__classPrivateFieldGet(this, _Zrup_artifactManager, "f"), __classPrivateFieldGet(this, _Zrup_project, "f"), channel, (infix || '').replace(/<zrupDir>/, zrupDir));
        }
        __classPrivateFieldSet(this, _Zrup_verbosity, new Verbosity(request.options.verbose || false), "f");
        __classPrivateFieldGet(this, _Zrup_verbosity, "f").hookRuleBuilder(__classPrivateFieldSet(this, _Zrup_ruleBuilder, new RuleBuilder(__classPrivateFieldGet(this, _Zrup_project, "f"), __classPrivateFieldGet(this, _Zrup_artifactManager, "f")), "f"), __classPrivateFieldGet(this, _Zrup_artifactManager, "f"));
        __classPrivateFieldGet(this, _Zrup_verbosity, "f").hookModuleBuilder(__classPrivateFieldSet(this, _Zrup_moduleBuilder, new ModuleBuilder(__classPrivateFieldGet(this, _Zrup_project, "f"), __classPrivateFieldGet(this, _Zrup_ruleBuilder, "f")), "f"));
    }
    async run() {
        try {
            console.log("Loading graph");
            await __classPrivateFieldGet(this, _Zrup_moduleBuilder, "f").loadRootModule();
            __classPrivateFieldGet(this, _Zrup_ruleBuilder, "f").finalize();
            const build = new Build(__classPrivateFieldGet(this, _Zrup_project, "f").graph, __classPrivateFieldGet(this, _Zrup_db, "f"), __classPrivateFieldGet(this, _Zrup_artifactManager, "f"));
            __classPrivateFieldGet(this, _Zrup_verbosity, "f").hookBuild(build);
            console.log("Resolving artifacts");
            const requestedArtifacts = __classPrivateFieldGet(this, _Zrup_request, "f").goals.map(ref => __classPrivateFieldGet(this, _Zrup_artifactManager, "f").get(ref));
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
            console.log(`Number of data queries:        ${__classPrivateFieldGet(this, _Zrup_db, "f").queryCount}`);
            console.log(`Data queries took:             ${__classPrivateFieldGet(this, _Zrup_db, "f").queryTime} ms`);
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
_Zrup_request = new WeakMap(), _Zrup_projectRoot = new WeakMap(), _Zrup_config = new WeakMap(), _Zrup_project = new WeakMap(), _Zrup_db = new WeakMap(), _Zrup_artifactManager = new WeakMap(), _Zrup_ruleBuilder = new WeakMap(), _Zrup_moduleBuilder = new WeakMap(), _Zrup_verbosity = new WeakMap();
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
//# sourceMappingURL=zrup.js.map