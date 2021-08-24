//
import {FINGERPRINT, SRC, TREE_STATE} from "../consts.mjs";
import path from "path";

export const tree_state_file = 'internal:zrup+tree-state';

/**
 * @param {ModuleBuilder.DefinerAPI} M
 * @param {Artifact.Resolvable} [stateName] A resolvable identifying the produced tree state file
 */
export const tree_state = function tree_state(M, stateName = tree_state_file)
{
    M.to('tree-state', ({T}) => {
        M.always();
            return {
                cmd: TREE_STATE,
                args: T`${SRC}`,
                out: M.produces(stateName)
            }
    });
}

/**
 * @typedef FingerprintPatternDescriptor
 * @extends {Object}
 * @property {boolean} [exclude] - Subtract matches form the set instead of adding them
 * @property {string} pattern - Glob pattern
 */

/**
 * @typedef {(string|FingerprintPatternDescriptor)} FingerprintPattern
 */

/**
 * @typedef FingerprintDescriptor
 * Object describing how to make a tree fingerprint
 * @extends {Object}
 * @property {Artifact.Reference} [rule]
 * @property {FingerprintPattern[]} [patterns]
 * @property {Artifact.Reference[]} [dependencies] - Tracked build artifacts that are known to be matched by the rules
 * and must therefore be built before the fingerprint is taken. Those may also be surrogate targets that aren't matched
 * by the rules directly but represent the prerequisite build steps.
 */

/**
 * @callback fingerprintDescriptorProvider
 * @param {RuleBuilder.DefinerAPI} params
 * @return {FingerprintDescriptor}
 */

/**
 * @param {ModuleBuilder.DefinerAPI} M
 * @param {Artifact.Reference} target
 * @param {fingerprintDescriptorProvider} D
 */
export function tree_fp(M, target, D)
{
    const
        fp = target.toString(),
        fp_debug = fp + ".fp-debug",
        {depends,produces,to} = M,
        {AID} = M.API,
        aid = new AID(fp);

    to(`${aid.ref.replace(/\W+/g,"-")}-tree-fp`, (R) => {

        const
            {T} = R,
            descriptor = D(R),
            {patterns, dependencies, rulePrefix} = descriptor,
            renderedPatterns = [];


        for (let pattern of [patterns].flat()) {
            if ('string' === typeof pattern) renderedPatterns.push(pattern);
            else {
                if (pattern.exclude) renderedPatterns.push('-n');
                renderedPatterns.push(ensureQuoted(pattern.pattern))
            }
        }

        M.depends(...(dependencies || []));

        const
            resolvedRulePrefix = rulePrefix ? T`${rulePrefix}` : M.module.absolutePath,
            treeRoot = T`${SRC}`,
            relativeRulePrefix =
                resolvedRulePrefix !== treeRoot
                    ? path.relative(treeRoot, resolvedRulePrefix)
                    : "";

        const options = [
            T`--debug ${produces(fp_debug)}`
        ];
        if (relativeRulePrefix !== "") {
            options.push(
                T`--rule-prefix #${relativeRulePrefix}`
            );
        }
        return {
            cmd: FINGERPRINT,
            cwd: T`${SRC}`,
            args: [
                ...options,
                T`${SRC}`,
                T`${depends(tree_state_file)}`,
                renderedPatterns
            ],
            out: produces(fp)
        }
    });

    return fp;
}

/**
 * @param {string} str
 * @return {string}
 */
function ensureQuoted(str)
{
    if(true || str.startsWith("'") && str.endsWith("'")) return str;
    return "'"+str.replaceAll("\\","\\"+"\\").replaceAll("'","\\"+"'")+"'";
}