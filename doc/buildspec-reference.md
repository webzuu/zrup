# Buildspec Reference Guide

This document provides a comprehensive reference for writing zrup buildspecs (`.zrup.mjs` files).

## Table of Contents

1. [Module Structure](#module-structure)
2. [Module Definer API](#module-definer-api)
3. [Rule Definer API](#rule-definer-api)
4. [Recipe Descriptors](#recipe-descriptors)
5. [Artifact References](#artifact-references)
6. [Template Tag](#template-tag)
7. [Advanced Recipes](#advanced-recipes)
8. [Configuration](#configuration)

## Module Structure

### Basic Module Template

```javascript
/** @type {ModuleBuilder.definer} */
const moduleName = async function moduleName(M) {
    // Module body
}
export default moduleName;
```

### Module Naming

The module name defaults to the function name. This name is used to reference the module from other modules and in artifact identifiers.

### Including Submodules

```javascript
await include('subdir1', 'subdir2', 'subdir3');
```

The `include()` function:
- Takes relative paths to directories containing `.zrup.mjs` files
- Loads modules recursively
- Returns a promise that resolves to an array of loaded module names

## Module Definer API

The parameter object passed to a module definer contains:

**Key Concept:** Rules specify *when* to build (dependencies, outputs, conditions), and recipes specify *what* to do (the actual commands or actions).

### `module`
Type: `Module`

The module instance being defined.

```javascript
const moduleName = async function(M) {
    console.log(M.module.name);  // Access module name
    console.log(M.module.absolutePath);  // Access module directory
}
```

### `include(...paths)`
Type: `(...paths: string[]) => Promise<string[]>`

Include submodules from specified relative paths.

```javascript
await include('frontend', 'backend', 'shared');
```

### `to(name, definer)`
Type: `(name: string, definer: RuleDefiner) => void`

Define a rule using the simplified API. The definer can return:
- A command string (with template tag)
- A recipe descriptor object
- Nothing (use imperative API inside the definer)

```javascript
// Return command string
to("build", ({T}) => T`make all`);

// Return descriptor
to("build", ({T}) => ({
    cmd: "make all",
    out: produces("build.log")
}));

// Use imperative API
to("build", ({T}) => {
    depends("src.c");
    produces("program");
    return T`gcc src.c -o program`;
});
```

### `rule(definer)` or `rule(name, definer)`
Type: `(name?: string, definer: RuleDefiner) => void`

Define a rule using the imperative API. More flexible than `to()` but more verbose.

```javascript
rule("build", ({rule, depends, produces}) => {
    depends("src.c");
    produces("program");
    return new CommandRecipe(({exec, args}) => {
        exec("gcc");
        args("src.c", "-o", "program");
    });
});
```

### `depends(...artifacts)`
Type: `(...artifacts: Artifact.Resolvables[]) => Dependency[]`

Mark artifacts as dependencies of the rule being defined. Returns Dependency objects.

```javascript
depends("input.txt");
depends("file1.txt", "file2.txt");
depends(...arrayOfFiles);
```

### `produces(...artifacts)`
Type: `(...artifacts: Artifact.Resolvables[]) => Artifact[]`

Mark artifacts as outputs of the rule being defined. Returns Artifact objects.

```javascript
produces("output.txt");
produces("out1.txt", "out2.txt");
```

### `resolve(...artifacts)`
Type: `(...artifacts: Artifact.Resolvables[]) => (string|ResolveArtifactResult)[]`

Resolve artifact references to paths without creating dependencies.

```javascript
const path = resolve("file.txt")[0].toString();
const modulePath = resolve(".")[0].toString();
```

### `after(...rules)`
Type: `(...rules: string[]) => void`

Specify that the current rule must be processed after other rules.

```javascript
after("setup");
after("setup", "initialize");
after("otherModule+prepare");
```

### `also(...rules)`
Type: `(...rules: string[]) => void`

Specify additional rules that should run when the current rule runs.

```javascript
also("lint");
also("lint", "format-check");
```

### `always([value])`
Type: `(value?: boolean) => void`

Mark the rule as always-run (never skip due to up-to-date check).

```javascript
always();      // Always run
always(true);  // Always run
always(false); // Normal up-to-date checking
```

### `T`
Type: `templateStringTag`

Template tag for constructing commands with embedded artifact references.

```javascript
T`gcc -o ${produces('program')} ${depends('main.c')}`
```

### `API`
Type: `ZrupAPI`

Object containing constructors for advanced usage:

```javascript
const {CommandRecipe, WrapperRecipe, DelayedRecipe, AID} = M.API;
```

## Rule Definer API

When defining a rule, the definer function receives a parameter object with:

### `rule`
Type: `Rule`

The rule instance being defined.

### `depends(...artifacts)`
Same as module-level `depends()`, but only available inside rule definers.

### `produces(...artifacts)`
Same as module-level `produces()`, but only available inside rule definers.

### `after(...rules)`
Same as module-level `after()`.

### `also(...rules)`
Same as module-level `also()`.

### `always([value])`
Same as module-level `always()`.

### `resolve(...artifacts)`
Same as module-level `resolve()`.

### `T`
Same as module-level `T`.

## Recipe Descriptors

When using `to()`, you can return a descriptor object with these properties:

### `cmd`
Type: `string | string[] | TemplateResult`

The command to execute. Can be:
- A simple string: `"make all"`
- An array (flattened and joined): `["make", "-j4", "all"]`
- A template tag result: `T\`make all\``

### `args`
Type: `any[]`

Additional arguments to pass to the command. Elements are flattened and stringified.

```javascript
{
    cmd: "gcc",
    args: ["-Wall", "-O2", depends("src.c"), "-o", produces("program")]
}
```

### `cwd`
Type: `string | Artifact.Reference`

Working directory for the command.

```javascript
{
    cmd: "npm install",
    cwd: "frontend"
}
```

### `shell`
Type: `boolean`

Whether to execute the command through `/bin/bash`. Default is `true` for template tag commands.

```javascript
{
    cmd: "echo $PATH",
    shell: true
}
```

### `out`
Type: `Artifact | string`

Redirect stdout to this artifact.

```javascript
{
    cmd: "ls -la",
    out: produces("files.txt")
}
```

### `err`
Type: `Artifact | string`

Redirect stderr to this artifact.

```javascript
{
    cmd: "make all",
    err: produces("errors.txt")
}
```

### `combined`
Type: `Artifact | string`

Redirect both stdout and stderr to this artifact.

```javascript
{
    cmd: "npm test",
    combined: produces("test-output.txt")
}
```

## Artifact References

### Understanding Channels

**Every artifact in zrup uses a channel.** Channels define where artifacts are stored:

- **`file:`** (implicit default) - Maps directly to your source tree
- **Other channels** (e.g., `internal:`, `tmp:`) - Create parallel directory trees under `.zrup/channels/<channel>/` that mirror your project structure

For example:
- `output.txt` → Uses `file:` channel → `<module-path>/output.txt`
- `internal:output.txt` → Uses `internal:` channel → `.zrup/channels/internal/<module-path>/output.txt`
- `internal:cloud+built` → Uses `internal:` channel → `.zrup/channels/internal/<path-to-cloud-module>/built`

Channels preserve module hierarchy, so artifacts from different modules don't collide.

### Formats

#### Simple Path
Relative to current module directory (uses implicit `file:` channel):
```javascript
"output.txt"
"dist/bundle.js"
"../shared/lib.js"
```

#### Module-Scoped
Reference files in other modules (uses implicit `file:` channel):
```javascript
"moduleName+file.txt"
"frontend+dist/bundle.js"
```

#### Channel-Scoped
Reference artifacts in specific channels:
```javascript
"internal:build-state"              // Current module, internal channel
"internal:cloud+built"              // cloud module, internal channel
"tmp:intermediate-file"             // Current module, tmp channel
```

#### Fully Qualified
Combine type, channel, module, and path:
```javascript
"file:src+input.txt"                // Explicit file channel
"internal:frontend+compiled"        // Internal channel, frontend module
```

### Special References

#### Current Module Directory
```javascript
resolve(".")           // Module directory as artifact
resolve("+")           // Module directory as path string
"moduleName+"          // Another module's directory
```

## Template Tag

The `T` template tag enables convenient command construction:

### Basic Usage

```javascript
T`command arg1 arg2`
```

### Embedding Artifacts

```javascript
T`cp ${depends('src.txt')} ${produces('dst.txt')}`
```

### Embedding Multiple Artifacts

```javascript
const sources = ["a.c", "b.c", "c.c"];
T`gcc ${depends(...sources)} -o ${produces('program')}`
```

### Combining with Shell Features

```javascript
T`find src -name "*.js" | xargs cat > ${produces('combined.js')}`
T`make all && touch ${produces('done.txt')}`
```

### In Array Contexts

```javascript
{
    cmd: "gcc",
    args: [
        T`-I${resolve('include')}`,
        depends("src.c"),
        T`-o ${produces('program')}`
    ]
}
```

## Advanced Recipes

### CommandRecipe Builder API

When using `new CommandRecipe()`, the builder function receives:

#### `exec(command)`
Set the command to execute.

#### `args(...args)`
Add command arguments.

#### `cwd(path)`
Set working directory.

#### `shell(boolean)`
Enable/disable shell execution.

#### `out(artifact)`
Redirect stdout.

#### `err(artifact)`
Redirect stderr.

#### `combined(artifact)`
Redirect combined output.

Example:
```javascript
new CommandRecipe(({exec, args, out, cwd}) => {
    exec("gcc");
    args("-Wall", "-O2");
    args(...sources);
    args("-o", output);
    out(logFile);
    cwd("./build");
})
```

### WrapperRecipe

```javascript
new WrapperRecipe({
    recipe: baseRecipe,
    
    before: async (job) => {
        // Runs before the wrapped recipe
    },
    
    after: async (job) => {
        // Runs after the wrapped recipe
    },
    
    around: async (job, proceed) => {
        // Wraps the execution
        // Call proceed(job) to execute wrapped recipe
    }
})
```

### DelayedRecipe

```javascript
new DelayedRecipe(
    baseRecipe,
    delayMilliseconds
)
```

## Configuration

### `.zrup.json`

The project configuration file:

```json
{
    "zrupDir": ".zrup",
    "dataDir": "<zrupDir>/data",
    "channels": {
        "internal": "<zrupDir>/channels/internal",
        "tmp": "<zrupDir>/channels/tmp",
        "custom": "<zrupDir>/channels/custom"
    }
}
```

#### `zrupDir`
Directory for zrup's internal files.

#### `dataDir`
Directory for the build database.

#### `channels`
Map of channel names to their storage directories. Use `<zrupDir>` as a placeholder for the zrupDir value.

## Common Patterns

### Multi-File Dependencies

```javascript
const sources = ["a.c", "b.c", "c.c"];
to("compile", ({T}) => 
    T`gcc ${depends(...sources)} -o ${produces('program')}`
);
```

### Conditional Dependencies

```javascript
to("build", ({T}) => {
    const deps = [];
    if (needsSomeLib) deps.push("lib.a");
    depends(...deps);
    return T`gcc main.c -o ${produces('program')}`;
});
```

### Phony Targets

```javascript
to("all", ({T}) => {
    depends("internal:frontend+built", "internal:backend+built");
    return T`echo "All built" > ${produces('internal:all')}`;
});
```

### Fingerprinting

```javascript
to("fingerprint", ({T}) => {
    always();
    return T`find src -type f -name "*.ts" | xargs md5sum > ${produces('internal:fp')}`;
});

to("build", ({T}) => {
    depends("internal:fp");
    return T`tsc && touch ${produces('internal:built')}`;
});
```

### Clean Rules

```javascript
to("clean", ({T}) => {
    always();
    return T`rm -rf build dist && mkdir -p build dist && touch ${produces('internal:clean')}`;
});
```

## Type Annotations

For better IDE support, use JSDoc type annotations:

```javascript
/** @type {ModuleBuilder.definer} */
const myModule = async function myModule(M) {
    // M is properly typed
}
export default myModule;
```

This enables autocomplete for the module definer API.

## Summary

This reference covers:
- Module and rule definition APIs
- Recipe descriptor properties
- Artifact reference formats
- Template tag usage
- Advanced recipe types
- Configuration options
- Common patterns

For step-by-step tutorials, see the tutorial series. For API details, see the TypeDoc generated documentation.
