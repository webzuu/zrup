import {CommandRecipe} from "../../../../../build/recipe/command.js";

/** @type {ModuleBuilder~definer} */
const test = function test({rule}) {

    rule(function fromEmpty({depends, produces}) {

        const [[target], sources] = [
            produces('shouldBeEmpty.txt'),
            depends('src/empty.txt')
        ];

        return new CommandRecipe(({exec, out}) => {
            exec("cat", ...sources);
            out(target);
        })
    });

    rule(function concatenated({depends, produces}) {

        const [[target], sources] = [
            produces('actual.txt'),
            depends('src/input1.txt', 'src/input2.txt', 'shouldBeEmpty.txt')
        ];

        return new CommandRecipe(({exec, out}) => {
            exec("cat", ...sources);
            out(target);
        });
    });

    rule(function transformed(b) {
        const [[target], sources] = [
            b.produces('transformed.txt'),
            b.depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({shell, out}) => {
            shell('cat', ...sources, '|', 'tr i o');
            out(target);
        });
    });

    rule(function viaTemplateString({produces,depends}) {
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

    rule(function pipeFail({produces,depends}) {

        const [[output], [input1, input2]] = [
            produces('pipeFail.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({shell, out,T}) => {
            shell(T`
                cat ${input1} ${'src/input2.txt'} \
                    | bash -c "exit 173" \
                    | tr i o
            `);
            out(output);
        });
    });


};

export default test;