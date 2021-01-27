import {CommandRecipe} from "../../../../../src/build/recipe/command.js";

/** @type {ModuleBuilder~definer} */
const test = function test(R) {

    const {rule, produces, depends, always} = R;

    rule(function fromEmpty() {

        const [[target], sources] = [
            produces('shouldBeEmpty.txt'),
            depends('src/empty.txt')
        ];

        return new CommandRecipe(({exec, out}) => {
            exec("cat", ...sources);
            out(target);
        })
    });

    rule(function concatenated() {

        const [[target], sources] = [
            produces('actual.txt'),
            depends('src/input1.txt', 'src/input2.txt', 'shouldBeEmpty.txt')
        ];

        return new CommandRecipe(({exec, out}) => {
            exec("cat", ...sources);
            out(target);
        });
    });

    rule(function transformed() {
        const [[target], sources] = [
            produces('transformed.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({shell, out}) => {
            shell('cat', ...sources, '|', 'tr i o');
            out(target);
        });
    });

    rule(function viaTemplateString() {
        const [[output], [input1, input2]] = [
            produces('viaTemplateString.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({shell, out,T}) => {
            shell(T`
                cat ${input1} ${'src/input2.txt'} \
                | tr i o
            `);
            out(output);
        });
    });

    rule(function pipeFail() {

        const [[output], inputs] = [
            produces('pipeFail.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({shell, out,T}) => {
            shell(T`
                cat ${inputs[0]} ${'src/input2.txt'} \
                    | bash -c "exit 173" \
                    | tr i o
            `);
            out(output);
        });
    });

    rule(function handleNewLines() {

        const [target] = produces('handle-command-newlines.txt');

        return new CommandRecipe(({shell, out, T}) =>{

            out(target);
            shell(T`
                echo "foo";
                echo "bar"
            `);
        });
    });

    rule(function internals() {

        const [target] = produces('internal:foo/bar/handle-command-newlines.txt');

        return new CommandRecipe(({shell, out, T}) =>{

            out(target);
            shell(T`
                echo "foo";
                echo "bar"
            `);
        });
    })

    rule(function do_always() {

        always();
        const [target] = produces('internal:foo/bar/handle-always.txt');

        return new CommandRecipe(({shell, out,always}) => {
            out(target);
            shell("echo whatevs");
        })
    })

};

export default test;