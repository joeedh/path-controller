export declare function inlineRegister(cls: any, script: string): string;

export declare function register(cls: any, customName?: string): void;

export declare function inherit(cls: any, parent: any, customName?: string): string;

export declare type StructReader<type> = (obj : type) => void;
