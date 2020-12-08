import fs from "fs";
const fsp = fs.promises;
import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;
import Db from "@zrup/db/db";
import path from "path";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { DbTesting } from "@zrup/util/testing";

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
        expect(await t.db.has('A')).to.be.false;
        await t.db.record('A','B','C','D');
        expect(await t.db.has('A')).to.be.true;
    });

    it('persists dependencies', async() => {
        await t.db.record('A','B','C','D');
        await t.closeDb(); await t.openDb();
        expect(await t.db.has('A')).to.be.true;
    });

    it('lists versions', async() => {
        await t.db.record('A','B','X','Y');
        await t.db.record('A','C','X','Z');
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

    it("does not record artifacts conflicting with already recorded ones", async() => {
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
});
