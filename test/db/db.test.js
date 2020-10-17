import fs from "fs";
const fsp = fs.promises;
import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;
import Db from "@zrup/db/db";
import path from "path";
import rimraf from "rmfr";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tmpDir = path.normalize(path.join(__dirname,'../tmp'));
const dbFile = path.join(tmpDir, "states.dat");

async function makeTempDir() {
    await fsp.mkdir(tmpDir, { mode: 0o755, recursive: true});
    process.chdir(tmpDir);
}
async function deleteTempDir() {
    await rimraf(tmpDir);
}

/**
 *
 * @type {Db}
 */
let db = null;
async function openDb() {
    db = new Db(dbFile);
}

async function closeDb() {
    if (db) {
        await db.close();
        db = null;
    }
}

function commonSetup() {
    beforeEach(async () => { await makeTempDir(); await openDb(); });
    afterEach(async () => { await closeDb(); await deleteTempDir(); });
}

describe('Db async accessors', () => {

    commonSetup();

    it('create the DB if it does not exist', async () => {
        await db.db; //trigger async getter
        expect(fs.existsSync(dbFile)).to.be.true;
    });
});

describe('Db', () => {

    commonSetup();

    it('records dependencies', async() => {
        expect(await db.has('A')).to.be.false;
        await db.record('A','B','C','D');
        expect(await db.has('A')).to.be.true;
    });

    it('persists dependencies', async() => {
        await db.record('A','B','C','D');
        await closeDb(); await openDb();
        expect(await db.has('A')).to.be.true;
    });

    it('lists versions', async() => {
        await db.record('A','B','X','Y');
        await db.record('A','C','X','Z');
        const answer = await db.listVersions('A');
        expect(answer).to.be.array();
        expect(answer.map(_ => _.version).sort()).to.deep.equal(['B','C']);
    });

    it('lists version sources', async() => {
        await db.record('A','B','U','V');
        await db.record('A','B','X','Y');
        await db.record('A','C','X','Z');
        let answer = await db.listVersionSources('A','B');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['V','Y']);
        answer = await db.listVersionSources('A','C');
        expect(answer).to.be.array();
        expect(answer.sort((l,r) => l.source.localeCompare(r.source)).map(_ => _.version)).to.deep.equal(['Z']);
    });

    it('retracts versions', async() => {
        await db.record('A','B','C','D');
        await db.record('A','E','F','G');
        expect(await db.hasVersion('A','B')).to.be.true;
        await db.retract('A','B');
        expect(await db.hasVersion('A','B')).to.be.false;
        expect(await db.hasVersion('A','E')).to.be.true;
    });

    it('retracts targets', async() => {
        await db.record('A','B','C','D');
        await db.record('A','E','F','G');
        await db.record('B','X','Y','Z');
        expect(await db.has('A')).to.be.true;
        await db.retractTarget('A');
        expect(await db.has('A')).to.be.false;
        expect(await db.has('B')).to.be.true;
    });
});
