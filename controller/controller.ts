/**

 This is the main datapath controller module, inspired by Blender's RNA system.

 Datapaths are special bindings for objects; they store types (e.g. float, int, enumeration, string),
 as well as lots of UI-specific metadata (like human-readable names, tooltips, icons, numeric ranges, etc).

 Controller bindings are intended to present a more unified and coherent model of the
 application model than may actually exists.  This is inspired by Blender's RNA system, which
 hides almost all of Blender's core data structure complexity (Blender is written in C) from
 users who e.g. write python scripts, extend the UI, use advanced animation features, or anything else
 that uses RNA paths.

 ## Contexts

 The datapath system works in tandem with the context module.  Contexts are client-provided classes
 that the datapath API and ToolOps use to communicate with the application state.

 ## Example

 <pre>

 function initMyDataAPI() {
 let api = new DataAPI();

 //map MyContextClass to a struct, true tells mapStruct to auto-create
 //the struct if it doesn't already exist.
 //
 //MyContextClass should have a member "propCache" pointing at SavedToolDefaults.
 let st = api.mapStruct(MyContextClass, true);

 //set fields of struct, e.g. st.int, st.float, st.enum, st.struct, etc

 //build toolsys api
 buildToolSysAPI(api);

 //create bindings for default tool operator settings
 cstruct.struct("propCache", "toolDefaults", "Tool Defaults", api.mapStruct(ToolPropertyCache));

 return api;
 }
 </pre>
 */
import * as toolprop from "../toolsys/toolprop";
import * as parseutil from "../util/parseutil";
import { print_stack } from "../util/util";
import { ToolOp } from "../toolsys/toolsys";
import { PropTypes, PropFlags } from "../toolsys/toolprop";
import * as util from "../util/util";
import { DataPathSetOp } from "./controller_ops";
import { Curve1DProperty } from "../curve/curve1d_toolprop";
import { KeyMap } from "../controller";
import { isVecProperty, ToolPropertyTypes } from "../toolsys";

import {
  DataPath,
  DataFlags,
  DataTypes,
  DataPathError,
  getTempProp,
  ListIFace,
  ListFuncs,
  DataList,
  DataPathToolProperty,
} from "./controller_base";

declare global {
  interface SymbolConstructor {
    ToolID: symbol;
  }
}

export * from "./controller_base";
const PUTLParseError = parseutil.PUTLParseError;

import type { TokFunc } from "../util/parseutil";

const tk = (name: string, re: RegExp, func?: TokFunc) => new parseutil.tokdef(name, re, func);
const tokens = [
  tk("ID", /[a-zA-Z_$]+[a-zA-Z_$0-9]*/),
  tk("NUM", /-?[0-9]+/, (t) => {
    t.value = "" + parseInt(t.value);
    return t;
  }),
  tk("NUMBER", /-?[0-9]+\.[0-9]*/, (t) => {
    t.value = "" + parseFloat(t.value);
    return t;
  }),
  tk("STRLIT", /'.*?'/, (t) => {
    t.value = t.value.slice(1, t.value.length - 1);
    return t;
  }),
  tk("STRLIT", /".*?"/, (t) => {
    t.value = t.value.slice(1, t.value.length - 1);
    return t;
  }),
  tk("DOT", /\./),
  tk("EQUALS", /(\=)|(\=\=)/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("AND", /\&/),
  tk("WS", /[ \t\n\r]+/, () => undefined), //drop token
];

const lexer = new parseutil.lexer(tokens, (t) => {
  console.warn("Parse error", t);
  throw new DataPathError();
});

export const pathParser = new parseutil.parser(lexer);

const parserStack = new Array<parseutil.parser>(32);
for (let i = 0; i < parserStack.length; i++) {
  parserStack[i] = pathParser.copy();
}
let parserStackCur = 0;

import { setImplementationClass } from "./controller_base";
import { initToolPaths, parseToolPath } from "../toolsys/toolpath";
import { ContextLike, ModelInterface, ResolvePathResult } from "./controller_abstract";

export { DataPathError, DataFlags } from "./controller_base";

import { ToolClasses } from "../toolsys/toolsys";
import { ToolProperty, IntProperty } from "../toolsys/toolprop";

const tool_classes = ToolClasses;

let tool_idgen = 1;
Symbol.ToolID = Symbol("toolid");

type AnyClass = Record<string | symbol, any>;

function toolkey(cls: AnyClass): number {
  if (!(Symbol.ToolID in cls)) {
    cls[Symbol.ToolID] = tool_idgen++;
  }

  return cls[Symbol.ToolID] as number;
}

const lt = util.time_ms();
const lastmsg: string | undefined = undefined;
const lcount = 0;

const reportstack = ["api"];

export function pushReportName(name: string): void {
  if (reportstack.length > 1024) {
    console.trace("eerk, reportstack overflowed");
    reportstack.length = 0;
    reportstack.push("api");
  }

  reportstack.push(name);
}

function report(msg: string): void {
  const name = reportstack.length === 0 ? "api" : reportstack[reportstack.length - 1];

  util.console.context(name).warn(msg);
}

export function popReportName() {
  reportstack.pop();
}

export class DataStruct<CTX extends ContextLike = ContextLike> {
  members: DataPath[];
  name: string;
  pathmap: Record<string, DataPath>;
  flag: number;
  dpath: DataPath | undefined;
  inheritFlag: number;

  constructor(members: DataPath[] | undefined = [], name = "unnamed") {
    this.members = [];
    this.name = name;
    this.pathmap = {};
    this.flag = 0;
    this.dpath = undefined; //owning DataPath

    this.inheritFlag = 0;

    for (const m of members ?? []) {
      this.add(m);
    }
  }

  clear(): this {
    this.pathmap = {};
    this.members = [];

    return this;
  }

  copy(): DataStruct {
    const ret = new DataStruct();

    ret.name = this.name;
    ret.flag = this.flag;
    ret.inheritFlag = this.inheritFlag;

    for (const m of this.members) {
      const m2 = m.copy();

      //don't copy struct or list references, just
      //direct properties

      if (m2.type === DataTypes.PROP) {
        m2.data = (m2.data as ToolProperty).copy() as unknown as typeof m2.data;
      }

      ret.add(m2);
    }

    return ret;
  }

  /**
   * Like .struct, but the type of struct is looked up
   * for objects at runtime.  Note that to work correctly each object
   * must create its own struct definition via api.mapStruct
   *
   * @param path
   * @param apiname
   * @param uiname
   * @param default_struct : default struct if one can't be looked up
   * @returns {*}
   */
  dynamicStruct(path: string, apiname: string, uiname: string, default_struct?: DataStruct): DataStruct {
    const ret = default_struct ? default_struct : new DataStruct();

    const dpath = new DataPath(path, apiname, ret as unknown as ToolProperty, DataTypes.DYNAMIC_STRUCT);
    ret.inheritFlag |= this.inheritFlag;

    ret.dpath = dpath;

    this.add(dpath);
    return ret;
  }

  struct(path: string, apiname: string, uiname: string, existing_struct?: DataStruct): DataStruct {
    const ret = existing_struct ? existing_struct : new DataStruct();

    const dpath = new DataPath(path, apiname, ret as unknown as ToolProperty, DataTypes.STRUCT);
    ret.inheritFlag |= this.inheritFlag;

    ret.dpath = dpath;

    this.add(dpath);
    return ret;
  }

  customGet(getter: (this: ToolProperty) => unknown): this {
    this.dpath!.customGet(getter);

    return this;
  }

  customGetSet(getter: (this: ToolProperty) => unknown, setter: (this: ToolProperty, val: unknown) => void): this {
    this.dpath!.customGetSet(getter, setter);

    return this;
  }

  color3(path: string, apiname: string, uiname: string, description: string = uiname): DataPath {
    const ret = this.vec3(path, apiname, uiname, description);

    (ret.data as ToolProperty).subtype = toolprop.PropSubTypes.COLOR;
    ret.range(0, 1);
    ret.simpleSlider();

    ret.noUnits();

    return ret;
  }

  color4(path: string, apiname: string, uiname: string, description = uiname): DataPath {
    const ret = this.vec4(path, apiname, uiname, description);

    (ret.data as ToolProperty).subtype = toolprop.PropSubTypes.COLOR;
    ret.range(0, 1);
    ret.simpleSlider();

    ret.noUnits();

    return ret;
  }

  arrayList<T extends number = number>(
    path: string,
    apiname: string,
    structdef: DataStruct,
    uiname: string,
    description: string
  ): DataPath {
    const ret = this.list<number[], number, number>(path, apiname, {
      getIter(api: DataAPI, list: T[]) {
        return list[Symbol.iterator]();
      },
      getLength(api: DataAPI, list: T[]) {
        return list.length;
      },
      get(api: DataAPI, list: T[], key: number) {
        return list[key];
      },
      set(api: DataAPI, list: T[], key: number, val: T) {
        if (typeof key === "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
      },
      getKey(api: DataAPI, list: T[], value: T) {
        return list.indexOf(value);
      },
      getStruct(api: DataAPI, list: T[], key: string | number) {
        return structdef;
      },
    });

    return ret;
  }

  color3List(path: string, apiname: string, uiname: string, description: string): DataPath {
    return this.vectorList(3, path, apiname, uiname, description, toolprop.PropSubTypes.COLOR);
  }

  color4List(path: string, apiname: string, uiname: string, description: string): DataPath {
    return this.vectorList(4, path, apiname, uiname, description, toolprop.PropSubTypes.COLOR);
  }

  vectorList(
    size: number,
    path: string,
    apiname: string,
    uiname: string,
    description: string,
    subtype: number
  ): DataPath {
    let type;

    switch (size) {
      case 2:
        type = toolprop.Vec2Property;
        break;
      case 3:
        type = toolprop.Vec3Property;
      case 4:
        type = toolprop.Vec4Property;
    }

    if (type === undefined) {
      throw new DataPathError("Invalid size for vectorList; expected 2 3 or 4");
    }

    const prop = new type(undefined, apiname, uiname, description);

    const pstruct = new DataStruct(undefined, "Vector");
    pstruct.vec3("", "co", "Coords", "Coordinates");

    type VecList = number[][];
    type Vec = number[];
    const ret = this.list<VecList, number, Vec>(path, apiname, {
      getIter(api: DataAPI, list: VecList) {
        return list[Symbol.iterator]();
      },
      getLength(api: DataAPI, list: VecList) {
        return list.length;
      },
      get(api: DataAPI, list: VecList, key: number) {
        return list[key];
      },
      set(api: DataAPI, list: VecList, key: number, val: Vec) {
        if (typeof key == "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
      },
      getKey(api: DataAPI, list: VecList, value: Vec) {
        return list.indexOf(value);
      },
      getStruct(api: DataAPI, list: VecList, key: number) {
        return pstruct;
      },
    });

    return ret;
  }

  bool(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.BoolProperty(undefined, apiname, uiname, description);

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec2(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.Vec2Property(undefined, apiname, uiname, description);

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec3(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.Vec3Property(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec4(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.Vec4Property(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  float(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.FloatProperty(0, apiname, uiname, description);

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  textblock(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.StringProperty(undefined, apiname, uiname, description);
    prop.multiLine = true;

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  report(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.ReportProperty(undefined, apiname, uiname, description);

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  string(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new toolprop.StringProperty(undefined, apiname, uiname, description);

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  int(path: string, apiname: string, uiname?: string, description?: string, prop?: IntProperty) {
    if (!prop) {
      prop = new toolprop.IntProperty(0, apiname, uiname, description);
    }

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  curve1d(path: string, apiname: string, uiname?: string, description?: string) {
    const prop = new Curve1DProperty(undefined);

    prop.apiname = apiname;
    prop.uiname = uiname;
    prop.description = description;

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  enum(path: string, apiname: string, enumdef: any, uiname?: string, description?: string) {
    let prop;

    if (enumdef instanceof toolprop.EnumProperty) {
      prop = enumdef;
    } else {
      prop = new toolprop.EnumProperty(undefined, enumdef, apiname, uiname, description);
    }

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  list<ListType = any, KeyType = any, ObjType = any>(
    path: string,
    apiname: string,
    funcs: ListIFace<DataAPI, ListType, KeyType, ObjType, CTX> | ListFuncs<DataAPI, ListType, KeyType, ObjType, CTX>
  ) {
    const array = new DataList<DataAPI, ListType, KeyType, ObjType, CTX>(funcs);
    const dpath = new DataPath(path, apiname, array);
    dpath.type = DataTypes.ARRAY;

    this.add(dpath);
    return dpath;
  }

  flags(path: string, apiname: string, enumdef: any, uiname?: string, description?: string) {
    let prop;

    if (enumdef === undefined || !(enumdef instanceof toolprop.ToolProperty)) {
      prop = new toolprop.FlagProperty(undefined, enumdef, apiname, uiname, description);
    } else {
      prop = enumdef;
    }

    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  remove(m: string | DataPath) {
    if (typeof m === "string") {
      m = this.pathmap[m];
    }

    if (!(m.apiname in this.pathmap)) {
      throw new Error("Member not in struct " + m.apiname);
    }

    delete this.pathmap[m.apiname];
    this.members.remove(m);
  }

  fromToolProp(path: string, prop: ToolProperty, apiname = prop.apiname?.length ? prop.apiname : path) {
    const dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  add(dpath: DataPath) {
    if (dpath.apiname in this.pathmap) {
      if (window.DEBUG?.datapaths) {
        console.warn("Overriding existing member '" + dpath.apiname + "' in datapath struct", this.name);
      }

      this.remove(this.pathmap[dpath.apiname]);
    }

    dpath.flag |= this.inheritFlag;

    this.members.push(dpath);
    dpath.parent = this;

    this.pathmap[dpath.apiname] = dpath;

    return this;
  }
}

let _map_struct_idgen = 1;
const _map_structs = {} as { [k: string]: DataStruct };

const _dummypath = new DataPath();

const DummyIntProperty = new IntProperty();
const CLS_API_KEY = Symbol("dp_map_id");
const CLS_API_KEY_CUSTOM = Symbol("dp_map_custom");

export class DataAPI<CTX extends ContextLike = ContextLike> extends ModelInterface {
  rootContextStruct: DataStruct | undefined;
  structs: DataStruct[] = [];

  constructor() {
    super();

    this.rootContextStruct = undefined;
    this.structs = [];
  }

  static toolRegistered(cls: any) {
    return ToolOp.isRegistered(cls);
    //let key = toolkey(cls);
    //return key in tool_classes;
  }

  static registerTool(cls: any) {
    console.warn("Outdated function simple_controller.DataAPI.registerTool called");

    return ToolOp.register(cls);

    //let key = toolkey(cls);
    //
    //if (!(key in tool_classes)) {
    //  tool_classes[key] = cls;
    //}
  }

  getStructs() {
    return this.structs;
  }

  setRoot(sdef: DataStruct) {
    this.rootContextStruct = sdef;
  }

  hasStruct(cls: any) {
    return cls.hasOwnProperty(CLS_API_KEY);
  }

  getStruct(cls: any) {
    return this.mapStruct(cls, false);
  }

  mergeStructs(dest: DataStruct<CTX>, src: DataStruct<CTX>) {
    for (const m of src.members) {
      dest.add(m.copy());
    }
  }

  inheritStruct(cls: any, parent: any, auto_create_parent = false) {
    let st = this.mapStruct(parent, auto_create_parent);

    if (st === undefined) {
      throw new Error("parent has no struct definition");
    }

    st = st.copy();
    st.name = cls.name;

    this._addClass(cls, st);
    return st;
  }

  /**
   * Look up struct definition for a class.
   *
   * @param cls: the class
   * @param auto_create: If true, automatically create definition if not already existing.
   * @returns {IterableIterator<*>}
   */

  _addClass(cls: any, dstruct: DataStruct) {
    const key = _map_struct_idgen++;
    cls[CLS_API_KEY] = key;

    this.structs.push(dstruct);

    _map_structs[key] = dstruct;
  }

  /* Associate cls with a DataStruct
   * via callback, which will be called
   * with an instance of cls as its argument*/
  mapStructCustom(cls: any, callback: (instance: any) => void) {
    this.mapStruct(cls, true);
    cls[CLS_API_KEY_CUSTOM] = callback;
  }

  mapStruct(cls: any, auto_create = true, name = cls.name as string) {
    let key;

    if (!cls.hasOwnProperty(CLS_API_KEY)) {
      key = undefined;
    } else {
      key = cls[CLS_API_KEY];
    }

    if (key === undefined && auto_create) {
      const dstruct = new DataStruct(undefined, name);
      this._addClass(cls, dstruct);
      return dstruct;
    } else if (key === undefined) {
      throw new Error("class does not have a struct definition: " + name);
    }

    return _map_structs[key];
  }

  //used for tagging error messages
  pushReportContext(name: string) {
    pushReportName(name);
  }

  //used for tagging error messages
  popReportContext() {
    popReportName();
  }

  /*
  massSetProp operate on lists.  The idea is to
  write a filter str inside a data path, e.g.

  ctx.api.massSetProp(ctx, "obj.list[{$.select}].value", 1);


  * */
  massSetProp<T = unknown>(ctx: CTX, massSetPath: string, value: T) {
    for (const path of this.resolveMassSetPaths(ctx, massSetPath)) {
      this.setValue(ctx, path, value);
    }
  }

  /**
   *
   * Mass set paths take the form list[{$.prop}]`, where the filter is inside of the list.
   * Note: `$.prop` cannot be an expression unless you enable eval with `struct.list().evalMassSetFilter()`.
   * An example of a more complicated expression might be:
   * `canvas.paths[{$.id % 2 === 0}].material.color`
   */
  resolveMassSetPaths(ctx: CTX, massSetPath: string): string[] {
    if (massSetPath.startsWith("/")) {
      massSetPath = massSetPath.slice(1, massSetPath.length);
    }

    const start = massSetPath.search("{");
    const end = massSetPath.search("}");

    if (start < 0 || end < 0) {
      console.log(
        `
Mass set paths take the form \`list[{$.prop}]\`, where the filter is inside of the list.
Note: \`$.prop\` cannot be an expression unless you enable eval with \`struct.list().evalMassSetFilter()\`.
An example of a more complicated expression might be: 
\`canvas.paths[{$.id % 2 === 0}].material.color\``.trim()
      );
      throw new DataPathError("Invalid mass set datapath: " + massSetPath);
    }

    const prefix = massSetPath.slice(0, start - 1);
    const filter = massSetPath.slice(start + 1, end);
    const suffix = massSetPath.slice(end + 2, massSetPath.length);

    const rdef1 = this.resolvePath(ctx, prefix);
    if (rdef1 === undefined) {
      throw new DataPathError('unknown path: "' + prefix + '"');
    }

    // applyFilter isn't inferring rdef1 without the | undefined bleh
    // thus this hack
    const rdef = rdef1!;

    if (!(rdef.prop instanceof DataList)) {
      throw new DataPathError("massSetPath expected a path resolving to a DataList: " + massSetPath);
    }

    const paths = [];

    const list = rdef.prop;
    const api = ctx.api ?? this;

    function applyFilter(obj: any) {
      const forceEval = rdef.dpath.flag & DataFlags.USE_EVAL_MASS_SET_PATHS;

      if (obj === undefined) {
        return undefined;
      } else if (!forceEval && (typeof obj === "object" || typeof obj === "function")) {
        const st = api.mapStruct(obj.constructor, false);

        let path = filter;
        if (path.startsWith("$")) {
          path = path.slice(1, filter.length).trim();
        }
        if (path.startsWith(".")) {
          path = path.slice(1, filter.length).trim();
        }

        try {
          return api.getValue(obj, path, st);
        } catch (error) {
          if (!(error instanceof DataPathError)) {
            util.print_stack(error as Error);
            console.error("Error in datapath callback");
          }

          return false;
        }
      } else {
        const code = `
        (function filter($) {
          return ${filter};
        })
        `;
        //bundler friendly form
        const func = (0, eval)(code);
        return func(obj);
      }
    }

    for (const obj of list.getIter(this, rdef.value)) {
      if (!applyFilter(obj)) {
        continue;
      }

      const key = "" + list.getKey(this, rdef.value, obj);
      const path = `${prefix}[${key}]${suffix}`;

      /* validate the final path */
      try {
        this.getValue(ctx, path);
      } catch (error) {
        if (!(error instanceof DataPathError)) {
          util.print_stack(error as Error);
          console.error(path + ": Error in datapath API");
        }

        continue;
      }

      paths.push(path);
    }

    return paths;
  }

  resolvePath(ctx: CTX, inpath: string, ignoreExistence = false, dstruct?: DataStruct): ResolvePathResult | undefined {
    const parser = parserStack[parserStackCur++];
    let ret = undefined;

    if (inpath[0] === "/") {
      inpath = inpath.slice(1, inpath.length).trim();
    }

    try {
      ret = this.resolvePath_intern(ctx, inpath, ignoreExistence, parser, dstruct);
    } catch (error) {
      //throw new DataPathError("bad path " + path);
      if (!(error instanceof DataPathError)) {
        util.print_stack(error as Error);
        report("error while evaluating path " + inpath);
      }

      if (window.DEBUG?.datapaths) {
        util.print_stack(error as Error);
      }

      ret = undefined;
    }

    parserStackCur--;

    if (ret?.prop && ret.dpath && ret.dpath.flag & DataFlags.USE_CUSTOM_PROP_GETTER) {
      ret.prop = this.getPropOverride(ctx, inpath, ret.dpath, ret.obj) as ToolPropertyTypes;
    }

    if (ret?.prop && ret.dpath?.ui_name_get) {
      const dummy = {
        datactx : ctx,
        datapath: inpath,
        dataref : ret.obj,
      };

      const name = ret.dpath.ui_name_get.call(dummy as unknown as ToolProperty);

      ret.prop.uiname = "" + name;
    }

    return ret;
  }

  getPropOverride<P extends ToolProperty | ToolPropertyTypes>(
    ctx: CTX,
    path: string,
    dpath: DataPath,
    obj: any,
    prop = dpath.data as ToolProperty
  ): P {
    using execCtx = prop.execWithContext();
    execCtx.ctx = ctx;
    execCtx.datapath = path;
    execCtx.dataref = obj;

    const newprop = getTempProp<P>(prop.type);
    prop.copyTo(newprop);
    dpath.propGetter!.call(prop, newprop);
    return newprop;
  }

  /**
   get meta information for a datapath.

   @param ignoreExistence: don't try to get actual data associated with path,
    just want meta information
   */
  resolvePath_intern(
    ctx: CTX,
    inpath: string,
    ignoreExistence = false,
    p = pathParser,
    dstruct?: DataStruct
  ): ResolvePathResult | undefined {
    inpath = inpath.replace("==", "=");

    p.input(inpath);

    dstruct = dstruct || this.rootContextStruct;

    let obj = ctx as any;
    let lastobj = ctx as any;
    let subkey: string | number | undefined;
    let lastobj2: any | undefined;
    let lastkey: string | number | undefined;
    let prop: ToolPropertyTypes | undefined;
    let lastdpath: DataPath | undefined;

    function p_key() {
      const t = p.peeknext()!;
      if (t.type === "NUM" || t.type === "STRLIT") {
        p.next();
        return t.value;
      } else {
        throw new PUTLParseError("Expected list key");
      }
    }

    let _i = 0;
    while (!p.at_end()) {
      let key = p.expect("ID");
      let dpath = dstruct!.pathmap[key];

      lastdpath = dpath;

      if (dpath === undefined) {
        if (key === "length" && prop !== undefined && prop instanceof DataList) {
          prop.getLength(this, obj);
          key = "length";

          prop = DummyIntProperty;

          (prop as any).name = "length";
          prop.flag = PropFlags.READ_ONLY;

          dpath = _dummypath;
          dpath.type = DataTypes.PROP;
          dpath.data = prop as unknown as DataPathToolProperty;
          dpath.struct = dpath.parent = dstruct;
          dpath.flag = DataFlags.READ_ONLY;
          dpath.path = "length";

          /*
          parent: lastobj2,
            obj: lastobj,
            value: obj,
            key: lastkey,
            //*/
        } else if (key === "active" && prop !== undefined && prop instanceof DataList) {
          const act = prop.getActive(this, obj);

          if (act === undefined && !ignoreExistence) {
            throw new DataPathError("no active elem ent for list");
          }

          const actkey = obj !== undefined && act !== undefined ? prop.getKey(this, obj, act) : undefined;

          dstruct = prop.getStruct(this, obj, actkey);
          if (dstruct === undefined) {
            throw new DataPathError("couldn't get data type for " + inpath + "'s element '" + key + "'");
          }

          _dummypath.parent = dpath;
          dpath = _dummypath;

          lastobj = obj;
          obj = act;

          dpath.type = DataTypes.STRUCT;
          dpath.data = dstruct;
          dpath.path = key;

          p.optional("DOT");

          continue;
        } else {
          throw new DataPathError(inpath + ": unknown property " + key);
        }
      }

      let dynstructobj = undefined;

      if (dpath.type === DataTypes.STRUCT) {
        dstruct = dpath.data as DataStruct;
      } else if (dpath.type === DataTypes.DYNAMIC_STRUCT) {
        let ok = false;

        if (obj !== undefined) {
          let obj2;

          if (dpath.flag & DataFlags.USE_CUSTOM_GETSET) {
            const fakeprop = dpath.getSet!;
            fakeprop.ctx = ctx;
            fakeprop.dataref = obj;
            fakeprop.datapath = inpath;
            obj2 = (fakeprop as any).get();
            fakeprop.ctx = fakeprop.datapath = fakeprop.dataref = undefined;
          } else {
            obj2 = (obj as any)[dpath.path];
          }

          dynstructobj = obj2;

          if (obj2 !== undefined) {
            if (CLS_API_KEY_CUSTOM in obj2.constructor) {
              dstruct = obj2.constructor[CLS_API_KEY_CUSTOM](obj2);
            } else {
              dstruct = this.mapStruct(obj2.constructor, false);
            }
          } else {
            dstruct = dpath.data as DataStruct;
          }

          if (dstruct === undefined) {
            dstruct = dpath.data as DataStruct;
          }

          ok = dstruct !== undefined;
        }

        if (!ok) {
          throw new DataPathError("dynamic struct error for path: " + inpath);
        }
      } else {
        prop = dpath.data as ToolPropertyTypes;
      }

      if (prop && dpath.flag & DataFlags.USE_CUSTOM_PROP_GETTER) {
        prop = this.getPropOverride(ctx, inpath, dpath, obj) as ToolPropertyTypes;
      }

      if (dpath.path.search(/\./) >= 0) {
        const keys = dpath.path.split(/\./);

        for (const key of keys) {
          lastobj2 = lastobj;
          lastobj = obj;
          lastkey = key;

          if (obj === undefined && !ignoreExistence) {
            throw new DataPathError("no data for " + inpath);
          } else if (obj !== undefined) {
            obj = (obj as any)[key.trim()];
          }
        }
      } else {
        lastobj2 = lastobj;
        lastobj = obj;

        lastkey = dpath.path;

        if (dpath.flag & DataFlags.USE_CUSTOM_GETSET) {
          const fakeprop = dpath.getSet!;

          if (!fakeprop && dpath.type === DataTypes.PROP) {
            const prop = dpath.data as any;

            using execCtx = prop.execWithContext(ctx);
            execCtx.ctx = ctx;
            execCtx.dataref = obj;
            execCtx.datapath = inpath;

            try {
              obj = prop.getValue();
            } catch (error) {
              util.print_stack(error as Error);
              obj = undefined;
            }

            if (typeof obj === "string" && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
              obj = prop.values[obj];
            }
          } else {
            fakeprop.ctx = ctx;
            fakeprop.dataref = obj;
            fakeprop.datapath = inpath;

            obj = (fakeprop as any).get();
            fakeprop.ctx = fakeprop.datapath = fakeprop.dataref = undefined;
          }
        } else if (obj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for " + inpath);
        } else if (dpath.type === DataTypes.DYNAMIC_STRUCT) {
          obj = dynstructobj;
        } else if (obj !== undefined && dpath.path !== "") {
          obj = obj[dpath.path];
        }
      }

      const t = p.peeknext();
      if (t === undefined) {
        break;
      }

      if (t.type === "DOT") {
        p.next();
      } else if (
        t.type === "EQUALS" &&
        prop !== undefined &&
        (prop as ToolProperty).type & (PropTypes.ENUM | PropTypes.FLAG)
      ) {
        p.expect("EQUALS");

        const t2 = p.peeknext();
        const type = t2?.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type) as string | number;

        const val1 = val;

        if (typeof val == "string") {
          val = (prop as toolprop.EnumProperty).values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in (prop as toolprop.EnumProperty).keys) {
          subkey = (prop as toolprop.EnumProperty).keys[val];
        }

        key = dpath.path;
        obj = !!(lastobj[key] == val);
      } else if (
        t.type === "AND" &&
        prop !== undefined &&
        (prop as ToolProperty).type & (PropTypes.ENUM | PropTypes.FLAG)
      ) {
        p.expect("AND");

        const t2 = p.peeknext();
        const type = t2?.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type) as string | number;

        const val1 = val;

        if (typeof val == "string") {
          val = (prop as toolprop.EnumProperty).values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in (prop as toolprop.EnumProperty).keys) {
          subkey = (prop as toolprop.EnumProperty).keys[val];
        }

        key = dpath.path;
        obj = !!(lastobj[key] & (val as number));
      } else if (
        t.type === "LSBRACKET" &&
        prop !== undefined &&
        (prop as toolprop.EnumProperty).type & (PropTypes.ENUM | PropTypes.FLAG)
      ) {
        p.expect("LSBRACKET");

        const t2 = p.peeknext();
        const type = t2?.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type) as string | number;

        const val1 = val;

        const enumProp = prop as toolprop.EnumProperty;

        if (typeof val == "string") {
          val = enumProp.values[val];
        }

        if (val === undefined) {
          console.warn(inpath, enumProp.values, val1, prop);
          throw new DataPathError("unknown value " + val1);
        }

        if (val in enumProp.keys) {
          subkey = enumProp.keys[val];
        }

        let bitfield;
        key = dpath.path;

        if (!(enumProp.flag & PropFlags.USE_CUSTOM_GETSET)) {
          bitfield = lastobj ? lastobj[key] : 0;
        } else {
          // XXX
          using execCtx = enumProp.execWithContext();
          execCtx.dataref = lastobj;
          execCtx.datapath = inpath;
          execCtx.ctx = ctx;

          try {
            bitfield = enumProp.getValue();
          } catch (error) {
            util.print_stack(error as Error);

            bitfield = NaN;
          }
        }

        if (lastobj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for path " + inpath);
        } else if (lastobj !== undefined) {
          if (enumProp.type === PropTypes.ENUM) {
            obj = !!(bitfield === val);
          } else {
            obj = !!(bitfield & (val as number));
          }
        }

        p.expect("RSBRACKET");
      } else if (t.type === "LSBRACKET" && prop !== undefined && isVecProperty(prop)) {
        p.expect("LSBRACKET");
        const num = p.expect("NUM");
        p.expect("RSBRACKET");

        subkey = num;

        if (
          prop !== undefined &&
          !((prop as ToolProperty).type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT))
        ) {
          lastobj = obj;
        }

        obj = obj[num];
      } else if (t.type === "LSBRACKET") {
        p.expect("LSBRACKET");

        if (lastobj && lastkey && typeof lastkey === "string" && lastkey.length > 0) {
          lastobj = lastobj[lastkey];
        }

        lastkey = p_key();
        p.expect("RSBRACKET");

        if (!(prop instanceof DataList)) {
          throw new DataPathError("bad property, not a list");
        }

        obj = prop.get(this, lastobj, lastkey);
        dstruct = prop.getStruct(this, lastobj, lastkey);

        if (!dstruct) {
          throw new DataPathError(inpath + ": list has no entry " + lastkey);
        }

        if (p.peeknext() !== undefined && p.peeknext()?.type === "DOT") {
          p.next();
        }
      }

      if (_i++ > 1000) {
        console.warn("infinite loop in resolvePath parser");
        break;
      }
    }

    if (prop && (prop as ToolProperty).type & (PropTypes.ENUM | PropFlags.FLAG)) {
      (prop as toolprop.EnumProperty).checkMeta();
    }

    return {
      dpath  : lastdpath!,
      parent : lastobj2,
      obj    : lastobj,
      value  : obj,
      key    : lastkey! as string,
      dstruct: dstruct!,
      prop,
      subkey,
    };
  }

  _parsePathOverrides(path: string) {
    const parts = ["", undefined, undefined];

    const TOOLPATH = 0;
    const NAME = 1;
    const HOTKEY = 2;
    let part = TOOLPATH;

    for (let i = 0; i < path.length; i++) {
      const c = path[i];
      const n = i < path.length - 1 ? path[i + 1] : "";

      if (c === "|") {
        part = NAME;
        parts[NAME] = "";
        continue;
      } else if (c === ":" && n === ":") {
        part = HOTKEY;
        parts[HOTKEY] = "";
        i++;
        continue;
      }

      parts[part] += c;
    }

    return {
      path  : parts[TOOLPATH]!.trim(),
      uiname: parts[NAME] ? parts[NAME].trim() : undefined,
      hotkey: parts[HOTKEY] ? parts[HOTKEY].trim() : undefined,
    };
  }

  /** Get tooldef for path, applying any modifications, e.g.:
   *  "app.some_tool()|Label::CustomHotkeyString"
   * */
  getToolDef(toolpath: string) {
    const { path, uiname, hotkey } = this._parsePathOverrides(toolpath);

    const cls = this.parseToolPath(path);
    if (cls === undefined) {
      throw new DataPathError('unknown path "' + path + '"');
    }

    const def = cls.tooldef();
    def.uiname = uiname ?? def.uiname ?? path;
    if (hotkey) {
      def.hotkey = hotkey;
    }

    return def;
  }

  getToolPathHotkey(ctx: CTX, toolpath: string) {
    const { path, uiname, hotkey } = this._parsePathOverrides(toolpath);

    if (hotkey) {
      return hotkey;
    }

    try {
      return this.#getToolPathHotkey_intern(ctx, path);
    } catch (error) {
      print_stack(error as Error);
      util.console.context("api").log("failed to fetch tool path: " + path);

      return undefined;
    }
  }

  #getToolPathHotkey_intern(ctx: CTX, path: string) {
    const screen = (ctx as any).screen;
    const this2 = this;

    function searchKeymap(keymap: KeyMap) {
      if (keymap === undefined) {
        return undefined;
      }

      let ret: string | undefined;

      function search(cb: (tool: string) => boolean) {
        if (ret) {
          return;
        }

        for (const hk of keymap) {
          if (typeof hk.action === "string" && cb(hk.action)) {
            ret = hk.buildString();
          }
        }
      }

      search((tool) => tool.trim() === path.trim());
      search((tool) => this2._parsePathOverrides(tool).path === path.trim());

      return ret;
    }

    if (screen.sareas.length === 0) {
      return searchKeymap(screen.keymap);
    }

    //client might have its own area subclass with
    //getActiveArea defined (that's encouraged),
    //which is why we don't just call Area.getActiveArea
    const areacls = screen.sareas[0].area.constructor;
    const area = areacls.getActiveArea();

    if (area) {
      for (const keymap of area.getKeyMaps()) {
        const ret = searchKeymap(keymap);

        if (ret !== undefined) {
          return ret;
        }
      }
    }

    //search all other areas
    for (const sarea of screen.sareas) {
      if (!sarea.area) continue;

      for (const keymap of sarea.area.getKeyMaps()) {
        const ret = searchKeymap(keymap);

        if (ret) {
          return ret;
        }
      }
    }

    return (this as any).keymap ? searchKeymap((this as any).keymap) : undefined;
  }

  parseToolPath(path: string) {
    try {
      return parseToolPath(path).toolclass;
    } catch (error) {
      if (error instanceof DataPathError) {
        console.warn("warning, bad tool path " + path);
        return undefined;
      } else {
        throw error;
      }
    }
  }

  parseToolArgs(path: string) {
    return parseToolPath(path).args;
  }

  createTool<T extends ToolOp = ToolOp>(ctx: CTX, path: string, inputs: any = {}): T {
    let cls;
    let args;

    if (typeof path == "string") {
      //parseToolPath will raise DataPathError if path is malformed
      const tpath = parseToolPath(path);

      cls = tpath.toolclass;
      args = tpath.args;
    } else {
      cls = path;
      args = {};
    }

    if (!cls) {
      debugger;
      console.error("Unknown tool " + path);
    }

    args = { ...args };

    // feed inputs to invoke
    const tooldef = (cls as any)._getFinalToolDef();
    if (inputs !== undefined) {
      for (const k in inputs) {
        if (!(k in tooldef.inputs)) {
          console.warn(cls!.tooldef().uiname + ': Unknown tool property "' + k + '"');
          continue;
        }

        if (!(k in args)) {
          args[k] = inputs[k];
        }
      }
    }

    const tool = cls!.invoke(ctx, args);

    if (inputs !== undefined) {
      for (const k in inputs) {
        if (!(k in tool.inputs)) {
          console.warn(cls!.tooldef().uiname + ': Unknown tool property "' + k + '"');
          continue;
        }

        (tool.inputs as any)[k].setValue(inputs[k]);
      }
    }

    return tool as T;
  }
}

export function initSimpleController() {
  initToolPaths();
}

let dpt = DataPathSetOp;

export function getDataPathToolOp() {
  return dpt;
}

export function setDataPathToolOp(cls: any) {
  ToolOp.unregister(DataPathSetOp);

  if (!ToolOp.isRegistered(cls)) {
    ToolOp.register(cls);
  }

  dpt = cls;
}

setImplementationClass(DataAPI);
