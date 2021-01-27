import {FileArtifact} from "../../../../../src/graph/artifact/file.js";

/** @type {ModuleBuilder~definer} */
const test = function test(M) {

    const {to, rule, depends, produces, resolve, also, after} = M;
    const {WrapperRecipe} = M.API;

    const
        in_list = 'actual.in.list',
        out_list = 'actual.out.list',
        in_state = 'actual.in.state',
        out_state = 'actual.out.state'

    to('in-list', ({T}) => ({
        cwd: resolve('.'),
        cmd: T`find src -type f -name "*.txt" | sort`,
        out: produces(in_list)
    }));

    to('in-state', ({T}) => ({
        cwd: resolve('.'),
        cmd: T`md5sum $(cat ${depends(in_list)})`,
        out: produces(in_state)
    }));

    to('target', ({T}) => {
        also('build-record');
        return {
            cwd: resolve('.'),
            cmd: T`md5sum ${depends(in_state)}`,
            out: produces('internal:built')
        };
    });

    to('out-list', ({T}) => ({
        cwd: resolve('.'),
        cmd: T`find dist -type f -name "*.txt" | sort`,
        out: produces(out_list)
    }));

    to('out-state', ({T}) => {
        depends('internal:built');
        return {
            cwd: resolve('.'),
            cmd: T`md5sum $(cat ${depends(out_list)})`,
            out: produces(out_state)
        }
    })

    rule(
        'build-record',
        (R) => {
            after('out-state');
            const [stamp] = produces('internal:stamp')
            return new WrapperRecipe({
                after: async (job) => {
                    const transaction = job.build.createRecordVersionInfoTransaction(
                        await job.readAutoOutputsFile(out_state),
                        await job.readAutoDependenciesFile(in_state),
                        job
                    );
                    transaction();
                    const stampFile = stamp.artifact;
                    if (stampFile instanceof FileArtifact) {
                        await stampFile.putContents("SUCCESS!!!");
                    }
                }
            })
        }
    )
};
export default test;