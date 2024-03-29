import {ProjectTesting} from "../../../../src/util/testing.js";
import path from "path";
import {RuleBuilder} from "../../../../src/front/rule-builder.js";
import copy from "recursive-copy";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;
import {ModuleBuilder} from "../../../../src/front/module-builder.js";
import {Build} from "../../../../src/build.js";
import {Db} from "../../../../src/db.js";
import * as fs from "fs";
import {CommandError, CommandRecipe} from "../../../../src/build/recipe/command.js";
import {BuildError} from "../../../../src/build/error.js";
import stdout from "stdout-monkey"

const d = new ProjectTesting(path.join(__dirname,"tmp"), {createRootModule: false});

/** @type {RuleBuilder|null} */
let ruleBuilder = null;

function setup()
{
    d.setup();
    beforeEach(async () => {
        await copy(path.join(__dirname, "files"), d.project.path, {dot: true});
        ruleBuilder = new RuleBuilder(d.project, d.artifactManager);
    });
    afterEach(() => {
        ruleBuilder = null;
    })
}

describe("CommandRecipe", () => {

    setup();

    it("executes a simple command as part of a build job", async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('actual.txt');
        const expected = d.artifactManager.get('expected.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        //build fresh
        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.version).to.equal(await expected.version);

        //don't rebuild if dependencies unchanged
        expect((await runNewJob()).job.recipeInvoked).to.be.false;

        //rebuild if dependency changed
        fs.appendFileSync(path.join(d.tmpDir.toString(),'src/input2.txt'),"Some more input added\n");
        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.version).to.not.equal(await expected.version);

        //don't rebuild if dependencies unchanged again
        expect((await runNewJob()).job.recipeInvoked).to.be.false;
    });

    it('captures empty output', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const target = d.artifactManager.get('shouldBeEmpty.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(target)).run();
            return jobs;
        }

        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await target.exists).to.be.true;
        expect(await target.contents).to.equal("");
    });

    it("executes a command using a subshell", async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('transformed.txt');
        const expected = d.artifactManager.get('expected-tr-i-o.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }


        //build fresh
        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.version).to.equal(await expected.version);
    });

    it("transforms artifacts to files in tagged template string", async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('viaTemplateString.txt');
        const expected = d.artifactManager.get('expected-tr-i-o.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        //build fresh
        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.contents).to.equal(await expected.contents);
    });

    it("detects pipeline failures", async () => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('pipeFail.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        try {
            await runNewJob();
        }
        catch(e) {
            expect(e).to.be.instanceOf(BuildError);
            expect(e.reason).to.be.instanceOf(CommandError);
            expect(e.getBuildTraceAsString()).to.match(/\bpipeFail recipe exited with code 173\b/);
        }
    });

    it('escapes newlines in commands', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('handle-command-newlines.txt');
        const expected = d.artifactManager.get('expected-handle-command-newlines.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.version).to.equal(await expected.version);
    });

    it('resolves internal artifacts', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('internal:foo/bar/handle-command-newlines.txt');
        const expected = d.artifactManager.get('expected-handle-command-newlines.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect(await actual.version).to.equal(await expected.version);
    });
    // internal:foo/bar/handle-always.txt

    it('always runs a rule specified with always flag', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('internal:foo/bar/handle-always.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        expect((await runNewJob()).job.recipeInvoked).to.be.true;
        expect((await runNewJob()).job.recipeInvoked).to.be.true;
    });

    it('accepts a string as command-only simple descriptor', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const
            expected = d.artifactManager.get('expected-simple.txt'),
            actual = d.artifactManager.get('actual-simple.txt');

        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        await runNewJob();
        expect(await actual.version).to.equal(await expected.version);
    });

    it('supports echoing process output in addition to also capturing it', async() => {

        let monkey = undefined;
        const chunks = [];
        try {
            monkey = stdout((str, enc, cb) => { chunks.push(str); });
            const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

            await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
            ruleBuilder.finalize();

            const
                expected = d.artifactManager.get('expected-capture-and-echo.txt'),
                actual = d.artifactManager.get('actual-capture-and-echo.txt');

            let jobs = null;
            async function runNewJob() {
                await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
                return jobs;
            }

            await runNewJob();
            expect(await actual.version).to.equal(await expected.version);
            expect(chunks.join('')).to.equal(await expected.contents);
        }
        finally {
            if (monkey) monkey.restore();
        }
    });
})