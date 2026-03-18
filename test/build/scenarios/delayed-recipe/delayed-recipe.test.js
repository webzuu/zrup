import {ProjectTesting} from "../../../../js/util/testing.js";
import path from "path";
import {RuleBuilder} from "../../../../js/front/rule-builder.js";
import copy from "recursive-copy";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import chai from "chai";
const expect = chai.expect;
import {ModuleBuilder} from "../../../../js/front/module-builder.js";
import {Build} from "../../../../js/build.js";
import {Db} from "../../../../js/db.js";
import {HashService} from "../../../../js/hash/hash-service.js";
import {Artifact} from "../../../../js/graph/artifact.js";

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

describe("DelayedRecipe", function() {

    if (!global.v8debug) this.timeout(5000);
    setup();

    it("executes a wrapped recipe after delay", async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));
        await db.getStmt();
        await db.getStmt();
        const hashService = new HashService("md5");
        Artifact.setHashService(hashService);

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const actual = d.artifactManager.get('actual.txt');
        const expected = d.artifactManager.get('expected.txt');

        /** @type {(JobSet|null)} */
        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager, hashService).getJobSetForArtifact(actual)).run();
            return jobs;
        }

        let t = process.hrtime.bigint();
        await runNewJob();
        expect(Number(process.hrtime.bigint()-t)/1000000).to.not.be.lessThan(300);
        expect(jobs.jobs[0].recipeInvoked).to.be.true;
        expect(await actual.exists).to.be.true;
        expect(await actual.version).to.equal(await expected.version);
    });
})