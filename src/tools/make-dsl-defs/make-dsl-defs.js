import ts from "typescript";
const kinds = new Map(Object.entries(ts.SyntaxKind).map(([k, v]) => [v, k]));
function kind(value) {
    const result = kinds.get(value);
    if (undefined === result)
        throw new Error(`Invalid syntax kind ${name}`);
    return result;
}
const requestedTypes = {
    Artifact: {},
    AID: {},
    ArtifactManager: {},
    ArtifactResolver: {},
    ArtifactFactory: {},
    FileArtifact: {},
    Module: {},
    ResolveArtifactResult: {},
    Dependency: {},
    RuleBuilder: {},
    CommandRecipe: {},
    Job: {},
    Build: {},
    Rule: {},
    ModuleBuilder: { detailed: false }
};
class DSLBuilder {
    constructor() {
        this.namespaces = [];
        this.classes = [];
    }
    render() {
        return `
declare interface __emptyClassWorkaround {}
declare type EmptyWorkaround<T> = T | __emptyClassWorkaround;
declare type ValueOrArray<T> = T | ValueOrArray<T>[];

${this.classes.join("\n\n")}

declare module "zrup-dsl" {
    global {
        ${this.namespaces.join("\n\n").split("\n").map(_ => '        ' + _).join("\n").trimLeft()}
    }
}
        `.trim();
    }
}
function makeVisitor(sourceFile, builder) {
    const requestedTypeNames = Object.keys(requestedTypes);
    const branch = [];
    function traverse(node, visitor) {
        branch.push(node);
        try {
            ts.forEachChild(node, visitor);
        }
        catch (e) {
            throw e;
        }
        finally {
            branch.pop();
        }
    }
    function visit(node) {
        if (branch.length) {
            // @ts-ignore
            node["parent"] = branch[branch.length - 1];
        }
        const nodeKind = kind(node.kind);
        if (ts.isModuleBlock(node)) {
            const decl = node.parent;
            const name = decl.name.getFullText().trim();
            if (!requestedTypeNames.includes(name)) {
                return;
            }
            builder.namespaces.push(`namespace ${name} ${node.getFullText()}`);
            return;
        }
        if (ts.isClassDeclaration(node)) {
            const nameNode = node.name;
            const name = nameNode?.getFullText(sourceFile).trim();
            if (!name || !requestedTypeNames.includes(name)) {
                return;
            }
            const config = requestedTypes[name];
            if (!config || false === config.detailed)
                return;
            let text = node.getText(sourceFile);
            text = text.replace(/^.*?\b((?:(abstract|final)\s+)?)class/, "$1class");
            builder.classes.push(`declare ${text}`);
        }
        if (ts.isInterfaceDeclaration(node)) {
            const nameNode = node.name;
            const name = nameNode?.getFullText(sourceFile).trim();
            if (!name || !requestedTypeNames.includes(name)) {
                return;
            }
            const config = requestedTypes[name];
            if (!config || false === config.detailed)
                return;
            let text = node.getText(sourceFile);
            text = text.replace(/^.*?\binterface/, "interface");
            builder.classes.push(`declare ${text}`);
        }
        switch (nodeKind) {
            case "ImportDeclaration":
            case "ImportEqualsDeclaration":
                return;
            default:
                traverse(node, visit);
        }
    }
    return visit;
}
function process(fileNames, options) {
    let program = ts.createProgram(fileNames, options);
    const builder = new DSLBuilder();
    for (let sourceFile of program.getSourceFiles()) {
        if (!fileNames.includes(sourceFile.fileName))
            continue;
        const visit = makeVisitor(sourceFile, builder);
        visit(sourceFile);
    }
    console.log(builder.render());
}
process([
    'graph/artifact',
    'graph/artifact/file',
    'graph/dependency',
    'graph/rule',
    'module',
    'front/rule-builder',
    'front/module-builder',
    'build/recipe/command',
    'build/job'
]
    .map(_ => '/fasthome/rulatir/works/zrup/types/' + _ + '.d.ts'), {
    rootDir: "./utility",
});
//# sourceMappingURL=make-dsl-defs.js.map