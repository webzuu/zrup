import chai from "chai";
import asserttype from 'chai-asserttype';
import MockArtifact from "@zrup/graph/artifact/mock";
import PromiseKeeper from "@zrup/util/promise-keeper";
chai.use(asserttype);
const expect = chai.expect;

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import DbTesting from "@zrup/util/testing";

const t = new DbTesting(path.join(__dirname, '../tmp'));

describe("Mock artifact", () => {
    it("returns version", async() => {
        let pk = new PromiseKeeper();
        let o = new MockArtifact();

    });
})