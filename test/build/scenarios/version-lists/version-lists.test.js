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
import {Job} from "../../../../src/build/job.js";

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

describe('Version list idiom', function() {

    //if (!global.v8debug) this.timeout(5000);
    setup();

    it('records autodependency and autotarget versions', async() => {

        const db = new Db(path.join(d.tmpDir.toString(),".data/states.sqlite"));

        await new ModuleBuilder(d.project, ruleBuilder).loadRootModule();
        ruleBuilder.finalize();

        const am = d.artifactManager;

        const target = d.artifactManager.get('internal:built');
        const artifacts = which => ({
            in_list: am.get(`${which}.in.list`),
            in_state: am.get(`${which}.in.state`),
            out_list: am.get(`${which}.out.list`),
            out_state: am.get(`${which}.out.state`),
        });
        const [expected, actual] = ['expected','actual'].map(artifacts);

        /** @type {(JobSet|null)} */
        let jobs = null;
        async function runNewJob() {
            await (jobs = await new Build(d.project.graph, db, d.artifactManager).getJobSetForArtifact(target)).run();
            return jobs;
        }

        await runNewJob();
        expect(jobs.job).to.be.instanceOf(Job);
        expect(await actual.in_list.contents).to.equal(await expected.in_list.contents);
        expect(await actual.in_state.contents).to.equal(await expected.in_state.contents);
        expect(await actual.out_list.contents).to.equal(await expected.out_list.contents);
        expect(await actual.out_state.contents).to.equal(await expected.out_state.contents);
        const versions = db.listVersions(am.get('dist/delta/gamma.txt').key);
        expect(versions).to.be.an('array');
        expect(versions.length).to.equal(3);
    })
})