import {SRC} from "../makelib/consts.mjs";
import {tree_fp} from "../makelib/macros/tree.mjs";

/** @type {ModuleBuilder.definer} */
const js = async function js(M) {
    const {depends, produces, resolve} = M;

    const a = {
        fingerprint:         'internal:source-fp',
        tsconfig:   'zrup+tsconfig.json',
        buildinfo:  'zrup+tsconfig.tsbuildinfo',
        built:      'internal:built'
    }

    tree_fp(M, a.fingerprint, () => ({
        rule:           'source-fp',
        patterns:       [ '../ts/**/*.ts' ],
        dependencies:   [ a.tsconfig ]
    }));


    M.to('compiled-js', ({T})=>{
        depends(a.fingerprint, a.tsconfig);
        produces(a.buildinfo);
        return { cwd: SRC, cmd: T`tsc` };
    });

    M.to('compiled-js-proof', ({T}) => ({
        cmd : [
            T`mkdir -p $(dirname ${resolve(a.built)})`,
            T` && md5state -- ${depends(a.buildinfo)} > ${produces(a.built)}`
        ]
    }));
}
export default js;
