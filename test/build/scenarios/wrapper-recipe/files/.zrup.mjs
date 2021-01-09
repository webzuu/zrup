import {CommandRecipe} from "../../../../../build/recipe/command.js";
import {WrapperRecipe} from "../../../../../build/recipe/wrapper.js";
import fs from "fs/promises";

export default function test({module, rule}) {

    rule(function concatenated({depends, produces}) {

        const [[actual, log], sources] = [
            produces('actual.txt','log.txt'),
            depends('src/input1.txt', 'src/input2.txt')
        ];

        const command = new CommandRecipe(({cmd, out}) => {
            cmd("cat", ...sources);
            out(actual);
        });

        return new WrapperRecipe({
            recipe: command,
            before: () => log.append("Before\n"),
            around: async (job, proceed) => {
                await log.append("Before proceed()\n");
                await proceed();
                await log.append("After proceed()\n");
            },
            after: () => log.append("After")
        });
    });
};