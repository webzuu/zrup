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
import {ProjectTesting} from "../../util/testing";
import {Rule} from "../../graph/rule";
import path from "path";
import {ModuleBuilder} from "../../front/module-builder";
import copy from "recursive-copy";

const d = new ProjectTesting(path.join(__dirname,"tmp"), {createRootModule: false});

/** @type {RuleBuilder|null} */
let ruleBuilder = null;
function setup()
{
    d.setup();
    beforeEach(async () => {
        ruleBuilder = new RuleBuilder(d.project, d.artifactManager);
        await copy(path.join(__dirname,"files"), d.project.path, {dot: true});
    });
    afterEach(() => {
        ruleBuilder = null;
    })
}

describe("ModuleBuilder", () => {

    setup();
    it("accepts and executes definers", async() => {
        const o = new ModuleBuilder(d.project, ruleBuilder);

        let theRule = null;
        await o.define(
            null,
            "",
            "root",
            ({rule})=>{
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

    it("loads module files", async() => {
        const o = new ModuleBuilder(d.project, ruleBuilder);
        await o.loadRootModule();
        const rootModule = d.project.getModuleByName("root", true);
        expect(d.project.getModuleByPath("")).to.equal(rootModule);
        const subModule = d.project.getModuleByName("submodule", true);
        expect(d.project.getModuleByPath("submodule")).to.equal(subModule);
    })
});