// ts-node ESM configuration
export const resolve = (specifier, context, defaultResolve) => {
    // For TypeScript files
    if (specifier.endsWith('.ts')) {
        const { parentURL = null } = context;
        return {
            url: new URL(specifier, parentURL).href,
            format: 'module'
        };
    }

    // Let Node.js handle all other specifiers
    return defaultResolve(specifier, context, defaultResolve);
};

export const getFormat = (url, context, defaultGetFormat) => {
    // For TypeScript files
    if (url.endsWith('.ts')) {
        return {
            format: 'module'
        };
    }

    // Let Node.js handle all other URLs
    return defaultGetFormat(url, context, defaultGetFormat);
};

export const transformSource = async (source, context, defaultTransformSource) => {
    const { url } = context;

    // For TypeScript files
    if (url.endsWith('.ts')) {
        return {
            source: source.toString()
        };
    }

    // Let Node.js handle all other sources
    return defaultTransformSource(source, context, defaultTransformSource);
}; 