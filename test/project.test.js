import {Project} from "../project";
import {fileURLToPath} from "url";
import path, {dirname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
import chaiAsPromised from "chai-as-promised";
import {TempDir} from "../util/testing";
import {Module} from "../module";
chai.use(chaiAsPromised);
const expect = chai.expect;
import {mkdir as fsMkDir}  from "fs/promises";

async function mkdir(path) {
    await fsMkDir(path, { mode: 0o755, recursive: true });
}

const tmpDir = new TempDir(path.join(__dirname, '../tmp'));

describe("Project", () => {

    tmpDir.setup();

    it("can be constructed", async() => {
        const rootDirectory = path.join(tmpDir.toString(), ".zrup");
        const prj = new Project(rootDirectory);
        expect(prj.path).to.equal(rootDirectory);
        expect(prj.rootModule).to.be.instanceOf(Module);
        expect(prj.rootModule.name).to.equal("__ROOT__");

        const fooDir = path.join(rootDirectory,"foo");
        await mkdir(fooDir);
        const foo = new Module(prj.rootModule,"foo","foo");
        expect (foo.absolutePath).to.equal(fooDir);
    });

    it("finds closest module", async() => {
        const root = path.join(tmpDir.toString(), ".zrup");
        const prj = new Project(root);
        const foo = new Module(prj.rootModule, "foo", "foo-module");
        const bar = new Module(foo, "bar/baz", "bar-module");
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz/deep/whatever.js"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz/deep/"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz/deep"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz/whatever.js"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz/"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/baz"))).to.equal(bar);
        expect(prj.findClosestModule(path.join(root,"foo/bar/bazooka"))).to.equal(foo);
        expect(prj.findClosestModule(path.join(root,"foo/bar/outside/whatever.js"))).to.equal(foo);
        expect(prj.findClosestModule(path.join(root,"foo/bar/whatever.js"))).to.equal(foo);
        expect(prj.findClosestModule(path.join(root,"foo/whatever.js"))).to.equal(foo);
        expect(prj.findClosestModule(path.join(root,"foolish/whatever.js"))).to.equal(prj.rootModule);
        expect(prj.findClosestModule(path.join(root,"outside/whatever.js"))).to.equal(prj.rootModule);
        expect(prj.findClosestModule(path.join(root,"whatever.js"))).to.equal(prj.rootModule);
    })
});
