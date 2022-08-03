import { parseExpressionAt } from 'acorn';
import type { CallExpression, Literal, SequenceExpression } from 'estree';

const importReg = /\bimport\.meta\.(importGlob|icons)(?:<\w+>)?\s*\(/g;

export function importGlob(code: string) {
    const matches = Array.from(code.matchAll(importReg));
    const task = matches.map((match, index) => {
        const start = match.index!;
        let ast: CallExpression | SequenceExpression;
        ast = parseExpressionAt(code, start, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ranges: true,
        }) as any;

        if (ast.type === 'SequenceExpression') ast = ast.expressions[0] as CallExpression;
        const arg1 = ast.arguments[0] as Literal;
        const arg2 = ast.arguments[1] as Literal;

        if (typeof arg1.value !== 'string' || typeof arg2.value !== 'string') {
            return '';
        }

        const globs = [arg1.value, arg2.value];
        const end = ast.range![1];
        return {
            match, index, globs, start, end,
        };
    });

    return task.filter(Boolean);
}
