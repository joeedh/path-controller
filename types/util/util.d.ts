/* Returns 'undefined' as type type.  Breaks the type
   system, is meant only for object pool systems.
 */
import {Matrix4, Vector2, Vector3, Vector4} from "./vectormath";
import type {Curve1D} from "../curve/curve1d";

export declare function undefinedForGC<type>(): type;

export declare class cachering<type> extends Array<type> {
  constructor(factory: () => type, n: number);

  static fromConstructor<type>(cls: new () => type, number: n, isprivate?: boolean): cachering<type>;

  next(): type;
}

export declare class IDGen {
  next(): number;

  copy(): this;

  _cur: number;
}

export declare function time_ms(): number;

export declare function termColor(s: string, c: string, d?: number): string;

export declare function termPrint(...arguments: any[]);

export declare class MovingAvg {
  constructor(size?: number);

  reset(): this;

  add(val: number): number;

  sample(): number;
}

export declare function pollTimer(id: string, interval: number): boolean;

export declare class ArrayPool {
  get<type>(n: number, clear?: boolean): Array<type>;
}

export declare class set<KeyType> {
  constructor(input?: Iterable<KeyType>);

  has(key: KeyType): boolean;

  [Symbol.iterator](): Iterator<KeyType>;

  get size(): number;

  equals(setb: this): boolean;

  clear(): this;

  filter(f: Function, thisvar: any): this;

  map(f: Function, thisvar: any): this;

  reduce(f: Function, initial: any): this;

  copy(): this;

  add(item: KeyType): void;

  delete(item: KeyType, ignore_existence?: boolean): void;

  remove(item: KeyType, ignore_existence?: boolean): void;

  has(item): boolean;

  forEach(func: function, thisvar: this): void;
}

export declare class Queue<type> {
  constructor(n: number);

  enqueue(item: type): number;

  clear(clearData?: boolean): this;

  dequeue(): type | undefined;

  queue: Array<type>;

  length: number;
}

export declare class HashDigest {
  get(): number;

  add(f: number | Matrix4 | Vector2 | Vector3 | Vector4 | string | boolean | Curve1D): number;

  reset(): this;
}

export declare function print_stack(error: Error): void;

export class MersenneRandom {
  constructor(seed?: number);

  random(): number;

  seed(f: number);
}

export declare function random(): number;

export declare function seed(s: number);

export class MinHeapQueue<type> {
  constructor(iter?: Iterable<type>, iterw?: Iterable<number>);

  push(e: type, w: number): void;

  pop(): type | void;

  length: number;
}

export class IDMap<ValueType> {
  has(id: number): boolean;

  set(id: number, val: ValueType): boolean;

  get(id: number): ValueType | undefined;

  delete(id: number): boolean;

  keys(): Iterable<number>;

  values(): Iterable<ValueType>;

  [Symbol.iterator](): Iterator<[number, ValueType]>
}
