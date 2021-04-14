import chai from "chai";
const expect = chai.expect;

import path from "path";

import {MockFileFactory} from "../../src/graph/artifact/mock.js";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {RecipeArtifactFactory} from "../../src/graph/artifact/recipe.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { DbTesting } from "../../src/util/testing.js";
import { PromiseKeeper } from "../../src/util/promise-keeper.js";
import { Recipe } from "../../src/build/recipe.js";
import md5 from "md5";
import {Rule} from "../../src/graph/rule.js";
import { Build } from "../../src/build.js";
import { BuildError } from "../../src/build/error.js";
import { Dependency } from "../../src/graph/dependency.js";
import {Project} from "../../src/project.js";
import {Artifact, ArtifactManager} from "../../src/graph/artifact.js";
import {Module} from "../../src/module.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));


const MakeItExistRecipe = class MakeItExistRecipe extends Recipe
{
    #pk;

    constructor(pk) {
        super();
        this.#pk = pk;
    }

    async executeFor(job, spec) {
        const onlyTarget = job.outputs[0];
        const key = onlyTarget.key;
        const sourceVersions = await Promise.all(
            job.dependencies.map(
                dep => (async () => [
                    ["key", dep.artifact.key],
                    ["version", await dep.artifact.version]
                ])()
            )
        );
        sourceVersions.sort((lhs,rhs) => lhs[0][1].localeCompare(rhs[0][1]));
        const hash = md5(JSON.stringify(sourceVersions));
        this.#pk.set(key, "exists",  true);
        this.#pk.set(key, "version", hash);
    }

    async concretizeSpecFor(job) {
        return {};
    }
}

function simple()
{
    const pk = new PromiseKeeper();
    const makeTarget = new MakeItExistRecipe(pk);
    const prj = new Project(t.tmpDir.toString());
    const g = prj.graph;
    Module.createRoot(prj, "test");
    const manager = new ArtifactManager();
    new MockFileFactory(manager, prj, pk);
    new RecipeArtifactFactory(manager, prj);
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

describe("Build", function () {

    t.setup();

    it("gets empty recorded version info if artifact doesn't exist", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        (pk.about(target.key,"exists").resolve)(false);
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.an('object');
        expect(versionInfo.version).to.be.null;
        expect(versionInfo.sourceVersions).to.be.an('object');
        expect(versionInfo.sourceVersions).to.be.empty;
    });

    it("gets empty recorded version if artifact was never built", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [true,"142857"]
        });
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.an('object');
        expect(versionInfo.version).to.equal("142857");
        expect(versionInfo.sourceVersions).to.be.an('object');
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
        expect(versionInfo).to.be.an('object');
        expect(versionInfo.version).to.equal("857142");
        expect(versionInfo.sourceVersions).to.be.an('object');
        expect(versionInfo.sourceVersions[source.key]).to.equal("142857");
    });

    it("gets actual version info when all involved artifacts exist", async() => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [source.key]: [true,"142857"],
            [target.key]: [true,"857142"]
        });
        const versionInfo = await build.getActualVersionInfo(Object.values(rule.dependencies).map(d => d.artifact));
        expect(versionInfo).to.be.an('object');
    });

    it("gets build job for target", async () => {
        // noinspection JSUnusedLocalSymbols
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        const jobSet = await build.getJobSetForArtifact(target);
        expect(jobSet).to.be.an('object');
        const job = jobSet.jobs[0];
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
        const jobSet = await build.getJobSetForArtifact(target);
        await jobSet.run();
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
        const jobSet = await build.getJobSetForArtifact(target);
        await jobSet.run();
        const job = jobSet.jobs[0];
        expect(job.finished).to.be.true;
        expect(job.recipeInvoked).to.be.true;
        const build2 = new Build(g, build.db,build.artifactManager);
        const jobSet2 = await build2.getJobSetForArtifact(target);
        const isUpToDate = await build2.isUpToDate(jobSet2.jobs[0])
        expect(isUpToDate).to.be.true;
    });

    it("does not rebuild an up-to-date target", async () => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const jobs = await build.getJobSetForArtifact(target);
        await jobs.run();
        expect(jobs.job.finished).to.be.true;
        expect(await build.isUpToDate(jobs.job)).to.be.true;
        build = new Build(g,build.db,build.artifactManager);
        const jobs2 = await build.getJobSetForArtifact(target);
        await jobs2.run();
        expect(jobs2.job.finished).to.be.true;
        expect(jobs2.job.recipeInvoked).to.be.false;
    });

    it("rebuilds target if a dependency changes", async () => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        })
        const jobs = await build.getJobSetForArtifact(target);
        await jobs.run();
        expect(jobs.job.finished).to.be.true;
        expect(await build.isUpToDate(jobs.job)).to.be.true;
        answers(pk,{[source.key]: [nil,"123456"]});
        expect(await build.isUpToDate(jobs.job)).to.be.false;
        build = new Build(g,build.db,build.artifactManager);
        const jobs2 = await build.getJobSetForArtifact(target);
        await jobs2.run();
        expect(jobs2.job.finished).to.be.true;
        expect(jobs2.job.recipeInvoked).to.be.true;
    });

    it("finds target outdated if it doesn't match the build record", async () => {

        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk, {
            [source.key]: [true, "142857"],
            [target.key]: [false]
        });
        let jobs = await build.getJobSetForArtifact(target);
        await jobs.run();
        answers(pk, {
            [target.key]: [true, "857142"]
        });
        build = new Build(g, build.db, build.artifactManager);
        jobs = await build.getJobSetForArtifact(target);
        expect(await build.isUpToDate(jobs.job)).to.be.false;
    });

    it("always rebuilds a target of an always-rule", async() => {
        let {pk,target,source,rule,build} = simple();
        rule.always = true;
        answers(pk,{
            [target.key]: [false],
            [source.key]: [true,"857142"]
        });
        let jobs = await build.getJobSetForArtifact(target);
        await jobs.run();
        expect(jobs.job.recipeInvoked).to.be.true;
        expect(await target.exists).to.be.true;
        expect(await build.isUpToDate(jobs.job)).to.be.false;
        build = new Build(build.graph, build.db, build.artifactManager);
        jobs = await build.getJobSetForArtifact(target);
        expect(jobs.job.recipeInvoked).to.be.false;
        await jobs.job.run();
        expect(jobs.job.recipeInvoked).to.be.true;
        expect(await build.isUpToDate(jobs.job)).to.be.false;
    })

    it("gets actual version info for target with nonexistent source", async() => {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [false]
        });
        const versionInfo = await build.getActualVersionInfo(Object.values(rule.dependencies).map(d => d.artifact));
        expect(versionInfo).to.be.an('object');
    })

    //Should have tested for this since day one!!!
    it("reports existing target w/o build record as outdated", async() => {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [true,"654321"],
            [source.key]: [true,"123456"]
        });
        const jobs = await build.getJobSetForArtifact(target);
        expect(await build.isUpToDate(jobs.job)).to.be.false;
    });

    it("reports nonexistent target from nonexistent source as outdated", async ()=> {
        // noinspection JSUnusedLocalSymbols
        let {pk,g,target,dep,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false],
            [source.key]: [false]
        });
        const targetDep = new Dependency(target);
        const jobs = await build.getJobSetFor(targetDep);
        expect(await build.isUpToDate(jobs.job)).to.be.false;
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
            const job = await build.getJobSetForArtifact(target);
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
        const jobs = await build.getJobSetForArtifact(target);
        await jobs.run();
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

    it("deletes recorded targets before build", async() => {
        let {pk,g,target,source,makeTarget,rule,build,manager} = simple();
        answers(pk,{
            [target.key]: [true,"654321"],
            [source.key]: [true,"123456"]
        });
        const noLongerBuilt = manager.get("file:z.nginx");
        answers(pk,{
            [noLongerBuilt.key]: [true,"000000"]
        });
        expect(await noLongerBuilt.exists).to.be.true;
        const ruleKey = rule.key;
        await build.db.record(target.key, "123456", rule.key, source.key, await source.version);
        await build.db.record(noLongerBuilt.key, await noLongerBuilt.version, rule.key, source.key, await source.version);
        await build.recordArtifacts([source,target,noLongerBuilt]);
        const jobSet = await build.getJobSetForArtifact(target);
        await jobSet.run();
        expect(await noLongerBuilt.exists).to.be.false;
    });
});
