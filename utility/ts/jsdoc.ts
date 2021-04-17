import ts from "typescript";


class JSDocBuilder {
    blocks: string[] = [];
    block(tag: string, type?: string, name?: string, ...entries: Parameters<typeof JSDocBuilder.prototype.item>[]  ) {
        this.blocks.push([
            '/**',
            this.item(tag, type, name),
            ...entries.map(entry => this.item(...entry)),
            ` */`
        ].join("\n"));
    }
    item(tag: string, type?: string, value?: string) : string {
        return ` * @${tag}${type ? ` {${type}}` : ""}${value ? ` ${value}` : ""}`;
    }
}

const kinds = new Map(
    Object.entries(ts.SyntaxKind).map(([k,v]) => [v,k])
);

function kind(value: ts.SyntaxKind) : string {
    const result = kinds.get(value);
    if (undefined === result) throw new Error(`Invalid syntax kind ${name}`);
    return result;
}

function makeVisitor(builder: JSDocBuilder) : [(node: ts.Node) => void, string[]] {
    let indent = "";
    const result : string[] = [];
    function visit(node: ts.Node) {
        result.push(indent + kind(node.kind));
        const oldIndent = indent;
        indent += ' ';
        ts.forEachChild(node, visit);
        indent = oldIndent;
    }
    return [visit, result];
}

function process(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    for(let sourceFile of program.getSourceFiles()) {
        if (!fileNames.includes(sourceFile.fileName)) continue;
        const
            builder = new JSDocBuilder(),
            [visit, result] = makeVisitor(builder);
        visit(sourceFile);
        console.log(`File ${sourceFile.fileName} was fully parsed:\n${result.join("\n")}`);
    }
}

process(
    [
        '/fasthome/rulatir/works/zrup/ts/front/module-builder.ts'
    ],
    {
        rootDir: "./utility",
    }
);