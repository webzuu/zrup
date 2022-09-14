import { Node, Project, StructureKind, SyntaxKind } from "ts-morph";
class DSLBuilder {
    constructor() {
        this.namespaces = [];
        this.classes = [];
    }
    render() {
        // language=TypeScript
        return `
declare interface __emptyClassWorkaround {}
declare type EmptyWorkaround<T> = T | __emptyClassWorkaround;
declare type ValueOrArray<T> = T | ValueOrArray<T>[];
import {EventEmitter} from "events";
import {Transaction} from "better-sqlite3";

${this.classes.join("\n\n")}

declare global {
    ${this.namespaces.join("\n\n").split("\n").map(_ => '    ' + _).join("\n").trimLeft()}
}

export{};
        `.trim();
    }
}
const requestedTypes = {
    Artifact: {},
    AID: {},
    ArtifactManager: {},
    ArtifactResolver: {},
    ArtifactFactory: {},
    FileArtifact: {},
    RecipeArtifact: {},
    Module: {},
    ResolveArtifactResult: {},
    Dependency: {},
    RuleBuilder: {},
    CommandRecipe: {},
    Job: {},
    JobSet: {},
    Build: {},
    Rule: {},
    ModuleBuilder: { detailed: false },
    Graph: {},
    Db: {},
    RecordedVersionInfo: {},
    ZrupAPI: {}
};
const requestedTypeNames = Object.keys(requestedTypes);
const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
    skipAddingFilesFromTsConfig: true
});
project.addSourceFilesAtPaths([
    'db',
    'graph',
    'graph/artifact',
    'graph/artifact/file',
    'graph/artifact/recipe',
    'graph/dependency',
    'graph/rule',
    'module',
    'front/rule-builder',
    'front/module-builder',
    'front/zrup',
    'build',
    'build/recipe',
    'build/recipe/command',
    'build/job',
    'build/job-set',
    'front/api',
].map(_ => 'types/' + _ + '.d.ts'));
const builder = new DSLBuilder();
function processInterface(iface) {
    const docs = iface.getJsDocs();
    let doc = docs[0];
    if (doc) {
        const struct = doc.getStructure();
        const tagsToBeAdded = [];
        iface.getProperties().forEach(prop => {
            const propDocs = prop.getJsDocs();
            const propDoc = propDocs[0];
            if (propDoc && doc) {
                const propType = prop.getType();
                const typeRef = propType.getText().split('.').filter(_ => /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(_)).join('.');
                const v = 7;
                tagsToBeAdded.push({
                    kind: StructureKind.JSDocTag,
                    tagName: "property",
                    text: `{${typeRef}} ${prop.getName()}` +
                        (struct.description ? ' ' + propDoc.getDescription().trim() : '')
                });
            }
        });
        doc.addTags(tagsToBeAdded);
    }
}
for (let sourceFile of project.getSourceFiles()) {
    sourceFile.forEachDescendant((node, traversal) => {
        if (Node.isModuleBlock(node)) {
            const decl = node.getParent();
            const name = decl.getName().trim();
            if (requestedTypeNames.includes(name)) {
                traversal.skip();
                node.forEachChild((member) => {
                    if (Node.isInterfaceDeclaration(member)) {
                        processInterface(member);
                    }
                });
                builder.namespaces.push(`namespace ${name} ${node.getFullText()}`);
            }
        }
        if (Node.isClassDeclaration(node)) {
            const name = node.getName();
            if (name && requestedTypeNames.includes(name)) {
                const config = requestedTypes[name];
                if (!config || false === config.detailed)
                    return;
                let text = node.getText();
                text = text.replace(/^.*?\b((?:(abstract|final)\s+)?)class/, "$1class");
                builder.classes.push(`declare ${text}`);
            }
            traversal.skip();
        }
        if (Node.isInterfaceDeclaration(node)) {
            const name = node.getName();
            if (name && requestedTypeNames.includes(name)) {
                const config = requestedTypes[name];
                if (!config || false === config.detailed)
                    return;
                let text = node.getText();
                text = text.replace(/^.*?\binterface/, "interface");
                builder.classes.push(`declare ${text}`);
            }
            traversal.skip();
        }
        if ([
            SyntaxKind.ImportDeclaration,
            SyntaxKind.ImportEqualsDeclaration
        ].includes(node.getKind())) {
            traversal.skip();
        }
    });
}
console.log(builder.render());
//# sourceMappingURL=make-dsl-defs.js.map