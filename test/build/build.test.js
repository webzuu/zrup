import fs from "fs";
const fsp = fs.promises;
import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;

import path from "path";

import {MockFileFactory} from "../../graph/artifact/mock.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { DbTesting } from "../../util/testing.js";
import { Graph } from "../../graph.js";
import { PromiseKeeper } from "../../util/promise-keeper.js";
import { Recipe } from "../../build/recipe.js";
import md5 from "md5";
import {Rule} from "../../graph/rule.js";
import { Build } from "../../build.js";
import { BuildError } from "../../build/error.js";
import { Dependency } from "../../graph/dependency.js";
import {Project} from "../../project.js";
import {Artifact, ArtifactManager} from "../../graph/artifact.js";
import {Module} from "../../module.js";
import {FileArtifactFactory} from "../../graph/artifact/file.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));


class MakeItExistRecipe extends Recipe
{
    #pk;

    constructor(pk) {
        super();
        this.#pk = pk;
    }

    async executeFor(job) {
        const onlyTarget = job.outputs[0];
        const key = onlyTarget.key;
        const sourceVersions = await Promise.all(
            job.dependencies.map(
                dep => (async () => [
                    ["key", dep.key],
                    ["version", await dep.version]
                ])()
            )
        );
        sourceVersions.sort((lhs,rhs) => lhs[0][1].localeCompare(rhs[0][1]));
        const hash = md5(JSON.stringify(sourceVersions));
        this.#pk.set(key, "exists",  true);
        this.#pk.set(key, "version", hash);
    }
}

function simple()
{
    const pk = new PromiseKeeper();
    const g = new Graph();
    const makeTarget = new MakeItExistRecipe(pk);
    const prj = new Project(t.tmpDir.toString());
    Module.createRoot(prj, "test");
    const manager = new ArtifactManager();
    new MockFileFactory(manager, prj, pk);
    const target = manager.get('file:w.nginx');
    const source = manager.get('file:obey/w.nginx.php');
    const rule = new Rule(prj.rootModule, "w.nginx");
    rule.addDependency(source);
    rule.addOutput(target);
    rule.recipe = makeTarget;
    g.addRule(rule);
    const build = new Build(g, t.db, manager);
    return {pk,g,target,source,makeTarget,rule,build,prj,manager};
}

const nil = {}
/**
 *
 * @param {PromiseKeeper} pk
 * @param {Object.<string, *>} answers
 */
function answers(pk, answers)
{
    for(let key of Object.keys(answers)) {
        if(nil !== answers[key][0]) pk.set(key,"exists",answers[key][0]);
        if (false === answers[key][0]) {
            pk.set(key,"version",Artifact.NONEXISTENT_VERSION)
        }
        else if(nil !== answers[key][1]) {
            pk.set(key, "version", answers[key][1]);
        }
    }
}

describe("Build", () => {

    t.setup();

    it("gets empty recorded version info if artifact doesn't exist", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        (pk.about(target.key,"exists").resolve)(false);
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.object();
        expect(versionInfo.version).to.be.null;
        expect(versionInfo.sourceVersions).to.be.object();
        expect(versionInfo.sourceVersions).to.be.empty;
    });

    it("gets empty recorded version if artifact was never built", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [true,"142857"]
        });
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.object();
        expect(versionInfo.version).to.equal("142857");
        expect(versionInfo.sourceVersions).to.be.object();
        expect(versionInfo.sourceVersions).to.be.empty;
    });

    it("gets recorded version after it was explicitly stored", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [source.key]: [true,"142857"],
            [target.key]: [true,"857142"]
        });
        await t.db.record(target.key, await target.version, rule.key, source.key, await source.version);
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.object();
        expect(versionInfo.version).to.equal("857142");
        expect(versionInfo.sourceVersions).to.be.object();
        expect(versionInfo.sourceVersions[source.key]).to.equal("142857");
    });

    it("gets actual version info when all involved artifacts exist", async() => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [source.key]: [true,"142857"],
            [target.key]: [true,"857142"]
        });
        const versionInfo = await build.getActualVersionInfo(rule);
        expect(versionInfo).to.be.object();
    });

    it("gets build job for target", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        const job = await build.getJobForArtifact(target);
        expect(job).to.be.object();
        expect(job.build).to.equal(build);
        expect(job.rule).to.equal(rule);
    });

    it("builds a simple target", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const job = await build.getJobForArtifact(target);
        await job.run();
        expect(await target.exists).to.be.true;
        expect(await target.version).to.not.be.null;
    });

    it("reports freshly built target as up to date", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const job = await build.getJobForArtifact(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(job.recipeInvoked).to.be.true;
        const build2 = new Build(g, build.db,build.artifactManager);
        const job2 = await build2.getJobForArtifact(target);
        const isUpToDate = await build2.isUpToDate(job2)
        expect(isUpToDate).to.be.true;
    });

    it("does not rebuild an up-to-date target", async () => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const job = await build.getJobForArtifact(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(await build.isUpToDate(job)).to.be.true;
        build = new Build(g,build.db,build.artifactManager);
        const job2 = await build.getJobForArtifact(target);
        await job2.run();
        expect(job2.finished).to.be.true;
        expect(job2.recipeInvoked).to.be.false;
    });

    it("rebuilds target if a dependency changes", async () => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const job = await build.getJobForArtifact(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(await build.isUpToDate(job)).to.be.true;
        answers(pk,{[source.key]: [nil,"123456"]});
        expect(await build.isUpToDate(job)).to.be.false;
        build = new Build(g,build.db,build.artifactManager);
        const job2 = await build.getJobForArtifact(target);
        await job2.run();
        expect(job2.finished).to.be.true;
        expect(job2.recipeInvoked).to.be.true;
    });

    it("always rebuilds a target of an always-rule", async() => {
        let {pk,g,db,target,source,makeTarget,rule,build} = simple();
        rule.always = true;
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        });
        let job = await build.getJobForArtifact(target);
        await job.run();
        expect(job.recipeInvoked).to.be.true;
        expect(await target.exists).to.be.true;
        expect(await build.isUpToDate(job)).to.be.false;
        build = new Build(build.graph, build.db, build.artifactManager);
        job = await build.getJobForArtifact(target);
        expect(job.recipeInvoked).to.be.false;
        await job.run();
        expect(job.recipeInvoked).to.be.true;
        expect(await build.isUpToDate(job)).to.be.false;
    })

    it("gets actual version info for target with nonexistent source", async() => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [false]
        });
        const versionInfo = await build.getActualVersionInfo(rule);
        expect(versionInfo).to.be.object();
    })

    it("reports nonexistent target from nonexistent source as not up to date", async ()=> {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,dep,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [false]
        });
        const targetDep = new Dependency(target);
        const job = await build.getJobFor(targetDep);
        expect(await build.isUpToDate(job)).to.be.false;
    });

    it("fails with minimally useful error message if source not found", async()=> {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [false]
        })
        let err = null;
        try {
            const job = await build.getJobForArtifact(target);
            await job.run();
        }
        catch(e) {
            err=e;
        }
        expect(err).to.be.instanceof(BuildError);
        /**
         *
         * @type {BuildError}
         */
        const buildErr = err;
        const why = buildErr.getBuildTraceAsString();
        expect(why).to.equal("Rule w.nginx failed to build\n"+
            "because No rule to build required file:test+obey/w.nginx.php");
    });
    
    it("records version info along with artifacts", async () => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"123456"]
        });
        const job = await build.getJobForArtifact(target);
        await job.run();
        /** @type {Db~ArtifactRecord|null} */
        let targetInfo = await build.db.getArtifact(target.key);
        expect(targetInfo.key).to.equal(target.key);
        expect(targetInfo.type).to.equal(target.type);
        expect(targetInfo.identity).to.equal(target.identity);
        /** @type {Db~ArtifactRecord|null} */
        let sourceInfo = await build.db.getArtifact(source.key);
        expect(sourceInfo.key).to.equal(source.key);
        expect(sourceInfo.type).to.equal(source.type);
        expect(sourceInfo.identity).to.equal(source.identity);
    });
});
