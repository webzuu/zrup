import {CommandRecipe} from "../../../../../src/build/recipe/command.js";
import {DelayedRecipe} from "../../../../../src/build/recipe/delayed.js";

export default function test({module, rule}) {

    rule(function concatenated({depends, produces}) {

        const [[target], sources] = [
            produces('actual.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        const command = new CommandRecipe(({exec, out}) => {
            exec("cat", ...sources);
            out(target);
        });

        return new DelayedRecipe(command, 750);
    });
};