/** @type {ModuleBuilder.definer} */
const combination = async function combination(M) {
    const {depends, produces, to, always} = M;

    to('A', ({T}) =>
        T`cat ${depends('B.txt', 'C.txt')} > ${produces('A.txt')}`
    );

    to('C', ({T}) =>
        T`cat ${depends('D.txt', 'E.txt')} > ${produces('C.txt')}`
    );

    to('E', ({T}) => {
        always();
        return T`cat ${depends('F.txt')} > ${produces('E.txt')}`;
    });
}

export default combination;
