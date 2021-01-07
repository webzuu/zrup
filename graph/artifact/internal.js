import {FileArtifact, FileArtifactFactoryAbstract, FileArtifactResolver} from "./file";

export class InternalArtifact extends FileArtifact
{
    /** @return {string} */
    get type()
    {
        return "internal";
    }
    static get type() { return "internal"; }
}

export class InternalArtifactFactory extends FileArtifactFactoryAbstract
{
    constructor(manager, project)
    {
        super(manager,project,InternalArtifact,new FileArtifactResolver(project,".internal"));
    }
}