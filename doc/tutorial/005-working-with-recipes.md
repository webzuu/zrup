# 005. Working with Recipes

Topics covered:
 - Understanding the Recipe abstraction
 - CommandRecipe in depth
 - Advanced CommandRecipe usage
 - WrapperRecipe for pre/post processing
 - DelayedRecipe for timing control
 - Creating custom recipes

## Understanding Recipes

In zrup, a **Recipe** is an abstraction that defines how to execute a build step. While most rules use the convenient `to()` API which creates a CommandRecipe behind the scenes, understanding recipes directly gives you more control.

### The Recipe Interface

Every recipe must implement two methods:

```javascript
class Recipe {
    // Prepare the build specification for a job
    async concretizeSpecFor(job) { ... }
    
    // Execute the build step
    async executeFor(job, spec) { ... }
}
```

This separation allows zrup to:
1. Compute what needs to be done (`concretizeSpecFor`)
2. Record the specification in the build database
3. Execute only when needed (`executeFor`)

## CommandRecipe

The `CommandRecipe` is the most commonly used recipe type. When you use the `to()` function, you're creating a CommandRecipe.

### Basic CommandRecipe Usage

We've already seen simple CommandRecipe usage:

```javascript
to("build", ({T}) => 
    T`gcc -o ${produces('program')} ${depends('main.c')}`
);
```

This is shorthand for:

```javascript
to("build", () => ({
    cmd: T`gcc -o ${produces('program')} ${depends('main.c')}`
}));
```

### Advanced CommandRecipe Properties

A CommandRecipe descriptor can have many properties:

```javascript
to("build", ({T}) => ({
    // Required: the command to execute
    cmd: "make",
    
    // Optional: command arguments
    args: ["-j4", "all"],
    
    // Optional: working directory
    cwd: "subdir",
    
    // Optional: use shell for command execution
    shell: true,
    
    // Optional: output redirections
    out: produces("stdout.txt"),
    err: produces("stderr.txt"),
    combined: produces("output.txt")
}));
```

### Using CommandRecipe Directly

For more control, you can use the `CommandRecipe` class directly with the `rule()` API:

```javascript
import {CommandRecipe} from "./js/build/recipe/command.js";

/** @type {ModuleBuilder.definer} */
const advanced = async function advanced({rule, depends, produces}) {
    
    rule(function myRule({depends, produces}) {
        const [target] = produces('output.txt');
        const sources = depends('input1.txt', 'input2.txt');
        
        return new CommandRecipe(({exec, args, out, cwd}) => {
            exec("cat");
            args(...sources);
            out(target);
        });
    });
}
export default advanced;
```

The builder function receives these functions:
- **`exec(command)`**: Set the command to execute
- **`args(...args)`**: Add command arguments
- **`out(artifact)`**: Redirect stdout
- **`err(artifact)`**: Redirect stderr
- **`combined(artifact)`**: Redirect both stdout and stderr
- **`cwd(path)`**: Set working directory
- **`shell(boolean)`**: Enable/disable shell execution

### Example: Dynamic Command Construction

```javascript
/** @type {ModuleBuilder.definer} */
const dynamic = async function dynamic({rule, depends, produces}) {
    
    rule(function compile({depends, produces}) {
        const sources = depends('src/*.c');  // Imagine this returns multiple files
        const [output] = produces('program');
        
        return new CommandRecipe(({exec, args, cwd}) => {
            exec("gcc");
            args("-Wall", "-O2");
            args(...sources);
            args("-o", output);
            cwd("./");
        });
    });
}
export default dynamic;
```

## WrapperRecipe

`WrapperRecipe` allows you to wrap another recipe with pre-processing, post-processing, or around-processing hooks.

### Basic WrapperRecipe

```javascript
import {WrapperRecipe} from "./js/build/recipe/wrapper.js";
import {CommandRecipe} from "./js/build/recipe/command.js";

/** @type {ModuleBuilder.definer} */
const wrapped = async function wrapped({rule, depends, produces}) {
    
    rule(function wrappedBuild() {
        
        const mainRecipe = new CommandRecipe(({exec, args}) => {
            exec("make");
            args("all");
        });
        
        return new WrapperRecipe({
            recipe: mainRecipe,
            
            before: async (job) => {
                console.log(`Starting build for ${job.rule.name}`);
            },
            
            after: async (job) => {
                console.log(`Completed build for ${job.rule.name}`);
            }
        });
    });
}
export default wrapped;
```

### WrapperRecipe Hooks

WrapperRecipe supports three types of hooks:

#### Before Hook

Runs before the wrapped recipe:

```javascript
before: async (job) => {
    // Preparation logic
    console.log("Setting up...");
}
```

#### After Hook

Runs after the wrapped recipe completes:

```javascript
after: async (job) => {
    // Cleanup or reporting logic
    console.log("Cleaning up...");
}
```

#### Around Hook

Completely wraps the execution, giving you control over when (or if) the wrapped recipe runs:

```javascript
around: async (job, proceed) => {
    console.log("Before execution");
    try {
        await proceed(job);  // Execute the wrapped recipe
        console.log("Success!");
    } catch (error) {
        console.log("Failed!");
        throw error;
    }
}
```

### Practical Example: Build with Notifications

```javascript
/** @type {ModuleBuilder.definer} */
const notify = async function notify({rule, depends, produces, resolve, T}) {
    const {WrapperRecipe} = M.API;
    
    rule(function buildWithNotify() {
        
        const baseRecipe = new CommandRecipe(({exec, args, out}) => {
            exec("npm");
            args("run", "build");
            out(produces("build.log"));
        });
        
        return new WrapperRecipe({
            recipe: baseRecipe,
            
            before: async (job) => {
                const startTime = Date.now();
                job.startTime = startTime;
                // Send notification: build started
            },
            
            after: async (job) => {
                const duration = Date.now() - job.startTime;
                // Send notification: build completed in X ms
            },
            
            around: async (job, proceed) => {
                try {
                    await proceed(job);
                } catch (error) {
                    // Send notification: build failed
                    throw error;
                }
            }
        });
    });
}
export default notify;
```

### Example: Conditional Execution

```javascript
return new WrapperRecipe({
    recipe: mainRecipe,
    
    around: async (job, proceed) => {
        // Check some condition
        const shouldRun = await checkCondition();
        
        if (shouldRun) {
            await proceed(job);
        } else {
            console.log("Skipping execution due to condition");
        }
    }
});
```

## DelayedRecipe

`DelayedRecipe` wraps another recipe and delays its execution by a specified amount of time. This is useful for timing-sensitive operations or when simulating slow builds for testing.

### Basic Usage

```javascript
import {DelayedRecipe} from "./js/build/recipe/delayed.js";
import {CommandRecipe} from "./js/build/recipe/command.js";

/** @type {ModuleBuilder.definer} */
const delayed = async function delayed({rule, depends, produces}) {
    
    rule(function slowBuild() {
        
        const baseRecipe = new CommandRecipe(({exec, args}) => {
            exec("make");
            args("all");
        });
        
        // Delay execution by 5 seconds (5000 milliseconds)
        return new DelayedRecipe(baseRecipe, 5000);
    });
}
export default delayed;
```

### Use Cases for DelayedRecipe

1. **Rate limiting**: Delay builds that access rate-limited APIs or services
2. **Timing tests**: Ensure builds behave correctly with delays
3. **Staged deployments**: Add delays between deployment stages
4. **Debouncing**: Wait for a period before executing expensive operations

### Example: Staged Deployment

```javascript
/** @type {ModuleBuilder.definer} */
const deploy = async function deploy({rule, depends, produces}) {
    const {DelayedRecipe} = M.API;
    
    // Deploy to staging immediately
    rule(function deployStaging() {
        return new CommandRecipe(({exec, args}) => {
            exec("./deploy.sh");
            args("staging");
        });
    });
    
    // Deploy to production after 60 seconds
    rule(function deployProduction() {
        depends("internal:deployed-staging");
        
        const deployRecipe = new CommandRecipe(({exec, args}) => {
            exec("./deploy.sh");
            args("production");
        });
        
        return new DelayedRecipe(deployRecipe, 60000);  // 60 second delay
    });
}
export default deploy;
```

## Combining Recipes

You can combine WrapperRecipe and DelayedRecipe for sophisticated behavior:

```javascript
/** @type {ModuleBuilder.definer} */
const combined = async function combined({rule, depends, produces}) {
    const {WrapperRecipe, DelayedRecipe} = M.API;
    
    rule(function complexBuild() {
        
        // Base recipe
        const baseRecipe = new CommandRecipe(({exec}) => {
            exec("make all");
        });
        
        // Add delay
        const delayedRecipe = new DelayedRecipe(baseRecipe, 3000);
        
        // Wrap with logging
        return new WrapperRecipe({
            recipe: delayedRecipe,
            
            before: async (job) => {
                console.log("Build will start in 3 seconds...");
            },
            
            after: async (job) => {
                console.log("Build completed successfully!");
            }
        });
    });
}
export default combined;
```

## Custom Recipes

For specialized needs, you can create custom recipe classes:

```javascript
import {Recipe} from "./js/build/recipe.js";

class CustomRecipe extends Recipe {
    constructor(config) {
        super();
        this.config = config;
    }
    
    async concretizeSpecFor(job) {
        // Return an object describing what will be done
        return {
            action: this.config.action,
            timestamp: Date.now()
        };
    }
    
    async executeFor(job, spec) {
        // Perform the actual work
        console.log(`Executing ${spec.action} at ${spec.timestamp}`);
        
        // Your custom logic here
        switch (spec.action) {
            case "custom-action":
                // Do something custom
                break;
            default:
                throw new Error(`Unknown action: ${spec.action}`);
        }
    }
}

/** @type {ModuleBuilder.definer} */
const custom = async function custom({rule}) {
    
    rule(function myCustomRule() {
        return new CustomRecipe({
            action: "custom-action"
        });
    });
}
export default custom;
```

## Best Practices

1. **Use `to()` for simple cases**: The high-level API is cleaner and more maintainable for most use cases.

2. **Use `rule()` and recipes directly when you need**:
   - Dynamic command construction
   - Complex pre/post processing
   - Custom execution logic
   - Recipe composition

3. **Keep recipes focused**: Each recipe should do one thing well. Use WrapperRecipe to compose behaviors.

4. **Document custom recipes**: If you create custom recipes, add JSDoc comments explaining their purpose and usage.

5. **Test recipe behavior**: Custom recipes should be tested, especially the concretization and execution separation.

6. **Be careful with state**: Recipes should be mostly stateless. State needed during execution should be in the `spec` object.

7. **Use WrapperRecipe for cross-cutting concerns**: Logging, timing, error handling, and notifications are good candidates.

## Summary

- **Recipe**: The base abstraction for defining how build steps execute
- **CommandRecipe**: The standard recipe for running shell commands (used by `to()`)
- **WrapperRecipe**: Adds before/after/around hooks to other recipes
- **DelayedRecipe**: Delays execution of wrapped recipes
- **Custom Recipes**: You can create your own recipe types for specialized behavior

Understanding recipes gives you the power to extend zrup's capabilities while maintaining its declarative, database-backed build tracking.
