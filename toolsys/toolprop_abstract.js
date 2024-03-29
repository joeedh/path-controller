"use strict";

/*
this file is a skeleton that defines the contract
that any tool property library must implement to interface with path.ux.
*/

//maps prop type names to integers
import * as util from "../util/util.js";

export let PropTypes = {
  INT        : 1,
  STRING     : 2,
  BOOL       : 4,
  ENUM       : 8,
  FLAG       : 16,
  FLOAT      : 32,
  VEC2       : 64,
  VEC3       : 128,
  VEC4       : 256,
  MATRIX4    : 512,
  QUAT       : 1024,
  PROPLIST   : 4096,
  STRSET     : 8192,
  CURVE      : 8192<<1,
  FLOAT_ARRAY: 8192<<2,
  REPORT     : 8192<<3
  //ITER : 8192<<1
};

export const PropSubTypes = {
  COLOR: 1
};

//flags
export const PropFlags = {
  SELECT                : 1,
  PRIVATE               : 2,
  LABEL                 : 4,
  USE_ICONS             : 64, /* Implies FORCE_ENUM_CHECKBOXES (for enum/flag properties). */
  USE_CUSTOM_GETSET     : 128, //used by controller.js interface
  SAVE_LAST_VALUE       : 256,
  READ_ONLY             : 512,
  SIMPLE_SLIDER         : 1<<10,
  FORCE_ROLLER_SLIDER   : 1<<11,
  USE_BASE_UNDO         : 1<<12, //internal to simple_controller.js
  EDIT_AS_BASE_UNIT     : 1<<13, //user textbox input should be interpreted in display unit
  NO_UNDO               : 1<<14,
  USE_CUSTOM_PROP_GETTER: 1<<15, //hrm, not sure I need this
  FORCE_ENUM_CHECKBOXES : 1<<16,/* Use a strip of checkboxes, also applies to flag properties. */
  NO_DEFAULT            : 1<<17,
};

export class ToolPropertyIF {
  constructor(type, subtype, apiname, uiname, description, flag, icon) {
    this.data = undefined;

    this.type = type;
    this.subtype = subtype;

    this.apiname = apiname;
    this.uiname = uiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
  }

  equals(b) {
    throw new Error("implement me");
  }

  copyTo(b) {

  }

  copy() {

  }

  _fire(type, arg1, arg2) {
  }

  on(type, cb) {
  }

  off(type, cb) {
  }

  getValue() {
  }

  setValue(val) {
  }

  setStep(step) {
  }

  setRange(min, max) {
  }

  setUnit(unit) {
  }

  //some clients have seperate ui range
  setUIRange(min, max) {
  }

  setIcon(icon) {
  }
}

export class StringPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.STRING);
  }
}

export class NumPropertyIF extends ToolPropertyIF {
};

export class IntPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.INT);
  }

  setRadix(radix) {
    throw new Error("implement me");
  }
}

export class FloatPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.FLOAT);
  }

  setDecimalPlaces(n) {
  }
}

export class EnumPropertyIF extends ToolPropertyIF {
  constructor(value, valid_values) {
    super(PropTypes.ENUM);

    this.values = {}
    this.keys = {};
    this.ui_value_names = {};
    this.iconmap = {};

    if (valid_values === undefined) return this;

    if (valid_values instanceof Array || valid_values instanceof String) {
      for (var i = 0; i < valid_values.length; i++) {
        this.values[valid_values[i]] = valid_values[i];
        this.keys[valid_values[i]] = valid_values[i];
      }
    } else {
      for (var k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }

    for (var k in this.values) {
      var uin = k[0].toUpperCase() + k.slice(1, k.length);

      uin = uin.replace(/\_/g, " ");
      this.ui_value_names[k] = uin;
    }
  }

  addIcons(iconmap) {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (var k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }
  }
}

export class FlagPropertyIF extends EnumPropertyIF {
  constructor(valid_values) {
    super(PropTypes.FLAG);
  }
}

export class Vec2PropertyIF extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC2);
  }
}

export class Vec3PropertyIF extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC3);
  }
}

export class Vec4PropertyIF extends ToolPropertyIF {
  constructor(valid_values) {
    super(PropTypes.VEC4);
  }
}

/**
 * List of other tool props (all of one type)
 */
export class ListPropertyIF extends ToolPropertyIF {
  /*
  * Prop must be a ToolProperty subclass instance
  * */
  constructor(prop) {
    super(PropTypes.PROPLIST);

    this.prop = prop;
  }

  get length() {
  }

  set length(val) {
  }

  copyTo(b) {
  }

  copy() {
  }

  /**
   * clear list
   * */
  clear() {

  }

  push(item = this.prop.copy()) {
  }

  [Symbol.iterator]() {
  }
}

//like FlagsProperty but uses strings
export class StringSetPropertyIF extends ToolPropertyIF {
  constructor(value = undefined, definition = []) {
    super(PropTypes.STRSET);
  }

  /*
  * Values can be a string, undefined/null, or a list/set/object-literal of strings.
  * If destructive is true, then existing set will be cleared.
  * */
  setValue(values, destructive = true, soft_fail = true) {
  }

  getValue() {
  }

  addIcons(iconmap) {
  }


  addUINames(map) {
  }

  addDescriptions(map) {
  }

  copyTo(b) {
  }

  copy() {
  }
}

export class Curve1DPropertyIF extends ToolPropertyIF {
  constructor(curve, uiname) {
    super(PropTypes.CURVE);

    this.data = curve;
  }

  getValue() {
    return this.curve;
  }

  setValue(curve) {
    if (curve === undefined) {
      return;
    }

    let json = JSON.parse(JSON.stringify(curve));
    this.data.load(json);
  }

  copyTo(b) {
    b.setValue(this.data);
  }
}

