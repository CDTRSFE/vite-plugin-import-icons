import ts from 'rollup-plugin-ts';
import dts from 'rollup-plugin-dts';
import pkg from './package.json';

export default [
    {
        input: './src/index.ts',
        external: ['ms'],
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' },
        ],
        plugins: [ts()],
    },
    {
        input: './src/index.ts',
        external: ['ms'],
        output: [
            { file: pkg.types, format: 'es' },
        ],
        plugins: [dts()],
    },
];
