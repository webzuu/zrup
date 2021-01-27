import ducktype from "ducktype";
const DuckType = ducktype(Boolean).constructor

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

const objectValidator = ducktype(Object);
export function dictionary(...args)
{
    if (args.length===0) return ducktype({});
    let types = args.slice(0,args.length-1);

    let options = args[args.length-1];
    if (options.constructor !== Object) {
        types.push(options);
        options = null;
    }
    const itemArrayValidator = ducktype(types.length > 0 ? [types] : []);
    const constructorOptions = {
        name: `dictionary<${types.map(_ => _.name).join('|')}>`,
        test: function(obj) {
            if (null===obj) return options ? !!options.nullable : false;
            if ('undefined'===typeof obj) return options ? !!options.optional : false;
            return objectValidator.test(obj) && itemArrayValidator.test(Object.values(obj));
        }
    }
    if (true===options.nullable) constructorOptions.nullable=true;
    if (true===options.optional) constructorOptions.optional=true;
    return new DuckType(constructorOptions);
}