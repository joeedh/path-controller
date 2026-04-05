/**
 see doc_src/context.md
 */

import * as util from "../util/util.js";

import cconst from "../config/config.js";
import type { DataAPI } from "./controller";
import { ToolStack } from "../controller.js";

declare global {
  interface SymbolConstructor {
    CachedDef: symbol;
    ContextID: symbol
  }
}

interface Notifier {
  error(screen: unknown, message: string, timeout: number): unknown;
  warning(screen: unknown, message: string, timeout: number): unknown;
  message(screen: unknown, msg: string, timeout: number): unknown;
  progbarNote(screen: unknown, msg: string, perc: number, color: string, timeout: number, id: string): unknown;
}

let notifier: Notifier | undefined = undefined;

export function setNotifier(cls: Notifier): void {
  notifier = cls;
}

export const ContextFlags = {
  IS_VIEW: 1,
};

class InheritFlag {
  data: number;

  constructor(data: number) {
    this.data = data;
  }
}

let __idgen = 1;

if ((Symbol as unknown as Record<string | symbol, unknown>).ContextID === undefined) {
  (Symbol as unknown as Record<string | symbol, unknown>).ContextID = Symbol("ContextID");
}

if ((Symbol as unknown as Record<string | symbol, unknown>).CachedDef === undefined) {
  (Symbol as unknown as Record<string | symbol, unknown>).CachedDef = Symbol("CachedDef");
}

const _ret_tmp: [unknown] = [undefined];

export const OverlayClasses: Function[] = [];

interface ContextDefinition {
  name?: string;
  flag?: number | InheritFlag;
}

type OverlayParent = { new (appstate: unknown): Record<string, unknown> };

export function makeDerivedOverlay(parent: OverlayParent) {
  return class ContextOverlay extends (parent as { new (...args: unknown[]): Record<string, unknown> }) {
    ctx: Context | undefined;
    _state: unknown;
    __allKeys: Set<string | symbol> | undefined;

    constructor(appstate: unknown) {
      super(appstate);

      this.ctx = undefined; //owning context
      this._state = appstate;
    }

    get state(): unknown {
      return this._state;
    }

    set state(state: unknown) {
      this._state = state;
    }

    onRemove(_have_new_file: boolean = false): void {}

    copy(): ContextOverlay {
      return new (this.constructor as typeof ContextOverlay)(this._state);
    }

    validate(): boolean {
      throw new Error("Implement me!");
    }

    //base classes override this
    static contextDefine(): ContextDefinition {
      throw new Error("implement me!");
      return {
        name: "",
        flag: 0,
      };
    }

    //don't override this
    static resolveDef(): { name?: string; flag: number } {
      if (this.hasOwnProperty(Symbol.CachedDef)) {
        return (this as unknown as Record<symbol, { name?: string; flag: number }>)[Symbol.CachedDef];
      }

      let def2: Record<string, unknown> = {};
      (Symbol as unknown as Record<string | symbol, unknown>).CachedDef = {};

      let def = this.contextDefine() as Record<string, unknown>;

      if (def === undefined) {
        def = {};
      }

      for (let k in def) {
        def2[k] = def[k];
      }

      if (!("flag" in def)) {
        def2.flag = Context.inherit(0);
      }

      let parents: Function[] = [];
      let p = util.getClassParent(this);

      while (p && p !== ContextOverlay) {
        parents.push(p);
        p = util.getClassParent(p);
      }

      if (def2.flag instanceof InheritFlag) {
        let flag = def2.flag.data;
        for (let parent of parents) {
          let pdef = (parent as unknown as typeof ContextOverlay).contextDefine() as Record<string, unknown>;

          if (!pdef.flag) {
            continue;
          } else if (pdef.flag instanceof InheritFlag) {
            flag |= pdef.flag.data;
          } else {
            flag |= pdef.flag as number;
            //don't go past non-inheritable parents
            break;
          }
        }

        def2.flag = flag;
      }

      return def2 as { name?: string; flag: number };
    }
  };
}

export const ContextOverlay = makeDerivedOverlay(Object as unknown as OverlayParent);

export const excludedKeys = new Set([
  "onRemove",
  "reset",
  "toString",
  "_fix",
  "valueOf",
  "copy",
  "next",
  "save",
  "load",
  "clear",
  "hasOwnProperty",
  "toLocaleString",
  "constructor",
  "propertyIsEnumerable",
  "isPrototypeOf",
  "state",
  "saveProperty",
  "loadProperty",
  "getOwningOverlay",
  "_props",
]);

type OverlayInstance = InstanceType<ReturnType<typeof makeDerivedOverlay>>;

export class LockedContext {
  props: Record<string, { data: unknown; get: (ctx: unknown, data: unknown) => unknown }>;
  state: unknown;
  api: unknown;
  toolstack: unknown;
  noWarnings: boolean;
  ctx: Context;
  [key: string]: unknown;

  constructor(ctx: Context, noWarnings?: boolean) {
    this.props = {};

    this.state = (ctx as Record<string, unknown>).state;
    this.api = (ctx as Record<string, unknown>).api;
    this.toolstack = (ctx as Record<string, unknown>).toolstack;

    this.noWarnings = !!noWarnings;
    this.ctx = ctx;

    this.load(ctx);
  }

  toLocked(): this {
    //just return itself
    return this;
  }

  error(...args: unknown[]): unknown {
    return (this.ctx as unknown as Record<string, (...args: unknown[]) => unknown>).error(...args);
  }
  warning(...args: unknown[]): unknown {
    return (this.ctx as unknown as Record<string, (...args: unknown[]) => unknown>).warning(...args);
  }
  message(...args: unknown[]): unknown {
    return (this.ctx as unknown as Record<string, (...args: unknown[]) => unknown>).message(...args);
  }
  progbar(...args: unknown[]): unknown {
    return (this.ctx as unknown as Record<string, (...args: unknown[]) => unknown>).progbar(...args);
  }
  progressBar(...args: unknown[]): unknown {
    let ctxRec = this.ctx as unknown as Record<string, Function | undefined>;
    return ctxRec.progbar !== undefined ? ctxRec.progbar!(...args) : ctxRec.progressBar!(...args);
  }
  load(ctx: Context): void {
    let keys = (ctx as unknown as { _props: Set<string> })._props;

    function wrapget(name: string) {
      return function (ctx2: unknown, data: unknown): unknown {
        return ctx.loadProperty(ctx2, name, data);
      };
    }

    for (let k of keys) {
      let v: unknown;
      if (k === "state" || k === "toolstack" || k === "api") {
        continue;
      }

      if (typeof k === "string" && (k.endsWith("_save") || k.endsWith("_load"))) {
        continue;
      }

      try {
        v = (ctx as Record<string, unknown>)[k];
      } catch (_error) {
        if ((cconst.DEBUG as Record<string, boolean>).contextSystem) {
          console.warn("failed to look up property in context: ", k);
        }
        continue;
      }

      let data: unknown, getter: ((ctx2: unknown, data: unknown) => unknown) | undefined;
      let overlay = ctx.getOwningOverlay(k);

      if (overlay === undefined) {
        //property must no longer be used?
        continue;
      }

      try {
        let oRec = overlay as Record<string, unknown>;
        if (typeof k === "string" && oRec[k + "_save"] && oRec[k + "_load"]) {
          data = (oRec[k + "_save"] as Function)();
          getter = oRec[k + "_load"] as (ctx2: unknown, data: unknown) => unknown;
        } else {
          data = ctx.saveProperty(k);
          getter = wrapget(k);
        }
      } catch (_error) {
        console.warn("Failed to save context property", k);
        continue;
      }

      this.props[k] = {
        data: data,
        get : getter!,
      };
    }

    let defineProp = (name: string): void => {
      Object.defineProperty(this, name, {
        get: function (this: LockedContext) {
          let def = this.props[name];
          return def.get(this.ctx, def.data);
        },
      });
    };

    for (let k in this.props) {
      defineProp(k);
    }

    this.ctx = ctx;
  }

  setContext(ctx: Context): void {
    this.ctx = ctx;

    this.state = (ctx as Record<string, unknown>).state;
    this.api = (ctx as Record<string, unknown>).api;
    this.toolstack = (ctx as Record<string, unknown>).toolstack;
  }
}

let next_key = {};
let idgen = 1;

export class Context {
  state: unknown;
  _props: Set<string>;
  _stack: OverlayInstance[];
  _inside_map: Record<number, number>;
  [key: string]: unknown;

  constructor(appstate: unknown) {
    this.state = appstate;

    this._props = new Set();
    this._stack = [];
    this._inside_map = {};
  }

  static isContextSubclass(cls: Function | null): boolean {
    while (cls) {
      if (cls === Context) {
        return true;
      }

      cls = (cls as unknown as Record<string, Function>).__proto__;
    }

    return false;
  }

  /** chrome's debug console corrupts this._inside_map,
   this method fixes it*/
  _fix(): void {
    this._inside_map = {};
  }

  fix(): void {
    this._fix();
  }

  error(message: string, timeout: number = 1500): unknown {
    let state = this.state as Record<string, unknown> | undefined;

    console.warn(message);

    if (state && state.screen) {
      return notifier!.error(state.screen, message, timeout);
    }
  }

  warning(message: string, timeout: number = 1500): unknown {
    let state = this.state as Record<string, unknown> | undefined;

    console.warn(message);

    if (state && state.screen) {
      return notifier!.warning(state.screen, message, timeout);
    }
  }

  message(msg: string, timeout: number = 1500): unknown {
    let state = this.state as Record<string, unknown> | undefined;

    console.warn(msg);

    if (state && state.screen) {
      return notifier!.message(state.screen, msg, timeout);
    }
  }

  progbar(msg: string, perc: number = 0.0, timeout: number = 1500, id: string = msg): unknown {
    let state = this.state as Record<string, unknown> | undefined;

    if (state && state.screen) {
      return notifier!.progbarNote(state.screen, msg, perc, "green", timeout, id);
    }
  }

  validateOverlays(): void {
    let stack = this._stack;
    let stack2: OverlayInstance[] = [];

    for (let i = 0; i < stack.length; i++) {
      if (stack[i].validate()) {
        stack2.push(stack[i]);
      }
    }

    this._stack = stack2;
  }

  hasOverlay(cls: Function): boolean {
    return this.getOverlay(cls) !== undefined;
  }

  getOverlay(cls: Function): OverlayInstance | undefined {
    for (let overlay of this._stack) {
      if (overlay.constructor === cls) {
        return overlay;
      }
    }
  }

  clear(have_new_file: boolean = false): void {
    for (let overlay of this._stack) {
      overlay.onRemove(have_new_file);
    }

    this._stack = [];
  }

  reset(have_new_file: boolean = false): void {
    this.clear(have_new_file);
  }

  override(overrides: Record<string, unknown> & { copy?: () => Record<string, unknown> }): Context {
    if (overrides.copy === undefined) {
      overrides.copy = function () {
        return Object.assign({}, this);
      };
    }

    let ctx = this.copy();
    ctx.pushOverlay(overrides as unknown as OverlayInstance);
    return ctx;
  }

  copy(): Context {
    let ret = new (this.constructor as typeof Context)(this.state);

    for (let item of this._stack) {
      ret.pushOverlay(item.copy());
    }

    return ret;
  }

  static super(): Record<string, never> {
    return next_key as Record<string, never>;
  }

  saveProperty(key: string): unknown {
    return (this as Record<string, unknown>)[key];
  }

  loadProperty(_ctx: unknown, _key: string, data: unknown): unknown {
    return data;
  }

  getOwningOverlay(name: string, _val_out?: [unknown]): OverlayInstance | undefined {
    let inside_map = this._inside_map;
    let stack = this._stack;

    if ((cconst.DEBUG as Record<string, boolean>).contextSystem) {
      console.log(name, inside_map);
    }

    for (let i = stack.length - 1; i >= 0; i--) {
      let overlay = stack[i];
      let ret: unknown = next_key;

      if ((overlay as unknown as Record<string | symbol, unknown>)[Symbol.ContextID] === undefined) {
        throw new Error("context corruption");
      }

      let ikey = (overlay as unknown as Record<string | symbol, unknown>)[Symbol.ContextID] as number;

      if ((cconst.DEBUG as Record<string, boolean>).contextSystem) {
        console.log(ikey, overlay);
      }

      if (inside_map[ikey]) {
        continue;
      }

      if (overlay.__allKeys && overlay.__allKeys.has(name)) {
        if ((cconst.DEBUG as Record<string, boolean>).contextSystem) {
          console.log("getting value");
        }

        inside_map[ikey] = 1;

        try {
          ret = (overlay as Record<string, unknown>)[name];
        } catch (error) {
          inside_map[ikey] = 0;
          throw error;
        }

        inside_map[ikey] = 0;
      }

      if (ret !== next_key) {
        if (_val_out !== undefined) {
          _val_out[0] = ret;
        }
        return overlay;
      }
    }

    if (_val_out !== undefined) {
      _val_out[0] = undefined;
    }

    return undefined;
  }

  ensureProperty(name: string): void {
    if (this.hasOwnProperty(name)) {
      return;
    }

    this._props.add(name);

    Object.defineProperty(this, name, {
      get: function (this: Context) {
        let ret = _ret_tmp;
        _ret_tmp[0] = undefined;

        this.getOwningOverlay(name, ret);
        return ret[0];
      },
      set: function () {
        throw new Error("Cannot set ctx properties");
      },
    });
  }

  toLocked(): LockedContext {
    return new LockedContext(this);
  }

  pushOverlay(overlay: OverlayInstance): void {
    if (!(overlay as unknown as Record<string | symbol, unknown>).hasOwnProperty(Symbol.ContextID)) {
      (overlay as unknown as Record<string | symbol, unknown>)[Symbol.ContextID] = idgen++;
    }

    let keys = new Set<string | symbol>();
    for (let key of util.getAllKeys(overlay)) {
      if (!excludedKeys.has(key as string) && !(typeof key === "string" && key[0] === "_")) {
        keys.add(key);
      }
    }

    overlay.ctx = this;

    if (overlay.__allKeys === undefined) {
      overlay.__allKeys = keys;
    }

    for (let k of keys) {
      let bad = typeof k === "symbol" || excludedKeys.has(k as string);
      bad = bad || (typeof k === "string" && k[0] === "_");
      bad = bad || (typeof k === "string" && k.endsWith("_save"));
      bad = bad || (typeof k === "string" && k.endsWith("_load"));

      if (bad) {
        continue;
      }

      this.ensureProperty(k as string);
    }

    if (this._stack.indexOf(overlay) >= 0) {
      console.warn("Overlay already added once");
      if (this._stack[this._stack.length - 1] === overlay) {
        console.warn("  Definitely an error, overlay is already at top of stack");
        return;
      }
    }

    this._stack.push(overlay);
  }

  popOverlay(overlay: OverlayInstance): void {
    if (overlay !== this._stack[this._stack.length - 1]) {
      console.warn("Context.popOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.pop();
  }

  removeOverlay(overlay: OverlayInstance): void {
    if (this._stack.indexOf(overlay) < 0) {
      console.warn("Context.removeOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.remove(overlay);
  }

  static inherit(data: number): InheritFlag {
    return new InheritFlag(data);
  }

  static register(cls: Function): void {
    if ((cls as unknown as Record<string | symbol, unknown>)[Symbol.ContextID]) {
      console.warn("Tried to register same class twice:", cls);
      return;
    }

    (cls as unknown as Record<string | symbol, unknown>)[Symbol.ContextID] = __idgen++;
    OverlayClasses.push(cls);
  }
}

export function test(): boolean {
  function testInheritance(): boolean {
    class Test0 extends ContextOverlay {
      static contextDefine() {
        return {
          flag: 1,
        };
      }
    }

    class Test1 extends Test0 {
      static contextDefine() {
        return {
          flag: 2,
        };
      }
    }

    // @ts-expect-error static side override returns InheritFlag for flag field
    class Test2 extends Test1 {
      static contextDefine(): ContextDefinition {
        return {
          flag: Context.inherit(4),
        };
      }
    }

    class Test3 extends Test2 {
      static contextDefine(): ContextDefinition {
        return {
          flag: Context.inherit(8),
        };
      }
    }

    class Test4 extends Test3 {
      static contextDefine(): ContextDefinition {
        return {
          flag: Context.inherit(16),
        };
      }
    }

    return (Test4 as unknown as typeof ContextOverlay).resolveDef().flag === 30;
  }

  return testInheritance();
}

if (!test()) {
  throw new Error("Context test failed");
}
