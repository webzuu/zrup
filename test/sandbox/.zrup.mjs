/** @type {ModuleBuilder~definer} */
const $$ = async function $$({include, to, produces, depends})
{
    await include('src');

    const
        target = 'output.txt',
        source = 'internal:src+output.txt';

    to("install", () => (
        {
            cmd: ['cp', ...depends(source), ...produces(target)]
        }
    ));
}
export default $$;
