# 003. Artifacts and Channels

Topics covered:
 - Understanding artifact identifiers (AIDs)
 - Channels: internal, tmp, and custom channels
 - Module-scoped artifacts vs channel artifacts
 - Artifact resolution
 - Using the `resolve()` function

## Artifact Identifiers (AIDs)

In zrup, every build artifact is identified by an **Artifact Identifier (AID)**. An AID is a string that uniquely identifies a build artifact and can have several formats:

### Simple File References

The most basic form is a simple filename or path, which is resolved relative to the current module's directory:

```javascript
produces("output.txt")          // File in current module's directory
produces("dist/bundle.js")      // File in subdirectory
```

### Module-Scoped References

To refer to artifacts in other modules, use the format `module+path`:

```javascript
depends("js+built.js")          // Refers to built.js in the js module
depends("src+input.txt")        // Refers to input.txt in the src module
```

The module name is the one defined in the module's definer function.

### Channel References

**Every artifact in zrup uses a channel.** The default channel is `file:`, which maps directly to your source tree. Other channels create parallel directory trees under `.zrup/channels/<channel>` that mirror your project's structure.

When you use a channel, artifacts are stored in paths that preserve the module hierarchy. For example, `internal:cloud+built` resolves to `<project-root>/.zrup/channels/internal/<path-to-cloud-module>/built`.

The format is `channel:artifact-name` or `channel:module+path`:

```javascript
produces("internal:compiled")      // Internal channel, current module
produces("internal:cloud+built")   // Internal channel, cloud module
produces("tmp:cache-file")         // Temporary channel artifact
```

Common channels:
- **file** (implicit default): Maps to your source tree
- **internal**: For build artifacts that persist across builds, stored in parallel tree under `.zrup/channels/internal/`
- **tmp**: For temporary artifacts that can be cleaned up, stored under `.zrup/channels/tmp/`

Channels are configured in `.zrup.json`:

```json
{
    "zrupDir": ".zrup",
    "dataDir": "<zrupDir>/data",
    "channels": {
        "internal": "<zrupDir>/channels/internal",
        "tmp": "<zrupDir>/channels/tmp"
    }
}
```

### Fully Qualified AIDs

You can combine module and channel information in a fully qualified AID. The general format is: `[type:][[module+]ref]`

Examples:
```javascript
"file:src+input.txt"            // Explicitly typed as file
"internal:js+built"             // Channel with module
```

## Using Artifacts in Rules

### The `depends()` Function

Mark artifacts as dependencies of the current rule. The rule will only execute if its dependencies are up-to-date:

```javascript
to("copy", ({T}) => 
    T`cp ${depends("src+input.txt")} ${produces("output.txt")}`
);
```

You can depend on multiple artifacts:

```javascript
to("concatenate", ({T}) => {
    depends("input1.txt", "input2.txt", "input3.txt");
    return T`cat input1.txt input2.txt input3.txt > ${produces("combined.txt")}`;
});
```

Or use an array:

```javascript
const inputs = ["input1.txt", "input2.txt", "input3.txt"];
depends(...inputs);
```

### The `produces()` Function

Mark artifacts as outputs of the current rule. When these artifacts are requested, zrup will execute the rule to produce them:

```javascript
to("build", ({T}) => 
    T`gcc -o ${produces("program")} ${depends("main.c")}`
);
```

Multiple outputs are also supported:

```javascript
to("compile", ({T}) => {
    produces("output.o", "output.d");
    return T`gcc -c -MMD ${depends("source.c")} -o output.o`;
});
```

### The `resolve()` Function

Sometimes you need to resolve an artifact reference to an actual path without marking it as a dependency or output. This is where `resolve()` comes in:

```javascript
to("list-files", ({T}) => ({
    cwd: resolve("."),  // Resolve current module directory
    cmd: T`ls -la > ${produces("files.txt")}`
}));
```

The `resolve()` function returns an array of resolved paths or artifact information. When used with a single artifact, you typically want the first element:

```javascript
const modulePath = resolve(".")[0].toString();
```

## Practical Examples

### Example 1: Multi-Module Build

```javascript
// Root module
/** @type {ModuleBuilder.definer} */
const root = async function root({include, to, depends, produces}) {
    await include('src', 'dist');
    
    to("all", ({T}) => 
        T`md5state -- ${depends('dist+bundle.js')} > ${produces('internal:all')}`
    );
}
export default root;
```

```javascript
// src/.zrup.mjs
/** @type {ModuleBuilder.definer} */
const src = async function src({to, depends, produces}) {
    to("compile", ({T}) => 
        T`tsc ${depends('main.ts')} -o ${produces('internal:compiled.js')}`
    );
}
export default src;
```

```javascript
// dist/.zrup.mjs
/** @type {ModuleBuilder.definer} */
const dist = async function dist({to, depends, produces}) {
    to("bundle", ({T}) => 
        T`cp ${depends('internal:src+compiled.js')} ${produces('bundle.js')}`
    );
}
export default dist;
```

### Example 2: Using Internal Channels for Build State

```javascript
/** @type {ModuleBuilder.definer} */
const build = async function build({to, depends, produces}) {
    
    // Create a fingerprint of source files
    to("source-fingerprint", ({T}) => 
        T`find src -type f -name "*.ts" | xargs md5sum > ${produces('internal:source-fp')}`
    );
    
    // Compile only if sources changed
    to("compile", ({T}) => {
        depends('internal:source-fp');
        return T`tsc && touch ${produces('internal:compiled')}`;
    });
    
    // Bundle depends on compilation
    to("bundle", ({T}) => 
        T`webpack && md5sum dist/bundle.js > ${produces('internal:bundled')}`
    );
}
export default build;
```

### Example 3: Working with Temporary Artifacts

```javascript
/** @type {ModuleBuilder.definer} */
const process = async function process({to, depends, produces}) {
    
    // Create temporary intermediate file
    to("preprocess", ({T}) => 
        T`cpp ${depends('input.c')} > ${produces('tmp:preprocessed.c')}`
    );
    
    // Use the temporary file
    to("compile", ({T}) => 
        T`gcc -c ${depends('tmp:preprocessed.c')} -o ${produces('output.o')}`
    );
}
export default process;
```

## Best Practices

1. **Understand channel mapping**: Remember that channels create parallel directory trees. `internal:cloud+state` maps to `.zrup/channels/internal/<path-to-cloud-module>/state`, preserving the module hierarchy.

2. **Use `internal:` for persistent build state**: Build artifacts that need to persist across builds and track changes should use the `internal:` channel.

3. **Use `file:` (implicit) for source and final outputs**: Keep actual source files and final build outputs in the default `file:` channel (your source tree).

4. **Use `tmp:` for ephemeral artifacts**: Temporary files that don't need to persist can use the `tmp:` channel.

5. **Minimize use of `resolve()`**: Prefer `depends()` and `produces()` which automatically handle artifact resolution and track dependencies. Use `resolve()` only when you truly need a path without dependency tracking (e.g., for `cwd` settings).

6. **Choose meaningful artifact names**: Use descriptive names that make the build graph easier to understand:
   ```javascript
   produces('internal:typescript-compiled')  // Good
   produces('internal:tsc')                  // Less clear
   ```

7. **Module-scoped channel references work**: You can reference artifacts in other modules within non-file channels: `internal:frontend+built` is valid and resolves to the internal channel's parallel tree.

## Summary

- **AIDs** uniquely identify artifacts in various formats: simple paths, module-scoped (`module+path`), or channel-scoped (`channel:name`)
- **Channels** are parallel directory trees for different types of artifacts; every artifact uses a channel (default is `file:`)
- Non-`file:` channels mirror your project structure under `.zrup/channels/<channel>/`
- **`depends()`** marks inputs and creates dependency edges in the build graph
- **`produces()`** marks outputs and makes artifacts buildable
- **`resolve()`** converts artifact references to paths without creating dependencies
- The artifact system enables zrup to track dependencies accurately and rebuild only what's necessary
