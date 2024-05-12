import {SRC} from "../makelib/consts.mjs";

/** @type {ModuleBuilder.definer} */
const docs = async function docs(M) {
    const {depends, produces, resolve} = M;

    M.to('typedoc', ({T})=>{

        depends('zrup+tsconfig.json')
        return {
            cwd: SRC,
            cmd: [
                'rm -rf doc/td/*',
                T`&& ${SRC}/node_modules/.bin/typedoc --gitRevision wip --out doc/td --entryPointStrategy expand ./ts`,
                T`&& mkdir -p $(dirname ${resolve('internal:built')})`,
                T`&& cp ${depends('internal:js+built')} ${produces('internal:built')}`
            ]
        }
    });

}
export default docs;
