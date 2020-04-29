import * as util from './util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from './vectormath.js';
import {ToolPropertyIF, PropTypes} from "./toolprop_abstract.js";

export {PropTypes} from './toolprop_abstract.js';

let first = (iter) => {
  if (iter === undefined) {
    return undefined;
  }
  
  if (!(Symbol.iterator in iter)) {
    for (let item in iter) {
      return item;
    }
    
    return undefined;
  }
  
  for (let item of iter) {
    return item;
  }
};

//set PropTypes to custom type integers
export function setPropTypes(types) {
  for (let k in types) {
    PropTypes[k] = types[k];
  }
}

export const PropSubTypes = {
  COLOR : 1
};

export const PropFlags = {
  SELECT            : 1,
  USE_ICONS         : 64,
  USE_CUSTOM_GETSET : 128, //used by controller.js interface
  SAVE_LAST_VALUE   : 256,
  READ_ONLY         : 512
};

export let customPropertyTypes = [];

export let PropClasses = {};
function _addClass(cls) {
  PropClasses[new cls().type] = cls;
}

export class ToolProperty extends ToolPropertyIF {
  constructor(type, subtype, apiname, uiname, description, flag, icon) {
    super();

    this.data = undefined;

    if (type === undefined) {
      type = this.constructor.PROP_TYPE_ID;
    }

    this.type = type;
    this.subtype = subtype;

    //is false if this property still has its default value,
    //i.e. it hasn't been set by the user or anyone else
    this.wasSet = false;

    this.apiname = apiname;
    this.uiname = uiname !== undefined ? uiname : apiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
    
    this.callbacks = {};
  } 

  static register(cls) {
    cls.PROP_TYPE_ID = util.strhash(cls.name);
    PropTypes[cls.name] = cls.PROP_TYPE_ID;

    customPropertyTypes.push(cls);
  }

  _fire(type, arg1, arg2) {
    if (this.callbacks[type] === undefined) {
      return;
    }

    for (let cb of this.callbacks[type]) {
      cb.call(this, arg1, arg2);
    }
    return this;
  }

  on(type, cb) {
    if (this.callbacks[type] === undefined) {
      this.callbacks[type] = [];
    }

    this.callbacks[type].push(cb);
    return this;
  }

  off(type, cb) {
    this.callbacks[type].remove(cb);
    return this;
  }

  toJSON() {
    return {
      type : this.type,
      subtype : this.subtype,
      apiname : this.apiname,
      uiname : this.uiname,
      description : this.description,
      flag : this.flag,
      icon : this.icon,
      data : this.data
    }
  }
  
  loadJSON(obj) {
    this.type = obj.type;
    this.subtype = obj.subtype;
    this.apiname = obj.apiname;
    this.uiname = obj.uiname;
    this.description = obj.description;
    this.flag = obj.flag;
    this.icon = obj.icon;
    this.data = obj.data;
    
    return this;
  }
  
  getValue() {
    return this.data;
  }  
  
  setValue(val) {
    if (this.constructor === ToolProperty) {
      throw new Error("implement me!");
    }

    this.wasSet = true;

    this._fire("change", val);
  }
  
  copyTo(b) {
    b.apiname = this.apiname;
    b.uiname = this.uiname;
    b.description = this.description;
    b.flag = this.flag;
    b.icon = this.icon;
    b.subtype = this.subtype;

    for (let k in this.callbacks) {
      b.callbacks[k] = this.callbacks[k];
    }
  }
  
  copy() { //default copy method
    let ret = new this.constructor();
    
    this.copyTo(ret);
    ret.data = this.data;
    
    return ret;
  }
  
  setStep(step) {
    this.step = step;
    return this;
  }
  
  setRange(min, max) {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }
    
    this.range = [min, max];
    return this;
  }
  
  setIcon(icon) {
    this.icon = icon;
    
    return this;
  }
}

export class StringProperty extends ToolProperty {
  constructor(value, apiname, uiname, description, flag, icon) {
    super(PropTypes.STRING, undefined, apiname, uiname, description, flag, icon);
  }
  
  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;
    
    return this;
  }
  
  copy() {
    let ret = new StringProperty();
    this.copyTo(ret);
    return ret;
  }
  
  setValue(val) {
    //fire events
    super.setValue(val);
    this.data = val;
  }
}  
  
let num_res =[
  /([0-9]+)/,
  /((0x)?[0-9a-fA-F]+(h?))/,
  /([0-9]+\.[0-9]*)/,
  /([0-9]*\.[0-9]+)/
];
//num_re = /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)/

export function isNumber(f) {
  if (f == "NaN" || (typeof f == "number" && isNaN(f))) {
    return false;
  }
  
  f = (""+f).trim();
  
  let ok = false;
  
  for (let re of num_res) {
    let ret = f.match(re)
    if (!ret) {
      ok = false;
      continue;
    }
    
    ok = ret[0].length == f.length;
    if (ok) {
      break;
    }
  }
  
  return ok;
}
_addClass(StringProperty);

window.isNumber = isNumber;

export class NumProperty extends ToolProperty {
  constructor(type, value, apiname, 
              uiname, description, flag, icon) {
    super(type, undefined, apiname, uiname, description, flag, icon);
    
    this.data = 0;
    this.range = [0, 0];
  }
};

export class IntProperty extends ToolProperty {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.INT, undefined, apiname, uiname, description, flag, icon);
    
    this.radix = 10;
    this.data = value !== undefined ? Math.floor(value) : 0;
  }
  
  toJSON() {
    let ret = super.toJSON();
    ret.range = this.range;
    
    return ret;
  }
  
  loadJSON(obj) {
    super.loadJSON(obj);
    
    this.range = obj.range;
    return this;
  }
  
  setValue(val) {
    this.data = Math.floor(val);
    
    //fire events
    super.setValue(val);
    
    return this;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;
    return this;
  }

  setStep(step) {
    super.setStep(Math.floor(step));
  }

  setRange(min, max) {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }
    
    super.setRange(Math.floor(min), Math.floor(max));
    return this;
  }
  
  setRadix(radix) {
    this.radix = radix;
  }
}
_addClass(IntProperty);

export class BoolProperty extends ToolProperty {
  constructor(value, apiname,
              uiname, description, flag, icon)
  {
    super(PropTypes.BOOL, undefined, apiname, uiname, description, flag, icon);

    this.data = !!value;
  }

  toJSON() {
    let ret = super.toJSON();

    return ret;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    return this;
  }
}
_addClass(BoolProperty);

export class FloatProperty extends ToolProperty {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.FLOAT, undefined, apiname, uiname, description, flag, icon);
    
    this.data = value !== undefined ? ~~value : 0;
    this.decimalPlaces = 4;
  }
  
  toJSON() {
    let ret = super.toJSON();
    ret.range = this.range;
    
    return ret;
  }
  
  loadJSON(obj) {
    super.loadJSON(obj);
    
    this.range = obj.range;
    return this;
  }
  
  setDecimalPlaces(n) {
    this.decimalPlaces = n;
    return this;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data = this.data;
    return this;
  }

  setValue(val) {
    this.data = val;
    
    //fire events
    super.setValue(val);
    
    return this;
  }
}
_addClass(FloatProperty);

export class EnumProperty extends ToolProperty {
  constructor(string, valid_values, apiname, 
              uiname, description, flag, icon) 
  {
    super(PropTypes.ENUM, undefined, apiname, uiname, description, flag, icon);
    
    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.descriptions = {};

    if (valid_values === undefined) return this;
    
    if (valid_values instanceof Array || valid_values instanceof String) {
      for (var i=0; i<valid_values.length; i++) {
        this.values[valid_values[i]] = valid_values[i];
        this.keys[valid_values[i]] = valid_values[i];
      }
    } else {
      for (var k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }
    
    if (string === undefined) {
      this.data = first(valid_values);
    } else {
      this.setValue(string);
    }
    
    for (var k in this.values) {
      let uin = k.replace(/\[_-]/g, " ").trim();
      uin = uin.split(" ")
      let uiname = "";

      for (let word of uin) {
        uiname += word[0].toUpperCase() + word.slice(1, word.length).toLowerCase();
      }

      this.ui_value_names[k] = uiname;
      this.descriptions[k] = uiname;
    }
    
    this.iconmap = {};
  }

  addUINames(map) {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map) {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  addIcons(iconmap) {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (var k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  copyTo(p) {
    p.keys = Object.assign({}, this.keys);
    p.values = Object.assign({}, this.values);
    p.data = this.data;
    p.ui_value_names = this.ui_value_names;
    p.update = this.update;
    p.api_update = this.api_update;
    
    p.iconmap = this.iconmap;
    p.descriptions = this.descriptions;
    
    return p;
  }
  
  copy() {
    var p = new EnumProperty("dummy", {"dummy" : 0}, this.apiname, this.uiname, this.description, this.flag)

    this.copyTo(p);
    return p;
  }

  getValue() {
    if (this.data in this.values)
      return this.values[this.data];
    else
      return this.data;
  }

  setValue(val) {
    if (!(val in this.values) && (val in this.keys))
      val = this.keys[val];
    
    if (!(val in this.values)) {
      console.warn("Invalid value for enum!", val, this.values);
      return;
    }
    
    this.data = new String(val);
    
    //fire events
    super.setValue(val);
  }
}
_addClass(EnumProperty);

export class FlagProperty extends EnumProperty {
  constructor(string, valid_values, apiname,
              uiname, description, flag, icon) {
    super(string, valid_values, apiname,
          uiname, description, flag, icon);

    this.type = PropTypes.FLAG;
  }

  setValue(bitmask) {
    this.data = bitmask;

    //do not trigger EnumProperty's setValue
    ToolProperty.prototype.setValue.call(this, bitmask);
  }

  copy() {
    let ret = new FlagProperty();
    this.copyTo(ret);
    
    return ret;
  }
}
_addClass(FlagProperty);

export class Vec2Property extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.VEC2, undefined, apiname, uiname, description);
    this.data = new Vector2(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec2Property();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec2Property);

export class Vec3Property extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.VEC3, undefined, apiname, uiname, description);
    this.data = new Vector3(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec3Property();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec3Property);

export class Vec4Property extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.VEC4, undefined, apiname, uiname, description);
    this.data = new Vector4(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec4Property();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Vec4Property);

export class QuatProperty extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.QUAT, undefined, apiname, uiname, description);
    this.data = new Quat(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new QuatProperty();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(QuatProperty);

export class Mat4Property extends ToolProperty {
  constructor(data, apiname, uiname, description) {
    super(PropTypes.MATRIX4, undefined, apiname, uiname, description);
    this.data = new Matrix4(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);

    b.data.load(this.data);
  }

  copy() {
    let ret = new Mat4Property();
    this.copyTo(ret);
    return ret;
  }
}
_addClass(Mat4Property);

/**
 * List of other tool props (all of one type)
 */
export class ListProperty extends ToolProperty {
  /*
  * Prop must be a ToolProperty subclass instance
  * */
  constructor(prop, list=[], uiname="") {
    super(PropTypes.PROPLIST);

    this.uiname = uiname;

    if (typeof prop == "number") {
      prop = PropClasses[prop];

      if (prop !== undefined) {
        prop = new prop();
      }
    } else if (prop !== undefined) {
      if (prop instanceof ToolProperty) {
        prop = prop.copy();
      } else {
        prop = new prop();
      }
    }


    this.prop = prop;
    this.value = [];

    for (let val of list) {
      this.push(val);
    }
  }

  copyTo(b) {
    super.copyTo(b);

    b.prop = this.prop.copy();

    for (let prop of this.value) {
      b.value.push(prop.copy());
    }

    return b;
  }

  copy() {
    let ret = new ListProperty(this.prop.copy());
    this.copyTo(ret);
    return ret;
  }

  push(item=undefined) {
    if (item === undefined) {
      item = this.prop.copy();
    }

    if (!(item instanceof ToolProperty)) {
      let prop = this.prop.copy();
      prop.setValue(item);
      item = prop;
    }

    this.value.push(item);
    return item;
  }

  clear() {
    this.value.length = 0;
  }

  setValue(value) {
    this.clear();

    for (let item of value) {
      let prop = this.push();

      if (typeof item !== "object") {
        prop.setValue(item);
      } else if (item instanceof prop.constructor) {
        item.copyTo(prop);
      } else {
        console.log(item);
        throw new Error("invalid value " + item);
      }
    }
  }

  getValue() {
    return this.value;
  }

  [Symbol.iterator]() {
    let list = this.value;

    return (function*() {
      for (let item of list) {
        yield item.getValue();
      }
    })();
  }

  get length() {
    return this.value.length;
  }

  set length(val) {
    this.value.length = val;
  }
}

_addClass(ListProperty);

//like FlagsProperty but uses strings
export class StringSetProperty extends ToolProperty {
  constructor(value=undefined, definition=[]) {
    super(PropTypes.STRSET);

    let values = [];

    this.value = new util.set();

    let def = definition;
    if (Array.isArray(def) || def instanceof util.set || def instanceof Set) {
      for (let item of def) {
        values.push(item);
      }
    } else if (typeof def === "object") {
      for (let k in def) {
        values.push(k);
      }
    } else if (typeof def === "string") {
      values.push(def);
    }

    this.values = {};
    this.ui_value_names = {};
    this.descriptions = {};
    this.iconmap = {};

    for (let v of values) {
      this.values[v] = v;
      
      let uiname = v.replace(/\_/g, " ").trim();
      uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);

      this.ui_value_names[v] = uiname;
    }

    if (value !== undefined) {
      this.setValue(value);
    }
  }

  /*
  * Values can be a string, undefined/null, or a list/set/object-literal of strings.
  * If destructive is true, then existing set will be cleared.
  * */
  setValue(values, destructive=true, soft_fail=true) {
    let bad = typeof values !== "string";
    bad = bad && typeof values !== "object";
    bad = bad && values !== undefined && values !== null;

    if (bad) {
      if (soft_fail) {
        console.warn("Invalid argument to StringSetProperty.prototype.setValue() " + values);
        return;
      } else {
        throw new Error("Invalid argument to StringSetProperty.prototype.setValue() " + values);
      }
    }

    //handle undefined/null
    if (!values) {
      this.value.clear();
    } else if (typeof values === "string") {
      if (destructive)
        this.value.clear();

      if (!(values in this.values)) {
        if (soft_fail) {
          console.warn(`"${values}" is not in this StringSetProperty`);
          return;
        } else {
          throw new Error(`"${values}" is not in this StringSetProperty`);
        }
      }

      this.value.add(values);
    } else {
      let data = [];

      if (Array.isArray(values) || values instanceof util.set || values instanceof Set) {
        for (let item of values) {
          data.push(item);
        }
      } else { //object literal?
        for (let k in values) {
          data.push(k);
        }
      }

      for (let item of data) {
        if (!(item in this.values)) {
          if (soft_fail) {
            console.warn(`"${item}" is not in this StringSetProperty`);
            continue;
          } else {
            throw new Error(`"${item}" is not in this StringSetProperty`);
          }
        }

        this.value.add(item);
      }
    }
  }

  getValue() {
    return this.value;
  }

  addIcons(iconmap) {
    if (iconmap === undefined)
      return;

    for (let k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }


  addUINames(map) {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }
    
    return this;
  }

  addDescriptions(map) {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  copyTo(b) {
    super.copyTo(b);

    for (let val of this.value) {
      b.value.add(val);
    }
    
    b.values = {};
    for (let k in this.values) {
      b.values[k] = this.values[k];
    }

    for (let k in this.ui_value_names) {
      b.ui_value_names[k] = this.ui_value_names[k];
    }

    for (let k in this.iconmap) {
      b.iconmap[k] = this.iconmap[k];
    }

    for (let k in this.descriptions) {
      b.descriptions[k] = this.descriptions[k];
    }
  }

  copy() {
    let ret = new StringSetProperty(undefined, {});
    this.copyTo(ret);
    return ret;
  }
}

_addClass(StringSetProperty);