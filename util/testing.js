import path from "path";
import rimraf from "rmfr";

import fs from "fs";
const fsp = fs.promises;

import {Db} from "../db";
import {Project} from "../project";
import {Module} from "../module";

export class TempDir
{
    /** @type {string} */
    #tmpDir;

    /**
     * @param {string} tmpDir
     */
    constructor(tmpDir)
    {
        this.#tmpDir = tmpDir;
    }

    async make()
    {
        await fsp.mkdir(this.#tmpDir, { mode: 0o755, recursive: true });
    }

    async remove()
    {
        await rimraf(this.#tmpDir);
    }

    setup() {
        beforeEach(this.make.bind(this));
        afterEach(this.remove.bind(this));
    }

    /** @return {string} */
    toString()
    {
        return this.#tmpDir;
    }
}

export class DbTesting
{
    /** @type {TempDir} */
    #tmpDir;
    #dbFile
    /** @type Db */
    #db;
    constructor(tmpDir)
    {
        this.#tmpDir = new TempDir(tmpDir);
        this.#dbFile = path.join(this.#tmpDir.toString(),"db/state.sqlite");
        this.#db=null;
    }

    async openDb()
    {
        if (!this.#db) {
            await fsp.mkdir(path.dirname(this.#dbFile), { mode: 0o755, recursive: true });
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
        beforeEach(async () => {
            await this.#tmpDir.make();
            process.chdir(this.#tmpDir.toString());
            await this.openDb();
        });
        afterEach(async() => {
            await this.closeDb();
            await this.#tmpDir.remove();
        });
    }

    get db() { return this.#db; }
    get dbFile() { return this.#dbFile; }
    get tmpDir() { return this.#tmpDir; }
}

export class ModuleTesting
{
    /** @type {TempDir} */
    #tmpDir;

    /** @type {Project|null} */
    #project = null;

    /** @param {string} tmpDir */
    constructor(tmpDir)
    {
        this.#tmpDir = new TempDir(tmpDir);
    }

    setup() {
        this.#tmpDir.setup();

        beforeEach(async()=>{
            this.#project = new Project(path.join(this.tmpDir.toString(), '.zrup'));
            Module.createRoot(this.#project,"root");
        });
        afterEach(async()=>{
            this.#project = null;
        });
    }

    /** @type {TempDir} */
    get tmpDir()
    {
        return this.#tmpDir;
    }

    /** @type {Project|null} */
    get project()
    {
        return this.#project;
    }
}

export function wait(time)
{
    return new Promise((resolve) => { setTimeout(resolve, time); });
}