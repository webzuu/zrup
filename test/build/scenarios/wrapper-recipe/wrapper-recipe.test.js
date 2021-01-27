import {ProjectTesting} from "../../../../src/util/testing.js";
import path from "path";
import {RuleBuilder} from "../../../../src/front/rule-builder.js";
import copy from "recursive-copy";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import chai from "chai";
const expect = chai.expect;
import {ModuleBuilder} from "../../../../src/front/module-builder.js";
import {Build} from "../../../../src/build.js";
import {Db} from "../../../../src/db.js";
import * as fs from "fs";
import {Artifact} from "../../../../src/graph/artifact.js";

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

describe("WrapperRecipe", function () {

    setup();

    it("executes a wrapped recipe sandwiched between callbacks", async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('actual.txt');
        const expected = d.artifactManager.get('expected.txt');
        const actualLog = d.artifactManager.get('log.txt');
        const expectedLog = d.artifactManager.get('expected-log.txt');

        /** @type {(JobSet|null)} */
        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        await runNewJob();
        expect(jobs.job.recipeInvoked).to.be.true;
        expect(await actual.exists).to.be.true;
        expect(await actual.version).to.equal(await expected.version);
        expect(await actualLog.exists).to.be.true;
        expect(await actualLog.version).to.equal(await expectedLog.version);
    });
})