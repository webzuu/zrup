# 004. Advanced Rule Patterns

Topics covered:
 - Rule ordering with `after()`
 - Side-effect rules with `also()`
 - Always-run rules with `always()`
 - Controlling working directory with `cwd`
 - Output redirection: `out`, `err`, `combined`
 - Command arguments with `args`

## Rule Ordering: The `after()` Function

Sometimes you need to ensure that one rule runs after another, even when there's no direct artifact dependency between them. This is where `after()` comes in:

```javascript
/** @type {ModuleBuilder.definer} */
const build = async function build({to, after, depends, produces}) {
    
    to("initialize", ({T}) => 
        T`mkdir -p build && touch ${produces('internal:initialized')}`
    );
    
    to("compile", ({T}) => {
        after("initialize");  // Ensure initialization happens first
        return T`gcc -c ${depends('src.c')} -o ${produces('build/src.o')}`;
    });
}
export default build;
```

Use `after()` when:
- Rules have implicit dependencies not expressed through artifacts
- You need to enforce ordering for resource management (locks, initialization)
- Side effects of one rule must complete before another starts

You can reference rules from other modules:

```javascript
after("otherModule+rule-name");
```

## Side-Effect Rules: The `also()` Function

The `also()` function specifies that when the current rule is required, other rules should also be executed. Unlike `after()`, it doesn't specify order - the execution order is determined by actual dependencies:

```javascript
/** @type {ModuleBuilder.definer} */
const test = async function test({to, also, depends, produces}) {
    
    to("run-tests", ({T}) => {
        also("coverage-report");  // Always generate coverage when running tests
        return T`pytest ${depends('tests/')} > ${produces('test-results.txt')}`;
    });
    
    to("coverage-report", ({T}) => 
        T`coverage report > ${produces('coverage.txt')}`
    );
}
export default test;
```

Common use cases for `also()`:
- Logging or reporting rules that should always run alongside main rules
- Cleanup or maintenance tasks
- Verification steps

You can specify multiple also-rules:

```javascript
also("lint", "format-check", "security-scan");
```

## Always-Run Rules: The `always()` Function

By default, zrup checks if a rule's outputs are up-to-date before running it. The `always()` function disables this check, forcing the rule to run every time it's required:

```javascript
/** @type {ModuleBuilder.definer} */
const deploy = async function deploy({to, always, depends, produces}) {
    
    to("deploy", ({T}) => {
        always();  // Always deploy, never skip
        depends('dist+bundle.js');
        return T`scp dist/bundle.js server:/var/www/ && touch ${produces('internal:deployed')}`;
    });
    
    to("timestamp", ({T}) => {
        always();  // Always update timestamp
        return T`date > ${produces('build-time.txt')}`;
    });
}
export default deploy;
```

Use `always()` for:
- Rules that check external state (network, databases)
- Timestamp or metadata generation
- Rules with non-deterministic outputs
- Deployment or publishing tasks

**Note**: Use `always()` sparingly as it bypasses zrup's incremental build optimization.

## Controlling Working Directory: `cwd`

By default, commands run in the current module's directory. Use the `cwd` property to change this:

```javascript
/** @type {ModuleBuilder.definer} */
const npm = async function npm({to, depends, produces, resolve}) {
    
    to("install", ({T}) => ({
        cwd: resolve("..")[0].toString(),  // Run in parent directory
        cmd: T`npm install && touch ${produces('internal:npm-installed')}`
    }));
    
    to("build", ({T}) => ({
        cwd: "frontend",  // Relative to module directory
        cmd: T`npm run build && cp dist/bundle.js ${produces('../bundle.js')}`
    }));
}
export default npm;
```

The `cwd` can be:
- A string path (relative to module directory)
- An artifact reference resolved with `resolve()`
- A module reference like `resolve("otherModule+.")[0].toString()`

## Output Redirection

Zrup provides several ways to capture command output.

### Standard Output: `out`

Redirect stdout to a file:

```javascript
to("list", ({T}) => ({
    cmd: "ls -la",
    out: produces("files.txt")
}));
```

Or use shell redirection in the command:

```javascript
to("list", ({T}) => 
    T`ls -la > ${produces('files.txt')}`
);
```

Both approaches work, but using the `out` property is more explicit and may be clearer for readers.

### Standard Error: `err`

Capture stderr separately:

```javascript
to("compile", ({T}) => ({
    cmd: T`gcc ${depends('src.c')} -o ${produces('program')}`,
    err: produces("compile-errors.txt")
}));
```

### Combined Output: `combined`

Capture both stdout and stderr together:

```javascript
to("test", ({T}) => ({
    cmd: "npm test",
    combined: produces("test-output.txt")
}));
```

### Multiple Outputs

You can capture different streams to different files:

```javascript
to("build", ({T}) => ({
    cmd: "make all",
    out: produces("build-stdout.txt"),
    err: produces("build-stderr.txt"),
    combined: produces("build-all.txt")
}));
```

## Command Arguments: `args`

For more complex command construction, use the `args` property to pass arguments separately:

```javascript
/** @type {ModuleBuilder.definer} */
const compile = async function compile({to, depends, produces}) {
    
    to("compile", ({T}) => {
        const sources = ["src1.c", "src2.c", "src3.c"];
        return {
            cmd: "gcc",
            args: [
                "-Wall",
                "-O2",
                ...depends(...sources),
                "-o",
                produces("program")
            ]
        };
    });
}
export default compile;
```

The `args` array elements can be:
- Strings
- Numbers (converted to strings)
- Template tag results: `T\`...\``
- Results from `depends()` or `produces()`

Arguments are automatically flattened, so you can use nested arrays:

```javascript
args: [
    ["-Wall", "-Wextra"],
    ["-O2"],
    sources.map(s => depends(s))
]
```

## Practical Examples

### Example 1: Complex Build Pipeline

```javascript
/** @type {ModuleBuilder.definer} */
const pipeline = async function pipeline({to, after, also, depends, produces, resolve}) {
    
    // Setup
    to("clean", ({T}) => {
        always();
        return T`rm -rf build && mkdir -p build && touch ${produces('internal:clean')}`;
    });
    
    // Compile (must be after clean)
    to("compile", ({T}) => {
        after("clean");
        also("lint");  // Always lint when compiling
        return {
            cwd: resolve("."),
            cmd: "tsc",
            args: T`--project tsconfig.json`,
            out: produces("internal:compile-log.txt")
        };
    });
    
    // Lint (runs in parallel with compile if also() triggers it)
    to("lint", ({T}) => 
        T`eslint src/ > ${produces('lint-results.txt')}`
    );
    
    // Test (after compile)
    to("test", ({T}) => {
        after("compile");
        return {
            cmd: "npm test",
            combined: produces("test-results.txt")
        };
    });
    
    // Bundle (after test passes)
    to("bundle", ({T}) => {
        after("test");
        return T`webpack && touch ${produces('internal:bundled')}`;
    });
}
export default pipeline;
```

### Example 2: Conditional Execution Pattern

```javascript
/** @type {ModuleBuilder.definer} */
const conditional = async function conditional({to, depends, produces}) {
    
    // Check if rebuild is needed
    to("check-need-rebuild", ({T}) => {
        always();  // Always check
        return T`./scripts/check-rebuild.sh > ${produces('internal:rebuild-needed')}`;
    });
    
    // Rebuild only runs after check
    to("rebuild", ({T}) => {
        after("check-need-rebuild");
        depends('internal:rebuild-needed');
        return T`make clean && make all && touch ${produces('internal:rebuilt')}`;
    });
}
export default conditional;
```

### Example 3: Multi-Stage Build with Different Working Directories

```javascript
/** @type {ModuleBuilder.definer} */
const multistage = async function multistage({to, depends, produces, resolve}) {
    
    // Stage 1: Build in frontend directory
    to("build-frontend", ({T}) => ({
        cwd: "frontend",
        cmd: "npm run build",
        out: produces("internal:frontend-built")
    }));
    
    // Stage 2: Build in backend directory
    to("build-backend", ({T}) => ({
        cwd: "backend",
        cmd: "cargo build --release",
        out: produces("internal:backend-built")
    }));
    
    // Stage 3: Package in root directory
    to("package", ({T}) => {
        depends('internal:frontend-built', 'internal:backend-built');
        return {
            cwd: resolve("."),
            cmd: "./scripts/package.sh",
            out: produces("package.tar.gz")
        };
    });
}
export default multistage;
```

## Best Practices

1. **Use `after()` sparingly**: Only when artifact dependencies don't capture the relationship. Prefer expressing dependencies through artifacts when possible.

2. **Be careful with `always()`**: It breaks incremental builds. Document why a rule needs to always run.

3. **Prefer artifact dependencies over rule dependencies**: Instead of:
   ```javascript
   after("other-rule");
   ```
   Consider:
   ```javascript
   depends("internal:other-rule-output");
   ```

4. **Use `also()` for orthogonal concerns**: Logging, linting, formatting checks are good candidates.

5. **Keep `cwd` simple**: Complex working directory changes can make builds hard to understand. When possible, structure your project so commands can run in natural locations.

6. **Choose appropriate output redirection**: Use `out` for data, `err` for errors, `combined` when you need both in sequence.

7. **Document complex patterns**: When using `after()`, `also()`, and `always()` together, add comments explaining the intended behavior.

## Summary

- **`after()`**: Enforces rule execution order without artifact dependencies
- **`also()`**: Specifies side-effect rules that should run alongside the current rule
- **`always()`**: Forces a rule to run every time, bypassing up-to-date checks
- **`cwd`**: Changes the working directory for command execution
- **`out`, `err`, `combined`**: Redirect command output to artifact files
- **`args`**: Construct complex command-line arguments programmatically

These advanced patterns give you fine-grained control over build behavior while maintaining zrup's declarative style.
