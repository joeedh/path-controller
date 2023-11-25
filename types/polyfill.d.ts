export declare global {
  declare interface Array {
    remove(item: any): void;
  }

  declare interface SymbolConstructor {
    readonly keystr: unique symbol;
  }
}
