import ducktype from "ducktype";

/**
 * @param callback
 * @return {*}
 */
export default function recursive(callback)
{
    ducktype(Function).validate(callback);

    const number = callback.length;

    const indirects = [];
    for(let i=number; i; --i) {
        indirects.push(createIndirect());
    }
    const refs = indirects.map(_ => _.ducktype);
    let matrix = callback.call(null, ...indirects.map(_ => _.ducktype));
    matrix = Array.isArray(matrix) ? matrix : [matrix];

    if (matrix.length !== number) throw new Error(
        `Recursive ducktype was declared with ${number} indirection(s), but the callback returned ${matrix.length} item(s)`
    );
    for(let i=0; i<number; ++i) {
        indirects[i].indirection.that = matrix[i];
    }
    return refs.length===1 ? refs[0] : refs;
}

function indirectTest(object) {

    //`this` is the indirection object
    if (!(this.that instanceof DuckType)) {
        this.that = ducktype(this.that);
    }
    return this.that.test(object);
}

const dt = ducktype(Boolean);
const DuckType = dt.constructor;

function createIndirect() {
    const indirection = {};
    return {
        indirection,
        ducktype: new DuckType({
            name: 'indirect',
            test: indirectTest.bind(indirection)
        })
    };
}

