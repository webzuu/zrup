# Buildspec Writer's Guide

This comprehensive guide will teach you everything you need to know to write effective zrup buildspecs. It's designed for developers who want to master the zrup build system.

## Prerequisites

- Basic knowledge of JavaScript/Node.js
- Familiarity with command-line build tools
- Understanding of build systems concepts (dependencies, targets, incremental builds)

## What is Zrup?

Zrup is an experimental general-purpose build system designed for local development with these key features:

- **Content-based tracking**: Uses content hashes, not timestamps
- **Database-backed**: Stores build records in a database
- **Flexible dependency specification**: Unopinionated, allowing incomplete dependency graphs at user's discretion
- **No sandboxing**: Full filesystem access
- **Extensible primitives**: Core set of primitives that cover 99% of use cases

## Getting Started

### Installation

Initialize a zrup project:

```bash
zrup --init
```

This creates `.zrup.json` with default configuration.

### Your First Buildspec

Create `.zrup.mjs` in your project root:

```javascript
/** @type {ModuleBuilder.definer} */
const myProject = async function myProject({to, produces, depends, T}) {
    
    to("hello", () => 
        T`echo "Hello from zrup!" > ${produces('hello.txt')}`
    );
}
export default myProject;
```

Build it:

```bash
zrup hello.txt
```

## Core Concepts

### 1. Modules

A **module** is defined in a `.zrup.mjs` file. Modules organize your build specification and correspond to parts of your project.

**Key points:**
- Each `.zrup.mjs` file defines one module
- Modules can include submodules
- Module names are used in artifact references
- Root module is at project root

### 2. Rules

A **rule** defines how to build one or more artifacts. Rules specify:
- What they produce (outputs)
- What they depend on (inputs)
- How to build (recipe)

**A rule specifies *when* to do something, and a recipe specifies *what* to do.**

**Key points:**
- Rules are processed when their outputs are requested
- The rule's recipe is invoked only if outputs are out-of-date
- Up-to-date checks determine whether the recipe needs to run
- Rules can depend on other rules through artifacts

### 3. Artifacts

An **artifact** is anything produced or consumed by rules: files, markers, states.

**Artifact types:**
- **Files**: Regular files in your project
- **Channel artifacts**: Special artifacts in channels (internal, tmp)
- **Module artifacts**: Files scoped to modules

### 4. Dependencies

**Dependencies** create edges in the build graph. When artifact A depends on artifact B:
- B must be built before A
- If B changes, A becomes out-of-date
- Zrup tracks these relationships in the database

### 5. Recipes

A **recipe** defines how to execute a build step. Common recipes:
- **CommandRecipe**: Run shell commands (most common)
- **WrapperRecipe**: Add pre/post processing to other recipes
- **DelayedRecipe**: Add delays to other recipes
- **Custom recipes**: For specialized needs

## Building Effective Buildspecs

### Start Simple

Begin with a simple structure:

```javascript
/** @type {ModuleBuilder.definer} */
const project = async function project({to, depends, produces, T}) {
    
    // Build source
    to("compile", () => 
        T`tsc src/main.ts -o ${produces('dist/main.js')}`
    );
    
    // Run tests
    to("test", () => {
        depends("dist/main.js");
        return T`node dist/main.js --test > ${produces('test-results.txt')}`;
    });
    
    // All target
    to("all", () => {
        depends("dist/main.js", "test-results.txt");
        return T`echo "Build complete" > ${produces('internal:all')}`;
    });
}
export default project;
```

### Organize with Modules

As your project grows, split into modules:

```
.zrup.mjs              # Root module
frontend/.zrup.mjs     # Frontend module
backend/.zrup.mjs      # Backend module
shared/.zrup.mjs       # Shared code module
```

Root module:
```javascript
/** @type {ModuleBuilder.definer} */
const root = async function root({include, to, depends, produces, T}) {
    
    await include('frontend', 'backend', 'shared');
    
    to("all", () => {
        depends(
            'internal:frontend+built',
            'internal:backend+built'
        );
        return T`echo "All components built" > ${produces('internal:all')}`;
    });
}
export default root;
```

Frontend module:
```javascript
/** @type {ModuleBuilder.definer} */
const frontend = async function frontend({to, depends, produces, T}) {
    
    to("install", () => 
        T`npm install && touch ${produces('internal:installed')}`
    );
    
    to("build", () => {
        depends('internal:installed', 'shared+lib.js');
        return T`npm run build && touch ${produces('internal:built')}`;
    });
}
export default frontend;
```

### Use Channels Effectively

Channels organize artifacts using parallel directory trees that mirror your project structure:

```javascript
/** @type {ModuleBuilder.definer} */
const build = async function build({to, depends, produces, T}) {
    
    // Track source changes in internal channel
    // This creates: .zrup/channels/internal/<module-path>/source-fp
    to("source-fingerprint", () => {
        always();
        return T`find src -name "*.ts" | xargs md5sum > ${produces('internal:source-fp')}`;
    });
    
    // Compile when sources change
    to("compile", () => {
        depends('internal:source-fp');
        return T`tsc && touch ${produces('internal:compiled')}`;
    });
    
    // Test with temporary test data in tmp channel
    // This creates: .zrup/channels/tmp/<module-path>/test-data
    to("test", () => {
        depends('internal:compiled');
        return T`./scripts/generate-test-data.sh > ${produces('tmp:test-data')} &&
                 npm test -- --data tmp:test-data > ${produces('test-results.txt')}`;
    });
}
export default build;
```

### Handle Complex Dependencies

For complex dependency patterns:

```javascript
/** @type {ModuleBuilder.definer} */
const complex = async function complex({to, depends, produces, resolve, T}) {
    
    // Multiple inputs, single output
    to("concatenate", () => {
        const sources = ["a.txt", "b.txt", "c.txt"];
        return T`cat ${depends(...sources)} > ${produces('combined.txt')}`;
    });
    
    // Single input, multiple outputs
    to("split", () => {
        depends("combined.txt");
        produces("part1.txt", "part2.txt");
        return T`split combined.txt && mv xaa ${resolve('part1.txt')} && mv xab ${resolve('part2.txt')}`;
    });
    
    // Conditional dependencies
    to("build-with-features", () => {
        const baseDeps = ["main.c"];
        const featureDeps = [];
        
        if (needsFeatureA) featureDeps.push("feature-a.c");
        if (needsFeatureB) featureDeps.push("feature-b.c");
        
        return T`gcc ${depends(...baseDeps, ...featureDeps)} -o ${produces('program')}`;
    });
}
export default complex;
```

### Implement Incremental Builds

Use fingerprinting for accurate change detection:

```javascript
/** @type {ModuleBuilder.definer} */
const incremental = async function incremental({to, always, depends, produces, T}) {
    
    // Fingerprint inputs
    to("input-fingerprint", () => {
        always();
        return T`find src -type f -name "*.ts" | sort | xargs md5sum > ${produces('internal:input-fp')}`;
    });
    
    // Build only when inputs change
    to("compile", () => {
        depends('internal:input-fp');
        return {
            cmd: "tsc",
            out: produces("internal:compile-log.txt")
        };
    });
    
    // Fingerprint outputs
    to("output-fingerprint", () => {
        depends('internal:compile-log.txt');
        return T`find dist -type f -name "*.js" | sort | xargs md5sum > ${produces('internal:output-fp')}`;
    });
    
    // Further steps depend on output fingerprint
    to("bundle", () => {
        depends('internal:output-fp');
        return T`webpack && touch ${produces('internal:bundled')}`;
    });
}
export default incremental;
```

### Manage Build Stages

Use rule ordering for multi-stage builds:

```javascript
/** @type {ModuleBuilder.definer} */
const stages = async function stages({to, after, also, depends, produces, T}) {
    
    // Stage 1: Setup
    to("setup", () => 
        T`mkdir -p build temp && touch ${produces('internal:setup')}`
    );
    
    // Stage 2: Prepare (after setup)
    to("prepare", () => {
        after("setup");
        return T`./scripts/prepare.sh > ${produces('internal:prepared')}`;
    });
    
    // Stage 3: Build (after prepare, with linting)
    to("build", () => {
        after("prepare");
        also("lint");
        return T`make all && touch ${produces('internal:built')}`;
    });
    
    // Lint runs in parallel (via also)
    to("lint", () => 
        T`eslint src/ > ${produces('lint-results.txt')}`
    );
    
    // Stage 4: Package (after build)
    to("package", () => {
        after("build");
        return T`./scripts/package.sh && touch ${produces('internal:packaged')}`;
    });
    
    // Stage 5: Deploy (after package)
    to("deploy", () => {
        after("package");
        always();  // Always deploy
        return T`./scripts/deploy.sh && touch ${produces('internal:deployed')}`;
    });
}
export default stages;
```

### Handle Errors Gracefully

Use WrapperRecipe for error handling:

```javascript
import {WrapperRecipe} from "./js/build/recipe/wrapper.js";
import {CommandRecipe} from "./js/build/recipe/command.js";

/** @type {ModuleBuilder.definer} */
const robust = async function robust({rule, depends, produces, T}) {
    
    rule(function buildWithRetry() {
        
        const buildRecipe = new CommandRecipe(({exec, args, out}) => {
            exec("make");
            args("all");
            out(produces("build.log"));
        });
        
        return new WrapperRecipe({
            recipe: buildRecipe,
            
            around: async (job, proceed) => {
                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    try {
                        await proceed(job);
                        return;  // Success
                    } catch (error) {
                        attempts++;
                        if (attempts >= maxAttempts) {
                            console.error(`Build failed after ${maxAttempts} attempts`);
                            throw error;
                        }
                        console.log(`Build failed, retrying (${attempts}/${maxAttempts})...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
        });
    });
}
export default robust;
```

## Best Practices

### 1. Module Organization

**Do:**
- One module per major component
- Clear module names that match directory structure
- Include submodules explicitly

**Don't:**
- Create too many tiny modules
- Use deep nesting unless necessary
- Forget to export the module definer

### 2. Rule Design

**Do:**
- Give rules descriptive names
- Express dependencies through artifacts
- Keep rules focused on one task
- Document complex rules

**Don't:**
- Create rules that do too much
- Use `after()` when artifact dependencies suffice
- Overuse `always()` - it breaks incremental builds

### 3. Artifact Management

**Do:**
- Understand that all artifacts use channels (default is `file:`)
- Use `internal:` for persistent build state (creates parallel tree under `.zrup/channels/internal/`)
- Use `tmp:` for temporary files
- Use module-scoped channel references: `internal:module+artifact` works and preserves hierarchy
- Choose meaningful artifact names

**Don't:**
- Forget that channels mirror your project structure
- Use unclear artifact names
- Put unrelated artifacts in the same location

### 4. Command Construction

**Do:**
- Use template tags for readability
- Embed artifacts with `${depends()}` and `${produces()}`
- Use shell features (pipes, &&, etc.) when appropriate
- Set `cwd` when commands need specific directories

**Don't:**
- Construct complex commands with string concatenation
- Forget to mark inputs with `depends()`
- Forget to mark outputs with `produces()`

### 5. Performance

**Do:**
- Use fingerprinting for large file sets
- Enable parallel builds with proper dependencies
- Mark truly temporary artifacts with `tmp:`
- Profile build times and optimize bottlenecks

**Don't:**
- Use `always()` on expensive rules
- Create unnecessary intermediate artifacts
- Over-specify dependencies (creates serialization)

## Debugging Buildspecs

### Common Issues

#### 1. Artifact Not Found

**Problem:** `Could not resolve artifact`

**Solution:** Check artifact reference format:
```javascript
// Wrong
depends("src:input.txt")  // No 'src:' channel

// Right
depends("src+input.txt")  // Module-scoped
depends("internal:input") // Channel-scoped
```

#### 2. Recipe Never Runs

**Problem:** Recipe never executes even when building its target

**Solution:** Ensure the target is actually produced:
```javascript
// Wrong
to("build", ({T}) => 
    T`make all`  // No target marked!
);

// Right
to("build", ({T}) => 
    T`make all && touch ${produces('internal:built')}`
);
```

#### 3. Build Not Incremental

**Problem:** Everything rebuilds every time

**Solution:** Check for `always()` or missing dependencies:
```javascript
// Wrong
to("compile", ({T}) => {
    always();  // Oops!
    return T`tsc > ${produces('internal:compiled')}`;
});

// Right
to("compile", ({T}) => {
    depends('internal:source-fp');  // Only rebuild when sources change
    return T`tsc > ${produces('internal:compiled')}`;
});
```

### Debugging Techniques

1. **Check the build graph:**
   ```bash
   zrup --show-graph target
   ```

2. **Verbose output:**
   ```bash
   zrup -v target
   ```

3. **Inspect the database:**
   Look at `.zrup/data/` to see stored build records

4. **Add logging:**
   ```javascript
   to("build", ({T}) => {
       console.log("Building with dependencies:", depends('src.c'));
       return T`gcc src.c -o ${produces('program')}`;
   });
   ```

## Advanced Topics

### Custom Recipes

For specialized build logic, create custom recipes:

```javascript
import {Recipe} from "./js/build/recipe.js";

class GitCommitRecipe extends Recipe {
    constructor(message) {
        super();
        this.message = message;
    }
    
    async concretizeSpecFor(job) {
        return {
            message: this.message,
            timestamp: Date.now()
        };
    }
    
    async executeFor(job, spec) {
        // Custom git commit logic
        const {spawn} = require('child_process');
        return new Promise((resolve, reject) => {
            const git = spawn('git', ['commit', '-m', spec.message]);
            git.on('exit', (code) => {
                code === 0 ? resolve() : reject(new Error(`Git commit failed`));
            });
        });
    }
}
```

### Integration with External Tools

```javascript
/** @type {ModuleBuilder.definer} */
const integration = async function integration({to, depends, produces, T}) {
    
    // Docker builds
    to("docker-build", () => {
        depends('Dockerfile', 'internal:compiled');
        return T`docker build -t myapp:latest . && echo "built" > ${produces('internal:docker-built')}`;
    });
    
    // Package managers
    to("npm-install", () => {
        depends('package.json', 'package-lock.json');
        return T`npm ci && touch ${produces('internal:npm-installed')}`;
    });
    
    // External build systems
    to("cmake-build", () => {
        depends('CMakeLists.txt');
        return {
            cwd: "build",
            cmd: T`cmake .. && make && touch ${produces('internal:cmake-built')}`
        };
    });
}
export default integration;
```

## Summary

This guide covered:
- Core concepts: modules, rules, artifacts, dependencies, recipes
- Building effective buildspecs from simple to complex
- Best practices for organization, performance, and maintainability
- Debugging techniques
- Advanced topics and integrations

Continue with the tutorial series for hands-on examples, or consult the reference guide for detailed API documentation.
