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
import {FileArtifactFactory} from "../graph/artifact/file";
import {ArtifactManager} from "../graph/artifact";

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
    });

    it("accepts root module", async () => {
        const rootDirectory = path.join(tmpDir.toString(), ".zrup");
        const prj = new Project(rootDirectory);
        Module.createRoot(prj, "test");
        expect(prj.rootModule).to.be.instanceOf(Module);
        expect(prj.rootModule.name).to.equal("test");

        const fooDir = path.join(rootDirectory,"foo");
        await mkdir(fooDir);
        const foo = new Module(prj.rootModule,"foo","foo");
        expect (foo.absolutePath).to.equal(fooDir);
    })
});
