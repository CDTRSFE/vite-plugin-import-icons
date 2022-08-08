import type { Plugin } from 'vite';
import { isIconPath, genComponentCode, camelToKebab, transformImport } from './utils';
import type { OptionType } from './type';

const defaultOpt = {
    collections: {},
};

let pluginOpt: OptionType = { collections: {} };

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
        async load(id) {
            if (isIconPath(id)) {
                const code = await genComponentCode(id, opt);
                if (code) {
                    return {
                        code,
                        map: { version: 3, mappings: '', sources: [] } as any,
                    };
                }
            }
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
