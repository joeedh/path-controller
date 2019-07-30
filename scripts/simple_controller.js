import * as toolprop from './toolprop.js';
import * as parseutil from './parseutil.js';
import {print_stack} from './util.js';

let tk = (name, re, func) => new parseutil.tokdef(name, re, func);
let tokens = [
  tk("ID", /[a-zA-Z_$]+[a-zA-Z_$0-9]*/),
  tk("NUM", /[0-9]+/, (t) => {
    t.value = parseInt(t.value);
    return t;
  }),
  tk("STRLIT", /'.*'/, (t) => {
    t.value = t.value.slice(1, t.value.length-1);
    return t;
  }),
  tk("STRLIT", /".*"/, (t) => {
    t.value = t.value.slice(1, t.value.length-1);
    return t;
  }),
  tk("DOT", /\./),
  tk("EQUALS", /(\=)|(\=\=)/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("AND", /\&/),
  tk("WS", /[ \t\n\r]+/, (t) => undefined) //drok token
];

let lexer = new parseutil.lexer(tokens, (t) => {
  console.warn("Parse error", t);
  throw new DataPathError();
});

export let pathParser = new parseutil.parser(lexer);

let PropFlags = toolprop.PropFlags,
    PropTypes = toolprop.PropTypes;

import {ModelInterface, ToolOpIface,
        DataFlags, DataPathError} from './controller.js';
import {initToolPaths, parseToolPath} from './toolpath.js';
export {DataPathError, DataFlags} from './controller.js';

export let tool_classes = {};
let tool_idgen = 1;
Symbol.ToolID = Symbol("toolid");

function toolkey(cls) {
  if (!(Symbol.ToolID in cls)) {
    cls[Symbol.ToolID] = tool_idgen++;
  }

  return cls[Symbol.ToolID];
}

export const DataTypes = {
  STRUCT : 0,
  PROP   : 1,
  ARRAY  : 2
};

export class DataPath {
  constructor(path, apiname, prop, type=DataTypes.PROP) {
    this.type = type;
    this.data = prop;
    this.apiname = apiname;
    this.path = path;
    this.struct = undefined;
  }

  copy() {
    let ret = new DataPath();

    ret.type = this.type;
    ret.data = this.data;
    ret.apiname = this.apiname;
    ret.path = this.path;
    ret.struct = this.struct;

    return ret;
  }

  setProp(prop) {
    this.data = prop;
  }

  read_only() {
    this.flag |= DataFlags.READ_ONLY;
    return this;
  }

  //get/set will be called
  //like other callbacks,
  //e.g. the real object owning the property
  //will be stored in this.dataref
  customGetSet(get, set) {
    this.data.flag |= PropFlags.USE_CUSTOM_GETSET;

    this.data._getValue = this.data.getValue;
    this.data._setValue = this.data.setValue;

    if (get)
      this.data.getValue = get;

    if (set)
      this.data.setValue = set;

    return this;
  }

  /**db will be executed with underlying data object
    that contains this path in 'this.dataref'

    main event is 'change'
   */
  on(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.on(type, cb);
    } else {
      throw new Error("invalid call to DataPath.on");
    }

    return this;
  }

  off(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.off(type, cb);
    }
  }

  range(min, max) {
    this.data.setRange(min, max);
    return this;
  }

  decimalPlaces(n) {
    this.data.setDecimalPlaces(n);
    return this;
  }

  radix(r) {
    this.data.setRadix(r);
    return this;
  }

  step(s) {
    this.data.setStep(s);
    return this;
  }

  icon(i) {
    this.data.setIcon(i);
    return this;
  }

  icons(icons) { //for enum/flag properties
    this.data.addIcons(icons);
    return this;
  }

  description(d) {
    this.data.description = d;
    return this;
  }
}

/*this is a bitmask of standard filters
* for the data list interface*/
export const StandardListFilters = {
  SELECTED : 1,
  EDITABLE : 2,
  VISIBLE  : 4,
  ACTIVE   : 8
};

export class DataList {
  /**
    Okay, this is a simple interface for the controller to access lists,
    whether it's {} object maps, [] arrays, util.set's, or whatever.

    In fairmotion I used a lambda-type filter system, but that was problematic as it
    didn't support any sort of abstraction or composition, so the lamba strings ended up
    like this:
      "($.flag & SELECT) && !($.flag & HIDE) && !($.flag & GHOST) && (ctx.spline.layers.active.id in $.layers)

    Hopefully this new bitmask system will work better.

  * Callbacks is an array of name functions, like so:
   - function getStruct(api, list, key) //return DataStruct type of object in key, key is optional if omitted return base type of all objects?
   - function get(api, list, key)
   - function getLength(api, list)
   - function set(api, list, key, val)
   - function getActive(api, list)
   - function setActive(api, list, key)
   - function getIter(api, list)
   - function filter(api, list, filter : StandardListFilters bitmask) returns an iterable
   - function getKey(api, list, object) returns object's key in this list, either a string or a number
  * */

  copy() {
    let ret = new DataList([this.cb.get]);

    for (let k in this.cb) {
      ret.cb[k] = this.cb[k];
    }

    return ret;
  }

  constructor(callbacks) {
    if (callbacks === undefined) {
      throw new DataPathError("missing callbacks argument to DataList");
    }

    this.cb = {};
    for (let cb of callbacks) {
      this.cb[cb.name] = cb;
    }

    let check = (key) => {
      if (!(key in this.cbs)) {
        throw new DataPathError(`Missing ${key} callback in DataList`);
      }
    }
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
    this._check("set");
    this.cb.set(api, list, key, val);
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

    if (obj === undefined)
      return undefined;

    return api.getStruct(obj.constructor);
  }
}

export class DataStruct {
  constructor(members=[], name="unnamed") {
    this.members = [];
    this.name = name;
    this.pathmap = {};

    for (let m of members) {
      this.add(m);
    }
  }

  struct(path, apiname, uiname, existing_struct=undefined) {
    let ret = existing_struct ? existing_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.STRUCT);

    this.add(dpath);
    return ret;
  }

  color3(path, apiname, uiname, description) {
    let ret = this.vec3(path, apiname, uiname, description);

    ret.data.subtype = toolprop.PropSubTypes.COLOR;

    return ret;
  }

  color4(path, apiname, uiname, description) {
    let ret = this.vec4(path, apiname, uiname, description);

    ret.data.subtype = toolprop.PropSubTypes.COLOR;

    return ret;
  }

  vec2(path, apiname, uiname, description) {
    let prop = new toolprop.Vec2Property(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec3(path, apiname, uiname, description) {
    let prop = new toolprop.Vec3Property(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  vec4(path, apiname, uiname, description) {
    let prop = new toolprop.Vec4Property(undefined, apiname, uiname, description);

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

  string(path, apiname, uiname, description) {
    let prop = new toolprop.StringProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  int(path, apiname, uiname, description) {
    let prop = new toolprop.IntProperty(0, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  enum(path, apiname, enumdef, uiname, description) {
    let prop = new toolprop.EnumProperty(undefined, enumdef, apiname, uiname, description);

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
    let prop = new toolprop.FlagProperty(undefined, enumdef, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }

  add(m) {
    this.members.push(m);
    m.parent = this;

    this.pathmap[m.apiname] = m;

    return this;
  }
}

let _map_struct_idgen = 1;
let _map_structs = {};

window._debug__map_structs = _map_structs; //global for debugging purposes only

export class DataListIF {
  constructor(api) {
    this.api = api;
  }

  iterate(ctx, path) {
    let res = this.api.resolvePath(ctx, path);

    let list = res.obj;
    return res.prop.getIter(this.api, list);
  }

  getLength(ctx, path) {
    let res = this.api.resolvePath(ctx, path);

    let list = res.obj;
    return res.prop.getLength(this.api, list);
  }

  getObjectKey(ctx, listpath, object) {
    let res = this.api.resolvePath(ctx, listpath);

    let list = res.obj;
    return res.prop.getKey(this.api, list, object);
  }

  getObjectStruct(ctx, listpath, key) {
    let res = this.api.resolvePath(ctx, listpath);

    let list = res.obj;
    return res.prop.getStruct(this.api, list, key);
  }
}

let _dummypath = new DataPath();

export class DataAPI extends ModelInterface {
  constructor() {
    super();

    this._list = new DataListIF(this);
    this.rootContextStruct = undefined;
  }

  get list() {
    return this._list;
  }

  setRoot(sdef) {
    this.rootContextStruct = sdef;
  }

  getStruct(cls) {
    return this.mapStruct(cls, false);
  }

  mergeStructs(dest, src) {
    for (let m of src.members) {
      dest.add(m.copy());
    }
  }

  mapStruct(cls, auto_create=true) {
    let key;

    if (!cls.hasOwnProperty("__dp_map_id")) {
      key = undefined;
    } else {
      key = cls.__dp_map_id;
    }

    if (key === undefined && auto_create) {
      key = cls.__dp_map_id = _map_struct_idgen++;
      _map_structs[key] = new DataStruct(undefined, cls.name);
    } else if (key === undefined) {
      return undefined;
    }

    return _map_structs[key];
  }

  /**
    get meta information for a datapath.

   @param ignoreExistence: don't try to get actual data associated with path,
                           just want meta information
    */
  resolvePath(ctx, inpath, ignoreExistence=false) {
    let p = pathParser;
    inpath = inpath.replace("==", "=");

    p.input(inpath);

    let dstruct = this.rootContextStruct;
    let obj = ctx;
    let lastobj = ctx;
    let subkey;
    let lastobj2 = undefined;
    let lastkey = undefined;
    let prop = undefined;

    function p_key() {
      let t = p.peeknext();
      if (t.type == "NUM" || t.type == "STRLIT") {
        p.next();
        return t.value;
      } else {
        throw new PUTLParseError("Expected list key");
      }
    }

    let _i=0;
    while (!p.at_end()) {
      let key = p.expect("ID");
      let path = dstruct.pathmap[key];

      if (path === undefined) {
        if (prop !== undefined && prop instanceof DataList && key == "active") {
          let act = prop.getActive(this, obj);

          if (act === undefined && !ignoreExistence) {
            throw new DataPathError("no active elem ent for list");
          }

          dstruct = prop.getStruct(this, obj, prop.getKey(this, obj, act));
          if (dstruct === undefined) {
            throw new DataPathError("couldn't get data type for " + inpath + "'s element '" + key + "'");
          }

          path = _dummypath;

          path.type = DataTypes.STRUCT;
          path.data = dstruct;
          path.path = key;
        } else {
          throw new DataPathError(inpath + ": unknown property " + key);
        }
      }

      if (path.type == DataTypes.STRUCT) {
        dstruct = path.data;
      } else {
        prop = path.data;
      }

      if (path.path.search(/\./) >= 0) {
        let keys = path.path.split(/\./);
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

        lastkey = path.path;
        if (obj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for " + inpath);
        } else if (obj !== undefined) {
          obj = obj[path.path];
        }
      }

      let t = p.peeknext();
      if (t === undefined) {
        break;
      }

      if (t.type == "DOT") {
        p.next();
      } else if (t.type == "EQUALS" && prop !== undefined && (prop.type & (PropTypes.ENUM|PropTypes.FLAG))) {
        p.expect("EQUALS");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        //console.log("== in resolvepath", lastobj, val, path.path);
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

        key = path.path;
        obj = !!(lastobj[key] == val);
      } else if (t.type == "AND" && prop !== undefined && (prop.type & (PropTypes.ENUM|PropTypes.FLAG))) {
        p.expect("AND");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        //console.log("== in resolvepath", lastobj, val, path.path);
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

        key = path.path;
        obj = !!(lastobj[key] & val);
      } else if (t.type == "LSBRACKET" && prop !== undefined && (prop.type & (PropTypes.ENUM|PropTypes.FLAG))) {
        p.expect("LSBRACKET");

        let t2 = p.peeknext();
        let type = t2 && t2.type == "ID" ? "ID" : "NUM";

        let val = p.expect(type);

        //console.log("== in resolvepath", lastobj, val, path.path);
        let val1 = val;

        if (typeof val == "string") {
          val = prop.values[val];
        }

        if (val === undefined) {
          console.log(prop.values, val1, prop);
          throw new DataPathError("unknown value " + val1);
        }

        if (val in prop.keys) {
          subkey = prop.keys[val];
        }

        key = path.path;
        if (lastobj === undefined && !ignoreExistence) {
          throw new DataPathError("no data for path " + inpath);
        } else if (lastobj !== undefined) {
          if (prop.type == PropTypes.ENUM) {
            obj = !!(lastobj[key] == val);
          } else {
            obj = !!(lastobj[key] & val);
          }
        }

        p.expect("RSBRACKET");
      } else if (t.type == "LSBRACKET") {
        p.expect("LSBRACKET")

        if (lastkey && typeof lastkey == "string" && lastkey.length > 0) {
          lastobj = lastobj[lastkey];
        }

        lastkey = p_key();
        p.expect("RSBRACKET");

        if (!(prop instanceof DataList)) {
          throw new DataPathError("bad property, not a list");
        }

        obj = prop.get(this, lastobj, lastkey);
        dstruct = prop.getStruct(this, lastobj, lastkey);

        if (p.peeknext() !== undefined && p.peeknext().type == "DOT") {
          p.next();
        }
      }

      if (_i++ > 1000) {
        console.warn("infinite loop in resolvePath parser");
        break;
      }
    }

    return {
      parent : lastobj2,
      obj : lastobj,
      value : obj,
      key : lastkey,
      dstruct : dstruct,
      prop : prop,
      subkey : subkey
    };
  }

  resolvePathOld2(ctx, path) {
    let splitchars = new Set([".", "[", "]", "=", "&"]);
    let subkey = undefined;

    path = path.replace(/\=\=/g, "=");

    path = "." + this.prefix + path;
    //console.log(path);

    let p = [""];
    for (let i=0; i<path.length; i++) {
      let s = path[i];

      if (splitchars.has(s)) {
        if (s != "]") {
          p.push(s);
        }

        p.push("");
        continue;
      }

      p[p.length-1] += s;
    }

    for (let i=0; i<p.length; i++) {
      p[i] = p[i].trim();

      if (p[i].length == 0) {
        p.remove(p[i]);
        i--;
      }

      let c = parseInt(p[i]);
      if (!isNaN(c)) {
        p[i] = c;
      }
    }

    //console.log(p);
    let i = 0;

    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;
    let arg = undefined;
    let type = "normal";
    let retpath = p;
    let prop;
    let lastkey=key, a;
    let apiname = key;

    while (i < p.length-1) {
      lastkey = key;
      apiname = key;

      if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
        let dpath = dstruct.pathmap[lastkey];

        apiname = dpath.apiname;
      }

      let a = p[i];
      let b = p[i+1];

      //check for enum/flag propertys with [] form
      if (a == "[") {
        let ok = false;

        key = b;
        prop = undefined;

        console.log("key", key, "lastkey", lastkey, "apiname", apiname);

        if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
          let dpath = dstruct.pathmap[lastkey];

          if (dpath.type == DataTypes.PROP) {
            prop = dpath.data;
          }
        }

        if (prop !== undefined && (prop.type == PropTypes.ENUM || prop.type == PropTypes.FLAG)) {
          console.log("found flag/enum property");
          ok = true;
        }

        if (ok) {
          if (isNaN(parseInt(key))) {
            key = prop.values[key];
          } else if (typeof key == "int") {
            key = parseInt(key);
          }

          let value = obj;
          if (typeof value == "string") {
            value = prop.values[key];
          }

          if (prop.type == PropTypes.ENUM) {
            value = !!(value == key);
          } else { //flag
            value = !!(value & key);
          }

          if (key in prop.keys) {
            subkey = prop.keys[key];
          }

          obj = value;
          i++;
          continue;
        }
      }

      if (dstruct !== undefined && dstruct.pathmap[lastkey]) {
        let dpath = dstruct.pathmap[lastkey];

        if (dpath.type == DataTypes.PROP) {
          prop = dpath.data;
        }
      }

      if (a == "." || a == "[") {
        key = b;
        
        parent2 = parent1;
        parent1 = obj;
        obj = obj[b];
        
        if (obj === undefined || obj === null) {
          break;
        }
        
        if (typeof obj == "object") {
          dstruct = this.mapStruct(obj.constructor, false);
        }
        
        i += 2;
        continue;
      } else if (a == "&") {
        obj &= b;
        arg = b;

        if (b in prop.keys) {
          subkey = prop.keys[b];
        }

        i += 2;
        type = "flag";
        continue;
      } else if (a == "=") {
        obj = obj == b;
        arg = b;

        if (b in prop.keys) {
          subkey = prop.keys[b];
        }

        i += 2;
        type = "enum";
        continue;
      } else {
        throw new DataPathError("bad path " + path);
      }
      
      i++;
    }
    /*
    console.log(p);
    console.log(parent2);
    console.log(parent1);
    console.log(obj);
    //*/

    if (lastkey !== undefined && dstruct !== undefined && dstruct.pathmap[lastkey]) {
      let dpath = dstruct.pathmap[key];

      apiname = dpath.apiname;
    }

    if (apiname != "selectmode")
      console.log(apiname);

    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];
      
      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }
    
    return {
      parent : parent2,
      obj : parent1,
      value : obj,
      key : key,
      dstruct : dstruct,
      subkey : subkey,
      prop : prop,
      arg : arg,
      type : type,
      _path : retpath
    };
  }
  
  /*returns {
    obj : [object owning property key]
    parent : [parent of obj]
    key : [property key]
    value : [value of property]
    prop : [optional toolprop.ToolProperty representing the property definition]
    struct : [optional datastruct representing the type, if value is an object]
  }
  */    
  resolvePathold(ctx, path) {
    path = this.prefix + path;
    path = path.replace(/\[/g, ".").replace(/\]/g, "").trim().split(".");
    
    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;
    
    for (let c of path) {
      let c2 = parseInt(c);
      if (!isNaN(c2)) {
        c = c2;
      }
      
      parent2 = parent1;
      parent1 = obj;
      key = c;

      if (typeof obj == "number") {
        //bitmask test
        obj = obj & c;
        break;
      }

      obj = obj[c];
      
      if (typeof obj == "object") {
        dstruct = this.mapStruct(obj.constructor, false);
      }
    }
    
    let prop;
    
    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];
      
      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }
    
    return {
      parent : parent2,
      obj : parent1,
      value : obj,
      key : key,
      dstruct : dstruct,
      prop : prop
    };
  }

  getToolDef(path) {
    let cls = this.parseToolPath(path);
    if (cls === undefined) {
      throw new DataPathError("unknown path \"" + path + "\"");
    }
    
    return cls.tooldef();
  }

  getToolPathHotkey(ctx, path) {
    try {
      return this.getToolPathHotkey_intern(ctx, path);
    } catch (error) {
      print_stack(error);
      console.log("failed to fetch tool path");

      return undefined;
    }
  }

  getToolPathHotkey_intern(ctx, path) {
    let screen = ctx.screen;

    function searchKeymap(keymap) {
      for (let hk of keymap) {
        if (typeof hk.action == "string" && hk.action == path) {
          return hk.buildString();
        }
      }
    }

    if (screen.sareas.length == 0) {
      return searchKeymap(screen.keymap);
    }

    //client might have its own area subclass with
    //getActiveArea defined (that's encouraged),
    //which is why we don't just call Area.getActiveArea
    let areacls = screen.sareas[0].area.constructor;
    let area = areacls.getActiveArea();

    for (let keymap of area.getKeyMaps()) {
      let ret = searchKeymap(keymap);

      if (ret !== undefined) {
        return ret;
      }
    }

    return this.keymap ? searchKeymap(this.keymap) : false;
  }

  parseToolPath(path) {
    return parseToolPath(path).toolclass;
  }

  parseToolArgs(path) {
    return parseToolPath(path).args;
  }

  createTool(ctx, path, inputs={}) {
    //parseToolPath will raise DataPathError if path is malformed
    let tpath = parseToolPath(path);

    let cls = tpath.toolclass;
    let args = tpath.args;

    let tool = cls.invoke(ctx, args);

    if (inputs !== undefined) {
      for (let k in inputs) {
        if (!(k in tool.inputs)) {
          console.warn(cls.tooldef().uiname + ": Unknown tool property \"" + k + "\"");
          continue;
        }
        
        tool.inputs[k].setValue(inputs[k]);
      }
    }
    
    return tool;
  }
  
  static toolRegistered(cls) {
    let key = toolkey(cls);
    
    return key in tool_classes;
  }
  
  static registerTool(cls) {
    let key = toolkey(cls);
    
    if (!(key in tool_classes)) {
      tool_classes[key] = cls;
    }
  }
}

export function registerTool(cls) {
  return DataAPI.registerTool(cls);
}

export function initSimpleController() {
  initToolPaths();
}
