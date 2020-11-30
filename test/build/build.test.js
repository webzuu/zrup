import fs from "fs";
const fsp = fs.promises;
import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;

import path from "path";

import MockArtifact from "@zrup/graph/artifact/mock";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { DbTesting } from "@zrup/util/testing";
import Graph from "@zrup/graph/graph";
import PromiseKeeper from "@zrup/util/promise-keeper";
import Recipe from "@zrup/build/recipe";
import md5 from "md5";
import Rule, {SourceRule} from "@zrup/graph/rule";
import Build from "@zrup/build/build";
import BuildError from "@zrup/build/error";

const t = new DbTesting(path.join(__dirname, '../tmp'));

class MakeItExistRecipe extends Recipe
{
    #pk;

    constructor(pk) {
        super();
        this.#pk = pk;
    }

    async executeFor(rule) {
        const onlyTarget = rule.outputs[0];
        const sourceVersions = await Promise.all(
            rule.dependencies.map(
                dep => (async () => ({
                    /**
                     * @type {string}
                     */
                    key: dep.key,
                    /**
                     * @type {string}
                     */
                    version: await dep.version
                }))()
            )
        );
        sourceVersions.sort(
            (lhs,rhs) => lhs.key.localeCompare(rhs.key)
        );
        const hash = md5(JSON.stringify(sourceVersions));
        this.#pk.forget(onlyTarget.key,"exists");
        (this.#pk.about(onlyTarget.key,"exists").resolve)(true);
        this.#pk.forget(onlyTarget.key,"version");
        (this.#pk.about(onlyTarget.key,"version").resolve)(hash);
    }
}

function simple()
{
    const pk = new PromiseKeeper();
    const g = new Graph();
    const target = new MockArtifact(pk,"file","w.nginx");
    const source = new MockArtifact(pk,"file","obey/w.nginx.php");
    const makeTarget = new MakeItExistRecipe(pk);
    const rule = new Rule(g, makeTarget, me => {
        me.outputs.push(target);
        me.dependencies.push(source);
    });
    const build = new Build(g, t.db);
    return {pk,g,target,source,makeTarget,rule,build};
}

const nil = {}
/**
 *
 * @param {PromiseKeeper} pk
 * @param {object} answers
 */
function answers(pk, answers)
{
    for(let answer in answers) {
        if(nil !== answers[answer][0]) (pk.about(answer,"exists").resolve)(answers[answer][0]);
        if(nil !== answers[answer][1]) (pk.about(answer,"version").resolve)(answers[answer][1]);
    }
}

describe("Build", () => {

    t.setup();

    it("gets empty recorded version info artifact doesn't exist", async () => {
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil]
        });
        (pk.about(target.key,"exists").resolve)(false);
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.object();
        expect(versionInfo.version).to.be.null;
        expect(versionInfo.sourceVersions).to.be.object();
        expect(versionInfo.sourceVersions).to.be.empty;
    });

    it("gets empty recorded version if artifact was never built", async () => {
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
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [source.key]: [true,"142857"],
            [target.key]: [true,"857142"]
        });
        await t.db.record(target.key, await target.version, source.key, await source.version);
        const versionInfo = await build.getRecordedVersionInfo(target);
        expect(versionInfo).to.be.object();
        expect(versionInfo.version).to.equal("857142");
        expect(versionInfo.sourceVersions).to.be.object();
        expect(versionInfo.sourceVersions[source.key]).to.equal("142857");
    });

    it("gets actual version info when all involved artifacts exist", async() => {
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [source.key]: [true,"142857"],
            [target.key]: [true,"857142"]
        });
        const versionInfo = await build.getActualVersionInfo(rule);
        expect(versionInfo).to.be.object();
    });

    it("gets build job for target", async () => {
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        const job = build.getJobFor(target);
        expect(job).to.be.object();
        expect(job.build).to.equal(build);
        expect(job.rule).to.equal(rule);
    });

    it("builds a simple target", async () => {
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"857142"]
        })
        const job = build.getJobFor(target);
        await job.run();
        expect(await target.exists).to.be.true;
        expect(await target.version).to.not.be.null;
    });

    it("reports freshly built target as up to date", async () => {
        const {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"857142"]
        })
        const job = build.getJobFor(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(job.recipeInvoked).to.be.true;
        expect(await build.isUpToDate(rule)).to.be.true;
    });

    it("does not rebuild an up-to-date target", async () => {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"857142"]
        })
        const job = build.getJobFor(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(await build.isUpToDate(rule)).to.be.true;
        build = new Build(g,build.db);
        const job2 = build.getJobFor(target);
        await job2.run();
        expect(job2.finished).to.be.true;
        expect(job2.recipeInvoked).to.be.false;
    });

    it("rebuilds target if a dependency changes", async () => {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"857142"]
        })
        const job = build.getJobFor(target);
        await job.run();
        expect(job.finished).to.be.true;
        expect(await build.isUpToDate(rule)).to.be.true;
        pk.forget(source.key,"version");
        answers(pk,{[source.key]: [nil,"123456"]});
        expect(await build.isUpToDate(rule)).to.be.false;
        build = new Build(g,build.db);
        const job2 = build.getJobFor(target);
        await job2.run();
        expect(job2.finished).to.be.true;
        expect(job2.recipeInvoked).to.be.true;
    });

    it("gets actual version info for target with nonexistent source", async() => {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [false,nil]
        });
        const versionInfo = await build.getActualVersionInfo(rule);
        expect(versionInfo).to.be.object();
    })

    it("finds nonexistent source outdated", async ()=> {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [false,nil]
        });
        const job = build.getJobFor(source);
        expect(job.rule).to.be.instanceof(SourceRule);
        expect(await build.isUpToDate(job.rule)).to.be.false;
    });

    it("finds existent source outdated (to trigger existence check as a recipe)", async ()=> {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [true,"123456"]
        });
        const job = build.getJobFor(source);
        expect(job.rule).to.be.instanceof(SourceRule);
        expect(await build.isUpToDate(job.rule)).to.be.false;
    });


    it("nonexistent target from nonexistent source is not up to date", async ()=> {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [false,nil]
        });
        expect(await build.isUpToDate(rule)).to.be.false;
    });

    it("fails with minimally useful error message if source not found", async()=> {
        let {pk,g,target,source,makeTarget,rule,build} = simple();
        answers(pk,{
            [target.key]: [false,nil],
            [source.key]: [false,nil]
        })
        const job = build.getJobFor(target);
        let err = null;
        try {
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
        expect(why).to.equal("file w.nginx failed to build\n" +
            "because file obey/w.nginx.php failed to build\n" +
            "because source(s) not found:\n" +
            "\tfile obey/w.nginx.php");
    });
});
