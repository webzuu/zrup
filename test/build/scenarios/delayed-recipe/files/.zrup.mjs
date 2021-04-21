import {CommandRecipe} from "../../../../../js/build/recipe/command.js";
import {DelayedRecipe} from "../../../../../js/build/recipe/delayed.js";

export default function test({rule}) {

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