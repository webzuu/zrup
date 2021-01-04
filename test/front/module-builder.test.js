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

import {RuleBuilder} from "../../front/rule-builder";
import {DummyRecipe, ProjectTesting} from "../../util/testing";
import {AID} from "../../graph/artifact";
import {Module} from "../../module";
import {Rule} from "../../graph/rule";
import path from "path";
import {ModuleBuilder} from "../../front/module-builder";

const d = new ProjectTesting(path.join(__dirname,"tmp"));

/** @type {RuleBuilder|null} */
let ruleBuilder = null;
function setup()
{
    d.setup();
    beforeEach(() => {
        ruleBuilder = new RuleBuilder(d.project, d.artifactManager);
    });
    afterEach(() => {
        ruleBuilder = null;
    })
}

describe("ModuleBuilder", () => {

    setup();

    it("accepts and executes definers", async() => {
        const o = new ModuleBuilder(d.project, ruleBuilder);

        let theRule;
        await o.define(
            null,
            "",
            "root",
            ({module,include,rule})=>{
                rule(function mainRule({rule,depends,produces}){
                    theRule = rule;
                    depends("index.ts");
                    produces("index.js");
                });
            }
        );
        ruleBuilder.finalize();
        expect(theRule).to.be.instanceOf(Rule);
        expect(theRule.name).to.equal("mainRule");
        expect(d.project.graph.index.rule.key.get(theRule.key)).to.equal(theRule);
    });

});