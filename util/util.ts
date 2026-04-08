import "./polyfill.js";
import "./struct.js";
import MobileDetect from "./mobile-detect.js";
import nstructjs from "./struct.js";

const f64tmp = new Float64Array(1);
const u16tmp = new Uint16Array(f64tmp.buffer);

export function isDenormal(f: number): boolean {
  f64tmp[0] = f;

  const a = u16tmp[0];
  const b = u16tmp[1];
  const c = u16tmp[2];
  const d = u16tmp[3];

  //zero? check both positive and negative zero
  if (a === 0 && b === 0 && c === 0 && (d === 0 || d === 32768)) {
    return false;
  }

  let test = d & ~(1 << 15);
  test = test >> 4;

  //window.console.log(u16tmp[0], u16tmp[1], u16tmp[2], u16tmp[3], "|", test);

  return test === 0;
}

const colormap: Record<string, number> = {
  "black"   : 30,
  "red"     : 31,
  "green"   : 32,
  "yellow"  : 33,
  "blue"    : 34,
  "magenta" : 35,
  "cyan"    : 36,
  "teal"    : 36,
  "white"   : 37,
  "reset"   : 0,
  "grey"    : 2,
  "gray"    : 2,
  "orange"  : 202,
  "pink"    : 198,
  "brown"   : 314,
  "lightred": 91,
  "peach"   : 210,
};

export const termColorMap: Record<string | number, string | number> = {};
for (const k in colormap) {
  termColorMap[k] = colormap[k];
  termColorMap[colormap[k]] = k;
}

export function termColor(s: string | symbol, c: string | number, d: number = 0): string {
  let str: string;
  if (typeof s === "symbol") {
    str = s.toString();
  } else {
    str = "" + s;
  }

  let code: number;
  if (typeof c === "string" && c in colormap) {
    code = colormap[c];
  } else {
    code = c as number;
  }

  if (code > 107) {
    const s2 = "\u001b[38;5;" + code + "m";
    return s2 + str + "\u001b[39m";
  }

  return "\u001b[" + code + "m" + str + "\u001b[39m";
}

export function termPrint(...args: unknown[]): string {
  //let console = window.console;

  let s = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) {
      s += " ";
    }
    s += args[i];
  }

  const re1a = /\u001b\[[1-9][0-9]?m/;
  const re1b = /\u001b\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/;
  const re2 = /\u001b\[39m/;

  const endtag = "\u001b[39m";

  interface Token {
    type: string;
    value: string;
  }

  function tok(s: string, type: string): Token {
    return {
      type : type,
      value: s,
    };
  }

  const tokdef: [RegExp, string][] = [
    [re1a, "start"],
    [re1b, "start"],
    [re2, "end"],
  ];

  let s2 = s;

  const i = 0;
  const tokens: Token[] = [];

  while (s2.length > 0) {
    let ok = false;

    let mintk: [RegExp, string] | undefined = undefined;
    let mini: number | undefined = undefined;
    let minslice: string | undefined = undefined;
    let mintype: string | undefined = undefined;

    for (const tk of tokdef) {
      const idx = s2.search(tk[0]);

      if (idx >= 0 && (mini === undefined || idx < mini)) {
        minslice = s2.slice(idx, s2.length).match(tk[0])![0];
        mini = idx;
        mintype = tk[1];
        mintk = tk;
        ok = true;
      }
    }

    if (!ok) {
      break;
    }

    if (mini! > 0) {
      const chunk = s2.slice(0, mini);
      tokens.push(tok(chunk, "chunk"));
    }

    s2 = s2.slice(mini! + minslice!.length, s2.length);
    const t = tok(minslice!, mintype!);

    tokens.push(t);
  }

  if (s2.length > 0) {
    tokens.push(tok(s2, "chunk"));
  }

  const stack: (string | undefined)[] = [];
  let cur: string | undefined;

  let out = "";

  for (const t of tokens) {
    if (t.type === "chunk") {
      out += t.value;
    } else if (t.type === "start") {
      stack.push(cur);
      cur = t.value;

      out += t.value;
    } else if (t.type === "end") {
      cur = stack.pop();
      if (cur) {
        out += cur;
      } else {
        out += endtag;
      }
    }
  }

  return out;
}

(globalThis as Record<string, unknown>).termColor = termColor;

export class MovingAvg extends Array<number> {
  cur: number;
  used: number;
  sum: number;

  constructor(size: number = 64) {
    super();

    this.length = size;
    this.cur = 0;
    this.used = 0;
    this.sum = 0;
  }

  reset(): this {
    this.cur = this.used = this.sum = 0.0;

    return this;
  }

  add(val: number): number {
    if (this.used < this.length) {
      this[this.cur] = val;
      this.used++;
    } else {
      this.sum -= this[this.cur];
      this[this.cur] = val;
    }

    this.sum += val;
    this.cur = (this.cur + 1) % this.length;

    return this.sample();
  }

  sample(): number {
    return this.used ? this.sum / this.used : 0.0;
  }
}

export const timers: Record<string, number> = {};

export function pollTimer(id: string, interval: number): boolean {
  if (!(id in timers)) {
    timers[id] = time_ms();
  }

  if (time_ms() - timers[id] >= interval) {
    timers[id] = time_ms();
    return true;
  }

  return false;
}

let mobileDetect: { mobile(): string | null } | undefined = undefined;
let mobileDetectValue: boolean | undefined = undefined;
let lastUserAgent = "";

export function isMobile(): boolean {
  if (lastUserAgent !== navigator.userAgent) {
    // user agent changed, e.g. devtools is in mobile mode (or not)
    lastUserAgent = navigator.userAgent;
    mobileDetectValue = undefined;
    mobileDetect = undefined;
  }

  if (mobileDetectValue === undefined) {
    let result: string | boolean | null;

    if (navigator.userAgent.search(/Mobi/) !== -1) {
      // early exit
      result = true;
    } else {
      mobileDetect = new (MobileDetect as unknown as new (ua: string) => { mobile(): string | null })(
        navigator.userAgent
      );
      result = mobileDetect!.mobile();
    }

    if (typeof result === "string") {
      result = result.toLowerCase();
    }

    mobileDetectValue = Boolean(result);
  }

  return mobileDetectValue;
}
window.isMobile = isMobile as unknown as boolean;

interface SmartConsoleDataEntry {
  time: number;
  count: number;
}

export class SmartConsoleContext {
  name: string;
  color: string;
  __console: SmartConsole;
  timeInterval: number;
  timeIntervalAll: number;
  _last: number;
  last: SmartConsoleDataEntry | number;
  last2: number;
  _data: Record<number, SmartConsoleDataEntry>;
  _data_length: number;
  maxCache: number;

  constructor(name: string, console: SmartConsole) {
    this.name = name;

    const c = [random(), random(), random()];
    let sum = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
    sum = 255 / sum;

    const r = ~~(c[0] * sum);
    const g = ~~(c[1] * sum);
    const b = ~~(c[2] * sum);

    this.color = `rgb(${r},${g},${b})`;
    this.__console = console;

    //minimum time between prints of same message
    this.timeInterval = 375;

    //minimum time in general
    this.timeIntervalAll = 245;

    this._last = 0;
    this.last = 0;
    this.last2 = 0;
    this._data = {};
    this._data_length = 0;
    this.maxCache = 256;
  }

  hash(args: IArguments | unknown[]): number {
    let sum = 0;
    const mul = (1 << 19) - 1;
    const off = (1 << 27) - 1;
    let i = 0;

    function dohash(h: number): void {
      h = (h * mul + off + i * mul * 0.25) & mul;

      i++;
      sum = sum ^ h;
    }

    const visit = new WeakSet();

    const recurse = (n: unknown): void => {
      if (typeof n === "string") {
        dohash(strhash(n));
      } else if (typeof n === "undefined" || n === null) {
        dohash(0);
      } else if (typeof n === "object") {
        if (visit.has(n as object)) {
          return;
        }

        visit.add(n as object);

        const keys = getAllKeys(n as object);

        for (const k of keys) {
          let v: unknown;

          if (typeof k !== "string") {
            continue;
          }

          try {
            v = (n as Record<string, unknown>)[k];
          } catch (error) {
            continue;
          }

          recurse(v);
        }
      } else if (typeof n === "function") {
        dohash(strhash("" + (n as Function).name));
      }
    };

    //let str = "";

    for (let i = 0; i < args.length; i++) {
      recurse(args[i]);
      //str += args[i] + " ";
    }

    //window.console.log("HASH", sum, str);
    return sum;
  }

  clearCache(): this {
    this._data_length = 0;
    this._data = {};
    return this;
  }

  _getData(args: IArguments | unknown[]): SmartConsoleDataEntry {
    const key = this.hash(args);

    if (!(key in this._data)) {
      if (this._data_length > this.maxCache) {
        this.clearCache();
      }

      this._data[key] = {
        time : 0,
        count: 0,
      };

      this._data_length++;
    }

    return this._data[key];
  }

  _check(args: IArguments | unknown[]): boolean {
    if (this.timeIntervalAll > 0 && time_ms() - this.last2 < this.timeIntervalAll) {
      return false;
    }

    this.last2 = time_ms();

    return true;
    /*
    this.last2 = time_ms();

    let d = this._getData(args);
    let last = this.last;

    this.last = d;

    if (d !== last) {
      d.count = 0;
      d.time = time_ms();
      return true;
    }

    if (time_ms() - d.time > this.timeInterval) {
      d.time = time_ms();
      return true;
    }

    return false;*/
  }

  log(...args: unknown[]): void {
    if (this._check(args)) {
      window.console.log("%c", "color:" + this.color, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this._check(args)) {
      window.console.log("%c" + this.name, "color : " + this.color, ...args);
    }
  }

  trace(...args: unknown[]): void {
    if (this._check(args)) {
      window.console.trace(...args);
    }
  }

  error(...args: unknown[]): void {
    if (this._check(args)) {
      window.console.error(...args);
    }
  }
}

export class SmartConsole {
  contexts: Record<string, SmartConsoleContext>;

  constructor() {
    this.contexts = {};
  }

  context(name: string): SmartConsoleContext {
    if (!(name in this.contexts)) {
      this.contexts[name] = new SmartConsoleContext(name, this);
    }

    return this.contexts[name];
  }

  log(...args: unknown[]): void {
    const c = this.context("default");
    return c.log(...args);
  }

  warn(...args: unknown[]): void {
    const c = this.context("default");
    return c.warn(...args);
  }

  trace(...args: unknown[]): void {
    const c = this.context("default");
    return c.trace(...args);
  }

  error(...args: unknown[]): void {
    const c = this.context("default");
    return c.error(...args);
  }
}

export const console = new SmartConsole();

(globalThis as Record<string, unknown>).tm = 0.0;

const EmptySlot: object = {};

export function getClassParent(cls: Function): Function | undefined {
  let p = cls.prototype as { __proto__?: { constructor?: Function } } | undefined;

  if (p) p = p.__proto__ as { __proto__?: { constructor?: Function } } | undefined;
  if (p) return p.constructor;

  return undefined;
}

//make global for debugging purposes in console
//window._getClassParent = getClassParent;

export function list<T>(iterable: Iterable<T>): T[] {
  const ret: T[] = [];

  for (const item of iterable) {
    ret.push(item);
  }

  return ret;
}

/** Count items in list; if searchItem is not undefined then a count
 *  of the number of times searchItem occurs will be returned.*/
export function count<T>(iterable: Iterable<T>, searchItem?: T): number {
  let count = 0;

  if (searchItem !== undefined) {
    for (const item of iterable) {
      if (item === searchItem) {
        count++;
      }
    }
  } else {
    for (const _item of iterable) {
      count++;
    }
  }

  return count;
}

/*
 * returns all object keys, including
 * inherited ones
 * */
export function getAllKeys(obj: object): Set<string | symbol> {
  const keys = new Set<string | symbol>();

  if (typeof obj !== "object" && typeof obj !== "function") {
    throw new Error("must pass an object ot getAllKeys; object was: " + obj);
  }

  let p: object | null = obj;

  while (p && p !== Object) {
    for (const k in Object.getOwnPropertyDescriptors(p)) {
      if (k === "__proto__") continue;

      keys.add(k);
    }

    for (const k of Object.getOwnPropertySymbols(p)) {
      keys.add(k);
    }

    p = Object.getPrototypeOf(p);
  }

  let cls: Function | undefined = (obj as { constructor?: Function }).constructor;
  if (!cls) return keys;

  while (cls) {
    const proto = cls.prototype as object | undefined;
    if (!proto) {
      cls = getClassParent(cls);
      continue;
    }

    for (const k in proto) {
      keys.add(k);
    }

    for (const k in Object.getOwnPropertyDescriptors(proto)) {
      keys.add(k);
    }

    cls = getClassParent(cls);
  }

  return keys;
}

//globalThis._getAllKeys = getAllKeys;

export function btoa(buf: ArrayBuffer | Uint8Array | string | string): string {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }

  if (typeof buf === "string" || buf instanceof String) {
    return window.btoa(buf as string);
  }

  let ret = "";
  for (let i = 0; i < buf.length; i++) {
    ret += String.fromCharCode(buf[i]);
  }

  return btoa(ret);
}

export function formatNumberUI(val: number | undefined | null, isInt: boolean = false, decimals: number = 5): string {
  if (val === undefined || val === null) {
    return "0";
  } else if (isNaN(val)) {
    return "NaN";
  } else if (val === -Infinity) {
    return "-" + String.fromCharCode(0x221e);
  } else if (val === Infinity) {
    return "+" + String.fromCharCode(0x221e);
  } else if (!isInt) {
    return val.toFixed(decimals);
  } else {
    return "" + Math.floor(val);
  }
}

//window.formatNumberUI = formatNumberUI;

export function atob(buf: string): Uint8Array {
  const data = window.atob(buf);
  const ret: number[] = [];

  for (let i = 0; i < data.length; i++) {
    ret.push(data.charCodeAt(i));
  }

  return new Uint8Array(ret);
}

export function time_ms(): number {
  if (window.performance) return window.performance.now();
  else return new Date().getMilliseconds();
}

export function color2css(c: ArrayLike<number>): string {
  let ret = c.length === 3 ? "rgb(" : "rgba(";

  for (let i = 0; i < 3; i++) {
    if (i > 0) ret += ",";

    ret += ~~(c[i] * 255);
  }

  if (c.length === 4) ret += "," + (c as { [index: number]: number })[3];
  ret += ")";

  return ret;
}

export function merge<A extends object, B extends object>(obja: A, objb: B): A & B {
  return Object.assign({}, obja, objb);
}

const debug_cacherings = false;

if (debug_cacherings) {
  window._cacherings = [];

  window._clear_all_cacherings = function (kill_all: boolean = false): void {
    function copy(obj: unknown): unknown {
      if (typeof obj === "object" && obj !== null && typeof (obj as { copy?: Function }).copy === "function") {
        return (obj as { copy: () => unknown }).copy();
      } else if (typeof obj === "object" && obj !== null && (obj as object).constructor === Object) {
        const ret: Record<string | symbol, unknown> = {};

        for (const k of Reflect.ownKeys(obj as object)) {
          let v: unknown;

          try {
            v = (obj as Record<string | symbol, unknown>)[k];
          } catch (error) {
            continue;
          }

          if (typeof v !== "object") {
            ret[k] = v;
          } else {
            ret[k] = copy(v);
          }
        }

        return ret;
      } else if (typeof obj === "object" && obj !== null) {
        return new ((obj as object).constructor as new () => unknown)();
      }

      return obj;
    }

    for (const ch of window._cacherings as cachering<unknown>[]) {
      const obj = ch[0];
      const len = ch.length;

      ch.length = 0;
      ch.cur = 0;

      if (kill_all) {
        continue;
      }

      for (let i = 0; i < len; i++) {
        ch.push(copy(obj));
      }
    }
  };

  window._nonvector_cacherings = function (): unknown {
    for (const ch of window._cacherings as cachering<unknown>[]) {
      if (ch.length === 0) {
        continue;
      }

      const name = (ch[0] as object).constructor.name;
      let ok = !name.startsWith("Vector") && !name.startsWith("Quat");
      ok = ok && !name.startsWith("TriEditor");
      ok = ok && !name.startsWith("QuadEditor");
      ok = ok && !name.startsWith("PointEditor");
      ok = ok && !name.startsWith("LineEditor");

      if (ok) {
        console.log(name, ch);
      }
    }

    return undefined;
  };

  window._stale_cacherings = function (): unknown {
    const ret = (window._cacherings as cachering<unknown>[]).concat([]);

    ret.sort((a, b) => a.gen - b.gen);
    return ret;
  };
}

export class cachering<T> extends Array<T> {
  private: boolean;
  cur: number;
  gen: number;

  constructor(func: () => T, size: number, isprivate: boolean = false) {
    super();

    this.private = isprivate;
    this.cur = 0;
    this.gen = 0;

    if (!isprivate && debug_cacherings) {
      this.gen = 0;
      window._cacherings.push(this);
    }

    for (let i = 0; i < size; i++) {
      this.push(func());
    }
  }

  static fromConstructor<U>(cls: new () => U, size: number, isprivate: boolean = false): cachering<U> {
    const func = function (): U {
      return new cls();
    };

    return new cachering<U>(func, size, isprivate);
  }

  next(): T {
    if (debug_cacherings) {
      this.gen++;
    }

    const ret = this[this.cur];
    this.cur = (this.cur + 1) % this.length;

    return ret;
  }
}

interface KeystrObject {
  [Symbol.keystr](): string;
}

export class SetIter<T extends KeystrObject> {
  set: set<T>;
  i: number;
  ret: IteratorResult<T, undefined>;

  constructor(s: set<T>) {
    this.set = s;
    this.i = 0;
    this.ret = { done: false, value: undefined as unknown as T };
  }

  [Symbol.iterator](): this {
    return this;
  }

  next(): IteratorResult<T, undefined> {
    const ret = this.ret;

    while (this.i < this.set.items.length && this.set.items[this.i] === EmptySlot) {
      this.i++;
    }

    if (this.i >= this.set.items.length) {
      ret.done = true;
      ret.value = undefined as unknown as T;

      return ret;
    }

    ret.value = this.set.items[this.i++] as T;
    return ret;
  }
}

/**
 Set

 Stores objects in a set; each object is converted to a value via
 a [Symbol.keystr] method, and if that value already exists in the set
 then the object is not added.


 * */
export class set<T extends KeystrObject> {
  items: (T | object)[];
  keys: Record<string, number>;
  freelist: number[];
  length: number;

  constructor(input?: Iterable<T> | { forEach(fn: (item: T) => void, thisArg: unknown): void } | T[]) {
    this.items = [];
    this.keys = {};
    this.freelist = [];

    this.length = 0;

    if (typeof input === "string") {
      input = new String(input) as unknown as Iterable<T>;
    }

    if (input !== undefined) {
      if (Symbol.iterator in (input as object)) {
        for (const item of input as Iterable<T>) {
          this.add(item);
        }
      } else if ("forEach" in (input as object)) {
        (input as { forEach(fn: (item: T) => void, thisArg: set<T>): void }).forEach(function (this: set<T>, item: T) {
          this.add(item);
        }, this);
      } else if (input instanceof Array) {
        for (let i = 0; i < input.length; i++) {
          this.add(input[i]);
        }
      }
    }
  }

  get size(): number {
    return this.length;
  }

  [Symbol.iterator](): SetIter<T> {
    return new SetIter<T>(this);
  }

  equals(setb: set<T>): boolean {
    for (const item of this) {
      if (!setb.has(item)) {
        return false;
      }
    }

    for (const item of setb) {
      if (!this.has(item)) {
        return false;
      }
    }

    return true;
  }

  clear(): this {
    this.items.length = 0;
    this.keys = {};
    this.freelist.length = 0;
    this.length = 0;

    return this;
  }

  filter(f: (item: T, index: number, set: set<T>) => boolean, thisvar?: unknown): set<T> {
    let i = 0;
    const ret = new set<T>();

    for (const item of this) {
      if (f.call(thisvar, item, i++, this)) {
        ret.add(item);
      }
    }

    return ret;
  }

  map(f: (item: T, index: number, set: set<T>) => T, thisvar?: unknown): set<T> {
    const ret = new set<T>();

    let i = 0;

    for (const item of this) {
      ret.add(f.call(thisvar, item, i++, this));
    }

    return ret;
  }

  reduce<U>(f: (acc: U | T, item: T, index: number, set: set<T>) => U, initial?: U): U | T {
    let accumulator: U | T | undefined = initial;
    if (accumulator === undefined) {
      for (const item of this) {
        accumulator = item;
        break;
      }
    }

    let i = 0;
    for (const item of this) {
      accumulator = f(accumulator!, item, i++, this);
    }

    return accumulator!;
  }

  copy(): set<T> {
    const ret = new set<T>();
    for (const item of this) {
      ret.add(item);
    }

    return ret;
  }

  add(item: T): void {
    const key = item[Symbol.keystr]();

    if (key in this.keys) return;

    if (this.freelist.length > 0) {
      const i = this.freelist.pop()!;

      this.keys[key] = i;
      this.items[i] = item;
    } else {
      const i = this.items.length;

      this.keys[key] = i;
      this.items.push(item);
    }

    this.length++;
  }

  delete(item: T, ignore_existence: boolean = true): void {
    this.remove(item, ignore_existence);
  }

  remove(item: T, ignore_existence?: boolean): void {
    const key = item[Symbol.keystr]();

    if (!(key in this.keys)) {
      if (!ignore_existence) {
        console.warn("Warning, item", item, "is not in set");
      }
      return;
    }

    const i = this.keys[key];
    this.freelist.push(i);
    this.items[i] = EmptySlot;

    delete this.keys[key];

    this.length--;
  }

  has(item: T): boolean {
    return item[Symbol.keystr]() in this.keys;
  }

  forEach(func: (item: T) => void, thisvar?: unknown): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      if (item === EmptySlot) continue;

      thisvar !== undefined ? func.call(thisvar, item as T) : func(item as T);
    }
  }
}

export class HashIter {
  hash: hashtable;
  i: number;
  ret: { done: boolean; value: unknown };

  constructor(hash: hashtable) {
    this.hash = hash;
    this.i = 0;
    this.ret = { done: false, value: undefined };
  }

  next(): { done: boolean; value: unknown } {
    const items = this.hash._items;

    if (this.i >= items.length) {
      this.ret.done = true;
      this.ret.value = undefined;

      return this.ret;
    }

    do {
      this.i += 2;
    } while (this.i < items.length && items[this.i] === _hash_null);

    return this.ret;
  }
}

const _hash_null: object = {};

export class hashtable {
  _items: unknown[];
  _keys: Record<string, number>;
  length: number;

  constructor() {
    this._items = [];
    this._keys = {};
    this.length = 0;
  }

  [Symbol.iterator](): HashIter {
    return new HashIter(this);
  }

  set(key: KeystrObject, val: unknown): void {
    const key2 = key[Symbol.keystr]();

    let i: number;
    if (!(key2 in this._keys)) {
      i = this._items.length;

      try {
        this._items.push(0);
        this._items.push(0);
      } catch (error) {
        console.log(":::", this._items.length, key, key2, val);
        throw error;
      }

      this._keys[key2] = i;
      this.length++;
    } else {
      i = this._keys[key2];
    }

    this._items[i] = key;
    this._items[i + 1] = val;
  }

  remove(key: KeystrObject): void {
    const key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console.warn("Warning, key not in hashtable:", key, key2);
      return;
    }

    const i = this._keys[key2];

    this._items[i] = _hash_null;
    this._items[i + 1] = _hash_null;

    delete this._keys[key2];
    this.length--;
  }

  has(key: KeystrObject): boolean {
    const key2 = key[Symbol.keystr]();

    return key2 in this._keys;
  }

  get(key: KeystrObject): unknown {
    const key2 = key[Symbol.keystr]();

    if (!(key2 in this._keys)) {
      console.warn("Warning, item not in hash", key, key2);
      return undefined;
    }

    return this._items[this._keys[key2] + 1];
  }

  add(key: KeystrObject, val: unknown): void {
    return this.set(key, val);
  }

  keys(): unknown[] {
    const ret: unknown[] = [];

    for (let i = 0; i < this._items.length; i += 2) {
      const key = this._items[i];

      if (key !== _hash_null) {
        ret.push(key);
      }
    }

    return ret;
  }

  values(): unknown[] {
    const ret: unknown[] = [];

    for (let i = 0; i < this._items.length; i += 2) {
      const item = this._items[i + 1];

      if (item !== _hash_null) {
        ret.push(item);
      }
    }

    return ret;
  }

  forEach(cb: (key: string, val: unknown) => void, thisvar?: unknown): void {
    if (thisvar === undefined) thisvar = self;

    for (const k in this._keys) {
      const i = this._keys[k];

      cb.call(thisvar, k, this._items[i]);
    }
  }
}

let IDGenInternalIDGen = 0;

export class IDGen {
  __cur: number;
  _debug: boolean;
  _internalID: number;
  static STRUCT: string;

  constructor() {
    this.__cur = 1;

    this._debug = false;
    this._internalID = IDGenInternalIDGen++;
  }

  /*
  get _cur() {
    return this.__cur;
  }

  set _cur(v) {
    if (this._debug && pollTimer("_idgen_debug", 450)) {
      window.console.warn("_cur access", v);
    }

    this.__cur = v;
  }

  // */

  get cur(): number {
    return this.__cur;
  }

  set cur(v: number) {
    if (isNaN(v) || !isFinite(v)) {
      throw new Error("NaN error in util.IDGen");
    }

    this.__cur = v;
  }

  get _cur(): number {
    return this.cur;
  }

  set _cur(v: number) {
    window.console.warn("Deprecated use of IDGen._cur");
    this.cur = v;
  }

  static fromJSON(obj: { cur?: number; _cur?: number }): IDGen {
    const ret = new IDGen();

    ret.cur = obj.cur === undefined ? obj._cur! : obj.cur;

    return ret;
  }

  next(): number {
    return this.cur++;
  }

  copy(): IDGen {
    const ret = new IDGen();
    ret.cur = this.cur;

    return ret;
  }

  max_cur(id: number): void {
    this.cur = Math.max(this.cur, id + 1);
  }

  toJSON(): { cur: number } {
    return {
      cur: this.cur,
    };
  }

  loadSTRUCT(reader: (obj: IDGen) => void): void {
    reader(this);
  }
}

IDGen.STRUCT = `
IDGen {
  cur : int;
}
`;
nstructjs.register(IDGen);

function get_callstack(err: Error): string[] {
  return ("" + err.stack).split("\n");
}

export function print_stack(err?: Error): void {
  if (!err) {
    window.console.trace();
  } else {
    window.console.log(err.stack);
  }
}

(globalThis as Record<string, unknown>).get_callstack = get_callstack;
(globalThis as Record<string, unknown>).print_stack = print_stack;

export function fetch_file(path: string): Promise<string> {
  const url = location.origin + "/" + path;

  const req = new XMLHttpRequest();

  return new Promise(function (accept, reject) {
    req.open("GET", url);
    req.onreadystatechange = function (_e: Event) {
      if (req.status === 200 && req.readyState === 4) {
        accept(req.response as string);
      } else if (req.status >= 400) {
        reject(req.status);
      }
    };
    req.send();
  });
}

//from:https://en.wikipedia.org/wiki/Mersenne_Twister
function _int32(x: number): number {
  // Get the 31 least significant bits.
  return ~~(((1 << 30) - 1) & ~~x);
}

export class MersenneRandom {
  index: number;
  mt: Uint32Array;

  constructor(seed: number) {
    // Initialize the index to 0
    this.index = 624;
    this.mt = new Uint32Array(624);

    this.seed(seed);
  }

  random(): number {
    return this.extract_number() / (1 << 30);
  }

  /** normal-ish distribution */
  nrandom(n: number = 3): number {
    let ret = 0.0;

    for (let i = 0; i < n; i++) {
      ret += this.random();
    }

    return ret / n;
  }

  seed(seed: number): void {
    seed = ~~(seed * 8192);

    // Initialize the index to 0
    this.index = 624;
    this.mt.fill(0, 0, this.mt.length);

    this.mt[0] = seed; // Initialize the initial state to the seed

    for (let i = 1; i < 624; i++) {
      this.mt[i] = _int32(1812433253 * (this.mt[i - 1] ^ (this.mt[i - 1] >> 30)) + i);
    }
  }

  extract_number(): number {
    if (this.index >= 624) this.twist();

    let y = this.mt[this.index];

    // Right shift by 11 bits
    y = y ^ (y >> 11);
    // Shift y left by 7 and take the bitwise and of 2636928640
    y = y ^ ((y << 7) & 2636928640);
    // Shift y left by 15 and take the bitwise and of y and 4022730752
    y = y ^ ((y << 15) & 4022730752);
    // Right shift by 18 bits
    y = y ^ (y >> 18);

    this.index = this.index + 1;

    return _int32(y);
  }

  twist(): void {
    for (let i = 0; i < 624; i++) {
      // Get the most significant bit and add it to the less significant
      // bits of the next number
      const y = _int32((this.mt[i] & 0x80000000) + (this.mt[(i + 1) % 624] & 0x7fffffff));
      this.mt[i] = this.mt[(i + 397) % 624] ^ (y >> 1);

      if (y % 2 !== 0) this.mt[i] = this.mt[i] ^ 0x9908b0df;
    }

    this.index = 0;
  }
}

const _mt = new MersenneRandom(0);

export function random(): number {
  return _mt.extract_number() / (1 << 30);
}

export function seed(n: number): void {
  //  console.trace("seed called");
  _mt.seed(n);
}

const smallstr_hashes: Record<string, number> = {};

const MAXINT = Math.pow(2, 31) - 1;

export function strhash(str: string): number {
  if (str.length <= 64) {
    const hash = smallstr_hashes[str];

    if (hash !== undefined) {
      return hash;
    }
  }

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);

    hash = hash < 0 ? -hash : hash;

    hash ^= (ch * 1103515245 + 12345) & MAXINT;
  }

  if (str.length <= 64) {
    smallstr_hashes[str] = hash;
  }

  return hash;
}

const hashsizes = [
  /*2, 5, 11, 19, 37, 67, 127, */ 223, 383, 653, 1117, 1901, 3251, 5527, 9397, 15991, 27191, 46229, 78593, 133631,
  227177, 38619, 656587, 1116209, 1897561, 3225883, 5484019, 9322861, 15848867, 26943089, 45803279, 77865577, 132371489,
  225031553,
];

const FTAKEN = 0;
const FKEY = 1;
const FVAL = 2;
const FTOT = 3;

export class FastHash extends Array<unknown> {
  cursize: number;
  size: number;
  used: number;

  constructor() {
    super();

    this.cursize = 0;
    this.size = hashsizes[this.cursize];
    this.used = 0;

    this.length = this.size * FTOT;
    this.fill(0, 0, this.length);
  }

  resize(size: number): this {
    const table = this.slice(0, this.length);

    this.length = size * FTOT;
    this.size = size;
    this.fill(0, 0, this.length);

    for (let i = 0; i < table.length; i += FTOT) {
      if (!table[i + FTAKEN]) continue;

      const key = table[i + FKEY] as string | number | { valueOf(): number };
      const val = table[i + FVAL];
      this.set(key, val);
    }

    return this;
  }

  get(key: string | number | { valueOf(): number }): unknown {
    const hash: number = typeof key === "string" ? strhash(key) : typeof key === "object" ? key.valueOf() : key;

    let probe = 0;

    let h = (hash + probe) % this.size;

    let _i = 0;
    while (_i++ < 50000 && this[h * FTOT + FTAKEN]) {
      if (this[h * FTOT + FKEY] === key) {
        return this[h * FTOT + FVAL];
      }

      probe = (probe + 1) * 2;
      h = (hash + probe) % this.size;
    }

    return undefined;
  }

  has(key: string | number | { valueOf(): number }): boolean {
    const hash: number = typeof key === "string" ? strhash(key) : typeof key === "object" ? key.valueOf() : key;

    let probe = 0;

    let h = (hash + probe) % this.size;

    let _i = 0;
    while (_i++ < 50000 && this[h * FTOT + FTAKEN]) {
      if (this[h * FTOT + FKEY] === key) {
        return true;
      }

      probe = (probe + 1) * 2;
      h = (hash + probe) % this.size;
    }

    return false;
  }

  // @ts-ignore - intentionally shadows Array.prototype.set from polyfill
  set(key: string | number | { valueOf(): number }, val: unknown): void {
    const hash: number = typeof key === "string" ? strhash(key) : typeof key === "object" ? key.valueOf() : key;

    if (this.used > this.size / 3) {
      this.resize(hashsizes[this.cursize++]);
    }

    let probe = 0;

    let h = (hash + probe) % this.size;

    let _i = 0;
    while (_i++ < 50000 && this[h * FTOT + FTAKEN]) {
      if (this[h * FTOT + FKEY] === key) {
        this[h * FTOT + FVAL] = val;
        return;
      }

      probe = (probe + 1) * 2;
      h = (hash + probe) % this.size;
    }

    this[h * FTOT + FTAKEN] = 1;
    this[h * FTOT + FKEY] = key;
    this[h * FTOT + FVAL] = val;

    this.used++;
  }
}

export function test_fasthash(): FastHash {
  const h = new FastHash();
  console.log("bleh hash:", strhash("bleh"));

  h.set("bleh", 1);
  h.set("bleh", 2);
  h.set("bleh", 3);

  console.log(h);

  return h;
}

export class ImageReader {
  load_image(): Promise<ImageData> {
    const input = document.createElement("input");
    input.type = "file";

    let doaccept!: (value: ImageData) => void;

    const promise = new Promise<ImageData>((accept, _reject) => {
      doaccept = accept;
    });

    input.addEventListener("change", function (this: HTMLInputElement, _e: Event) {
      const files = this.files;
      console.log("got file", _e, files);

      if (!files || files.length === 0) return;

      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const data = (e.target as FileReader).result as string;
        const image = new Image();

        image.src = data;
        image.onload = (_e2: Event) => {
          console.log("got image", image.width, image.height);

          const canvas = document.createElement("canvas");
          const g = canvas.getContext("2d")!;

          canvas.width = image.width;
          canvas.height = image.height;

          g.drawImage(image, 0, 0);
          const idata = g.getImageData(0, 0, image.width, image.height);

          doaccept(idata);
        };
      };

      reader.readAsDataURL(files[0]);
    });

    input.click();
    return promise;
  }

  example(): void {
    this.load_image().then((idata) => {
      console.log(idata);
    });
  }
}

let digestcache: cachering<HashDigest>;

/** NOT CRYPTOGRAPHIC */
export class HashDigest {
  i: number;
  hash: number;

  constructor() {
    this.i = 0;
    this.hash = 0;
  }

  static cachedDigest(): HashDigest {
    return digestcache.next().reset();
  }

  reset(): this {
    this.i = 0;
    this.hash = 0;

    return this;
  }

  get(): number {
    return this.hash;
  }

  add(v: number | string | number[] | boolean): this {
    if (typeof v === "boolean") {
      this.add(v ? 1 : 0);
      return this;
    }
    if (typeof v === "string") {
      v = strhash(v);
    }

    if (typeof v === "object" && Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        this.add(v[i]);
      }

      return this;
    }

    if (v >= -5 && v <= 5) {
      v *= 32;
    }

    //try to deal with subdecimal floating point error

    let f = Math.fract(v) * (1024 * 512);
    f = ~~f / (1024 * 512);
    v = Math.floor(v) + f;

    //glibc linear congruel generator
    this.i = ((this.i + ~~v) * 1103515245 + 12345) & ((1 << 29) - 1);
    //according to wikipedia only the top 16 bits are random
    //this.i = this.i>>16;

    const v2 = (v * 1024 * 1024) & ((1 << 29) - 1);
    v = v | v2;

    v = ~~v;

    this.hash ^= v ^ this.i;

    return this;
  }
}

window._test_hash2 = () => {
  const h = new HashDigest();

  const tests = [
    [0, 0, 0, 0],
    [0, 0, 0],
    [0, 0],
    [0],
    [1],
    [2],
    [3],
    [strhash("yay")],
    [strhash("yay"), strhash("yay")],
    [strhash("yay"), strhash("yay"), strhash("yay")],
  ];

  for (const test of tests) {
    const h2 = new HashDigest();
    for (const f of test) {
      h2.add(f);
    }

    window.console.log(h2.get());
  }
  for (let i = 0; i < 50; i++) {
    h.add(0);
    //window.console.log(h.i/((1<<30)-1), h.hash);
  }
};

digestcache = cachering.fromConstructor(HashDigest, 512);

//globalThis._HashDigest = HashDigest;

export function hashjoin(_hash: number, _val: number): void {
  const sum = 0;
  const mul = (1 << 19) - 1;
  const off = (1 << 27) - 1;
  const i = 0;

  let h = _hash;
  h = (h * mul + off + i * mul * 0.25) & mul;
}

const NullItem: object = {};

export class MapIter<K extends KeystrObject, V> implements Iterator<[K, V]> {
  ret: IteratorResult<[K, V]>;
  value: [K, V];
  i: number;
  map: map<K, V>;
  done: boolean;

  constructor(ownermap: map<K, V>) {
    this.ret = { done: true, value: undefined as unknown as [K, V] };
    this.value = [undefined as unknown as K, undefined as unknown as V];
    this.i = 0;
    this.map = ownermap;
    this.done = true;
  }

  finish(): void {
    if (!this.done) {
      this.done = true;
      this.map.itercur--;
    }
  }

  next(): IteratorResult<[K, V]> {
    const ret = this.ret;
    let i = this.i;
    const m = this.map;
    const list = m._list;
    //window.console.log(this)

    while (i < list.length && list[i] === NullItem) {
      i += 2;
    }

    //window.console.log("  --", i, list[i], list[i+1]);

    if (i >= list.length) {
      ret.done = true;
      ret.value = undefined as unknown as [K, V];

      this.finish();
      return ret;
    }

    this.i = i + 2;

    this.value[0] = list[i] as K;
    this.value[1] = list[i + 1] as V;
    ret.value = this.value;
    ret.done = false;

    return ret;
  }

  return(): IteratorResult<[K, V]> {
    this.finish();

    return this.ret;
  }

  reset(): this {
    this.i = 0;
    this.value[0] = undefined as unknown as K;
    this.value[1] = undefined as unknown as V;
    this.done = false;

    return this;
  }
}

export class map<K extends KeystrObject, V> {
  _items: Record<string, number>;
  _list: unknown[];
  size: number;
  iterstack: MapIter<K, V>[];
  itercur: number;
  freelist: number[];

  constructor() {
    this._items = {};
    this._list = [];

    this.size = 0;

    this.iterstack = new Array(8);
    this.itercur = 0;
    for (let i = 0; i < this.iterstack.length; i++) {
      this.iterstack[i] = new MapIter<K, V>(this);
    }

    this.freelist = [];
  }

  has(key: K): boolean {
    return key[Symbol.keystr]() in this._items;
  }

  set(key: K, v: V): void {
    const k = key[Symbol.keystr]();

    let i = this._items[k];

    if (i === undefined) {
      if (this.freelist.length > 0) {
        i = this.freelist.pop()!;
      } else {
        i = this._list.length;
        this._list.length += 2;
      }

      this.size++;
    }

    this._list[i] = key;
    this._list[i + 1] = v;

    this._items[k] = i;
  }

  keys(): Generator<K> {
    const this2 = this;
    return (function* () {
      for (const [key, _val] of this2) {
        yield key;
      }
    })();
  }

  values(): Generator<V> {
    const this2 = this;
    return (function* () {
      for (const [_key, val] of this2) {
        yield val;
      }
    })();
  }

  get(k: K): V | undefined {
    const ks = k[Symbol.keystr]();

    const i = this._items[ks];
    if (i !== undefined) {
      return this._list[i + 1] as V;
    }

    return undefined;
  }

  delete(k: K): boolean {
    const ks = k[Symbol.keystr]();

    if (!(ks in this._items)) {
      return false;
    }

    const i = this._items[ks];

    this.freelist.push(i);

    this._list[i] = NullItem;
    this._list[i + 1] = NullItem;

    delete this._items[ks];
    this.size--;

    return true;
  }

  [Symbol.iterator](): MapIter<K, V> {
    const ret = this.iterstack[this.itercur].reset();
    this.itercur++;

    if (this.itercur === this.iterstack.length) {
      this.iterstack.push(new MapIter<K, V>(this));
    }

    return ret;
  }
}

(globalThis as Record<string, unknown>)._test_map = function (): map<string & KeystrObject, number> {
  const m = new map<string & KeystrObject, number>();

  m.set("1" as string & KeystrObject, 2);
  m.set(11 as unknown as string & KeystrObject, 3);
  m.set("5" as string & KeystrObject, 4);
  m.set("3" as string & KeystrObject, 5);
  m.set("3" as string & KeystrObject, 6);
  m.delete("3" as string & KeystrObject);

  for (const [key, item] of m) {
    for (const [key2, item2] of m) {
      window.console.log(key, item, key2, item2);
    }
    break;
  }

  console.log("itercur", m.itercur);

  return m;
};

function validateId(id: number): boolean {
  let bad = typeof id !== "number";
  bad = bad || id !== ~~id;
  bad = bad || isNaN(id);

  if (bad) {
    throw new Error("bad number " + id);
  }

  return bad;
}

const UndefinedTag: object = {};

export class IDMap<T> extends Array<T | object | undefined> {
  _keys: Set<number>;
  size: number;

  constructor() {
    super();

    this._keys = new Set<number>();
    this.size = 0;
  }

  has(id: number): boolean {
    validateId(id);

    if (id < 0 || id >= this.length) {
      return false;
    }

    return this[id] !== undefined;
  }

  // @ts-ignore - intentionally shadows Array.prototype.set from polyfill
  set(id: number, val: T): boolean {
    validateId(id);

    if (id < 0) {
      console.warn("got -1 id in IDMap");
      return false;
    }

    if (id >= this.length) {
      this.length = id + 1;
    }

    const storedVal: T | object = val === undefined ? UndefinedTag : val;

    let ret = false;

    if (this[id] === undefined) {
      this.size++;
      this._keys.add(id);
      ret = true;
    }

    this[id] = storedVal;
    return ret;
  }

  /* we allow -1, which always returns undefined*/
  get(id: number): T | undefined {
    validateId(id);

    if (id === -1) {
      return undefined;
    } else if (id < 0) {
      console.warn("id was negative");
      return undefined;
    }

    let ret = id < this.length ? this[id] : undefined;
    ret = ret === UndefinedTag ? undefined : ret;

    return ret as T | undefined;
  }

  delete(id: number): boolean {
    if (!this.has(id)) {
      return false;
    }

    this._keys.delete(id);
    this[id] = undefined;
    this.size--;

    return true;
  }

  keys(): Generator<number> {
    const this2 = this;
    return (function* () {
      for (const id of this2._keys) {
        yield id;
      }
    })();
  }

  values(): Generator<T | undefined> {
    const this2 = this;
    return (function* () {
      for (const id of this2._keys) {
        yield this2[id] as T | undefined;
      }
    })();
  }

  [Symbol.iterator](): Generator<[number, T | undefined]> {
    const this2 = this;
    const iteritem: [number, T | undefined] = [0, undefined];

    return (function* () {
      for (const id of this2._keys) {
        iteritem[0] = id;
        const val = this2[id];

        if (val === UndefinedTag) {
          iteritem[1] = undefined;
        } else {
          iteritem[1] = val as T | undefined;
        }

        yield iteritem;
      }
    })();
  }
}

(globalThis as Record<string, unknown>)._test_idmap = function (): IDMap<string> {
  const idmap = new IDMap<string>();

  for (let i = 0; i < 5; i++) {
    const id = ~~(Math.random() * 55);

    idmap.set(id, "yay" + i);
  }

  for (const [key, val] of idmap) {
    window.console.log(key, val, idmap.has(key), idmap.get(key));
  }

  return idmap;
};

const HW = 0;
const HELEM = 1;
const HTOT = 2;

function heaplog(..._args: unknown[]): void {
  //window.console.log(..._args);
}

export class MinHeapQueue<T> {
  heap: (number | T | undefined)[];
  freelist: number[];
  length: number;
  end: number;

  constructor(iter?: Iterable<T>, iterw: Iterable<number> = iter as unknown as Iterable<number>) {
    this.heap = [];
    this.freelist = [];
    this.length = 0;
    this.end = 0;

    if (iter) {
      const witer = iterw[Symbol.iterator]();

      for (const item of iter) {
        const w = witer.next().value;
        this.push(item, w as number);
      }
    }
  }

  push(e: T, w: number): void {
    if (typeof w !== "number") {
      throw new Error("w must be a number");
    }

    if (isNaN(w)) {
      throw new Error("NaN");
    }

    this.length++;
    const depth = Math.ceil(Math.log(this.length) / Math.log(2.0));
    const tot = Math.pow(2, depth) + 1;

    heaplog(depth, tot);

    if (this.heap.length < tot * HTOT) {
      const start = this.heap.length / HTOT;

      for (let i = start; i < tot; i++) {
        this.freelist.push(i * HTOT);
      }
    }

    const heap = this.heap;
    heap.length = tot * HTOT;

    let n = this.freelist.pop()!;

    heaplog("freelist", this.freelist);
    this.end = Math.max(this.end, n);

    heap[n] = w;
    heap[n + 1] = e;

    while (n > 0) {
      n /= HTOT;

      let p = (n - 1) >> 1;
      n *= HTOT;
      p *= HTOT;

      if (heap[p] === undefined || (heap[p] as number) > w) {
        if (n === this.end) {
          this.end = p;
        }

        heap[n] = heap[p];
        heap[n + 1] = heap[p + 1];

        heap[p] = w;
        heap[p + 1] = e;

        n = p;
      } else {
        break;
      }
    }
  }

  pop(): T | undefined {
    if (this.length === 0) {
      return undefined;
      //throw new Error("heap is empty");
    }

    const heap = this.heap;

    if (this.end === 0) {
      const ret = heap[1] as T | undefined;
      this.freelist.push(0);
      heap[0] = undefined;

      this.length = 0;

      return ret;
    }

    const ret = heap[1] as T | undefined;

    const end = this.end;

    function swap(n1: number, n2: number): void {
      let t = heap[n1];
      heap[n1] = heap[n2];
      heap[n2] = t;

      t = heap[n1 + 1];
      heap[n1 + 1] = heap[n2 + 1];
      heap[n2 + 1] = t;
    }

    heaplog("end", end);
    heaplog((heap as unknown[]).concat([]));

    heap[0] = heap[end];
    heap[1] = heap[end + 1];
    heap[end] = undefined;
    heap[end + 1] = undefined;

    let n = 0;
    while (n < heap.length) {
      n /= HTOT;

      let n1 = n * 2 + 1;
      let n2 = n * 2 + 2;

      n1 = ~~(n1 * HTOT);
      n2 = ~~(n2 * HTOT);
      n = ~~(n * HTOT);

      heaplog("  ", heap[n], heap[n1], heap[n2]);

      if (heap[n1] !== undefined && heap[n2] !== undefined) {
        if ((heap[n1] as number) > (heap[n2] as number)) {
          const t = n1;
          n1 = n2;
          n2 = t;
        }

        if ((heap[n] as number) > (heap[n1] as number)) {
          swap(n, n1);
          n = n1;
        } else if ((heap[n] as number) > (heap[n2] as number)) {
          swap(n, n2);
          n = n2;
        } else {
          break;
        }
      } else if (heap[n1] !== undefined) {
        if ((heap[n] as number) > (heap[n1] as number)) {
          swap(n, n1);
          n = n1;
        } else {
          break;
        }
      } else if (heap[n2] !== undefined) {
        if ((heap[n] as number) > (heap[n2] as number)) {
          swap(n, n2);
          n = n2;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    this.freelist.push(this.end);

    heap[this.end] = undefined;
    heap[this.end + 1] = undefined;

    while (this.end > 0 && heap[this.end] === undefined) {
      this.end -= HTOT;
    }

    this.length--;

    return ret;
  }
}

(globalThis as Record<string, unknown>).testHeapQueue = function (list1: number[] = [1, 8, -3, 11, 33]): number[] {
  const h = new MinHeapQueue<number>(list1);

  window.console.log((h.heap as unknown[]).concat([]));

  const results: number[] = [];
  const len = h.length;

  for (let i = 0; i < len; i++) {
    results.push(h.pop()!);
  }

  window.console.log((h.heap as unknown[]).concat([]));

  return results;
};

export class Queue<T> {
  initialSize: number;
  queue: (T | undefined)[];
  a: number;
  b: number;
  length: number;

  constructor(n: number = 32) {
    n = Math.max(n, 8);

    this.initialSize = n;

    this.queue = new Array(n);
    this.a = 0;
    this.b = 0;
    this.length = 0;
  }

  enqueue(item: T): void {
    const qlen = this.queue.length;

    const b = this.b;

    this.queue[b] = item;
    this.b = (this.b + 1) % qlen;

    if (this.length >= qlen || this.a === this.b) {
      const newsize = qlen << 1;
      const queue: (T | undefined)[] = new Array(newsize);

      for (let i = 0; i < qlen; i++) {
        const i2 = (i + this.a) % qlen;

        queue[i] = this.queue[i2];
      }

      this.a = 0;
      this.b = qlen;
      this.queue = queue;
    }

    this.length++;
  }

  clear(clearData: boolean = true): this {
    this.queue.length = this.initialSize;

    if (clearData) {
      for (let i = 0; i < this.queue.length; i++) {
        this.queue[i] = undefined;
      }
    }

    this.a = this.b = 0;
    this.length = 0;

    return this;
  }

  dequeue(): T | undefined {
    if (this.length === 0) {
      return undefined;
    }
    this.length--;

    const ret = this.queue[this.a];

    this.queue[this.a] = undefined;

    this.a = (this.a + 1) % this.queue.length;
    return ret;
  }
}

(globalThis as Record<string, unknown>)._testQueue = function (steps: number = 15, samples: number = 15): void {
  const queue = new Queue<{ f: number }>(3);

  for (let i = 0; i < steps; i++) {
    const list: { f: number }[] = [];

    for (let j = 0; j < samples; j++) {
      const item = { f: Math.random() };
      list.push(item);

      queue.enqueue(item);
    }

    let j = 0;

    while (queue.length > 0) {
      const item = queue.dequeue();

      if (item !== list[j]) {
        console.log(item, list);
        throw new Error("got wrong item");
      }

      j++;

      if (j > 10000) {
        console.error("Infinite loop error");
        break;
      }
    }
  }
};

export class ArrayPool {
  pools: Map<number, cachering<unknown[]>>;
  map: (cachering<unknown[]> | undefined)[];

  constructor() {
    this.pools = new Map();
    this.map = new Array(1024);
  }

  get(n: number, clear: boolean = false): unknown[] {
    let pool: cachering<unknown[]> | undefined;

    if (n < 1024) {
      pool = this.map[n];
    } else {
      pool = this.pools.get(n);
    }

    if (!pool) {
      let tot: number;

      if (n > 512) {
        tot = 32;
      } else if (n > 256) {
        tot = 64;
      } else if (n > 128) {
        tot = 256;
      } else if (n > 64) {
        tot = 512;
      } else {
        tot = 1024;
      }

      pool = new cachering(() => new Array(n) as unknown[], tot);
      if (n < 1024) {
        this.map[n] = pool;
      }
      this.pools.set(n, pool);

      return this.get(n, clear);
    }

    const ret = pool.next();
    if (ret.length !== n) {
      console.warn("Array length was set", n, ret);
      ret.length = n;
    }

    if (clear) {
      for (let i = 0; i < n; i++) {
        ret[i] = undefined;
      }
    }

    return ret;
  }
}

/** jsFiddle-friendly */
export class DivLogger {
  elemId: string;
  elem: HTMLElement | undefined;
  lines: string[];
  maxLines: number;

  constructor(elemId: string, maxLines: number = 16) {
    this.elemId = elemId;
    this.elem = undefined;
    this.lines = [];
    this.maxLines = maxLines;
  }

  push(line: string): void {
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
      this.lines.push(line);
    } else {
      this.lines.push(line);
    }

    this.update();
  }

  update(): void {
    let buf = this.lines.join(`<br>`);
    buf = buf.replace(/[ \t]/g, "&nbsp;");

    if (!this.elem) {
      this.elem = document.getElementById(this.elemId) ?? undefined;
    }

    if (this.elem) {
      this.elem.innerHTML = buf;
    }
  }

  toString(obj: unknown, depth: number = 0): string {
    let s = "";

    let tab = "";
    for (let i = 0; i < depth; i++) {
      tab += "$TAB";
    }

    if (typeof obj === "symbol") {
      return `[${obj.description}]`;
    }

    const DEPTH_LIMIT = 1;
    const CHAR_LIMIT = 100;

    if (typeof obj === "object" && Array.isArray(obj)) {
      const arr = obj as unknown[];
      s = "[$NL";
      for (let i = 0; i < arr.length; i++) {
        let v: string;

        if (depth >= DEPTH_LIMIT) {
          v = typeof arr[i];
        } else {
          v = this.toString(arr[i], depth + 1);
        }

        s += tab + "$TAB";
        s += v + (i !== arr.length - 1 ? "," : "") + "$NL";
      }

      const keys = Reflect.ownKeys(arr);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        let n: number;

        const k2 = this.toString(k);

        if (typeof k !== "symbol" && !isNaN((n = parseInt(k as string)))) {
          if (n >= 0 && n < arr.length) {
            continue;
          }
        }

        let v: unknown;
        try {
          v = (arr as unknown as Record<string | symbol, unknown>)[k];
        } catch (error) {
          v = "(error)";
        }

        s += tab + `$TAB${k2} : ${v}`;

        if (i < keys.length - 1) {
          s += ",";
        }

        if (!s.endsWith("$NL") && !s.endsWith("\n")) {
          s += "$NL";
        }
      }
      s += "$TAB]$NL";

      if (s.length < CHAR_LIMIT) {
        s = s.replace(/\$NL/g, "");
        s = s.replace(/(\$TAB)+/g, " ");
      } else {
        s = s.replace(/\$NL/g, "\n");
        s = s.replace(/\$TAB/g, "  ");
      }
    } else if (typeof obj === "object") {
      s = "{$NL";

      const keys = Reflect.ownKeys(obj as object);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const k2 = this.toString(k);

        let v: unknown;
        try {
          v = (obj as Record<string | symbol, unknown>)[k];
        } catch (error) {
          v = "(error)";
        }

        if (depth >= DEPTH_LIMIT) {
          v = typeof v;
        } else {
          v = this.toString(v, depth + 1);
        }

        s += tab + `$TAB${k2} : ${v}`;

        if (i < keys.length - 1) {
          s += ",";
        }

        if (!s.endsWith("$NL") && !s.endsWith("\n")) {
          s += "$NL";
        }
      }
      s += tab + "}$NL";

      if (s.length < CHAR_LIMIT) {
        s = s.replace(/\$NL/g, "");
        s = s.replace(/(\$TAB)+/g, " ");
      } else {
        s = s.replace(/\$NL/g, "\n");
        s = s.replace(/\$TAB/g, "  ");
      }
    } else if (typeof obj === "undefined") {
      s = "undefined";
    } else if (typeof obj === "function") {
      s = "function " + obj.name;
    } else {
      s = "" + obj;
    }

    return s;
  }
}

export const PendingTimeoutPromises = new Set<TimeoutPromise>();

type AcceptFn<T> = (value: T) => void;
type RejectFn = (reason?: unknown) => void;

export class TimeoutPromise<T = unknown> {
  silent: boolean;
  timeout: number;
  time: number;
  rejected: boolean;
  _promise!: Promise<T>;
  _accept!: AcceptFn<T>;
  _reject!: RejectFn;

  constructor(
    callback?: (accept: AcceptFn<T>, reject: RejectFn) => void,
    timeout: number = 3000,
    silent: boolean = false
  ) {
    this.silent = silent;
    this.timeout = timeout;
    this.time = time_ms();
    this.rejected = false;

    if (!callback) {
      return;
    }

    const accept2 = this._accept2.bind(this);
    const reject2 = this._reject2.bind(this);

    this._promise = new Promise<T>((accept, reject) => {
      this._accept = accept;
      this._reject = reject;

      callback(accept2, reject2);
    });

    PendingTimeoutPromises.add(this as TimeoutPromise);
  }

  _accept2(val: T): void {
    if (this.bad) {
      if (!this.silent) {
        this._reject(new Error("Timeout"));
      }
    } else {
      this._accept(val);
    }
  }

  static wrapPromise<U>(promise: Promise<U>, timeout: number = 3000, callback: AcceptFn<U>): TimeoutPromise<U> {
    const p = new TimeoutPromise<U>();

    p._promise = promise;

    p._accept = callback;
    p._reject = function (error: unknown) {
      throw error;
    };

    p.then((val: U) => {
      p._accept2(val);
    }).catch((error: unknown) => {
      p._reject2(error);
    });

    return p;
  }

  _reject2(error: unknown): void {
    this._reject(error);
  }

  then(callback: (val: T) => unknown): this {
    const cb = (val: T): unknown => {
      let ret = callback(val);

      if (ret instanceof Promise) {
        ret = TimeoutPromise.wrapPromise(ret, this.timeout, callback as AcceptFn<unknown>);
      }

      return ret;
    };

    this._promise.then(cb);
    return this;
  }

  catch(callback: (error: unknown) => void): this {
    this._promise.catch(callback);
    return this;
  }

  finally(callback: () => void): this {
    this._promise.catch(callback);
    return this;
  }

  get bad(): boolean {
    return time_ms() - this.time > this.timeout;
  }
}

window.setInterval(() => {
  const bad: TimeoutPromise[] = [];

  for (const promise of PendingTimeoutPromises) {
    if (promise.bad) {
      bad.push(promise);
    }
  }

  for (const promise of bad) {
    PendingTimeoutPromises.delete(promise);
  }

  for (const promise of bad) {
    try {
      promise._reject(new Error("Timeout"));
    } catch (error) {
      print_stack(error as Error);
    }
  }
}, 250);

import lzstring from "../extern/lz-string/lz-string.js";

export function compress(data: string): Uint8Array {
  return lzstring.compressToUint8Array(data);
}

export function decompress(data: DataView | ArrayBuffer | Uint8Array): string {
  if (data instanceof DataView) {
    data = new Uint8Array(data.buffer as ArrayBuffer);
  }

  if (data instanceof ArrayBuffer) {
    data = new Uint8Array(data);
  }

  return lzstring.decompressFromUint8Array(data as Uint8Array) ?? "";
}

/* Returns 'undefined' as type type.  Breaks the typescript
   type system, is meant only for object pool systems.
 */
export function undefinedForGC<T>(): T {
  return undefined as unknown as T;
}
