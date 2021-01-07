import {CommandRecipe} from "../../../../build/command-recipe.js";

export default function test({module, rule}) {

    rule(function concatenated({depends, produces}) {

        const [[target], sources] = [
            produces('actual.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        return new CommandRecipe(({cmd, out}) => {
            cmd("cat", ...sources);
            out(target);
        });
    });

    rule(function fromEmpty({depends, produces}) {

        const [[target], sources] = [
            produces('shouldBeEmpty.txt'),
            depends('src/empty.txt')
        ];

        return new CommandRecipe(({cmd, out}) => {
            cmd("cat", ...sources);
            out(target);
        })
    });
};