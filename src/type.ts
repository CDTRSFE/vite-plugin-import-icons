export interface OptionType {
    collections: Record<string, string>;
    transform?: (svg: string, collection: string, icon: string) => string;
}

export interface ResolverOptions {
    collections: string[];
}
