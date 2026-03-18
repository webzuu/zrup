import fs from "fs";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;
import path from "path";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {DbTesting} from "../../js/util/testing.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe('Db async accessors', () => {

    t.setup();

    it('create the DB if it does not exist', async () => {
        await t.db.getDb(); //trigger async getter
        expect(fs.existsSync(t.dbFile)).to.be.true;
    });
});

describe('Db', function () {

    t.setup();

    it('records dependencies', async function() {
        await t.db.getStmt();
        const ruleKey='whatever';
        expect(t.db.has('A')).to.be.false;
        t.db.record('A','B','md5',ruleKey,'C','D','md5');
        expect(t.db.has('A')).to.be.true;
    });

    it('persists dependencies', async() => {
        await t.db.getStmt();
        const ruleKey='whatever';
        t.db.record('A','B','md5',ruleKey,'C','D','md5');
        await t.closeDb(); await t.openDb();
        await t.db.getStmt();
        expect(t.db.has('A')).to.be.true;
    });

    it('lists versions', async () => {
        await t.db.getStmt();
        const ruleKey='whatever';
        t.db.record('A','B','md5',ruleKey,'X','Y','md5');
        t.db.record('A','C','md5',ruleKey,'X','Z','md5');
        const answer = t.db.listVersions('A');
        expect(answer).to.be.an('array');
        expect(answer.map(_ => _.version).sort()).to.deep.equal(['B','C']);
    });

    it('lists version sources', async () => {
        await t.db.getStmt();
        const ruleKey='whatever';
        t.db.record('A','B','md5',ruleKey,'U','V','md5');
        t.db.record('A','B','md5',ruleKey,'X','Y','md5');
        t.db.record('A','C','md5',ruleKey,'X','Z','md5');
        let answer = t.db.listVersionSources('A','B');
        expect(answer).to.be.an('array');
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['V','Y']);
        answer = t.db.listVersionSources('A','C');
        expect(answer).to.be.an('array');
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['Z']);
    });

    it('retracts versions', async () => {
        await t.db.getStmt();
        const ruleKey='whatever';
        t.db.record('A','B','md5',ruleKey,'C','D','md5');
        t.db.record('A','E','md5',ruleKey,'F','G','md5');
        expect(t.db.hasVersion('A','B')).to.be.true;
        t.db.retract('A','B');
        expect(t.db.hasVersion('A','B')).to.be.false;
        expect(t.db.hasVersion('A','E')).to.be.true;
    });

    it('retracts targets', async() => {
        await t.db.getStmt();
        const ruleKey = 'whatever';
        t.db.record('A','B','md5',ruleKey,'C','D','md5');
        t.db.record('A','E','md5',ruleKey,'F','G','md5');
        t.db.record('B','X','md5',ruleKey,'Y','Z','md5');
        expect(t.db.has('A')).to.be.true;
        t.db.retractTarget('A');
        expect(t.db.has('A')).to.be.false;
        expect(t.db.has('B')).to.be.true;
    });

    it('retracts rules', async () => {
        await t.db.getStmt();
        const ruleKey1 = 'whatever';
        const ruleKey2 = 'cool';
        t.db.record('A','B','md5',ruleKey1,'C','D','md5');
        t.db.record('E','F','md5',ruleKey1,'C','D','md5');
        t.db.record('A','B','md5',ruleKey1,'G','H','md5');
        t.db.record('E','F','md5',ruleKey1,'G','G','md5');
        t.db.record('U','V','md5',ruleKey2,'X','Y','md5');
        expect(t.db.has('A')).to.be.true;
        expect(t.db.has('E')).to.be.true;
        expect(t.db.has('U')).to.be.true;
         t.db.retractRule(ruleKey1);
        expect(t.db.has('A')).to.be.false;
        expect(t.db.has('E')).to.be.false;
        expect(t.db.has('U')).to.be.true;
    });

    it("does not throw if artifact not found", async () => {
        await t.db.getStmt();
        const result = t.db.getArtifact("foo");
        expect(result).to.be.null;
    });

    it("records artifacts", async () => {
        await t.db.getStmt();
        t.db.recordArtifact("foo","file","foo.c");
        const result = t.db.getArtifact("foo");
        expect(result.key).to.equal("foo");
        expect(result.type).to.equal("file");
        expect(result.identity).to.equal("foo.c");
    });

    it("does not overwrite recorded artifacts", async () => {
        await t.db.getStmt();
        t.db.recordArtifact("foo","file","foo.c");
        t.db.recordArtifact("wrong","file","foo.c");
        const foo = t.db.getArtifact("foo");
        expect(foo.key).to.equal("foo");
        expect(foo.type).to.equal("file");
        expect(foo.identity).to.equal("foo.c");
        const wrong = t.db.getArtifact("wrong");
        expect(wrong).to.be.null;
        t.db.recordArtifact("foo","whatever","nope.c");
        const whatever = t.db.getArtifact("foo");
        expect(whatever.type).to.equal("file");
        expect(whatever.identity).to.equal("foo.c");
    });

    it("considers enough characters from the identity field", async () => {
        await t.db.getStmt();
        const fooName = "a".repeat(1000)+"_foo";
        const barName = "a".repeat(1000)+"_bar";
        t.db.recordArtifact("foo","file",fooName);
        t.db.recordArtifact("bar","file",barName);
        const foo = t.db.getArtifact("foo");
        expect(foo.identity).to.equal(fooName);
        const bar = t.db.getArtifact("bar");
        expect(bar.identity).to.equal(barName);
    });

    it("prunes unreferenced artifacts", async () => {
        await t.db.getStmt();
        const ruleKey='whatever';
        t.db.record("foo","0",'md5',ruleKey,"bar","0",'md5');
        t.db.record("foo","0",'md5',ruleKey,"baz","1",'md5');
        t.db.recordArtifact("foo","file","foo.o");
        t.db.recordArtifact("bar","file","bar.c");
        t.db.recordArtifact("baz","file","baz.h");
        t.db.recordArtifact("gee","file","gee.js");
        t.db.getArtifact("gee");
        expect(t.db.getArtifact("gee")).to.be.an('object');
        t.db.pruneArtifacts();
        expect(t.db.getArtifact("gee")).to.be.null;
        expect(t.db.getArtifact("foo")).to.be.an('object');
    });

    it("lists rule sources", async () => {
        await t.db.getStmt();
        const ruleKey = 'whatever';
        t.db.record("O","0",'md5',ruleKey,"FOO","1",'md5');
        t.db.record("O","0",'md5',ruleKey,"BAR","2",'md5');
        t.db.record("I","3",'md5',ruleKey,"FOO","1",'md5');
        t.db.record("I","3",'md5',ruleKey,"BAR","2",'md5');
        t.db.recordArtifact("O","file","module.o");
        t.db.recordArtifact("I","file","module.i");
        t.db.recordArtifact("FOO","file","foo.c");
        t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const sources = t.db.listRuleSources(ruleKey);
        expect(sources).to.be.an('array');
        expect(sources.length).to.equal(2);
        sources.sort((a, b) => a.key.localeCompare(b.key));
        expect(sources[0].key).to.equal("BAR");
        expect(sources[1].key).to.equal("FOO");
    });

    it("lists rule targets", async () => {
        await t.db.getStmt();
        const ruleKey = 'whatever';
        t.db.record("O","0",'md5',ruleKey,"FOO","1",'md5');
        t.db.record("O","0",'md5',ruleKey,"BAR","2",'md5');
        t.db.record("I","3",'md5',ruleKey,"FOO","1",'md5');
        t.db.record("I","3",'md5',ruleKey,"BAR","2",'md5');
        t.db.recordArtifact("O","file","module.o");
        t.db.recordArtifact("I","file","module.i");
        t.db.recordArtifact("FOO","file","foo.c");
        t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const targets = t.db.listRuleTargets(ruleKey);
        expect(targets).to.be.an('array');
        expect(targets.length).to.equal(2);
        targets.sort((a, b) => a.key.localeCompare(b.key));
        expect(targets[0].key).to.equal("I");
        expect(targets[1].key).to.equal("O");
    });

    it("gets target's producing rule", async () => {
        await t.db.getStmt();
        const ruleKey = 'whatever';
        t.db.record("T","0",'md5',ruleKey,"FOO","1",'md5');
        expect(t.db.getProducingRule("T","0")).to.equal("whatever");
    });

    it("allows different producing rules for different target versions", async () =>{
        await t.db.getStmt();
        t.db.record("T","0",'md5',"zeroth","FOO","1",'md5');
        t.db.record("T","0",'md5',"zeroth","BAR","2",'md5');
        t.db.record("T","1",'md5',"first","FOO","1",'md5');
        t.db.record("T","1",'md5',"first","BAR","3",'md5');
        expect(t.db.getProducingRule("T","0")).to.equal("zeroth");
        expect(t.db.getProducingRule("T","1")).to.equal("first");
    });

    it("disallows different producing rules for same target version", async () => {
        await t.db.getStmt();
        t.db.record("T","0",'md5',"zeroth","FOO","1",'md5');
        expect(() => t.db.record("T","0",'md5',"first","BAR","2",'md5')).to.be.throw(Error);
    });

});
