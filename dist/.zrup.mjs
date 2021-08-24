import {SRC} from "../makelib/consts.mjs";

/** @type {ModuleBuilder.definer} */
const dist = async function dist(M) {
    const {depends, produces} = M;

    M.to('dsl', ({T}) => {

        depends('internal:js+built');
        return {
            cwd: SRC,
            cmd: T`node js/tools/make-dsl-defs/make-dsl-defs > ${produces('dsl.d.ts')}`
        }
    });
}
export default dist;
