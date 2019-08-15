import resolve from 'rollup-plugin-node-resolve';
// import { terser } from "rollup-plugin-terser";

export default {
    input: 'index.js',
    output: [
        {
            file: 'dist/main.cjs.js',
            format: 'cjs',
            exports: 'named',
            globals: {'@flatten-js/core': 'Flatten', 'core': 'Flatten'}
        },
        {
            file: 'dist/main.esm.js',
            format: 'esm',
            exports: 'named',
            globals: {'@flatten-js/core': 'Flatten', 'core': 'Flatten'}
        },
        {
            file: 'dist/main.umd.js',
            format: 'umd',
            name: 'boolean-op',
            exports: 'named',
            globals: {'@flatten-js/core': 'Flatten', 'core': 'Flatten'}
        },
    ],
    plugins: [
        resolve({
            customResolveOptions: {
                moduleDirectory: 'node_modules'
            }
        })
    ],
    external: ['@flatten-js/core']
};
