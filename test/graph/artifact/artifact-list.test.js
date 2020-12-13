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
        const foo = new MockArtifact(pk,"file","foo");
        const bar = new MockArtifact(pk,"file","bar");
        (pk.about(foo.key,"exists").resolve)(true);
        (pk.about(foo.key,"version").resolve)("142857");
        (pk.about(bar.key,"exists").resolve)(true);
        (pk.about(bar.key,"version").resolve)("857142");
        const list = new ArtifactList("baz");
        list.items = [foo,bar];
        const version1 = await list.version;
        expect(version1).to.be.string;
        pk.forget(foo.key,"version");
        (pk.about(foo.key,"version").resolve)("999999");
        const version2 = await list.version;
        expect(version2).to.be.string;
        expect(version2).to.not.equal(version1);
        list.items = [bar,foo];
        expect(await list.version).to.equal(version2);
    })
});
