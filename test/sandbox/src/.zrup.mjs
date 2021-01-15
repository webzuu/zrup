/** @type {ModuleBuilder~definer} */
const src = async function src({to, produces, depends})
{
    const
        target = 'internal:src+output.txt',
        sources = [
            'src+input1.txt',
            'src+input2.txt'
        ];

    to("concatenate", () => (
        {
            cmd: ['cat', depends(sources)],
            out: produces(target)  //when command writes to stdout
        }
    ));
}
export default src;
