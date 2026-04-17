// @ts-nocheck @deprecated
// So a proxy-based context layering approach runs into bugs with TS's type checker
// (got 'circular type dependency' errors that didn't happen with straight inheritance)

import { ContextLike } from "./controller_abstract";

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;

interface ILockedContext {
  toLocked(): this;
}

export type _ProxyContext<OVERLAYS extends {}> = UnionToIntersection<OVERLAYS> & ILockedContext;
export type PropertyLoader = (ctx: any, key: string | number | symbol, data: any) => any;
export type PropertySaver = (ctx: any, key: string | number | symbol, existing: any) => any;

class ContextLocker<OVERLAYS extends {}> {
  private overlays: OVERLAYS[];

  constructor(overlays: OVERLAYS[]) {
    this.overlays = overlays;
  }

  /**
   * Serializes the current context into a 'locked' read-only form.
   * Needed for consistent undo/redo.
   **/
  lock(ctx: any, saveProperty?: PropertySaver, loadProperty?: PropertyLoader) {
    let keys = [] as (string | symbol)[];
    let props = {} as any;

    for (const overlay of this.overlays) {
      const keys2 = new Set(
        Reflect.ownKeys(overlay).concat(Reflect.ownKeys((overlay as any).prototype))
      );
      // use forEach to capture key at each iteration
      keys2.forEach((key) => {
        if (typeof key === "string" && (key.endsWith("_save") || key.endsWith("_load"))) {
          return;
        }
        if (typeof key === "symbol") {
          props[key] = (overlay as any)[key];
          return;
        }

        const hasSave = `${key}_save` in overlay;
        const hasLoad = `${key}_load` in overlay;
        const savedKey = (s: string) => "$$" + s;

        function loadProp(key: string, hasLoad: boolean) {
          if (hasLoad) {
            return (overlay as any)[key + "_load"](ctx, props[savedKey(key)]);
          } else if (typeof loadProperty === "function") {
            return loadProperty(ctx, key, props[savedKey(key)]);
          } else {
            return props[savedKey(key)];
          }
        }

        function saveProp(key: string, hasSave: boolean) {
          if (hasSave) {
            return (overlay as any)[key + "_save"](ctx);
          } else if (typeof saveProperty === "function") {
            // forcibly set this to undefined here
            return saveProperty.call(undefined, ctx, key, (overlay as any)[key]);
          } else {
            return (overlay as any)[key];
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
          props[key] = (overlay as any)[key];
        }
      });
    }
  }
}

/**
 * Create a context that can be locked into a read-only form
 * Needed for stable undo/redo.
 *
 * @param overlays - list of overlay classes
 * @param saveProperty - default callback for saving a property
 *                       note: you can override this per-property
 *                       by adding a `_save` method to the overlay class
 * @param loadProperty - default callback for loading a property
 *                       note: you can override this per-property
 *                       by adding a `_load` method to the overlay class
 */
export function createOverlays<OVERLAYS extends {}>(
  overlays: OVERLAYS[],
  saveProperty?: PropertySaver,
  loadProperty?: PropertyLoader
): _ProxyContext<OVERLAYS> {
  return new Proxy(
    {},
    {
      get(target, prop, receiver) {
        if (prop === "toLocked") {
          const locker = new ContextLocker<OVERLAYS>(overlays);
          return function () {
            locker.lock(receiver, saveProperty, loadProperty);
          };
        }
        for (const overlay of overlays) {
          if (prop in overlay || prop in (overlay as any).prototype) {
            return (overlay as any)[prop];
          }
        }
      },
      set(target, prop, value) {
        for (const overlay of overlays) {
          if (prop in overlay || prop in (overlay as any).prototype) {
            (overlay as any)[prop] = value;
            return true;
          }
        }
        return false;
      },
    }
  ) as unknown as _ProxyContext<OVERLAYS>;
}
