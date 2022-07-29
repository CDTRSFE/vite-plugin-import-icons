declare module 'virtual:icons/*' {
    import type { FunctionalComponent, SVGAttributes } from 'vue';
    const component: FunctionalComponent<SVGAttributes>;
    export default component;
}
declare module '~icons/*' {
    import type { FunctionalComponent, SVGAttributes } from 'vue';
    const component: FunctionalComponent<SVGAttributes>;
    export default component;
}
interface ImportMeta {
    icons(collection: string, name: string): Record<string, FunctionalComponent<SVGAttributes>>;
}
