import type { Stats } from 'fs';
import { promises as fs } from 'fs';
import { compileTemplate } from '@vue/compiler-sfc';
import fg from 'fast-glob';
import type { OptionType } from './type';

const URL_PREFIXES = ['~icons/', 'virtual:icons/'];
const iconPathRE = new RegExp(`${URL_PREFIXES.map(v => `^${v}`).join('|')}`);

export function isIconPath(path: string) {
    return iconPathRE.test(path);
}

function resolvePath(path: string) {
    if (!isIconPath(path)) {
        return null;
    }
    path = path.replace(iconPathRE, '');
    path = path.replace(/\.\w+$/, '');
    const [collection, icon] = path.split('/');
    return {
        collection,
        icon,
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
        let svg = await fs.readFile(path, 'utf-8');
        const cleanupIdx = svg.indexOf('<svg');
        if (cleanupIdx > 0) svg = svg.slice(cleanupIdx);
        return svg;
    }
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
    const resolved = resolvePath(path);
    if (!resolved) return null;
    const { collection, icon } = resolved;
    if (!collection || !icon) return null;
    const dir = (opt.collections[collection] || '').replace(/\/$/, '');
    if (!dir) return null;
    const url = `${dir}/${icon}.svg`;
    const svg = await loadFile(url);
    if (!svg) throw new Error(`Icon ${url} not found`);

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

const paramsReg = /'([^']+)',\s?'([^']+)'/;
const importReg = /\bimport\.meta\.icons\(([^)]*)\)/g;
export function transformImport(code: string, opt: OptionType, id: string) {
    const group = code.match(importReg) || [];
    let result = code;
    group.forEach(item => {
        const params = item.match(paramsReg) || [];
        const [, collection, exp] = params;
        const dir = (opt.collections[collection] || '').replace(/\/$/, '');
        if (!dir) {
            throw new Error(`${item}: ${collection} not found`);
        }
        const entries = fg.sync([`${dir}/${exp}`], { dot: true });
        const paths = entries
            .filter(p => p.endsWith('.svg'))
            .map(p => {
                const [, icon] = p.match(/([^/]+).svg$/) || [];
                return `${icon}: defineAsyncComponent(() => import('~icons/${collection}/${icon}'))` || '';
            });
        result = result.replace(item, `{${paths.join(',')}}`);
    });
    if (group.length > 0) {
        // todo
        console.log(id);
        result = result.replace(/<script[^>]+>/, str => `${str}import { defineAsyncComponent } from 'vue';\n`);
    }
    return result;
}
