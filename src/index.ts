import type { Plugin, ModuleNode } from 'vite';
import { isIconPath, genComponentCode, camelToKebab, transformImport, resolvePath } from './utils';
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
        handleHotUpdate(ctx) {
            const { file, server, modules } = ctx;
            // 只处理 SVG 文件
            if (!file.endsWith('.svg')) return modules;

            // 判断 SVG 文件是否属于配置的图标集合（collections）
            const isCollectionFile = Object.values(pluginOpt.collections).some(dir =>
                file.startsWith(dir),
            );
            if (!isCollectionFile) return modules;

            // 收集受影响的模块（初始包含传入的模块）
            const affectedModules: Set<ModuleNode> = new Set();

            const mods = Array.from(server.moduleGraph.idToModuleMap.values());
            const virtualModule = mods.find(mod => {
                if (!mod.id) return false;
                const resolved = resolvePath(mod.id, pluginOpt);
                return resolved?.sourcePath === file;
            });
            if (!virtualModule) return modules;
            affectedModules.add(virtualModule);

            affectedModules.forEach(mod => {
                server.moduleGraph.invalidateModule(mod);
            });
            return Array.from(affectedModules);
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
