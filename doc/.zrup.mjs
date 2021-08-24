import {SRC} from "../makelib/consts.mjs";

/** @type {ModuleBuilder.definer} */
const docs = async function docs(M) {
    const {depends, produces, resolve} = M;

    M.to('typedoc', ({T})=>{

        return {
            cwd: SRC,
            cmd: [
                'rm -rf doc/td/*',
                '&& typedoc --tsconfig tsconfig.json --gitRevision wip --out doc/td ts/',
                T`&& mkdir -p $(dirname ${resolve('internal:built')})`,
                T`&& cp ${depends('internal:js+built')} ${produces('internal:built')}`
            ]
        }
    });

}
export default docs;
