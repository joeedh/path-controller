import { ContextLike } from "./controller_abstract";

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

interface ILockedContext {
  toLocked(): this;
}

export type _Context<OVERLAYS extends {}> = UnionToIntersection<OVERLAYS> & ILockedContext;

class ContextLocker<OVERLAYS extends {}> {
  private overlays: OVERLAYS[];

  constructor(overlays: OVERLAYS[]) {
    this.overlays = overlays;
  }

  /**
   * Serializes the current context into a 'locked' read-only form.
   * Needed for consistent undo/redo.
   **/
  lock(ctx: any) {
    let keys = [] as (string | symbol)[];
    let props = {} as any;

    for (const overlay of this.overlays) {
      const keys2 = new Set(Reflect.ownKeys(overlay).concat(Reflect.ownKeys((overlay as any).prototype)));
      for (const key of keys2) {
        if (typeof key === "string" && (key.endsWith("_save") || key.endsWith("_load"))) {
          continue;
        }
        if (typeof key === "symbol") {
          props[key] = (overlay as any)[key];
          continue;
        }

        const hasSave = `${key}_save` in overlay;
        const hasLoad = `${key}_load` in overlay;
        const savedKey = (s: string) => "$$" + s;

        if (hasSave || hasLoad) {
          // create a hidden property with the saved prop
          Object.defineProperty(props, savedKey(key), {
            value       : hasSave ? (overlay as any)[key + "_save"](ctx) : (overlay as any)[key],
            enumerable  : false,
            configurable: true,
          });
          // create a property with the getter
          Object.defineProperty(props, key, {
            configurable: true,
            enumerable  : true,
            get(): any {
              return hasLoad ? (overlay as any)[key + "_load"](ctx, props[savedKey(key)]) : props[savedKey(key)];
            },
            set(value: any) {
              throw new Error(`cannot set property ${key} in locked context`);
            },
          });
        } else {
          props[key] = (overlay as any)[key];
        }
      }
    }
  }
}

export function createOverlays<OVERLAYS extends {}>(overlays: OVERLAYS[]): _Context<OVERLAYS> {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === "toLocked") {
          const locker = new ContextLocker<OVERLAYS>(overlays);
          return locker.lock.bind(locker);
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
  ) as unknown as _Context<OVERLAYS>;
}

class A {
  bleh = 0;
  bleh2 = 1;
  bleh3 = 2;
}

class B {
  t1 = 0;
  t2 = 2;
  t3 = false;
}

const ctx = createOverlays<A | B>([new A(), new B()]);
