import { PropFlags, ToolProperty } from "./toolprop";
import { DataPath } from "../controller/controller_base";
import type { DataAPI, DataStruct } from "../controller";
import type { MacroClassType } from "./toolmacro";
import type { IToolOpConstructor } from "./toolop";

/* ------------------------------------------------------------------ */
/*  ToolPropertyCache                                                 */
/* ------------------------------------------------------------------ */

export class ToolPropertyCache {
  /** @deprecated */
  map: Map<unknown, unknown>;

  pathmap: Map<string, any>;
  accessors: Record<string, any>;
  userSetMap: Set<string>;
  declare api: DataAPI;
  declare dstruct: DataStruct;

  constructor() {
    this.map = new Map();
    this.pathmap = new Map();
    this.accessors = {};

    this.userSetMap = new Set();
  }

  static getPropKey(_cls: unknown, key: string, prop: ToolProperty): string {
    return prop.apiname && prop.apiname.length > 0 ? prop.apiname : key;
  }

  _buildAccessors(
    cls: IToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty,
    dstruct: DataStruct,
    api: DataAPI
  ): void {
    const tdef = (cls as IToolOpConstructor)._getFinalToolDef();

    this.api = api;
    this.dstruct = dstruct;

    if (!tdef.toolpath) {
      console.warn("Bad tool property", cls, "it's tooldef was missing a toolpath field");
      return;
    }

    const path = tdef.toolpath
      .trim()
      .split(".")
      .filter((f: string) => f.trim().length > 0);
    let obj = this.accessors;

    let st = dstruct;
    let partial = "";

    for (let i = 0; i < path.length; i++) {
      const k = path[i];
      let pathk = k;

      if (i === 0) {
        pathk = "accessors." + k;
      }

      if (i > 0) {
        partial += ".";
      }
      partial += k;

      if (!(k in obj)) {
        obj[k] = {};
      }

      const st2 = api.mapStruct(obj[k], true, k);
      if (!(st.pathmap && k in st.pathmap)) {
        st.struct(pathk, k, k, st2);
      }
      st = st2;

      this.pathmap.set(partial, obj[k]);
      obj = obj[k];
    }

    const name = prop.apiname !== undefined && prop.apiname.length > 0 ? prop.apiname : key;
    const prop2 = prop.copy();

    const dpath = new DataPath(name, name, prop2);
    let uiname = prop.uiname;

    if (!uiname || uiname.trim().length === 0) {
      uiname = prop.apiname;
    }
    if (!uiname || uiname.trim().length === 0) {
      uiname = key;
    }

    uiname = ToolProperty.makeUIName(uiname);

    prop2.uiname = uiname;
    prop2.description = prop2.description || prop2.uiname;

    st.add(dpath);

    // Seed only. Re-registering a class rebuilds its accessors, and assigning here
    // unconditionally would throw away whatever saveDefaultInputs had put in
    if (!(name in obj)) {
      obj[name] = prop2.getValue();
    }
  }

  _getAccessor(cls: IToolOpConstructor | MacroClassType): Record<string, unknown> | undefined {
    const toolpath = cls.tooldef().toolpath;
    if (!toolpath) return undefined;
    return this.pathmap.get(toolpath.trim());
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
      this._buildAccessors(cls as IToolOpConstructor, key, prop, this.dstruct, this.api);

      obj = this.pathmap.get(toolpath);
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
