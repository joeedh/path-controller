"use strict";

/*
this file is a skeleton that defines the contract
that any tool property library must implement to interface with path.ux.
*/

/**
 * Maps prop type names to integers.
 * These can be combined into a bitmask.
 **/
export const PropTypes = {
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
  CURVE      : 16384,
  FLOAT_ARRAY: 32768,
  REPORT     : 65536,
  //ITER : 8192<<1
} as const;
export type PropTypes = typeof PropTypes;

export const PropSubTypes: Record<string, number> = {
  COLOR: 1,
};

//flags
export const PropFlags: Record<string, number> = {
  SELECT                : 1,
  PRIVATE               : 2,
  LABEL                 : 4,
  USE_ICONS             : 64 /* Implies FORCE_ENUM_CHECKBOXES (for enum/flag properties). */,
  USE_CUSTOM_GETSET     : 128, //used by controller.js interface
  SAVE_LAST_VALUE       : 256,
  READ_ONLY             : 512,
  SIMPLE_SLIDER         : 1 << 10,
  FORCE_ROLLER_SLIDER   : 1 << 11,
  USE_BASE_UNDO         : 1 << 12, //internal to simple_controller.js
  EDIT_AS_BASE_UNIT     : 1 << 13, //user textbox input should be interpreted in display unit
  NO_UNDO               : 1 << 14,
  USE_CUSTOM_PROP_GETTER: 1 << 15, //hrm, not sure I need this
  FORCE_ENUM_CHECKBOXES : 1 << 16 /* Use a strip of checkboxes, also applies to flag properties. */,
  NO_DEFAULT            : 1 << 17,
};

export class ToolPropertyIF<TYPE extends number = number> {
  data: unknown;
  declare type: TYPE;
  subtype: number | undefined;
  apiname: string | undefined;
  uiname: string | undefined;
  description: string | undefined;
  flag: number | undefined;
  icon: number | undefined;

  constructor(
    type?: TYPE,
    subtype?: number,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    if (type === undefined) {
      type = (this.constructor as any).PROP_TYPE_ID as TYPE;
    }

    this.data = undefined;

    this.type = type!;
    this.subtype = subtype;

    this.apiname = apiname;
    this.uiname = uiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
  }

  equals(b: ToolPropertyIF): boolean {
    throw new Error("implement me");
  }

  copyTo(b: ToolPropertyIF): void {}

  copy(): ToolPropertyIF | void {}

  _fire(type: string, arg1?: unknown, arg2?: unknown): void {}

  on(type: string, cb: Function): void {}

  off(type: string, cb: Function): void {}

  getValue(): unknown {
    return undefined;
  }

  setValue(val: unknown): void {}

  setStep(step: number): void {}

  setRange(min: number, max: number): void {}

  setUnit(unit: string): void {}

  //some clients have seperate ui range
  setUIRange(min: number, max: number): void {}

  setIcon(icon: number): void {}
}

export class StringPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.STRING);
  }
}

export class NumPropertyIF extends ToolPropertyIF {}

export class IntPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.INT);
  }

  setRadix(radix: number): void {
    throw new Error("implement me");
  }
}

export class FloatPropertyIF extends ToolPropertyIF {
  constructor() {
    super(PropTypes.FLOAT);
  }

  setDecimalPlaces(n: number): void {}
}

export class EnumPropertyIF extends ToolPropertyIF {
  values: Record<string, string | number>;
  keys: Record<string | number, string | number>;
  ui_value_names: Record<string, string>;
  iconmap: Record<string, number>;

  constructor(value?: unknown, valid_values?: Record<string, number>) {
    super(PropTypes.ENUM);

    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.iconmap = {};

    if (valid_values === undefined) return;

    if (valid_values instanceof Array || valid_values instanceof String) {
      for (let i = 0; i < valid_values.length; i++) {
        this.values[valid_values[i] as string] = valid_values[i] as string;
        this.keys[valid_values[i] as string] = valid_values[i] as string;
      }
    } else {
      for (const k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }

    for (const k in this.values) {
      let uin = k[0].toUpperCase() + k.slice(1, k.length);

      uin = uin.replace(/\_/g, " ");
      this.ui_value_names[k] = uin;
    }
  }

  addIcons(iconmap: Record<string, number>): void {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (const k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }
  }
}

export class FlagPropertyIF extends EnumPropertyIF {
  constructor(valid_values?: Record<string, number> | string[] | string) {
    super(PropTypes.FLAG);
  }
}

export class Vec2PropertyIF extends ToolPropertyIF {
  constructor(valid_values?: unknown) {
    super(PropTypes.VEC2);
  }
}

export class Vec3PropertyIF extends ToolPropertyIF {
  constructor(valid_values?: unknown) {
    super(PropTypes.VEC3);
  }
}

export class Vec4PropertyIF extends ToolPropertyIF {
  constructor(valid_values?: unknown) {
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
  prop: ToolPropertyIF;

  constructor(prop: ToolPropertyIF) {
    super(PropTypes.PROPLIST);

    this.prop = prop;
  }

  get length(): number {
    return 0;
  }

  set length(val: number) {}

  copyTo(b: ToolPropertyIF): void {}

  copy(): ToolPropertyIF | void {}

  /**
   * clear list
   * */
  clear(): void {}

  push(item: ToolPropertyIF = this.prop.copy() as ToolPropertyIF): void {}

  [Symbol.iterator](): Iterator<ToolPropertyIF> {
    return [][Symbol.iterator]();
  }
}

//like FlagsProperty but uses strings
export class StringSetPropertyIF extends ToolPropertyIF {
  constructor(value?: unknown, definition: string[] = []) {
    super(PropTypes.STRSET);
  }

  /*
   * Values can be a string, undefined/null, or a list/set/object-literal of strings.
   * If destructive is true, then existing set will be cleared.
   * */
  setValue(values: unknown, destructive: boolean = true, soft_fail: boolean = true): void {}

  getValue(): unknown {
    return undefined;
  }

  addIcons(iconmap: Record<string, number>): void {}

  addUINames(map: Record<string, string>): void {}

  addDescriptions(map: Record<string, string>): void {}

  copyTo(b: ToolPropertyIF): void {}

  copy(): ToolPropertyIF | void {}
}

interface CurveData {
  load(json: unknown): void;
}

export class Curve1DPropertyIF extends ToolPropertyIF {
  declare data: CurveData | undefined;

  constructor(curve?: CurveData, uiname?: string) {
    super(PropTypes.CURVE);

    this.data = curve;
  }

  getValue(): CurveData | undefined {
    return this.data;
  }

  setValue(curve: unknown): void {
    if (curve === undefined) {
      return;
    }

    const json: unknown = JSON.parse(JSON.stringify(curve));
    this.data!.load(json);
  }

  copyTo(b: ToolPropertyIF): void {
    (b as Curve1DPropertyIF).setValue(this.data);
  }
}
