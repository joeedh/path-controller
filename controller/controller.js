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
import * as toolprop from "../toolsys/toolprop.js";
import * as parseutil from "../util/parseutil.js";
import { print_stack } from "../util/util.js";
import { ToolOp } from "../toolsys/toolsys.js";
import { PropTypes, PropFlags } from "../toolsys/toolprop.js";
import * as util from "../util/util.js";

import { DataPath, DataFlags, DataTypes, DataPathError, getTempProp } from "./controller_base.js";

export * from "./controller_base.js";

let PUTLParseError = parseutil.PUTLParseError;

let tk = (name, re, func) => new parseutil.tokdef(name, re, func);
let tokens = [
  tk("ID", /[a-zA-Z_$]+[a-zA-Z_$0-9]*/),
  tk("NUM", /-?[0-9]+/, (t) => {
    t.value = parseInt(t.value);
    return t;
  }),
  tk("NUMBER", /-?[0-9]+\.[0-9]*/, (t) => {
    t.value = parseFloat(t.value);
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
  tk("WS", /[ \t\n\r]+/, (t) => undefined), //drop token
];

let lexer = new parseutil.lexer(tokens, (t) => {
  console.warn("Parse error", t);
  throw new DataPathError();
});

export let pathParser = new parseutil.parser(lexer);

let parserStack = new Array(32);
for (let i = 0; i < parserStack.length; i++) {
  parserStack[i] = pathParser.copy();
}
parserStack.cur = 0;

import { setImplementationClass, isVecProperty, ListIface } from "./controller_base.js";
import { initToolPaths, parseToolPath } from "../toolsys/toolpath.js";
import { ModelInterface } from "./controller_abstract.js";

export { DataPathError, DataFlags } from "./controller_base.js";

import { ToolClasses } from "../toolsys/toolsys.js";
import { ToolProperty, IntProperty } from "../toolsys/toolprop.js";

let tool_classes = ToolClasses;

let tool_idgen = 1;
Symbol.ToolID = Symbol("toolid");

function toolkey(cls) {
  if (!(Symbol.ToolID in cls)) {
    cls[Symbol.ToolID] = tool_idgen++;
  }

  return cls[Symbol.ToolID];
}

let lt = util.time_ms();
let lastmsg = undefined;
let lcount = 0;

let reportstack = ["api"];

export function pushReportName(name) {
  if (reportstack.length > 1024) {
    console.trace("eerk, reportstack overflowed");
    reportstack.length = 0;
    reportstack.push("api");
  }

  reportstack.push(name);
}

function report(msg) {
  let name = reportstack.length === 0 ? "api" : reportstack[reportstack.length - 1];

  util.console.context(name).warn(msg);
}

export function popReportName() {
  reportstack.pop();
}

export class DataList extends ListIface {
  constructor(callbacks) {
    super();

    if (callbacks === undefined) {
      throw new DataPathError("missing callbacks argument to DataList");
    }

    this.cb = {};

    if (typeof callbacks === "object" && !Array.isArray(callbacks)) {
      for (let k in callbacks) {
        this.cb[k] = callbacks[k];
      }
    } else {
      for (let cb of callbacks) {
        this.cb[cb.name] = cb;
      }
    }

    let check = (key) => {
      if (!(key in this.cbs)) {
        throw new DataPathError(`Missing ${key} callback in DataList`);
      }
    };
  }

  /**
   Generic list API.

   * Callbacks is an array of name functions, like so:
   - function getStruct(api, list, key) //return DataStruct type of object in key, key is optional if omitted return base type of all objects?
   - function get(api, list, key)
   - function set(api, list, key, val) //this one has default behavior: list[key] = val
   - function getLength(api, list)
   - function getActive(api, list)
   - function setActive(api, list, key)
   - function getIter(api, list)
   - function getKey(api, list, object) returns object's key in this list, either a string or a number
   * */

  copy() {
    let ret = new DataList([this.cb.get]);

    for (let k in this.cb) {
      ret.cb[k] = this.cb[k];
    }

    return ret;
  }

  get(api, list, key) {
    return this.cb.get(api, list, key);
  }

  getLength(api, list) {
    this._check("getLength");
    return this.cb.getLength(api, list);
  }

  _check(cb) {
    if (!(cb in this.cb)) {
      throw new DataPathError(cb + " not supported by this list");
    }
  }

  set(api, list, key, val) {
    if (this.cb.set === undefined) {
      list[key] = val;
    } else {
      this.cb.set(api, list, key, val);
    }
  }

  getIter(api, list) {
    this._check("getIter");
    return this.cb.getIter(api, list);
  }

  filter(api, list, bitmask) {
    this._check("filter");
    return this.cb.filter(api, list, bitmask);
  }

  getActive(api, list) {
    this._check("getActive");
    return this.cb.getActive(api, list);
  }

  setActive(api, list, key) {
    this._check("setActive");
    this.cb.setActive(api, list, key);
  }

  getKey(api, list, obj) {
    this._check("getKey");
    return this.cb.getKey(api, list, obj);
  }

  getStruct(api, list, key) {
    if (this.cb.getStruct !== undefined) {
      return this.cb.getStruct(api, list, key);
    }

    let obj = this.get(api, list, key);

    if (obj === undefined) return undefined;

    return api.getStruct(obj.constructor);
  }
}

export class DataStruct {
  constructor(members = [], name = "unnamed") {
    this.members = [];
    this.name = name;
    this.pathmap = {};
    this.flag = 0;
    this.dpath = undefined; //owning DataPath

    this.inheritFlag = 0;

    for (let m of members) {
      this.add(m);
    }
  }

  clear() {
    this.pathmap = {};
    this.members = [];

    return this;
  }

  copy() {
    let ret = new DataStruct();

    ret.name = this.name;
    ret.flag = this.flag;
    ret.inheritFlag = this.inheritFlag;

    for (let m of this.members) {
      let m2 = m.copy();

      //don't copy struct or list references, just
      //direct properties

      if (m2.type === DataTypes.PROP) {
        m2.data = m2.data.copy();
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
  dynamicStruct(path, apiname, uiname, default_struct = undefined) {
    let ret = default_struct ? default_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.DYNAMIC_STRUCT);
    ret.inheritFlag |= this.inheritFlag;

    ret.dpath = dpath;

    this.add(dpath);
    return ret;
  }

  struct(path, apiname, uiname, existing_struct = undefined) {
    let ret = existing_struct ? existing_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.STRUCT);
    ret.inheritFlag |= this.inheritFlag;

    ret.dpath = dpath;

    this.add(dpath);
    return ret;
  }

  customGet(getter) {
    this.dpath.customGet(getter);

    return this;
  }

  customGetSet(getter, setter) {
    this.dpath.customGetSet(getter, setter);

    return this;
  }

  color3(path, apiname, uiname, description) {
    let ret = this.vec3(path, apiname, uiname, description);

    ret.data.subtype = toolprop.PropSubTypes.COLOR;
    ret.range(0, 1);
    ret.simpleSlider();

    ret.noUnits();

    return ret;
  }

  color4(path, apiname, uiname, description = uiname) {
    let ret = this.vec4(path, apiname, uiname, description);

    ret.data.subtype = toolprop.PropSubTypes.COLOR;
    ret.range(0, 1);
    ret.simpleSlider();

    ret.noUnits();

    return ret;
  }

  arrayList(path, apiname, structdef, uiname, description) {
    let ret = this.list(path, apiname, [
      function getIter(api, list) {
        return list[Symbol.iterator]();
      },
      function getLength(api, list) {
        return list.length;
      },
      function get(api, list, key) {
        return list[key];
      },
      function set(api, list, key, val) {
        if (typeof key === "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
      },
      function getKey(api, list, obj) {
        return list.indexOf(obj);
      },
      function getStruct(api, list, key) {
        return structdef;
      },
    ]);

    return ret;
  }

  color3List(path, apiname, uiname, description) {
    return this.vectorList(3, path, apiname, uiname, description, toolprop.PropSubTypes.COLOR);
  }

  color4List(path, apiname, uiname, description) {
    return this.vectorList(4, path, apiname, uiname, description, toolprop.PropSubTypes.COLOR);
  }

  vectorList(size, path, apiname, uiname, description, subtype) {
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

    let prop = new type(undefined, apiname, uiname, description);

    let pstruct = new DataStruct(undefined, "Vector");
    pstruct.vec3("", "co", "Coords", "Coordinates");

    let ret = this.list(path, apiname, [
      function getIter(api, list) {
        return list[Symbol.iterator]();
      },
      function getLength(api, list) {
        return list.length;
      },
      function get(api, list, key) {
        return list[key];
      },
      function set(api, list, key, val) {
        if (typeof key == "string") {
          key = parseInt(key);
        }

        if (key < 0 || key >= list.length) {
          throw new DataPathError("Invalid index " + key);
        }

        list[key] = val;
      },
      function getKey(api, list, obj) {
        return list.indexOf(obj);
      },
      function getStruct(api, list, key) {
        return pstruct;
      },
    ]);

    return ret;
  }

  bool(path, apiname, uiname, description) {
    let prop = new toolprop.BoolProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec2(path, apiname, uiname, description) {
    let prop = new toolprop.Vec2Property(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec3(path, apiname, uiname, description) {
    let prop = new toolprop.Vec3Property(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec4(path, apiname, uiname, description) {
    let prop = new toolprop.Vec4Property(undefined, apiname, uiname, description);
    //prop.uiname = uiname;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  float(path, apiname, uiname, description) {
    let prop = new toolprop.FloatProperty(0, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  textblock(path, apiname, uiname, description) {
    let prop = new toolprop.StringProperty(undefined, apiname, uiname, description);
    prop.multiLine = true;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  report(path, apiname, uiname, description) {
    let prop = new toolprop.ReportProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  string(path, apiname, uiname, description) {
    let prop = new toolprop.StringProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  int(path, apiname, uiname, description, prop = undefined) {
    if (!prop) {
      prop = new toolprop.IntProperty(0, apiname, uiname, description);
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  curve1d(path, apiname, uiname, description) {
    let prop = new Curve1DProperty(undefined);

    prop.apiname = apiname;
    prop.uiname = uiname;
    prop.description = description;

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  enum(path, apiname, enumdef, uiname, description) {
    let prop;

    if (enumdef instanceof toolprop.EnumProperty) {
      prop = enumdef;
    } else {
      prop = new toolprop.EnumProperty(undefined, enumdef, apiname, uiname, description);
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  list(path, apiname, funcs) {
    let array = new DataList(funcs);

    let dpath = new DataPath(path, apiname, array);
    dpath.type = DataTypes.ARRAY;

    this.add(dpath);
    return dpath;
  }

  flags(path, apiname, enumdef, uiname, description) {
    let prop;

    if (enumdef === undefined || !(enumdef instanceof toolprop.ToolProperty)) {
      prop = new toolprop.FlagProperty(undefined, enumdef, apiname, uiname, description);
    } else {
      prop = enumdef;
    }

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  remove(m) {
    if (typeof m === "string") {
      m = this.pathmap[m];
    }

    if (!(m.apiname in this.pathmap)) {
      throw new Error("Member not in struct " + m.apiname);
    }

    delete this.pathmap[m.apiname];
    this.members.remove(m);
  }

  fromToolProp(path, prop, apiname = prop.apiname.length > 0 ? prop.apiname : path) {
    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  add(m) {
    if (m.apiname in this.pathmap) {
      if (window.DEBUG.datapaths) {
        console.warn("Overriding existing member '" + m.apiname + "' in datapath struct", this.name);
      }

      this.remove(this.pathmap[m.apiname]);
    }

    m.flag |= this.inheritFlag;

    this.members.push(m);
    m.parent = this;

    this.pathmap[m.apiname] = m;

    return this;
  }
}

let _map_struct_idgen = 1;
let _map_structs = {};

window._debug__map_structs = _map_structs; //global for debugging purposes only

let _dummypath = new DataPath();

let DummyIntProperty = new IntProperty();
const CLS_API_KEY = Symbol("dp_map_id");
const CLS_API_KEY_CUSTOM = Symbol("dp_map_custom");

export class DataAPI extends ModelInterface {
  constructor() {
    super();

    this.rootContextStruct = undefined;
    this.structs = [];
  }

  get list() {
    return undefined;
  }

  static toolRegistered(cls) {
    return ToolOp.isRegistered(cls);
    //let key = toolkey(cls);
    //return key in tool_classes;
  }

  static registerTool(cls) {
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

  setRoot(sdef) {
    this.rootContextStruct = sdef;
  }

  hasStruct(cls) {
    return cls.hasOwnProperty(CLS_API_KEY);
  }

  getStruct(cls) {
    return this.mapStruct(cls, false);
  }

  mergeStructs(dest, src) {
    for (let m of src.members) {
      dest.add(m.copy());
    }
  }

  inheritStruct(cls, parent, auto_create_parent = false) {
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

  _addClass(cls, dstruct) {
    let key = _map_struct_idgen++;
    cls[CLS_API_KEY] = key;

    this.structs.push(dstruct);

    _map_structs[key] = dstruct;
  }

  /* Associate cls with a DataStruct
   * via callback, which will be called
   * with an instance of cls as its argument*/
  mapStructCustom(cls, callback) {
    this.mapStruct(cls, true);
    cls[CLS_API_KEY_CUSTOM] = callback;
  }

  mapStruct(cls, auto_create = true, name = cls.name) {
    let key;

    if (!cls.hasOwnProperty(CLS_API_KEY)) {
      key = undefined;
    } else {
      key = cls[CLS_API_KEY];
    }

    if (key === undefined && auto_create) {
      let dstruct = new DataStruct(undefined, name);
      this._addClass(cls, dstruct);
      return dstruct;
    } else if (key === undefined) {
      throw new Error("class does not have a struct definition: " + name);
    }

    return _map_structs[key];
  }

  //used for tagging error messages
  pushReportContext(name) {
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
  massSetProp(ctx, massSetPath, value) {
    for (let path of this.resolveMassSetPaths(ctx, massSetPath)) {
      this.setValue(ctx, path, value);
    }
  }

  resolveMassSetPaths(ctx, massSetPath) {
    if (massSetPath.startsWith("/")) {
      massSetPath = massSetPath.slice(1, massSetPath.length);
    }

    let start = massSetPath.search("{");
    let end = massSetPath.search("}");

    if (start < 0 || end < 0) {
      throw new DataPathError("Invalid mass set datapath: " + massSetPath);
      return;
    }

    let prefix = massSetPath.slice(0, start - 1);
    let filter = massSetPath.slice(start + 1, end);
    let suffix = massSetPath.slice(end + 2, massSetPath.length);

    let rdef = this.resolvePath(ctx, prefix);

    if (!(rdef.prop instanceof DataList)) {
      throw new DataPathError("massSetPath expected a path resolving to a DataList: " + massSetPath);
    }

    let paths = [];

    let list = rdef.prop;
    let api = ctx.api;

    function applyFilter(obj) {
      const forceEval = rdef.dpath.flag & DataFlags.USE_EVAL_MASS_SET_PATHS;

      if (obj === undefined) {
        return undefined;
      } else if (!forceEval && (typeof obj === "object" || typeof obj === "function")) {
        let st = api.mapStruct(obj.constructor, false);

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
            util.print_stack(error);
            console.error("Error in datapath callback");
          }

          return false;
        }
      } else {
        let $ = obj;
        return eval(filter);
      }
    }

    for (let obj of list.getIter(this, rdef.value)) {
      if (!applyFilter(obj)) {
        continue;
      }

      let key = "" + list.getKey(this, rdef.value, obj);
      let path = `${prefix}[${key}]${suffix}`;

      /* validate the final path */
      try {
        this.getValue(ctx, path);
      } catch (error) {
        if (!(error instanceof DataPathError)) {
          util.print_stack(error);
          console.error(path + ": Error in datapath API");
        }

        continue;
      }

      paths.push(path);
    }

    return paths;
  }

  resolvePath(ctx, inpath, ignoreExistence = false, dstruct = undefined) {
    let parser = parserStack[parserStack.cur++];
    let ret = undefined;

    if (inpath[0] === "/") {
      inpath = inpath.slice(1, inpath.length).trim();
    }

    try {
      ret = this.resolvePath_intern(ctx, inpath, ignoreExistence, parser, dstruct);
    } catch (error) {
      //throw new DataPathError("bad path " + path);
      if (!(error instanceof DataPathError)) {
        util.print_stack(error);
        report("error while evaluating path " + inpath);
      }

      if (window.DEBUG && window.DEBUG.datapaths) {
        util.print_stack(error);
      }

      ret = undefined;
    }

    parserStack.cur--;

    if (ret !== undefined && ret.prop && ret.dpath && ret.dpath.flag & DataFlags.USE_CUSTOM_PROP_GETTER) {
      ret.prop = this.getPropOverride(ctx, inpath, ret.dpath, ret.obj);
    }

    if (ret !== undefined && ret.prop && ret.dpath && ret.dpath.ui_name_get) {
      let dummy = {
        datactx : ctx,
        datapath: inpath,
        dataref : ret.obj,
      };

      let name = ret.dpath.ui_name_get.call(dummy);

      ret.prop.uiname = "" + name;
    }

    return ret;
  }

  getPropOverride(ctx, path, dpath, obj, prop = dpath.data) {
    prop.ctx = ctx;
    prop.datapath = path;
    prop.dataref = obj;

    let newprop = getTempProp(prop.type);
    prop.copyTo(newprop);

    dpath.propGetter.call(prop, newprop);
    prop.ctx = prop.datapath = prop.dataref = undefined;

    return newprop;
  }

  /**
   get meta information for a datapath.

   @param ignoreExistence: don't try to get actual data associated with path,
    just want meta information
   */
  resolvePath_intern(ctx, inpath, ignoreExistence = false, p = pathParser, dstruct = undefined) {
    inpath = inpath.replace("==", "=");

    p.input(inpath);

    dstruct = dstruct || this.rootContextStruct;

    let obj = ctx;
    let lastobj = ctx;
    let subkey;
    let lastobj2 = undefined;
    let lastkey = undefined;
    let prop = undefined;
    let lastdpath = undefined;

    function p_key() {
      let t = p.peeknext();
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
      let dpath = dstruct.pathmap[key];

      lastdpath = dpath;

      if (dpath === undefined) {
        if (key === "length" && prop !== undefined && prop instanceof DataList) {
          prop.getLength(this, obj);
          key = "length";

          prop = DummyIntProperty;

          prop.name = "length";
          prop.flag = PropFlags.READ_ONLY;

          dpath = _dummypath;
          dpath.type = DataTypes.PROP;
          dpath.data = prop;
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
          let act = prop.getActive(this, obj);

          if (act === undefined && !ignoreExistence) {
            throw new DataPathError("no active elem ent for list");
          }

          let actkey = obj !== undefined && act !== undefined ? prop.getKey(this, obj, act) : undefined;

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
        dstruct = dpath.data;
      } else if (dpath.type === DataTypes.DYNAMIC_STRUCT) {
        let ok = false;

        if (obj !== undefined) {
          let obj2;

          if (dpath.flag & DataFlags.USE_CUSTOM_GETSET) {
            let fakeprop = dpath.getSet;
            fakeprop.ctx = ctx;
            fakeprop.dataref = obj;
            fakeprop.datapath = inpath;

            obj2 = fakeprop.get();

            fakeprop.ctx = fakeprop.datapath = fakeprop.dataref = undefined;
          } else {
            obj2 = obj[dpath.path];
          }

          dynstructobj = obj2;

          if (obj2 !== undefined) {
            if (CLS_API_KEY_CUSTOM in obj2.constructor) {
              dstruct = obj2.constructor[CLS_API_KEY_CUSTOM](obj2);
            } else {
              dstruct = this.mapStruct(obj2.constructor, false);
            }
          } else {
            dstruct = dpath.data;
          }

          if (dstruct === undefined) {
            dstruct = dpath.data;
          }

          ok = dstruct !== undefined;
        }

        if (!ok) {
          throw new DataPathError("dynamic struct error for path: " + inpath);
        }
      } else {
        prop = dpath.data;
      }

      if (prop && dpath.flag & DataFlags.USE_CUSTOM_PROP_GETTER) {
        prop = this.getPropOverride(ctx, inpath, dpath, obj);
      }

      if (dpath.path.search(/\./) >= 0) {
        let keys = dpath.path.split(/\./);

        for (let key of keys) {
          lastobj2 = lastobj;
          lastobj = obj;
          lastkey = key;

          if (obj === undefined && !ignoreExistence) {
            throw new DataPathError("no data for " + inpath);
          } else if (obj !== undefined) {
            obj = obj[key.trim()];
          }
        }
      } else {
        lastobj2 = lastobj;
        lastobj = obj;

        lastkey = dpath.path;

        if (dpath.flag & DataFlags.USE_CUSTOM_GETSET) {
          let fakeprop = dpath.getSet;

          if (!fakeprop && dpath.type === DataTypes.PROP) {
            let prop = dpath.data;

            prop.ctx = ctx;
            prop.dataref = obj;
            prop.datapath = inpath;

            try {
              obj = prop.getValue();
            } catch (error) {
              util.print_stack(error);
              obj = undefined;
            }

            if (typeof obj === "string" && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
              obj = prop.values[obj];
            }

            prop.ctx = prop.dataref = prop.datapath = undefined;
          } else {
            fakeprop.ctx = ctx;
            fakeprop.dataref = obj;
            fakeprop.datapath = inpath;

            obj = fakeprop.get();
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

      let t = p.peeknext();
      if (t === undefined) {
        break;
      }

      if (t.type === "DOT") {
        p.next();
      } else if (t.type === "EQUALS" && prop !== undefined && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        p.expect("EQUALS");

        let t2 = p.peeknext();
        let type = t2 && t2.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = dpath.path;
        obj = !!(lastobj[key] == val);
      } else if (t.type === "AND" && prop !== undefined && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        p.expect("AND");

        let t2 = p.peeknext();
        let type = t2 && t2.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = dpath.path;
        obj = !!(lastobj[key] & val);
      } else if (t.type === "LSBRACKET" && prop !== undefined && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        p.expect("LSBRACKET");

        let t2 = p.peeknext();
        let type = t2 && t2.type === "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          console.warn(inpath, prop.values, val1, prop);
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        let bitfield;
        key = dpath.path;

        if (!(prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
          bitfield = lastobj ? lastobj[key] : 0;
        } else {
          prop.dataref = lastobj;
          prop.datapath = inpath;
          prop.ctx = ctx;

          try {
            bitfield = prop.getValue();
          } catch (error) {
            util.print_stack(error);

            bitfield = NaN;
          }
        }

        if (lastobj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for path " + inpath);
        } else if (lastobj !== undefined) {
          if (prop.type === PropTypes.ENUM) {
            obj = !!(bitfield === val);
          } else {
            obj = !!(bitfield & val);
          }
        }

        p.expect("RSBRACKET");
      } else if (t.type === "LSBRACKET" && prop !== undefined && isVecProperty(prop)) {
        p.expect("LSBRACKET");
        let num = p.expect("NUM");
        p.expect("RSBRACKET");

        subkey = num;

        if (prop !== undefined && !(prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT))) {
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

        if (p.peeknext() !== undefined && p.peeknext().type === "DOT") {
          p.next();
        }
      }

      if (_i++ > 1000) {
        console.warn("infinite loop in resolvePath parser");
        break;
      }
    }

    if (prop && prop.type & (PropTypes.ENUM | PropFlags.FLAG)) {
      prop.checkMeta();
    }

    return {
      dpath  : lastdpath,
      parent : lastobj2,
      obj    : lastobj,
      value  : obj,
      key    : lastkey,
      dstruct: dstruct,
      prop   : prop,
      subkey : subkey,
    };
  }

  _parsePathOverrides(path) {
    let parts = ["", undefined, undefined];

    const TOOLPATH = 0,
      NAME = 1,
      HOTKEY = 2;
    let part = TOOLPATH;

    for (let i = 0; i < path.length; i++) {
      let c = path[i];
      let n = i < path.length - 1 ? path[i + 1] : "";

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
      path  : parts[TOOLPATH].trim(),
      uiname: parts[NAME] ? parts[NAME].trim() : undefined,
      hotkey: parts[HOTKEY] ? parts[HOTKEY].trim() : undefined,
    };
  }

  /** Get tooldef for path, applying any modifications, e.g.:
   *  "app.some_tool()|Label::CustomHotkeyString"
   * */
  getToolDef(toolpath) {
    let { path, uiname, hotkey } = this._parsePathOverrides(toolpath);

    let cls = this.parseToolPath(path);
    if (cls === undefined) {
      throw new DataPathError('unknown path "' + path + '"');
    }

    let def = cls.tooldef();
    if (uiname) {
      def.uiname = uiname;
    }
    if (hotkey) {
      def.hotkey = hotkey;
    }

    return def;
  }

  getToolPathHotkey(ctx, toolpath) {
    let { path, uiname, hotkey } = this._parsePathOverrides(toolpath);

    if (hotkey) {
      return hotkey;
    }

    try {
      return this.#getToolPathHotkey_intern(ctx, path);
    } catch (error) {
      print_stack(error);
      util.console.context("api").log("failed to fetch tool path: " + path);

      return undefined;
    }
  }

  #getToolPathHotkey_intern(ctx, path) {
    let screen = ctx.screen;
    let this2 = this;

    function searchKeymap(keymap) {
      if (keymap === undefined) {
        return undefined;
      }

      let ret;

      function search(cb) {
        if (ret) {
          return;
        }

        for (let hk of keymap) {
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
    let areacls = screen.sareas[0].area.constructor;
    let area = areacls.getActiveArea();

    if (area) {
      for (let keymap of area.getKeyMaps()) {
        let ret = searchKeymap(keymap);

        if (ret !== undefined) {
          return ret;
        }
      }
    }

    //search all other areas
    for (let sarea of screen.sareas) {
      if (!sarea.area) continue;

      for (let keymap of sarea.area.getKeyMaps()) {
        let ret = searchKeymap(keymap);

        if (ret) {
          return ret;
        }
      }
    }

    return this.keymap ? searchKeymap(this.keymap) : false;
  }

  parseToolPath(path) {
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

  parseToolArgs(path) {
    return parseToolPath(path).args;
  }

  createTool(ctx, path, inputs = {}) {
    let cls;
    let args;

    if (typeof path == "string" || path instanceof String) {
      //parseToolPath will raise DataPathError if path is malformed
      let tpath = parseToolPath(path);

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
    const tooldef = cls._getFinalToolDef();
    if (inputs !== undefined) {
      for (let k in inputs) {
        if (!(k in tooldef.inputs)) {
          console.warn(cls.tooldef().uiname + ': Unknown tool property "' + k + '"');
          continue;
        }

        if (!(k in args)) {
          args[k] = inputs[k];
        }
      }
    }

    let tool = cls.invoke(ctx, args);

    if (inputs !== undefined) {
      for (let k in inputs) {
        if (!(k in tool.inputs)) {
          console.warn(cls.tooldef().uiname + ': Unknown tool property "' + k + '"');
          continue;
        }

        tool.inputs[k].setValue(inputs[k]);
      }
    }

    return tool;
  }
}

export function initSimpleController() {
  initToolPaths();
}

import { DataPathSetOp } from "./controller_ops.js";
import { Curve1DProperty } from "../curve/curve1d_toolprop.js";

let dpt = DataPathSetOp;

export function getDataPathToolOp() {
  return dpt;
}

export function setDataPathToolOp(cls) {
  ToolOp.unregister(DataPathSetOp);

  if (!ToolOp.isRegistered(cls)) {
    ToolOp.register(cls);
  }

  dpt = cls;
}

setImplementationClass(DataAPI);
