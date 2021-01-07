import {CommandRecipe} from "../../../../build/command-recipe.js";

export default function test({module, rule}) {

    rule(function concatenated({depends, produces}) {

        const [outs, ins] = [produces('actual.txt'), depends('src/input1.txt', 'src/input2.txt')];

        return new CommandRecipe(({cmd, out, resolve}) => {
            cmd("cat", ...resolve(...ins));
            out(...resolve(...outs));
        });
    });

    rule(function fromEmpty({depends, produces}) {

        const [outs, ins] = [produces('shouldBeEmpty.txt'), depends('src/empty.txt')];

        return new CommandRecipe(({cmd, out, resolve}) => {
            cmd("cat", ...resolve(...ins));
            out(...resolve(...outs));
        })
    });
};