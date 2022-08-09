import type { Plugin } from 'vite';
import { isIconPath, genComponentCode, camelToKebab, transformImport } from './utils';
import type { OptionType } from './type';

const defaultOpt = {
    collections: {},
};

let pluginOpt: OptionType = { collections: {} };
const sourceMap: Record<string, string> = {};

export default function importIcons(options: OptionType): Plugin {
    const opt = { ...defaultOpt, ...options };
    pluginOpt = opt;
    return {
        name: 'import-icons',
        enforce: 'pre',
        resolveId(id) {
            if (!isIconPath(id)) return null;
            return id;
        },
        async transform(code, id) {
            const result = await transformImport(code, options, id);
            if (result) {
                return {
                    code: result,
                    // map: result.s.generateMap(),
                };
            }
        },
        async load(id) {
            if (isIconPath(id)) {
                const result = await genComponentCode(id, opt);
                const code = result?.code;
                const url = result?.url;
                if (code && url) {
                    sourceMap[url] = id;
                    return {
                        code,
                        map: { version: 3, mappings: '', sources: [] } as any,
                    };
                }
            }
        },
        async handleHotUpdate(ctx) {
            const { file } = ctx;
            if (/\.svg$/.test(file)) {
                const id = sourceMap[file];
                if (id) {
                    // const defaultRead = ctx.read;
                    ctx.read = async function() {
                        const result = await genComponentCode(id, opt);
                        const code = result?.code;
                        console.log(code);
                        return code || '';
                    };
                }
                // const relationModule = [...server.moduleGraph.getModulesByFile(file.replace('.svg', '.vue'))!][0];
                // const content = await read();
                // console.log(content);
                // return vuePlugin.handleHotUpdate?.({
                //     ...ctx,
                //     read: () => code || '',
                // });
            }
        },
    };
}

export function ImportIconsResolver() {
    return function(name: string) {
        const collectionNames = Object.keys(pluginOpt.collections) || [];
        const kebab = camelToKebab(name);
        const collection = collectionNames.find(i => kebab.startsWith(i));
        if (!collection) return;
        let icon = kebab.slice(collection.length);
        if (icon[0] === '-') icon = icon.slice(1);
        if (!icon) return;
        return `~icons/${collection}/${icon}`;
    };
}
