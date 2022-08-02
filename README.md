# vite-plugin-import-icons

用于引入 SVG 图标的 Vite 插件，支持按需引入和批量引入。

## 安装

```bash
pnpm add vite-plugin-import-icons -D
```

## 配置

```typescript
// vite.config.ts
import ImportIcons from 'vite-plugin-import-icons'

export default defineConfig({
    plugins: [
        ImportIcons({ /* options */ }),
    ],
});
```

### collections

用于配置图标集，一个图标集对应一个存放图标的文件夹。

```js
ImportIcons({
    collections: {
        icons: './src/assets/icons',
    },
});
```

### transform

加载图标时自定义转换 SVG 文件，例如给图标添加 `fill` 属性。

```js
ImportIcons({
    transform(svg, collection, icon) {
        // apply fill to this icon on this collection
        if (collection === 'icons' && icon === 'account')
            return svg.replace(/^<svg /, '<svg fill="currentColor" ');
        return svg;
    },
});
```

## 使用

以 `~icons/{collection}/{icon}` 的格式引入需要的图标，`collection` 表示图标集，`icon` 表示图标名。

```vue
<template>
    <icons-home></icons-home>
    <icons-setting></icons-setting>
</template>

<script setup lang="ts">
import IconsHome from '~icons/icons/home';
import IconsSetting from '~icons/icons/setting';
</script>
```

```ts
// vite.config.ts
import ImportIcons from 'vite-plugin-import-icons';

export default {
    plugins: [
        ImportIcons({
            collection: {
                icons: './src/assets/icons',
            }
        })
    ],
};
```

### 自动引入

配合 `unplugin-vue-components/vite` 插件可以实现自动引入。

```vue
<template>
    <icons-home></icons-home>
    <other-icons-bar></other-icons-bar>
</template>
```

```ts
// vite.config.ts
import ImportIcons, { ImportIconsResolver } from 'vite-plugin-import-icons';
import Components from 'unplugin-vue-components/vite';

export default {
    plugins: [
        Components({
            resolvers: [
                ImportIconsResolver({
                    collections: ['icons', 'other-icons'],
                }),
            ],
        }),
        ImportIcons({
            collection: {
                icons: './src/assets/icons',
                'other-icons': './src/assets/other-icons',
            }
        })
    ]
}
```

### 批量引入

可以通过 `import.meta.icons` 函数一次性引入多个图标，函数的第一个参数为图标集，第二个参数为 [glob](https://github.com/mrmlnc/fast-glob#pattern-syntax) 字符串，函数返回值是一个 key 为图标名，value 为对应图标组件的对象。

```vue
<template>
    <component v-for="(icon, name) in icons" :is="icon" :key="name"></component>
</template>
<script>
const icons = import.meta.icons('icons', 'xxx-*')
</script>
```

```ts
// vite.config.ts
import ImportIcons, { ImportIconsResolver } from 'vite-plugin-import-icons';
import Components from 'unplugin-vue-components/vite';

export default {
    plugins: [
        ImportIcons({
            collection: {
                icons: './src/assets/icons'
            }
        })
    ]
}
```
