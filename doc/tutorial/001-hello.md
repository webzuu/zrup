#001. Hello

Topics covered:
 - Initializing a zrup project
 - Basic structure of a module
 - Creating a simple rule that produces a file target
 - Building the target

## Initialization

```shell
zrup --init
```

This command is necessary to initialize the configuration file `.zrup.json` with defaults that are sufficient for this lesson. Properties and features that can be configured using this file will be introduced gradually in further lessons.

## Modules

Zrup build specification consists of zrup modules. Using multiple modules is optional: it is entirely possible to put the whole specification in a single module in the root directory of the monorepo, but for larger projects it is convenient to split it into multiple modules in subdirectories corresponding to project's components or subsystems.

A zrup module resides in a file named .zrup.mjs, which is an ES6 module default-exporting an async callback function. The file is imported by the `zrup` executable, and the function, which we will refer to as the **module definer**, is eventually called to define build rules. An empty module looks like this:  

`.zrup.mjs`
```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello(M)
{
}
export default hello;
```

A module has a **name** that can be used to refer to it in build rules. By default, the name of the module definer function (the second occurrence of `hello` in the example above) becomes the name of the module.

The directory in which the module file resides is the module's **root directory**. It is the default prefix against which file artifact references inside the module are resolved.

### Module definer function

The parameters object passed to the module definer contains several properties, most of them being functions that can be used to define build rules in the body of the definer. It is useful to annotate the variable holding the module definer with the `ModuleBuilder~definer` type from the zrup library. This will provide code completion for the parameter object.

## Rules

There are several ways to define rules. The most convenient is the `to()` function provided by the module definer parameters object. This function takes a name string, and a callback function that returns a specification object. We will call this function a rule definer.

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to})
{
    to(
        // rule name
        "hello",
        
        // rule definer
        () => ({
            cmd: `echo "Hello!"`,
            out: "hello.txt"
        })
    );
}
export default hello;
```

The rule specification object in this example contains two properties: the `cmd` property specifies the command to be executed in order to build the rule's targets, and the `out` property specifies the file to which the standard output of the command is to be captured.

### Specifying rule targets

The rule in the last example **cannot be used yet**, because the only way to invoke a rule is to request that one of its targets be built, and we haven't yet designated anything as the target. The `out` property only specifies output redirection from the command, but it does not actually mark the destination artifact as the rule's target. We can mark the `hello.txt` file as a target by using the `produces()` function, which we can destructure from the module definer parameter's object like we did with the `to()` function:

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to, produces}) // <- grab produces()
{
    to(
        "hello",
        () => ({
            cmd: `echo "Hello!"`,
            out: produces("hello.txt") // <- mark hello.txt as rule's target
        })
    );
}
export default hello;
```

We can now invoke the rule to build our file:

```
$ zrup hello.txt
Loading graph
Resolving artifacts
Creating top level build jobs
Running build jobs
Invoking recipe for rule hello+hello
Running build jobs: 40.339ms
All done
Number of data queries:        7
Data queries took:             0.6833230014890432 ms
```

### Specifying rule inputs

Let's try creating another rule that copies the "hello.txt" file we just built to the 'dist/' folder.

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to, produces, depends}) // <- grab depends()
{
    to(
        "dist",
        () => ({
            cmd: [  // <- yes, you can pass an array here
                'mkdir -p dist',
                '&&',
                'cp',
                depends('hello.txt'), // <- mark the file as a dependency
                produces('dist/hello.txt')
            ]
        })
    );
    
    to(
        "hello",
        () => ({
            cmd: `echo "Hello!"`,
            out: produces("hello.txt") // <- mark hello.txt as rule's target
        })
    );
}
export default hello;
```

In this example we destructured and used the `depends()` function to mark a file as the dependency of the new rule. As demonstrated, it is possible to pass an array to the `cmd` property. This array will be flattened and its elements will be stringified, trimmed and space-joined to form the command string.

These rule definitions look quite verbose for the simple tasks that they accomplish. This is because we only used very basic primitives in this introductory example. In the next tutorial we will learn how to make rules more concise.
