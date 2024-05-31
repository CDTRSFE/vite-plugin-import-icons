import { readFileSync } from 'fs';
import ts from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';

const pkg = JSON.parse(readFileSync('package.json', { encoding: 'utf8' }));

export default [
    {
        input: './src/index.ts',
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' },
        ],
        plugins: [ts()],
    },
    {
        input: './src/index.ts',
        output: [
            { file: pkg.types, format: 'es' },
        ],
        plugins: [dts()],
    },
];
