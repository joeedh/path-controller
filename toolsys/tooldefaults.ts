import { PropFlags, ToolProperty } from "./toolprop";
import type { MacroClassType } from "./toolmacro";
import type { IToolOpConstructor } from "./toolop";
import type { ToolRegistry } from "./toolregistry";

/* ------------------------------------------------------------------ */
/*  ToolPropertyCache                                                 */
/* ------------------------------------------------------------------ */

/**
 * One registry's saved tool inputs. Storage only: the datapath binding that reads these
 * belongs to whichever api asked for it, since an api may list several registries and a
 * toolpath prefix can span them.
 */
export class ToolPropertyCache {
  /** Saved values per toolpath. An api's defaults tree hangs these records directly. */
  readonly values: Map<string, Record<string, any>>;

  userSetMap: Set<string>;

  /**
   * The registry this cache belongs to, assigned by `ToolRegistry`'s constructor. A cache
   * has one owner, so this does not go stale the way a bound api would.
   */
  declare registry: ToolRegistry;

  constructor() {
    this.values = new Map();
    this.userSetMap = new Set();
  }

  /** The record holding one tool's saved inputs, created empty on first ask. */
  valuesFor(toolpath: string): Record<string, any> {
    let obj = this.values.get(toolpath);

    if (obj === undefined) {
      obj = {};
      this.values.set(toolpath, obj);
    }

    return obj;
  }

  static getPropKey(_cls: unknown, key: string, prop: ToolProperty): string {
    return prop.apiname && prop.apiname.length > 0 ? prop.apiname : key;
  }

  /** Splits a toolpath into its segments, or returns undefined if it is malformed. */
  static _splitToolpath(cls: IToolOpConstructor | MacroClassType): string[] | undefined {
    const tdef = (cls as IToolOpConstructor)._getFinalToolDef();

    if (!tdef.toolpath) {
      console.warn("Bad tool property", cls, "it's tooldef was missing a toolpath field");
      return undefined;
    }

    return tdef.toolpath
      .trim()
      .split(".")
      .filter((f: string) => f.trim().length > 0);
  }

  /** The apiname a property is stored and bound under. */
  static _accessorName(key: string, prop: ToolProperty): string {
    return prop.apiname !== undefined && prop.apiname.length > 0 ? prop.apiname : key;
  }

  /**
   * Seeds the stored value for one input and returns the record holding it. Reachable
   * from the toolpath alone, so it works with no api and no struct.
   */
  _ensureValues(
    cls: IToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty
  ): Record<string, any> | undefined {
    const path = ToolPropertyCache._splitToolpath(cls);

    if (path === undefined) {
      return undefined;
    }

    const obj = this.valuesFor(path.join("."));
    const name = ToolPropertyCache._accessorName(key, prop);

    // Seed only. Re-registering a class re-seeds, and assigning here unconditionally
    // would throw away whatever saveDefaultInputs had put in
    if (!(name in obj)) {
      obj[name] = prop.copy().getValue();
    }

    return obj;
  }

  _getAccessor(cls: IToolOpConstructor | MacroClassType): Record<string, unknown> | undefined {
    const toolpath = cls.tooldef().toolpath;
    if (!toolpath) return undefined;
    return this.values.get(toolpath.trim());
  }

  static getFullPath(
    cls: IToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty
  ): string {
    const toolpath = cls.tooldef()!.toolpath!.trim();
    const propKey = ToolPropertyCache.getPropKey(cls, key, prop);
    return `${toolpath}.${propKey}`;
  }

  useDefault(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): boolean {
    return this.userSetMap.has(ToolPropertyCache.getFullPath(cls, key, prop));
  }

  has(cls: IToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): boolean {
    if (prop.flag & PropFlags.NO_DEFAULT) {
      return false;
    }

    const obj = this._getAccessor(cls);

    key = ToolPropertyCache.getPropKey(cls, key, prop);
    return !!obj && key in obj;
  }

  get<T>(
    cls: IToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty<T>
  ): T | undefined {
    if ((cls as any)._IsToolMacro) {
      return undefined;
    }

    const obj = this._getAccessor(cls);
    key = (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, prop);

    if (obj) {
      return obj[key] as T | undefined;
    }

    return undefined;
  }

  set<T>(
    cls: IToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty<T>
  ): this | undefined {
    if ((cls as any)._IsToolMacro) {
      return;
    }

    let toolpath = cls.tooldef().toolpath;
    if (!toolpath) {
      console.error("Malformed toolpath in toolop definition: undefined");
      return;
    }
    toolpath = toolpath.trim();
    let obj = this._getAccessor(cls);

    if (!obj) {
      console.warn("Warning, toolop " + cls.name + " was not in the default map; unregistered?");

      // Seeding is what makes the write below land; telling the apis is best-effort,
      // since a registry with no built api has nowhere to put a binding yet
      obj = this._ensureValues(cls, key, prop);
      this.registry?.updateDefaults(cls as IToolOpConstructor);
    }

    if (!obj) {
      console.error("Malformed toolpath in toolop definition: " + toolpath);
      return;
    }

    key = (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, prop);

    //copy prop first in case we're a non-primitive-value type, e.g. vector properties
    obj[key] = prop.copy().getValue();

    const path = toolpath + "." + key;
    this.userSetMap.add(path);

    return this;
  }
}

export const SavedToolDefaults: ToolPropertyCache = new ToolPropertyCache();
