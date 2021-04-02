# 002. The command template tag

The zrup library provides a template string tag function that makes it possible to write more concise commands. This function is available as the `T` member of the module definer parameters object.

Let's recap the module from the first tutorial:

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to, produces, depends})
{
    to(
        "dist",
        () => ({
            cmd: [
                'mkdir -p dist',
                '&&',
                'cp',
                depends('hello.txt'),
                produces('dist/hello.txt')
            ]
        })
    );
    
    to(
        "hello",
        () => ({
            cmd: `echo "Hello!"`,
            out: produces("hello.txt")
        })
    );
}
export default hello;
```

We can use the template tag to rewrite it like this:

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to, produces, depends, T}) // <- grab T()
{
    to(
        "dist",
        () => ({
            cmd: T`mkdir -p dist && cp ${depends("hello.txt")} ${produces("dist/hello.txt")}`
        })
    );
    
    to(
        "hello",
        () => ({
            cmd: T`echo "Hello!" > ${produces("hello.txt")}`
        })
    );
}
export default hello;
```

The `T` tag allowed us to conveniently inline the `depends()` and `produces()` calls in the template strings that specify the commands. We also used shell redirection directly in `hello` rule's command instead of specifying the `out` property.

 - We inlined the calls to `depends()` and `produces()` in the command strings tagged with the `T` tag.
 - Instead of the `out` option, we used shell redirection directly in `hello` rule's command.

We can be make it still more concise by simply returning command strings from rule builder functions. This is equivalent to returning a specification object with just the `cmd` property:

```javascript
/** @type {ModuleBuilder~definer} */
const hello = async function hello({to, produces, depends, T}) // <- grab T
{
    to("dist",  () => T`mkdir -p dist && cp ${depends("hello.txt")} ${produces("dist/hello.txt")}`);
    
    to("hello", () => T`echo "Hello!" > ${produces("hello.txt")}`);
}
export default hello;
```

