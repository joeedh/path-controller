/* Returns 'undefined' as type type.  Breaks the type
   system, is meant only for object pool systems.
 */
export declare function undefinedForGC<type>(): type;

export declare class cachering<type> extends Array<type> {
  constructor(factory: () => type, n: number);

  static fromConstructor<type>(cls: new () => type, number: n): cachering<type>;

  next(): type;
}

export declare class IDGen {
  next: number;

  copy(): this;
}

export declare function time_ms(): number;

export declare function termColor(s: string, c: string, d: number): string;

export declare function termPrint(...arguments: any[]);

export declare class MovingAvg {
  constructor(size?: number);

  reset(): this;

  add(val: number): number;

  sample(): number;
}

export declare function pollTimer(id: string, interval: number): boolean;

export declare class ArrayPool {
  get<type>(n: number, clear: boolean): Array<type>;
}

export declare class set<KeyType> {
  constructor(input: Iterable<KeyType>);

  has(key: KeyType): boolean;

  [Symbol.iterator](): Iterable<KeyType>;

  get size(): number;

  equals(setb: this): boolean;

  clear(): this;

  filter(f: Function, thisvar: any): this;

  map(f: Function, thisvar: any): this;

  reduce(f: Function, initial: any): this;

  copy(): this;

  add(item: KeyType): void;

  delete(item: KeyType, ignore_existence: boolean): void;

  remove(item: KeyType, ignore_existence: boolean): void;

  has(item): boolean;

  forEach(func: function, thisvar: this): void;
}