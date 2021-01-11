import fs from "fs";
const fsp = fs.promises;
import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;
import path from "path";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {DbTesting, TempDir} from "../../util/testing.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe('Db async accessors', () => {

    t.setup();

    it('create the DB if it does not exist', async () => {
        await t.db.db; //trigger async getter
        expect(fs.existsSync(t.dbFile)).to.be.true;
    });
});

describe('Db', () => {

    t.setup();

    it('records dependencies', async() => {
        const ruleKey='whatever';
        expect(await t.db.has('A')).to.be.false;
        await t.db.record('A','B',ruleKey,'C','D');
        expect(await t.db.has('A')).to.be.true;
    });

    it('persists dependencies', async() => {
        const ruleKey='whatever';
        await t.db.record('A','B',ruleKey,'C','D');
        await t.closeDb(); await t.openDb();
        expect(await t.db.has('A')).to.be.true;
    });

    it('lists versions', async() => {
        const ruleKey='whatever';
        await t.db.record('A','B',ruleKey,'X','Y');
        await t.db.record('A','C',ruleKey,'X','Z');
        const answer = await t.db.listVersions('A');
        expect(answer).to.be.array();
        expect(answer.map(_ => _.version).sort()).to.deep.equal(['B','C']);
    });

    it('lists version sources', async() => {
        const ruleKey='whatever';
        await t.db.record('A','B',ruleKey,'U','V');
        await t.db.record('A','B',ruleKey,'X','Y');
        await t.db.record('A','C',ruleKey,'X','Z');
        let answer = await t.db.listVersionSources('A','B');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['V','Y']);
        answer = await t.db.listVersionSources('A','C');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['Z']);
    });

    it('retracts versions', async() => {
        const ruleKey='whatever';
        await t.db.record('A','B',ruleKey,'C','D');
        await t.db.record('A','E',ruleKey,'F','G');
        expect(await t.db.hasVersion('A','B')).to.be.true;
        await t.db.retract('A','B');
        expect(await t.db.hasVersion('A','B')).to.be.false;
        expect(await t.db.hasVersion('A','E')).to.be.true;
    });

    it('retracts targets', async() => {
        const ruleKey = 'whatever';
        await t.db.record('A','B',ruleKey,'C','D');
        await t.db.record('A','E',ruleKey,'F','G');
        await t.db.record('B','X',ruleKey,'Y','Z');
        expect(await t.db.has('A')).to.be.true;
        await t.db.retractTarget('A');
        expect(await t.db.has('A')).to.be.false;
        expect(await t.db.has('B')).to.be.true;
    });

    it('retracts rules', async() => {
        const ruleKey1 = 'whatever';
        const ruleKey2 = 'cool';
        await t.db.record('A','B',ruleKey1,'C','D');
        await t.db.record('E','F',ruleKey1,'C','D');
        await t.db.record('A','B',ruleKey1,'G','H');
        await t.db.record('E','F',ruleKey1,'G','G');
        await t.db.record('U','V',ruleKey2,'X','Y');
        expect(await t.db.has('A')).to.be.true;
        expect(await t.db.has('E')).to.be.true;
        expect(await t.db.has('U')).to.be.true;
        await t.db.retractRule(ruleKey1);
        expect(await t.db.has('A')).to.be.false;
        expect(await t.db.has('E')).to.be.false;
        expect(await t.db.has('U')).to.be.true;
    });

    it("does not throw if artifact not found", async () => {
        const result = await t.db.getArtifact("foo");
        expect(result).to.be.null;
    });

    it("records artifacts", async () => {
        await t.db.recordArtifact("foo","file","foo.c");
        const result = await t.db.getArtifact("foo");
        expect(result.key).to.equal("foo");
        expect(result.type).to.equal("file");
        expect(result.identity).to.equal("foo.c");
    });

    it("does not overwrite recorded artifacts", async() => {
        await t.db.recordArtifact("foo","file","foo.c");
        await t.db.recordArtifact("wrong","file","foo.c");
        const foo = await t.db.getArtifact("foo");
        expect(foo.key).to.equal("foo");
        expect(foo.type).to.equal("file");
        expect(foo.identity).to.equal("foo.c");
        const wrong = await t.db.getArtifact("wrong");
        expect(wrong).to.be.null;
        await t.db.recordArtifact("foo","whatever","nope.c");
        const whatever = await t.db.getArtifact("foo");
        expect(whatever.type).to.equal("file");
        expect(whatever.identity).to.equal("foo.c");
    });

    it("considers enough characters from the identity field", async () => {
        const fooName = "a".repeat(1000)+"_foo";
        const barName = "a".repeat(1000)+"_bar";
        await t.db.recordArtifact("foo","file",fooName);
        await t.db.recordArtifact("bar","file",barName);
        const foo = await t.db.getArtifact("foo");
        expect(foo.identity).to.equal(fooName);
        const bar = await t.db.getArtifact("bar");
        expect(bar.identity).to.equal(barName);
    });

    it("prunes unreferenced artifacts", async () => {
        const ruleKey='whatever';
        await t.db.record("foo","0",ruleKey,"bar","0");
        await t.db.record("foo","0",ruleKey,"baz","1");
        await t.db.recordArtifact("foo","file","foo.o");
        await t.db.recordArtifact("bar","file","bar.c");
        await t.db.recordArtifact("baz","file","baz.h");
        await t.db.recordArtifact("gee","file","gee.js");
        await t.db.getArtifact("gee");
        expect(await t.db.getArtifact("gee")).to.be.object;
        await t.db.pruneArtifacts();
        expect(await t.db.getArtifact("gee")).to.be.null;
        expect(await t.db.getArtifact("foo")).to.be.object;
    });

    it("lists rule sources", async() => {
        const ruleKey = 'whatever';
        await t.db.record("O","0",ruleKey,"FOO","1");
        await t.db.record("O","0",ruleKey,"BAR","2");
        await t.db.record("I","3",ruleKey,"FOO","1");
        await t.db.record("I","3",ruleKey,"BAR","2");
        await t.db.recordArtifact("O","file","module.o");
        await t.db.recordArtifact("I","file","module.i");
        await t.db.recordArtifact("FOO","file","foo.c");
        await t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const sources = await t.db.listRuleSources(ruleKey);
        expect(sources).to.be.array();
        expect(sources.length).to.equal(2);
        sources.sort((a, b) => a.key.localeCompare(b.key));
        expect(sources[0].key).to.equal("BAR");
        expect(sources[1].key).to.equal("FOO");
    });

    it("lists rule targets", async() => {
        const ruleKey = 'whatever';
        await t.db.record("O","0",ruleKey,"FOO","1");
        await t.db.record("O","0",ruleKey,"BAR","2");
        await t.db.record("I","3",ruleKey,"FOO","1");
        await t.db.record("I","3",ruleKey,"BAR","2");
        await t.db.recordArtifact("O","file","module.o");
        await t.db.recordArtifact("I","file","module.i");
        await t.db.recordArtifact("FOO","file","foo.c");
        await t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const targets = await t.db.listRuleTargets(ruleKey);
        expect(targets).to.be.array();
        expect(targets.length).to.equal(2);
        targets.sort((a, b) => a.key.localeCompare(b.key));
        expect(targets[0].key).to.equal("I");
        expect(targets[1].key).to.equal("O");
    });

    it("gets target's producing rule", async() => {
        const ruleKey = 'whatever';
        await t.db.record("T","0",ruleKey,"FOO","1");
        expect(await t.db.getProducingRule("T","0")).to.equal("whatever");
    });

    it("allows different producing rules for different target versions", async () =>{
        await t.db.record("T","0","zeroth","FOO","1");
        await t.db.record("T","0","zeroth","BAR","2");
        await t.db.record("T","1","first","FOO","1");
        await t.db.record("T","1","first","BAR","3");
        expect(await t.db.getProducingRule("T","0")).to.equal("zeroth");
        expect(await t.db.getProducingRule("T","1")).to.equal("first");
    });

    it("disallows different producing rules for same target version", async () => {
        await t.db.record("T","0","zeroth","FOO","1");
        await expect(t.db.record("T","0","first","BAR","2")).to.be.rejectedWith(Error);
    });

});
