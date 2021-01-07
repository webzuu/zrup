import pathUtils from "path";
import {Project} from "../../../project";
import {FileArtifact, FileArtifactFactory} from "../../../graph/artifact/file";
import {ArtifactManager} from "../../../graph/artifact";
import {Module} from "../../../module";
import {TempDir} from "../../../util/testing";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tmpDir=new TempDir(pathUtils.join(__dirname,"tmp"));

import chai from "chai";
const expect = chai.expect;

describe('FileArtifact', () => {

    tmpDir.setup();
    it('can create physical artifact', async() => {

        const path="foo/bar/index.js";
        const o = new FileArtifact(`file:test+${path}`,`${tmpDir}/${path}`);
        expect(await o.exists).to.be.false;
        await o.putContents('import path from "path";\n');
        expect(await o.exists).to.be.true;
        const finalContents = 'import foo from "foo";\n';
        await o.putContents(finalContents);
        expect(await o.contents).to.equal(finalContents);
        expect(o.caps.canRemove).to.be.true;
        await o.rm();
        expect(await o.exists).to.be.false;
        await o.rm(); //should squelch ENOENT
    });
});

describe('FileArtifactFactory', ()=>{

    tmpDir.setup();

    it("finds closest module", async() => {
        const root = pathUtils.join(tmpDir.toString(), ".zrup");
        const prj = new Project(root);
        const factory = new FileArtifactFactory(new ArtifactManager(),prj);
        Module.createRoot(prj, "test")
        const foo = new Module(prj.rootModule, "foo", "foo-module");
        const bar = new Module(foo, "bar/baz", "bar-module");
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz/deep/whatever.js"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz/deep/"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz/deep"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz/whatever.js"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz/"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/baz"))).to.equal(bar);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/bazooka"))).to.equal(foo);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/outside/whatever.js"))).to.equal(foo);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/bar/whatever.js"))).to.equal(foo);
        expect(factory.findClosestModule(pathUtils.join(root,"foo/whatever.js"))).to.equal(foo);
        expect(factory.findClosestModule(pathUtils.join(root,"foolish/whatever.js"))).to.equal(prj.rootModule);
        expect(factory.findClosestModule(pathUtils.join(root,"outside/whatever.js"))).to.equal(prj.rootModule);
        expect(factory.findClosestModule(pathUtils.join(root,"whatever.js"))).to.equal(prj.rootModule);
    })

    it("determines whether a path is infixed", async () => {
        const root = tmpDir.toString();
        const prj = new Project(root);
        const infix = "foo/bar";
        const factory = new FileArtifactFactory(new ArtifactManager(), prj, infix);
        expect(factory.treeInfix).to.equal(infix);
        expect(factory.isInfixed("baz/demo")).to.be.false;
        expect(factory.isInfixed(`${infix}/baz/demo`)).to.be.true;
        expect(factory.isInfixed(pathUtils.resolve(root, "baz/demo"))).to.be.false;
        expect(factory.isInfixed(pathUtils.resolve(factory.treePrefix, "baz/demo"))).to.be.true;
    });

    it("applies path infix", async () => {
        const root = tmpDir.toString();
        const prj = new Project(root);
        const infix = "foo/bar";
        const factory = new FileArtifactFactory(new ArtifactManager(), prj, infix);

        expect(factory.applyInfix("gen/lou")).to.equal(`${infix}/gen/lou`);
        expect(factory.applyInfix(`${infix}/gen/lou`)).to.equal(`${infix}/gen/lou`)
        expect(
            factory.applyInfix(pathUtils.resolve(prj.path,"gen/lou"))
        ).to.equal(
            pathUtils.resolve(factory.treePrefix, "gen/lou")
        )
        expect(
            factory.applyInfix(pathUtils.resolve(factory.treePrefix, "gen/lou"))
        ).to.equal(
            pathUtils.resolve(factory.treePrefix, "gen/lou")
        )
    });

    it("removes path infix", async () => {
        const root = tmpDir.toString();
        const prj = new Project(root);
        const infix = "foo/bar";
        const factory = new FileArtifactFactory(new ArtifactManager(), prj, infix);

        expect(factory.removeInfix(`${infix}/gen/lou`)).to.equal("gen/lou");
        expect(factory.removeInfix(`gen/lou`)).to.equal(`gen/lou`)
        expect(
            factory.removeInfix(pathUtils.resolve(factory.treePrefix, "gen/lou"))
        ).to.equal(
            pathUtils.resolve(prj.path,"gen/lou")
        )
        expect(
            factory.removeInfix(pathUtils.resolve(prj.path,"gen/lou"))
        ).to.equal(
            pathUtils.resolve(prj.path,"gen/lou")
        )
    });
});