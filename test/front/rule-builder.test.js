import chai from "chai";
import asserttype from 'chai-asserttype';
chai.use(asserttype);
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import path from "path"

import {RuleBuilder} from "../../front/rule-builder";
import {TempDir} from "../../util/testing";
import {Project} from "../../project";
import {AID, ArtifactManager} from "../../graph/artifact";
import {Module} from "../../module";
import {Recipe} from "../../build/recipe";
import {Rule} from "../../graph/rule";
import {FileArtifactFactory} from "../../graph/artifact/file";

class RuleBuilderDependencies
{
    /** @type {TempDir} */
    tmpDir;

    /** @type {Project|null} */
    project = null;

    /** @type {ArtifactManager} */
    artifactManager = null;

    constructor()
    {
        this.tmpDir = new TempDir(path.join(__dirname, "tmp"));
    }

    up()
    {
        this.project = new Project(this.tmpDir.toString()); //assumes setup mechanism has already upped this.tmpDir
        this.artifactManager = new ArtifactManager();
        new FileArtifactFactory(this.artifactManager,this.project);
        this.project.addModule(Module.createRoot(this.project,"test"));
    }

    down()
    {
        this.artifactManager = null;
        this.project = null;
    }

    setup()
    {
        this.tmpDir.setup();
        beforeEach(this.up.bind(this));
        afterEach(this.down.bind(this));
    }
}

class DummyRecipe extends Recipe
{
    async executeFor(job) {
        return undefined;
    }
}

const d = new RuleBuilderDependencies();

describe("RuleBuilder", () => {

    d.setup();

    it("accepts definers in any order", async() => {
        const o = new RuleBuilder(d.project, d.artifactManager);
        /** @type {Rule|null} */
        let theRule = null;
        let theDependentRule = null;
        const definer = function testRule({rule, depends, produces}) {
            theRule = rule;
            depends("foo.ts");
            produces("foo.js");
            return new DummyRecipe();
        };
        const dependentDefiner = function dependentRule({rule, produces, after}) {
            theDependentRule = rule;
            produces("foo.exe");
            after("testRule");
            return new DummyRecipe();
        };
        o.acceptDefiner(d.project.rootModule, dependentDefiner);
        o.acceptDefiner(d.project.rootModule, definer);
        o.finalize();
        expect(theRule).to.be.instanceOf(Rule);
        expect(AID.parse(Object.values(theRule.dependencies)[0].artifact.identity).ref).to.equal("foo.ts");
        expect(AID.parse(Object.values(theRule.outputs)[0].identity).ref).to.equal("foo.js");
        expect(theDependentRule).to.be.instanceOf(Rule);
        expect(Object.values(theDependentRule.after)[0].name).to.equal("testRule");
    });
});