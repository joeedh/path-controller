export declare function inlineRegister(cls: any, script: string): string;

export declare function register(cls: any, customName?: string): void;

export declare function inherit(cls: any, parent: any, customName?: string): string;

export declare type StructReader<type> = (obj: type) => void;

export declare function writeObject(data: number[], object: any): void;

export declare function writeJSON(object: any, cls?: new () => any): any;

export declare function readObject<type>(data: DataView, cls: new() => type): type;

export declare function readJSON<type>(json: any, cls: new() => type): type;
