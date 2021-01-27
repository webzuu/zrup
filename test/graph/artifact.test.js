import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;
import {AID, ArtifactManager} from "../../src/graph/artifact.js";
import {Project} from "../../src/project.js";

import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {MockFileFactory} from "../../src/graph/artifact/mock.js";
import {PromiseKeeper} from "../../src/util/promise-keeper.js";
import {Module} from "../../src/module.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("AID.parse", () => {
    const parseData = {
        "":                             { ref: ""                                                   },
        "file:":                        { type: "file", ref: ""                                     },
        "module+":                      { module: "module", ref: ""                                 },
        "foo.js":                       { ref: "foo.js"                                             },
        "file:foo/bar.js":              { type: "file", ref: "foo/bar.js"                           },
        "module+foo/bar.js":            { module: "module", ref: "foo/bar.js"                       },
        "internal:module+foo/bar.js":   { type: "internal", module: "module", ref: "foo/bar.js"     },
        "file:__ROOT__+foo/bar.js":     { type: "file", module: "__ROOT__", ref: "foo/bar.js"       },
        "expected-log.txt":             { ref: "expected-log.txt"                                   }
    }

    for(let aidString of Object.getOwnPropertyNames(parseData)) {
        it(`parses "${aidString}" correctly`, () => {
            expect(AID.parse(aidString)).to.deep.equal(parseData[aidString]);
        })
        it(`constructs correctly from "${aidString}"`, () => {
            const aid = new AID(aidString);
            for(let property of Object.getOwnPropertyNames(parseData[aidString])) {
                expect(aid[property]).to.equal(parseData[aidString][property]);
            }
        });
        it(`converts correctly back to "${aidString}"`, () => {
            expect((new AID(aidString))+'').to.equal(aidString);
        });
    }
});

describe("AID", () => {
    it('changes type immutably', () => {
        const aid = new AID("file:foo+bar/baz.js");
        const aid2 = aid.withType("internal");
        expect(aid2).to.not.equal(aid);
        expect(aid2.type).to.equal("internal");
        const aid3 = aid2.withType("file");
        expect(aid3).to.not.equal(aid);
        expect(aid3.descriptor).to.deep.equal(aid.descriptor);
    });
    it('changes module immutably', () => {
        const aid = new AID("file:foo+bar/baz.js");
        const aid2 = aid.withModule("gen");
        expect(aid2).to.not.equal(aid);
        expect(aid2.module).to.equal("gen");
        const aid3 = aid2.withModule("foo");
        expect(aid3).to.not.equal(aid);
        expect(aid3.descriptor).to.deep.equal(aid.descriptor);
    });
    it('changes ref immutably', () => {
        const aid = new AID("file:foo+bar/baz.js");
        const aid2 = aid.withRef("bar/lou.js");
        expect(aid2).to.not.equal(aid);
        expect(aid2.ref).to.equal("bar/lou.js");
        const aid3 = aid2.withRef("bar/baz.js");
        expect(aid3).to.not.equal(aid);
        expect(aid3.descriptor).to.deep.equal(aid.descriptor);
    });
});

describe("ArtifactManager", () => {

    it("Normalizes artifact identities", async() => {
        const project = new Project(__dirname+"/tmp");
        const artifactManager = new ArtifactManager();
        new MockFileFactory(artifactManager, project, new PromiseKeeper());
        project.addModule(Module.createRoot(project, "test"));
        const artifact = artifactManager.get("foo/bar.js");
        expect(artifact.identity).to.equal("file:test+foo/bar.js");
    });
})