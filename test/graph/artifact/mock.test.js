import chai from "chai";
import {MockArtifact} from "../../../src/graph/artifact/mock.js";
import {PromiseKeeper} from "../../../src/util/promise-keeper.js";
import path from "path";
const expect = chai.expect;


import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {DbTesting} from "../../../src/util/testing.js";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe("Mock artifact", () => {

    it("returns version", async () => {
        const pk = new PromiseKeeper();
        const o = new MockArtifact("file:foo", "file", pk);
        pk.set(o.key,"exists",true);
        setTimeout(() => { (pk.about(o.key,"version").resolve)("X"); },200);
        const X = await o.version;
        expect(X).to.equal("X");
    });

    it("returns content", async () => {
        const pk = new PromiseKeeper();
        const o = new MockArtifact("file:foo", "file", pk);
        pk.set(o.key,"exists",true);
        (pk.about("foo","exists").resolve)(true);
        setTimeout(() => { (pk.about(o.key,"contents").resolve)("XOO"); },200);
        const X = await o.getContents();
        expect(X).to.equal("XOO");
    });
});