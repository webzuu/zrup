export async function resolve(specifier, context, defaultResolve) {
    const noExtension = specifier.replace(/\.[mc]?js$/,'');
    const withExtension = noExtension === specifier ? noExtension+'.js' : specifier;
    let resolved = null;
    try {
        resolved = defaultResolve(specifier, context, defaultResolve);
    }
    catch (e) {}
    if (resolved) return resolved;
    resolved = defaultResolve(withExtension, context, defaultResolve);
    return resolved;
}