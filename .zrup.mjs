import {tree_state} from "./makelib/macros/tree.mjs";

/** @type {ModuleBuilder.definer} */
const zrup = async function zrup(M) {

    const {include, depends, produces} = M;

    await include('js','doc','dist');

    tree_state(M, 'internal:zrup+tree-state');

    M.to('all', ({T}) =>
        T`md5state -- ${depends('dist+dsl.d.ts', 'internal:docs+built')} > ${produces('internal:all')}`
    );
}
export default zrup;
