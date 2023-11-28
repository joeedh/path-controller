export declare global {
  declare interface Array {
    remove(item: any): void;
  }

  declare interface SymbolConstructor {
    readonly keystr: unique symbol;
  }

  declare interface MathConstructor {
    fract(f: number): number;
  }

  declare interface Math {
    fract(f: number): number;
  }

  declare interface WindowOrWorkerGlobalScope {
    redraw_all(): void;
  }
}
