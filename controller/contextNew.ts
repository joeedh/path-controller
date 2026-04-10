export type PropertyLoader = (ctx: any, key: string | number | symbol, data: any) => any;
export type PropertySaver = (ctx: any, key: string | number | symbol, existing: any) => any;
type CtxAny = any;

class ContextLocker<OVERLAYS extends {}> {
  private ctx: CtxAny;

  constructor(ctx: CtxAny) {
    this.ctx = ctx;
  }

  /**
   * Serializes the current context into a 'locked' read-only form.
   * Needed for consistent undo/redo.
   **/
  lock(ctx: any, saveProperty?: PropertySaver, loadProperty?: PropertyLoader) {
    if (ctx === undefined) {
      throw new Error("ctx was undefined! in ContextLocker.lock()!");
    }
    let keys = [] as (string | symbol)[];
    let props = {} as any;

    console.log(ctx);
    function getAllKeys(obj: any) {
      const keys = new Set<string>();
      while (obj && obj !== Object) {
        for (const k in Object.getOwnPropertyDescriptors(obj)) {
          if (typeof k === "string") {
            keys.add(k);
          }
        }
        for (let k in obj) {
          if (typeof k === "string") {
            keys.add(k);
          }
        }
        obj = Object.getPrototypeOf(obj);
      }
      return keys;
    }
    let keys2 = new Set(getAllKeys(ctx));

    // use forEach to capture key at each iteration
    keys2.forEach((key) => {
      if (typeof key === "string" && (key.endsWith("_save") || key.endsWith("_load"))) {
        return;
      }
      if (typeof key === "symbol") {
        props[key] = (ctx as any)[key];
        return;
      }

      const hasSave = `${key}_save` in ctx;
      const hasLoad = `${key}_load` in ctx;
      const savedKey = (s: string) => "$$" + s;

      function loadProp(key: string, hasLoad: boolean) {
        if (hasLoad) {
          return (ctx as any)[key + "_load"](ctx, props[savedKey(key)]);
        } else if (typeof loadProperty === "function") {
          return loadProperty(ctx, key, props[savedKey(key)]);
        } else {
          return props[savedKey(key)];
        }
      }

      function saveProp(key: string, hasSave: boolean) {
        if (hasSave) {
          return (ctx as any)[key + "_save"](ctx);
        } else if (typeof saveProperty === "function") {
          // forcibly set this to undefined here
          return saveProperty.call(undefined, ctx, key, (ctx as any)[key]);
        } else {
          return (ctx as any)[key];
        }
      }

      if (hasSave || hasLoad) {
        // create a hidden property with the saved prop
        Object.defineProperty(props, savedKey(key), {
          value       : saveProp(key, hasSave),
          enumerable  : false,
          configurable: true,
        });
        // create a property with the getter
        Object.defineProperty(props, key, {
          configurable: true,
          enumerable  : true,
          get(): any {
            return loadProp(key, hasLoad);
          },
          set(value: any) {
            throw new Error(`cannot set property ${key} in locked context`);
          },
        });
      } else {
        props[key] = (ctx as any)[key];
      }
    });

    return props as CtxAny;
  }
}

export function toLockedImpl(this: any) {
  return new ContextLocker(this).lock(this, this.saveProperty, this.loadProperty);
}

export interface ILockableCtx {
  /** use toLockedImpl, e.g. toLocked = toLockedImpl */
  toLocked: () => CtxAny;
  /** default property serializer */
  saveProperty?: PropertySaver;
  /** default property deserializer */
  loadProperty?: PropertyLoader;
}
