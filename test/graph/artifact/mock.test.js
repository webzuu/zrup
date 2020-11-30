import chai from "chai";
import asserttype from 'chai-asserttype';
import MockArtifact from "@zrup/graph/artifact/mock";
import PromiseKeeper from "@zrup/util/promise-keeper";
import path from "path";
chai.use(asserttype);
const expect = chai.expect;


import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {DbTesting} from "@zrup/util/testing";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe("Mock artifact", () => {

    it("returns version", async () => {
        const pk = new PromiseKeeper();
        const o = new MockArtifact(pk, "file", "foo");
        (pk.about("foo","exists").resolve)(true);
        setTimeout(() => { (pk.about(o.key,"version").resolve)("X"); },200);
        const X = await o.version;
        expect(X).to.equal("X");
    });

    it("returns content", async () => {
        const pk = new PromiseKeeper();
        const o = new MockArtifact(pk, "file", "foo");
        (pk.about("foo","exists").resolve)(true);
        setTimeout(() => { (pk.about(o.key,"contents").resolve)("XOO"); },200);
        const X = await o.contents;
        expect(X).to.equal("XOO");
    });
});