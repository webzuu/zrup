import {CommandRecipe} from "../../build/recipe/command.js";
import {AID, Artifact} from "../../graph/artifact.js";
import {FileArtifact} from "../../graph/artifact/file.js";
import ducktype from "ducktype";
import {Dependency} from "../../graph/dependency.js";
const DuckType = ducktype(Boolean).constructor;
import chai from "chai";
const {expect} = chai;

describe("ducktype", () => {
    it("can validate Artifact wrappers", ()=>{

        const dt = ducktype(String,AID,Artifact,Dependency,{artifact: Artifact});
        const obj = { toString: () => "/foo/bar" };
        const artifact = new FileArtifact("file:root+foo/bar","/home/rulatir/foo/bar");
        Object.defineProperty(obj, "artifact", {
            get: () => artifact
        });
        expect(dt.test(artifact)).to.be.true;
    });
});