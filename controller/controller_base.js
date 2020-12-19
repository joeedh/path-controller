import {PropFlags, PropTypes} from '../toolsys/toolprop_abstract.js';
import {Quat, Vector2, Vector3, Vector4} from '../util/vectormath.js';
import * as toolprop_abstract from '../toolsys/toolprop_abstract.js';
import * as toolprop from '../toolsys/toolprop.js';
import {print_stack} from '../util/util.js';
import {ToolProperty} from '../toolsys/toolprop.js';

export const DataFlags = {
  READ_ONLY         : 1,
  USE_CUSTOM_GETSET : 2,
  USE_FULL_UNDO     : 4 //DataPathSetOp in controller_ops.js saves/loads entire file for undo/redo
};


export const DataTypes = {
  STRUCT: 0,
  DYNAMIC_STRUCT: 1,
  PROP: 2,
  ARRAY: 3
};


export class DataPathError extends Error {
};


export function getVecClass(proptype) {
  switch (proptype) {
    case PropTypes.VEC2:
      return Vector2;
    case PropTypes.VEC3:
      return Vector3;
    case PropTypes.VEC4:
      return Vector4;
    case PropTypes.QUAT:
      return Quat;
    default:
      throw new Error("bad prop type " + proptype);
  }
}
export function isVecProperty(prop) {
  if (!prop || typeof prop !== "object" || prop === null)
    return false;

  let ok = false;

  ok = ok || prop instanceof toolprop_abstract.Vec2PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec3PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec4PropertyIF;
  ok = ok || prop instanceof toolprop.Vec2Property;
  ok = ok || prop instanceof toolprop.Vec3Property;
  ok = ok || prop instanceof toolprop.Vec4Property;

  ok = ok || prop.type === PropTypes.VEC2;
  ok = ok || prop.type === PropTypes.VEC3;
  ok = ok || prop.type === PropTypes.VEC4;
  ok = ok || prop.type === PropTypes.QUAT;

  return ok;
}

export class DataPath {
  constructor(path, apiname, prop, type = DataTypes.PROP) {
    this.type = type;
    this.data = prop;
    this.apiname = apiname;
    this.path = path;
    this.flag = 0;
    this.struct = undefined;
  }

  copy() {
    let ret = new DataPath();

    ret.flag = this.flag;
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

  readOnly() {
    this.flag |= DataFlags.READ_ONLY;

    if (this.type === DataTypes.PROP) {
      this.data.flag |= PropFlags.READ_ONLY;
    }

    return this;
  }

  read_only() {
    console.warn("DataPath.read_only is deprecated; use readOnly");
    return this.readOnly();
  }

  /**
   *
   * For the callbacks 'this' points to an internal ToolProperty;
   * Referencing object lives in 'this.dataref'; calling context in 'this.ctx';
   * and the datapath is 'this.datapath'
   **/
  customGetSet(get, set) {
    this.flag |= DataFlags.USE_CUSTOM_GETSET;

    if (this.type !== DataTypes.DYNAMIC_STRUCT && this.type !== DataTypes.STRUCT) {
      this.data.flag |= PropFlags.USE_CUSTOM_GETSET;
      this.data._getValue = this.data.getValue;
      this.data._setValue = this.data.setValue;

      if (get)
        this.data.getValue = get;

      if (set)
        this.data.setValue = set;
    } else {
      this.getSet = {
        get, set
      };

      this.getSet.dataref = undefined;
      this.getSet.datapath = undefined;
      this.getSet.ctx = undefined;
    }

    return this;
  }

  customSet(set) {
    this.customGetSet(undefined, set);
    return this;
  }

  customGet(get) {
    this.customGetSet(get, undefined);
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

  simpleSlider() {
    this.data.flag |= PropFlags.SIMPLE_SLIDER;
    return this;
  }

  rollerSlider() {
    this.data.flag &= ~PropFlags.SIMPLE_SLIDER;
    this.data.flag |= PropFlags.FORCE_ROLLER_SLIDER;

    return this;
  }

  noUnits() {
    this.baseUnit("none");
    this.displayUnit("none");
    return this;
  }

  baseUnit(unit) {
    this.data.setBaseUnit(unit);
    return this;
  }

  displayUnit(unit) {
    this.data.setDisplayUnit(unit);
    return this;
  }

  range(min, max) {
    this.data.setRange(min, max);
    return this;
  }

  uiRange(min, max) {
    this.data.setUIRange(min, max);
    return this;
  }

  decimalPlaces(n) {
    this.data.setDecimalPlaces(n);
    return this;
  }

  /**
   * like other callbacks (until I refactor it),
   * func will be called with a mysterious object that stores
   * the following properties:
   *
   * this.dataref  : owning object reference
   * this.datactx  : ctx
   * this.datapath : datapath
   * */
  uiNameGetter(func) {
    this.ui_name_get = func;
    return this;
  }

  expRate(exp) {
    this.data.setExpRate(exp);
    return this;
  }

  /**adds a slider for moving vector component sliders simultaneously*/
  uniformSlider(state=true) {
    this.data.uniformSlider(state);

    return this;
  }

  radix(r) {
    this.data.setRadix(r);
    return this;
  }

  relativeStep(s) {
    this.data.setRelativeStep(s);
    return this;
  }

  step(s) {
    this.data.setStep(s);
    return this;
  }

  /**
   *
   * Tell DataPathSetOp to save/load entire app state for undo/redo
   *
   * */
  fullSaveUndo() {
    this.flag |= DataFlags.USE_FULL_UNDO;
    this.data.flag |= PropFlags.USE_BASE_UNDO;

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

  descriptions(description_map) { //for enum/flag properties
    this.data.addDescriptions(description_map);
    return this;
  }

  uiNames(uinames) {
    this.data.addUINames(uinames);
    return this;
  }

  description(d) {
    this.data.description = d;
    return this;
  }
}

export const StructFlags = {
  NO_UNDO: 1 //struct and its child structs can't participate in undo
             //via the DataPathToolOp
};

export class ListIface {
  getStruct(api, list, key) {

  }
  get(api, list, key) {

  }

  getKey(api, list, obj) {

  }

  getActive(api, list) {

  }

  setActive(api, list, val) {

  }

  set(api, list, key, val) {
    list[key] = val;
  }

  getIter() {

  }

  filter(api, list, filter) {

  }
}

export class ToolOpIface {
  constructor() {
  }

  static tooldef() {return {
    uiname      : "!untitled tool",
    icon        : -1,
    toolpath    : "logical_module.tool", //logical_module need not match up to real module name
    description : undefined,
    is_modal    : false,
    inputs      : {}, //tool properties
    outputs     : {}  //tool properties
  }}
};

export class ModelInterface {
  constructor() {
    this.prefix = "";
  }

  getToolDef(path) {
    throw new Error("implement me");
  }

  getToolPathHotkey(ctx, path) {
    return undefined;
  }

  get list() {
    throw new Error("implement me");
    return ListIface;
  }

  createTool(path, inputs={}, constructor_argument=undefined) {
    throw new Error("implement me");
  }

  //returns tool class, or undefined if one cannot be found for path
  parseToolPath(path) {
    throw new Error("implement me");
  }

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  execOrRedo(ctx, toolop, compareInputs=false) {
    return ctx.toolstack.execOrRedo(ctx, toolop, compareInputs);
  }

  execTool(ctx, path, inputs={}, constructor_argument=undefined) {
    return new Promise((accept, reject) => {
      let tool = path;

      try {
        if (typeof tool == "string" || !(tool instanceof ToolOp)) {
          tool = this.createTool(ctx, path, inputs, constructor_argument);
        }
      } catch (error) {
        print_stack(error);
        reject(error);
        return;
      }

      //give client a chance to change tool instance directly
      accept(tool);

      //execute
      try {
        ctx.toolstack.execTool(ctx, tool);
      } catch (error) { //for some reason chrome is suppressing errors
        print_stack(error);
        throw error;
      }
    });
  }

  //used by simple_controller.js for tagging error messages
  pushReportContext(name) {

  }

  //used by simple_controller.js for tagging error messages
  popReportContext() {

  }

  static toolRegistered(tool) {
    throw new Error("implement me");
  }

  static registerTool(tool) {
    throw new Error("implement me");
  }

  //not yet supported by path.ux's controller implementation
  massSetProp(ctx, mass_set_path, value) {
    throw new Error("implement me");
  }

  /** takes a mass_set_path and returns an array of individual paths */
  resolveMassSetPaths(ctx, mass_set_path) {
    throw new Error("implement me");
  }

  /**
   * @example
   *
   * return {
   *   obj      : [object owning property key]
   *   parent   : [parent of obj]
   *   key      : [property key]
   *   subkey   : used by flag properties, represents a key within the property
   *   value    : [value of property]
   *   prop     : [optional toolprop.ToolProperty representing the property definition]
   *   struct   : [optional datastruct representing the type, if value is an object]
   *   mass_set : mass setter string, if controller implementation supports it
   * }
   */
  resolvePath(ctx, path, ignoreExistence) {
  }

  setValue(ctx, path, val) {
    let res = this.resolvePath(ctx, path);
    let prop = res.prop;

    if (prop !== undefined && (prop.flag & PropFlags.READ_ONLY)) {
      throw new DataPathError("Tried to set read only property");
    }

    if (prop !== undefined && (prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
      prop.dataref = res.obj;
      prop.ctx = ctx;
      prop.datapath = path;

      prop.setValue(val);
      return;
    }

    if (prop !== undefined) {
      if (prop.type === PropTypes.CURVE && !val) {
        throw new DataPathError("can't set curve data to nothing");
      }

      let use_range = (prop.type & (PropTypes.INT | PropTypes.FLOAT));

      use_range = use_range || (res.subkey && (prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)));
      use_range = use_range && prop.range;
      use_range = use_range && !(prop.range[0] === 0.0 && prop.range[1] === 0.0);

      if (use_range) {
        val = Math.min(Math.max(val, prop.range[0]), prop.range[1]);
      }
    }

    let old = res.obj[res.key];

    if (res.subkey !== undefined && res.prop !== undefined && res.prop.type === PropTypes.ENUM) {
      let ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] = ival;
      }
    } else if (res.prop !== undefined && res.prop.type === PropTypes.FLAG) {
      if (res.subkey !== undefined) {
        let ival = res.prop.values[res.subkey];

        if (val) {
          res.obj[res.key] |= ival;
        } else {
          res.obj[res.key] &= ~ival;
        }
      } else if (typeof val === "number" || typeof val === "boolean") {
        val = typeof val === "boolean" ? (val & 1) : val;

        res.obj[res.key] = val;
      } else {
        throw new DataPathError("Expected a number for a bitmask property");
      }
    } else if (res.subkey !== undefined && isVecProperty(res.prop)) {
      res.obj[res.subkey] = val;
    } else if (!(prop !== undefined && prop instanceof ListIface)) {
      res.obj[res.key] = val;
    }

    if (prop !== undefined && prop instanceof ListIface) {
      prop.set(this, res.obj, res.key, val);
    } else if (prop !== undefined) {
      prop.dataref = res.obj;
      prop.datapath = path;
      prop.ctx = ctx;

      prop._fire("change", res.obj[res.key], old);
    }
  }

  getDescription(ctx, path) {
    let rdef = this.resolvePath(ctx, path);
    if (rdef === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    if (!rdef.prop || !(rdef.prop instanceof ToolProperty)) {
      return "";
    }

    let type = rdef.prop.type;
    let prop = rdef.prop;

    if (rdef.subkey !== undefined) {
      let subkey = rdef.subkey;

      if (type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4)) {
        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type & (PropTypes.ENUM|PropTypes.FLAG)) {
        if (!(subkey in prop.values) && subkey in prop.keys) {
          subkey = prop.keys[subkey]
        };

        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type === PropTypes.PROPLIST) {
        let val = tdef.value;
        if (typeof val === "object" && val instanceof ToolProperty) {
          return val.description;
        }
      }
    }

    return rdef.prop.description ? rdef.prop.description : rdef.prop.uiname;
  }

  validPath(ctx, path) {
    try {
      this.getValue(ctx, path);
      return true;
    } catch (error) {
      if (!(error instanceof DataPathError)) {
        throw error;
      }
    }

    return false;
  }

  getValue(ctx, path) {
    if (typeof ctx == "string") {
      throw new Error("You forgot to pass context to getValue");
    }

    let ret = this.resolvePath(ctx, path);

    if (ret === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    if (ret.prop !== undefined && (ret.prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
      ret.prop.dataref = ret.obj;
      ret.prop.datapath = path;
      ret.prop.ctx = ctx;

      let val = ret.prop.getValue();

      if (typeof val === "string" && (ret.prop.type & (PropTypes.FLAG|PropTypes.ENUM))) {
        val = ret.prop.values[val];
      }

      return val;

    }

    return this.resolvePath(ctx, path).value;
  }
}

let DataAPIClass = undefined;
export function setImplementationClass(cls) {
  DataAPIClass = cls;
}

export function registerTool(cls) {
  if (DataAPIClass === undefined) {
    throw new Error("data api not initialized properly; call setImplementationClass");
  }

  return DataAPIClass.registerTool(cls);
}
