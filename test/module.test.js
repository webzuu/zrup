import {fileURLToPath} from "url";
import path, {dirname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ModuleTesting} from "../js/util/testing.js";
import {Module} from "../js/module.js";
chai.use(chaiAsPromised);
const expect = chai.expect;

const t = new ModuleTesting(path.join(__dirname, '../tmp'));

describe("Module", () => {

    t.setup();

    it("can be constructed with project's root module as parent", async() => {
        const foo = new Module(t.project.rootModule,"foo","foo-module");
        expect (foo.absolutePath).to.equal(path.join(t.project.path,"foo"));
    });

    const resolveCases = {
        "naked path":                   ["bar/baz.js", "%FOO%/bar/baz.js"],
        "path with type":               ["file:bar/baz.js", "%FOO%/bar/baz.js"],
        "path with module":             ["foo-module+bar/baz.js", "%FOO%/bar/baz.js"],
        "path with type and module":    ["file:foo-module+bar/baz.js", "%FOO%/bar/baz.js"],
        "path with root module":        ["file:root+foo/bar/baz.js","%FOO%/bar/baz.js"]
    }

    for(let caption in resolveCases) {
        let [ref, expected] = resolveCases[caption];
        it(`resolves ${caption}`, () => {
            const foo = new Module(t.project.rootModule,"foo","foo-module");
            const resolved = foo.resolve(ref);
            expect(resolved).to.equal(expected.replace('%FOO%',foo.absolutePath));
        });
    }
});
