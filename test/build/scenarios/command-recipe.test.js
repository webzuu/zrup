import {ProjectTesting} from "../../../util/testing";
import path from "path";
import {RuleBuilder} from "../../../front/rule-builder";
import copy from "recursive-copy";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import chai from "chai";
const expect = chai.expect;
import {ModuleBuilder} from "../../../front/module-builder";
import {Build} from "../../../build";
import {Db} from "../../../db";
import {AID} from "../../../graph/artifact";
import * as fs from "fs";

const d = new ProjectTesting(path.join(__dirname,"tmp"), {createRootModule: false});

/** @type {RuleBuilder|null} */
let ruleBuilder = null;

/**
 * @param {string} scenarioDir
 */
function setup(scenarioDir)
{
    d.setup();
    beforeEach(async () => {
        ruleBuilder = new RuleBuilder(d.project, d.artifactManager);
        await copy(path.join(__dirname, scenarioDir), d.project.path, {dot: true});
    });
    afterEach(() => {
        ruleBuilder = null;
    })
}

describe("CommandRecipe", async() => {

    setup('command-recipe');

    it("executes a simple command as part of a build job", async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('actual.txt');
        const expected = d.artifactManager.get('expected.txt');

        let job = null;
        async function runNewJob() {
            await (job = await new Build(d.project.graph, db, d.artifactManager).getJobForArtifact(actual)).run();
            return job;
        }


        //build fresh
        expect((await runNewJob()).recipeInvoked).to.be.true;
        expect(await actual.version).to.equal(await expected.version);

        //don't rebuild if dependencies unchanged
        expect((await runNewJob()).recipeInvoked).to.be.false;

        //rebuild if dependency changed
        fs.appendFileSync(path.join(d.tmpDir.toString(),'src/input2.txt'),"Some more input added\n");
        expect((await runNewJob()).recipeInvoked).to.be.true;
        expect(await actual.version).to.not.equal(await expected.version);

        //don't rebuild if dependencies unchanged again
        expect((await runNewJob()).recipeInvoked).to.be.false;
    });

    it('captures empty output', async() => {
        const db = new Db(path.join(d.tmpDir.toString(),".data"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const target = d.artifactManager.get('shouldBeEmpty.txt');

        let job = null;
        async function runNewJob() {
            await (job = await new Build(d.project.graph, db, d.artifactManager).getJobForArtifact(target)).run();
            return job;
        }

        expect((await runNewJob()).recipeInvoked).to.be.true;
        expect(await target.exists).to.be.true;
        expect(await target.contents).to.equal("");
    });
})