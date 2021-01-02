import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
const expect = chai.expect;

import {MockArtifact} from "../../../graph/artifact/mock";
import {PromiseKeeper} from "../../../util/promise-keeper";
import {ArtifactList} from "../../../graph/artifact/artifact-list";

describe("Artifact list", () => {

    it("Computes version from item versions", async() => {
        const pk = new PromiseKeeper();
        const foo = new MockArtifact("file:foo","file",pk);
        const bar = new MockArtifact("file:bar","file",pk);
        pk.set(foo.key,"exists",true);
        pk.set(foo.key,"version","142857");
        pk.set(bar.key,"exists",true);
        pk.set(bar.key,"version","857142");
        const list = new ArtifactList("baz");
        list.items = [foo,bar];
        const version1 = await list.version;
        expect(version1).to.be.string();
        pk.set(foo.key,"version","999999");
        const version2 = await list.version;
        expect(version2).to.be.string();
        expect(version2).to.not.equal(version1);
        list.items = [bar,foo];
        expect(await list.version).to.equal(version2);
    })
});
