import {CommandRecipe} from "../../../../build/command-recipe.js";

export default function test({module, rule}) {

    rule(function concatenated({depends, produces}) {

        const src = ['src/input1.txt', 'src/input2.txt'];
        depends(...src);
        const target = 'actual.txt';
        produces(target);

        return new CommandRecipe(({cmd, out}) => {
            cmd("cat", ...src);
            out(target);
        });
    });

    rule(function fromEmpty({depends, produces}) {

        const src = 'src/empty.txt';
        depends(src);
        const target = 'shouldBeEmpty.txt';
        produces(target);

        return new CommandRecipe(({cmd, out}) => {
            cmd("cat", src);
            out(target);
        })
    });
};