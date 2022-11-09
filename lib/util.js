export const camelCase = (value) => {
    return value.replace(/-([a-z])/g,  (g) => { return g[1].toUpperCase(); });
}

export const dash = (value) => {
    return value.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
}
