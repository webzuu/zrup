import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {RuleBuilder} from "../../js/front/rule-builder.js";
import {DummyRecipe, ProjectTesting} from "../../js/util/testing.js";
import {AID} from "../../js/graph/artifact.js";
import {Module} from "../../js/module.js";
import {Rule} from "../../js/graph/rule.js";
import path from "path";

const d = new ProjectTesting(path.join(__dirname,"tmp"));

describe("RuleBuilder", () => {

    d.setup();

    it("accepts definers in any order", async() => {
        const o = new RuleBuilder(d.project, d.artifactManager);
        /** @type {Rule|null} */
        let theRule = null;
        let theDependentRule = null;
        o.acceptDefiner(
            d.project.rootModule,
            function dependentRule({rule, produces, after})
            {
                theDependentRule = rule;
                produces("foo.exe");
                after("testRule");
                return new DummyRecipe();
            }
        );
        o.acceptDefiner(
            d.project.rootModule,
            function testRule({rule, depends, produces}) {
                theRule = rule;
                depends("foo.ts");
                produces("foo.js");
                return new DummyRecipe();
            }
        );
        o.finalize();
        expect(theRule).to.be.instanceOf(Rule);
        expect(AID.parse(Object.values(theRule.dependencies)[0].artifact.identity).ref).to.equal("foo.ts");
        expect(AID.parse(Object.values(theRule.outputs)[0].identity).ref).to.equal("foo.js");
        expect(theDependentRule).to.be.instanceOf(Rule);
        expect(Object.values(theDependentRule.after)[0].name).to.equal("testRule");
    });

    it("handles cross-module references", async() => {
        const o = new RuleBuilder(d.project, d.artifactManager);
        const submodule = d.project.addModule(new Module(d.project.rootModule,"submodules/submodule","submodule"));
        let submoduleRule = null, mainRule=null;
        o.acceptDefiner(
            submodule,
            function buildSubmoduleTarget({rule, depends, produces})
            {
                submoduleRule = rule;
                depends("submodule.ts");
                produces("submodule.js");
                return new DummyRecipe();
            }
        );
        o.acceptDefiner(
            d.project.rootModule,
            function buildMainTarget({rule, depends, produces})
            {
                mainRule = rule;
                produces("app.min.js");
                depends(
                    "main.js",
                    "submodule+submodule.js",
                );
                return new DummyRecipe();
            }
        );
        o.finalize();
        const crossModuleRef = "file:submodule+submodule.js";
        const expectedSubmoduleTarget = d.artifactManager.find(crossModuleRef);
        const actualSubmoduleTarget = Object.values(submoduleRule.outputs)[0];
        const actualMainDependency = (
            Object.values(mainRule.dependencies)
                .find(_ => _.artifact.identity === crossModuleRef)
                .artifact
        );
        expect(actualSubmoduleTarget).to.equal(expectedSubmoduleTarget);
        expect(actualMainDependency).to.equal(expectedSubmoduleTarget);

        expect(d.artifactManager.allReferences.sort()).to.deep.equal([
            'file:submodule+submodule.ts',
            'file:submodule+submodule.js',
            'file:test+app.min.js',
            'file:test+main.js'
        ].sort());

    });
});