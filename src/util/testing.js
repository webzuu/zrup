import path from "path";
import rimraf from "rmfr";

import fs from "fs";
const fsp = fs.promises;

import Db from "@zrup/db/db";


export class DbTesting
{
    #tmpDir;
    #dbFile
    #db;
    constructor(tmpDir)
    {
        this.#tmpDir = tmpDir;
        this.#dbFile = path.join(this.#tmpDir,"states.dat");
        this.#db=null;
    }

    async makeTempDir()
    {
        await fsp.mkdir(this.#tmpDir, { mode: 0o755, recursive: true});
        process.chdir(this.#tmpDir);
    }

    async deleteTempDir()
    {
        await rimraf(this.#tmpDir);
    }

    async openDb()
    {
        if (!this.#db) {
            this.#db = new Db(this.#dbFile);
        }
    }

    async closeDb()
    {
        if (this.#db) {
            let db = this.#db;
            this.#db=null;
            await db.close();
        }
    }

    setup() {
        beforeEach(async () => { await this.makeTempDir(); await this.openDb(); });
        afterEach(async() => { await this.closeDb(); await this.deleteTempDir(); });
    }

    get db() { return this.#db; }
    get dbFile() { return this.#dbFile; }
};