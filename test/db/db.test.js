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

import {DbTesting, TempDir} from "../../src/util/testing.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe('Db async accessors', () => {

    t.setup();

    it('create the DB if it does not exist', async () => {
        await t.db.db; //trigger async getter
        expect(fs.existsSync(t.dbFile)).to.be.true;
    });
});

describe('Db', function () {

    t.setup();

    it('records dependencies', async function() {
        const ruleKey='whatever';
        expect(t.db.has('A')).to.be.false;
        t.db.record('A','B',ruleKey,'C','D');
        expect(t.db.has('A')).to.be.true;
    });

    it('persists dependencies', async() => {
        const ruleKey='whatever';
        t.db.record('A','B',ruleKey,'C','D');
        await t.closeDb(); await t.openDb();
        expect(t.db.has('A')).to.be.true;
    });

    it('lists versions', () => {
        const ruleKey='whatever';
        t.db.record('A','B',ruleKey,'X','Y');
        t.db.record('A','C',ruleKey,'X','Z');
        const answer = t.db.listVersions('A');
        expect(answer).to.be.array();
        expect(answer.map(_ => _.version).sort()).to.deep.equal(['B','C']);
    });

    it('lists version sources', () => {
        const ruleKey='whatever';
        t.db.record('A','B',ruleKey,'U','V');
        t.db.record('A','B',ruleKey,'X','Y');
        t.db.record('A','C',ruleKey,'X','Z');
        let answer = t.db.listVersionSources('A','B');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['V','Y']);
        answer = t.db.listVersionSources('A','C');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['Z']);
    });

    it('retracts versions', () => {
        const ruleKey='whatever';
        t.db.record('A','B',ruleKey,'C','D');
        t.db.record('A','E',ruleKey,'F','G');
        expect(t.db.hasVersion('A','B')).to.be.true;
        t.db.retract('A','B');
        expect(t.db.hasVersion('A','B')).to.be.false;
        expect(t.db.hasVersion('A','E')).to.be.true;
    });

    it('retracts targets', async() => {
        const ruleKey = 'whatever';
        t.db.record('A','B',ruleKey,'C','D');
        t.db.record('A','E',ruleKey,'F','G');
        t.db.record('B','X',ruleKey,'Y','Z');
        expect(t.db.has('A')).to.be.true;
        t.db.retractTarget('A');
        expect(t.db.has('A')).to.be.false;
        expect(t.db.has('B')).to.be.true;
    });

    it('retracts rules', () => {
        const ruleKey1 = 'whatever';
        const ruleKey2 = 'cool';
        t.db.record('A','B',ruleKey1,'C','D');
        t.db.record('E','F',ruleKey1,'C','D');
        t.db.record('A','B',ruleKey1,'G','H');
        t.db.record('E','F',ruleKey1,'G','G');
        t.db.record('U','V',ruleKey2,'X','Y');
        expect(t.db.has('A')).to.be.true;
        expect(t.db.has('E')).to.be.true;
        expect(t.db.has('U')).to.be.true;
         t.db.retractRule(ruleKey1);
        expect(t.db.has('A')).to.be.false;
        expect(t.db.has('E')).to.be.false;
        expect(t.db.has('U')).to.be.true;
    });

    it("does not throw if artifact not found",  () => {
        const result = t.db.getArtifact("foo");
        expect(result).to.be.null;
    });

    it("records artifacts", () => {
        t.db.recordArtifact("foo","file","foo.c");
        const result = t.db.getArtifact("foo");
        expect(result.key).to.equal("foo");
        expect(result.type).to.equal("file");
        expect(result.identity).to.equal("foo.c");
    });

    it("does not overwrite recorded artifacts", () => {
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

    it("considers enough characters from the identity field", () => {
        const fooName = "a".repeat(1000)+"_foo";
        const barName = "a".repeat(1000)+"_bar";
        t.db.recordArtifact("foo","file",fooName);
        t.db.recordArtifact("bar","file",barName);
        const foo = t.db.getArtifact("foo");
        expect(foo.identity).to.equal(fooName);
        const bar = t.db.getArtifact("bar");
        expect(bar.identity).to.equal(barName);
    });

    it("prunes unreferenced artifacts", () => {
        const ruleKey='whatever';
        t.db.record("foo","0",ruleKey,"bar","0");
        t.db.record("foo","0",ruleKey,"baz","1");
        t.db.recordArtifact("foo","file","foo.o");
        t.db.recordArtifact("bar","file","bar.c");
        t.db.recordArtifact("baz","file","baz.h");
        t.db.recordArtifact("gee","file","gee.js");
        t.db.getArtifact("gee");
        expect(t.db.getArtifact("gee")).to.be.object;
        t.db.pruneArtifacts();
        expect(t.db.getArtifact("gee")).to.be.null;
        expect(t.db.getArtifact("foo")).to.be.object;
    });

    it("lists rule sources", () => {
        const ruleKey = 'whatever';
        t.db.record("O","0",ruleKey,"FOO","1");
        t.db.record("O","0",ruleKey,"BAR","2");
        t.db.record("I","3",ruleKey,"FOO","1");
        t.db.record("I","3",ruleKey,"BAR","2");
        t.db.recordArtifact("O","file","module.o");
        t.db.recordArtifact("I","file","module.i");
        t.db.recordArtifact("FOO","file","foo.c");
        t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const sources = t.db.listRuleSources(ruleKey);
        expect(sources).to.be.array();
        expect(sources.length).to.equal(2);
        sources.sort((a, b) => a.key.localeCompare(b.key));
        expect(sources[0].key).to.equal("BAR");
        expect(sources[1].key).to.equal("FOO");
    });

    it("lists rule targets", () => {
        const ruleKey = 'whatever';
        t.db.record("O","0",ruleKey,"FOO","1");
        t.db.record("O","0",ruleKey,"BAR","2");
        t.db.record("I","3",ruleKey,"FOO","1");
        t.db.record("I","3",ruleKey,"BAR","2");
        t.db.recordArtifact("O","file","module.o");
        t.db.recordArtifact("I","file","module.i");
        t.db.recordArtifact("FOO","file","foo.c");
        t.db.recordArtifact("BAR","file","bar.c");
        /** @type {object[]} */
        const targets = t.db.listRuleTargets(ruleKey);
        expect(targets).to.be.array();
        expect(targets.length).to.equal(2);
        targets.sort((a, b) => a.key.localeCompare(b.key));
        expect(targets[0].key).to.equal("I");
        expect(targets[1].key).to.equal("O");
    });

    it("gets target's producing rule", () => {
        const ruleKey = 'whatever';
        t.db.record("T","0",ruleKey,"FOO","1");
        expect(t.db.getProducingRule("T","0")).to.equal("whatever");
    });

    it("allows different producing rules for different target versions",  () =>{
        t.db.record("T","0","zeroth","FOO","1");
        t.db.record("T","0","zeroth","BAR","2");
        t.db.record("T","1","first","FOO","1");
        t.db.record("T","1","first","BAR","3");
        expect(t.db.getProducingRule("T","0")).to.equal("zeroth");
        expect(t.db.getProducingRule("T","1")).to.equal("first");
    });

    it("disallows different producing rules for same target version",  () => {
        t.db.record("T","0","zeroth","FOO","1");
        expect(() => t.db.record("T","0","first","BAR","2")).to.be.throw(Error);
    });

});
