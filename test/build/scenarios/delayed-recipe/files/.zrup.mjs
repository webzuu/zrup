import {CommandRecipe} from "../../../../../build/recipe/command.js";
import {DelayedRecipe} from "../../../../../build/recipe/delayed.js";

export default function test({module, rule}) {

    debugger;
    rule(function concatenated({depends, produces}) {

        debugger;
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