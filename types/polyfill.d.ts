export declare global {
  declare interface Array {
    remove(item: any, ignore_existence?: boolean): void;

    /** FailOnError is true by default. */
    replace(oldItem: any, newItem: any, failOnError?: boolean): void;
  }

  declare interface SymbolConstructor {
    readonly keystr: unique symbol;
  }

  declare interface MathConstructor {
    fract(f: number): number;

    tent(f: number): number;
  }

  declare interface Math {
    fract(f: number): number;

    tent(f: number): number;
  }
}
