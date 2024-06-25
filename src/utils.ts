import type { Stats } from 'fs';
import { promises as fs } from 'fs';
import { compileTemplate } from '@vue/compiler-sfc';
import fg from 'fast-glob';
import MagicString from 'magic-string';
import type { OptionType } from './type';
import { importGlob } from './importGlob';

const URL_PREFIXES = ['~icons/', 'virtual:icons/'];
const iconPathRE = new RegExp(`${URL_PREFIXES.map(v => `^${v}`).join('|')}`);

export function isIconPath(path: string) {
    return iconPathRE.test(path);
}

export function resolvePath(path: string, opt: OptionType) {
    if (!isIconPath(path)) {
        return null;
    }
    path = path.replace(iconPathRE, '');
    path = path.replace(/\.\w+$/, '');
    const [collection, icon] = path.split('/');

    const dir = (opt.collections[collection] || '').replace(/\/$/, '');
    const sourcePath = `${dir}/${icon}.svg`;
    return {
        collection,
        icon,
        sourcePath,
    };
}

async function loadFile(path: string) {
    let stat: Stats;
    try {
        stat = await fs.lstat(path);
    } catch (err) {
        return null;
    }
    if (stat.isFile()) {
        const svg = await fs.readFile(path, 'utf-8');
        return svg;
    }
}

function transformSvg(svg: string, collection: string, icon: string, opt: OptionType) {
    let result = svg;
    const cleanupIdx = result.indexOf('<svg');
    if (cleanupIdx > 0) result = svg.slice(cleanupIdx);
    const transform = opt.transform;
    result = typeof transform === 'function' ? transform(result, collection, icon) : result;

    if (!result.startsWith('<svg')) {
        console.warn(`Icon "${icon}" in "${collection}" is not a valid SVG`);
    }
    return result;
}

function handleSVGId(svg: string) {
    const hasID = /="url\(#/.test(svg);
    const idMap: Record<string, string> = {};
    let injectScripts = '';
    if (hasID) {
        svg = svg
            .replace(/\b([\w-]+?)="url\(#(.+?)\)"/g, (_, s, id) => {
                idMap[id] = `'${id}':'uicons-'+__randId()`;
                return `:${s}="'url(#'+idMap['${id}']+')'"`;
            })
            .replace(/\bid="(.+?)"/g, (full, id) => {
                if (idMap[id]) { return `:id="idMap['${id}']"`; }
                return full;
            });
        injectScripts = `const __randId = () => Math.random().toString(36).substr(2, 10);
        const idMap = {${Object.values(idMap).join(',')}};`;
    }
    return {
        hasID,
        svg,
        injectScripts,
    };
}

export async function genComponentCode(path: string, opt: OptionType) {
    const resolved = resolvePath(path, opt);
    if (!resolved) return null;
    const { collection, icon, sourcePath } = resolved;
    if (!collection || !icon) return null;
    let svg = await loadFile(sourcePath);
    if (!svg) throw new Error(`Icon ${sourcePath} not found`);

    svg = transformSvg(svg, collection, icon, opt);
    const { injectScripts, svg: handled } = handleSVGId(svg);

    let { code } = compileTemplate({
        source: handled,
        id: `${collection}:${icon}`,
        filename: `${collection}-${icon}.vue`,
    });

    code = code.replace(/^export /gm, '');
    code += `\n\nexport default { name: '${collection}-${icon}', render${injectScripts ? `, data() {${injectScripts};return { idMap }}` : ''} }`;
    code += '\n/* vite-plugin-components disabled */';

    return code;
}

export function camelToKebab(key: string): string {
    const result = key
        .replace(/:/g, '-')
        .replace(/([A-Z])/g, ' $1')
        .trim();
    return result.split(/\s+/g).join('-').toLowerCase();
}

export function transformImport(code: string, opt: OptionType, id: string) {
    if (id.includes('/node_modules/')) return;
    if (!/\.(ts|js|vue)\b/.test(id)) return;

    const s = new MagicString(code);
    const matches = importGlob(code);
    matches.forEach(v => {
        if (typeof v === 'string') return;
        const { start, end, globs: [collection, exp] } = v;
        const dir = (opt.collections[collection] || '').replace(/\/$/, '');
        if (!dir) {
            throw new Error(`${collection} not found`);
        }

        let globExp = exp;
        if (!/\.([^.]+)$/.test(globExp)) {
            globExp += '.svg';
        }

        const entries = fg.sync([globExp], { dot: false, cwd: dir, objectMode: true, globstar: false });
        const paths = entries
            .filter(({ name }) => name.endsWith('.svg'))
            .map(({ name }) => {
                const icon = name.replace('.svg', '');
                return `'${icon}': defineAsyncComponent(() => import('~icons/${collection}/${icon}'))`;
            });
        s.overwrite(start, end, `{${paths.join(', ')}}\n`);
    });

    let result = code;
    if (matches.length > 0) {
        const importExp = 'import { defineAsyncComponent } from \'vue\';\n';
        if (/\.(ts|js)\b/.test(id)) {
            s.prepend(importExp);
        }
        result = s.toString();
        if (/\.(vue)\b/.test(id)) {
            result = result.replace(/<script[^>]+>/, str => `${str}\n${importExp}`);
        }
    }
    return result;
}
