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
        await t.db.record('A','B','U','V');
        await t.db.record('A','B','X','Y');
        await t.db.record('A','C','X','Z');
        let answer = await t.db.listVersionSources('A','B');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['V','Y']);
        answer = await t.db.listVersionSources('A','C');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['Z']);
    });

    it('retracts versions', async() => {
        await t.db.record('A','B','C','D');
        await t.db.record('A','E','F','G');
        expect(await t.db.hasVersion('A','B')).to.be.true;
        await t.db.retract('A','B');
        expect(await t.db.hasVersion('A','B')).to.be.false;
        expect(await t.db.hasVersion('A','E')).to.be.true;
    });

    it('retracts targets', async() => {
        await t.db.record('A','B','C','D');
        await t.db.record('A','E','F','G');
        await t.db.record('B','X','Y','Z');
        expect(await t.db.has('A')).to.be.true;
        await t.db.retractTarget('A');
        expect(await t.db.has('A')).to.be.false;
        expect(await t.db.has('B')).to.be.true;
    });
});
