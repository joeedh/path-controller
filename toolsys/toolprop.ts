import * as util from "../util/util.js";
import { Vector2, Vector3, Vector4, Quat, Matrix4 } from "../util/vectormath.js";
import { ToolPropertyIF, PropTypes, PropFlags } from "./toolprop_abstract.js";
import nstructjs from "../util/struct.js";
import type { StructReader } from "../util/nstructjs_es6.js";

export { PropTypes, PropFlags } from "./toolprop_abstract.js";

export type NumberConstraintBase =
  | "range"
  | "expRate"
  | "step"
  | "uiRange"
  | "displayUnit"
  | "baseUnit"
  | "stepIsRelative"
  | "slideSpeed"
  | "sliderDisplayExp";
export type IntegerConstraint = NumberConstraintBase | "radix";
export type FloatConstraint = NumberConstraintBase | "decimalPlaces";
export type NumberConstraint = IntegerConstraint | FloatConstraint;

export const NumberConstraintsBase: Set<NumberConstraintBase> = new Set<NumberConstraintBase>([
  "range",
  "expRate",
  "step",
  "uiRange",
  "baseUnit",
  "displayUnit",
  "stepIsRelative",
  "slideSpeed",
  "sliderDisplayExp",
]);

export const IntegerConstraints: Set<IntegerConstraint> = new Set<IntegerConstraint>(
  (["radix"] as IntegerConstraint[]).concat(util.list(NumberConstraintsBase) as IntegerConstraint[])
);

export const FloatConstrinats: Set<FloatConstraint> = new Set<FloatConstraint>(
  (["decimalPlaces"] as FloatConstraint[]).concat(util.list(NumberConstraintsBase) as FloatConstraint[])
);

export const NumberConstraints: Set<NumberConstraint> = new Set<NumberConstraint>(
  (util.list(IntegerConstraints) as NumberConstraint[]).concat(util.list(FloatConstrinats) as NumberConstraint[])
);

export const PropSubTypes: Record<string, number> = {
  COLOR: 1,
};

type CallbackFn = (this: ToolProperty<unknown>, arg1?: unknown, arg2?: unknown) => void;

/* String satisfies KeystrObject via global.d.ts augmentation of String,
   but TypeScript's structural check on primitives doesn't see it. We
   force the type here so every call-site stays clean. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UtilStringSet = util.set<any>;

let first = <T>(iter: Iterable<T> | Record<string, T> | undefined): T | string | undefined => {
  if (iter === undefined) {
    return undefined;
  }

  if (!(Symbol.iterator in (iter as object))) {
    for (let item in iter as Record<string, T>) {
      return item;
    }

    return undefined;
  }

  for (let item of iter as Iterable<T>) {
    return item;
  }

  return undefined;
};

//set PropTypes to custom type integers
export function setPropTypes(types: Record<string, number>): void {
  for (let k in types) {
    PropTypes[k] = types[k];
  }
}

export let customPropertyTypes: (typeof ToolProperty)[] = [];
export let PropClasses: Record<number, typeof ToolProperty> = {};

let customPropTypeBase: number = 17;

let wordmap: Record<string, string> = {
  sel  : "select",
  unsel: "deselect",
  eid  : "id",
  props: "properties",
  res  : "resource",
};

export var defaultRadix: number = 10;
export var defaultDecimalPlaces: number = 4;

class OnceTag {
  cb: CallbackFn;

  constructor(cb: CallbackFn) {
    this.cb = cb;
  }
}

interface ToolPropertyConstructor {
  PROP_TYPE_ID?: number;
  new (...args: unknown[]): ToolProperty<unknown> & { type: number };
}

type ToolPropertySubclass = Function & { STRUCT?: string; PROP_TYPE_ID?: number };

export class ToolProperty<T = unknown> extends ToolPropertyIF {
  static STRUCT: string;
  static PROP_TYPE_ID: number;

  declare data: T | undefined;
  declare type: number;
  declare subtype: number | undefined;
  wasSet: boolean;
  declare apiname: string | undefined;
  declare uiname: string | undefined;
  declare description: string | undefined;
  declare flag: number;
  declare icon: number;
  icon2: number;

  decimalPlaces: number;
  radix: number;
  step: number;

  range: [number, number] | undefined;
  uiRange: [number, number] | undefined;
  baseUnit: string | undefined;
  displayUnit: string | undefined;
  stepIsRelative: boolean;
  expRate: number;
  slideSpeed: number;

  callbacks: Record<string, (CallbackFn | OnceTag)[]>;

  /* These are used in subclasses but accessed generically */
  update?: Function;
  api_update?: Function;

  constructor(
    type?: number,
    subtype?: number,
    apiname?: string,
    uiname: string = "",
    description: string = "",
    flag: number = 0,
    icon: number = -1
  ) {
    super();

    this.data = undefined;

    if (type === undefined) {
      type = (this.constructor as typeof ToolProperty).PROP_TYPE_ID;
    }

    this.type = type!;
    this.subtype = subtype;

    //is false if this property still has its default value,
    //i.e. it hasn't been set by the user or anyone else
    this.wasSet = false;

    this.apiname = apiname;
    this.uiname = uiname !== undefined ? uiname : apiname;
    this.description = description;
    this.flag = flag | PropFlags.SAVE_LAST_VALUE;
    this.icon = icon;
    this.icon2 = icon; //another icon, e.g. unchecked state

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    this.decimalPlaces = defaultDecimalPlaces;
    this.radix = defaultRadix;
    this.step = 0.05;
    this.stepIsRelative = false;
    this.expRate = 1.33;
    this.slideSpeed = 1.0;

    this.callbacks = {};
  }

  static internalRegister(cls: ToolPropertySubclass): void {
    PropClasses[new (cls as unknown as ToolPropertyConstructor)().type] = cls as unknown as typeof ToolProperty;
  }

  static getClass(type: number): typeof ToolProperty | undefined {
    return PropClasses[type];
  }

  static setDefaultRadix(n: number): void {
    defaultRadix = n;
  }

  static setDefaultDecimalPlaces(n: number): void {
    defaultDecimalPlaces = n;
  }

  static makeUIName(name: string): string {
    let parts: string[] = [""];
    let lastc: string | undefined = undefined;

    let ischar = (c: string): boolean => {
      let code = c.charCodeAt(0);

      let upper = code >= "A".charCodeAt(0);
      upper = upper && code <= "Z".charCodeAt(0);

      let lower = code >= "a".charCodeAt(0);
      lower = lower && code <= "z".charCodeAt(0);

      return upper || lower;
    };

    for (let i = 0; i < name.length; i++) {
      let c = name[i];

      if (c === "_" || c === "-" || c === "$") {
        lastc = c;
        c = " ";
        parts.push("");
        continue;
      }

      if (i > 0 && c === c.toUpperCase() && lastc !== lastc!.toUpperCase()) {
        if (ischar(c) && ischar(lastc!)) {
          parts.push("");
        }
      }

      parts[parts.length - 1] += c;
      lastc = c;
    }

    let subst = (word: string): string => {
      if (word in wordmap) {
        return wordmap[word];
      } else {
        return word;
      }
    };

    let result = parts
      .filter((f) => f.trim().length > 0)
      .map((f) => subst(f))
      .map((f) => f[0].toUpperCase() + f.slice(1, f.length).toLowerCase())
      .join(" ")
      .trim();
    return result;
  }

  static register(cls: typeof ToolProperty & { name: string; PROP_TYPE_ID: number }): number {
    cls.PROP_TYPE_ID = 1 << customPropTypeBase;
    PropTypes[cls.name] = cls.PROP_TYPE_ID;

    customPropTypeBase++;
    customPropertyTypes.push(cls);

    PropClasses[new (cls as unknown as ToolPropertyConstructor)().type] = cls;

    return cls.PROP_TYPE_ID;
  }

  static calcRelativeStep(step: number, value: number, logBase: number = 1.5): number {
    value = Math.log(Math.abs(value) + 1.0) / Math.log(logBase);
    value = Math.max(value, step);

    console.warn(util.termColor("STEP", "red"), value);
    return value;
  }

  setDescription(s: string): this {
    this.description = s;
    return this;
  }

  setUIName(s: string): this {
    this.uiname = s;
    return this;
  }

  calcMemSize(): number {
    function strlen(s: string | undefined): number {
      //length of string plus an assumed member pointer
      return s !== undefined ? s.length + 8 : 8;
    }

    let tot = 0;

    tot += strlen(this.apiname) + strlen(this.uiname);
    tot += strlen(this.description);

    tot += 11 * 8; //assumed member pointers
    for (let k in this.callbacks) {
      tot += 24;
    }

    return tot;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    throw new Error("implement me");
  }

  private(): this {
    this.flag |= PropFlags.PRIVATE;
    this.flag &= ~PropFlags.SAVE_LAST_VALUE;
    return this;
  }

  /** Save property in last value cache.  Now set by default,
   *  to disable use .ignoreLastValue().
   */
  saveLastValue(): this {
    this.flag |= PropFlags.SAVE_LAST_VALUE;
    return this;
  }

  ignoreLastValue(): this {
    this.flag &= ~PropFlags.SAVE_LAST_VALUE;
    return this;
  }

  report(...args: unknown[]): void {
    console.warn(...args);
  }

  _fire(type: string, arg1?: unknown, arg2?: unknown): this {
    if (this.callbacks[type] === undefined) {
      return this;
    }

    let stack = this.callbacks[type];
    stack = stack.concat([]); //copy

    for (let i = 0; i < stack.length; i++) {
      let cb = stack[i];

      if (cb instanceof OnceTag) {
        let j = i;

        //remove callback;
        while (j < stack.length - 1) {
          stack[j] = stack[j + 1];
          j++;
        }

        (stack as (CallbackFn | OnceTag | undefined)[])[j] = undefined;
        stack.length--;

        i--;

        cb.cb.call(this, arg1, arg2);
      } else {
        cb.call(this, arg1, arg2);
      }
    }

    return this;
  }

  clearEventCallbacks(): this {
    this.callbacks = {};
    return this;
  }

  once(type: string, cb: CallbackFn): this {
    if (this.callbacks[type] === undefined) {
      this.callbacks[type] = [];
    }

    //check if cb is already in callback list inside a OnceTag
    for (let cb2 of this.callbacks[type]) {
      if (cb2 instanceof OnceTag && cb2.cb === cb) {
        return this;
      }
    }

    let tag = new OnceTag(cb);

    this.callbacks[type].push(tag);

    return this;
  }

  on(type: string, cb: CallbackFn): this {
    if (this.callbacks[type] === undefined) {
      this.callbacks[type] = [];
    }

    this.callbacks[type].push(cb);
    return this;
  }

  off(type: string, cb: CallbackFn): this {
    (this.callbacks[type] as unknown as CallbackFn[]).remove(cb);
    return this;
  }

  toJSON(): Record<string, unknown> {
    return {
      type       : this.type,
      subtype    : this.subtype,
      apiname    : this.apiname,
      uiname     : this.uiname,
      description: this.description,
      flag       : this.flag,
      icon       : this.icon,
      data       : this.data,
      range      : this.range,
      uiRange    : this.uiRange,
      step       : this.step,
    };
  }

  loadJSON(obj: Record<string, unknown>): this {
    this.type = obj.type as number;
    this.subtype = obj.subtype as number | undefined;
    this.apiname = obj.apiname as string | undefined;
    this.uiname = obj.uiname as string | undefined;
    this.description = obj.description as string | undefined;
    this.flag = obj.flag as number;
    this.icon = obj.icon as number;
    this.data = obj.data as T | undefined;

    return this;
  }

  getValue(): T {
    return this.data as T;
  }

  setValue(val?: T): void {
    if (this.constructor === ToolProperty) {
      throw new Error("implement me!");
    }

    this.wasSet = true;

    this._fire("change", val);
  }

  copyTo(b: ToolProperty<unknown>): void {
    b.apiname = this.apiname;

    b.uiname = this.uiname;
    b.description = this.description;
    b.icon = this.icon;
    b.icon2 = this.icon2;

    b.baseUnit = this.baseUnit;
    b.subtype = this.subtype;
    b.displayUnit = this.displayUnit;

    b.flag = this.flag;

    for (let k in this.callbacks) {
      b.callbacks[k] = this.callbacks[k];
    }
  }

  copy(): ToolProperty<T> {
    //default copy method
    let ret = new (this.constructor as ToolPropertyConstructor)();

    this.copyTo(ret);

    return ret as ToolProperty<T>;
  }

  setStep(step: number): this {
    this.step = step;
    return this;
  }

  getStep(value: number = 1.0): number {
    if (this.stepIsRelative) {
      return ToolProperty.calcRelativeStep(this.step, value);
    } else {
      return this.step;
    }
  }

  setRelativeStep(step: number): void {
    this.step = step;
    this.stepIsRelative = true;
  }

  setRange(min: number, max: number): this {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }

    this.range = [min, max] as [number, number];
    return this;
  }

  noUnits(): this {
    this.baseUnit = this.displayUnit = "none";
    return this;
  }

  setBaseUnit(unit: string): this {
    this.baseUnit = unit;
    return this;
  }

  setDisplayUnit(unit: string): this {
    this.displayUnit = unit;
    return this;
  }

  setUnit(unit: string): this {
    this.baseUnit = this.displayUnit = unit;
    return this;
  }

  setFlag(f: number, combine: boolean = false): this {
    this.flag = combine ? this.flag | f : f;
    return this;
  }

  setUIRange(min: number, max: number): this {
    if (min === undefined || max === undefined) {
      throw new Error("min and/or max cannot be undefined");
    }

    this.uiRange = [min, max] as [number, number];
    return this;
  }

  setIcon(icon: number): this {
    this.icon = icon;

    return this;
  }

  setIcon2(icon: number): this {
    this.icon2 = icon;

    return this;
  }

  loadSTRUCT(reader: StructReader<ToolProperty<T>>): void {
    reader(this);

    if (this.uiRange && this.uiRange[0] === -1e17 && this.uiRange[1] === 1e17) {
      this.uiRange = undefined;
    }

    if (this.baseUnit === "undefined") {
      this.baseUnit = undefined;
    }

    if (this.displayUnit === "undefined") {
      this.displayUnit = undefined;
    }
  }
}

ToolProperty.STRUCT = `
ToolProperty {
  apiname        : string | ""+this.apiname;
  type           : int;
  flag           : int;
  subtype        : int;
  icon           : int;
  icon2          : int;
  baseUnit       : string | ""+this.baseUnit;
  displayUnit    : string | ""+this.displayUnit;
  range          : array(float) | this.range ? this.range : [-1e17, 1e17];
  uiRange        : array(float) | this.uiRange ? this.uiRange : [-1e17, 1e17];
  description    : string;
  stepIsRelative : bool;
  step           : float;
  expRate        : float;
  radix          : float;
  decimalPlaces  : int;
  uiname         : string | this.uiname || this.apiname || "";
  wasSet         : bool;
}
`;
nstructjs.register(ToolProperty);

(window as { ToolProperty: unknown }).ToolProperty = ToolProperty;

export class FloatArrayProperty extends ToolProperty<number[]> {
  static override STRUCT: string;

  value: number[];

  constructor(
    value?: Iterable<number | boolean>,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.FLOAT_ARRAY, undefined, apiname, uiname, description, flag, icon);

    this.value = [];

    if (value !== undefined) {
      this.setValue(value);
    }
  }

  [Symbol.iterator](): IterableIterator<number> {
    return this.value[Symbol.iterator]();
  }

  override setValue(value?: Iterable<number | boolean>): void {
    super.setValue();

    if (value === undefined) {
      throw new Error("value was undefined in FloatArrayProperty's setValue method");
    }

    this.value.length = 0;

    for (let item of value) {
      if (typeof item !== "number" && typeof item !== "boolean") {
        console.log(value);
        throw new Error("bad item for FloatArrayProperty " + item);
      }

      this.value.push(item as number);
    }
  }

  push(item: number | boolean): void {
    if (typeof item !== "number" && typeof item !== "boolean") {
      throw new Error("bad item for FloatArrayProperty " + item);
    }

    this.value.push(item as number);
  }

  override getValue(): number[] {
    return this.value;
  }

  clear(): this {
    this.value.length = 0;
    return this;
  }
}

FloatArrayProperty.STRUCT =
  nstructjs.inherit(FloatArrayProperty, ToolProperty) +
  `
  value : array(float);
}`;
nstructjs.register(FloatArrayProperty);

export class StringProperty extends ToolProperty<string> {
  static override STRUCT: string;

  multiLine: boolean;

  constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.STRING, undefined, apiname, uiname, description, flag, icon);

    this.multiLine = false;

    if (value) {
      this.setValue(value);
    } else {
      this.setValue("");
    }

    this.wasSet = false;
  }

  override calcMemSize(): number {
    return super.calcMemSize() + (this.data !== undefined ? this.data.length * 4 : 0) + 8;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return this.data === (b as StringProperty).data;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);

    (b as StringProperty).data = this.data;
    (b as StringProperty).multiLine = this.multiLine;
  }

  override getValue(): string {
    return this.data as string;
  }

  override setValue(val?: string): void {
    //fire events
    super.setValue(val);
    this.data = val;
  }
}

StringProperty.STRUCT =
  nstructjs.inherit(StringProperty, ToolProperty) +
  `
  data : string;
}
`;
nstructjs.register(StringProperty);
ToolProperty.internalRegister(StringProperty);

/*
let num_res = [
  /([0-9]+)/,
  /((0x)?[0-9a-fA-F]+(h?))/,
  /([0-9]+\.[0-9]*)/,
  /([0-9]*\.[0-9]+)/,
  /(\.[0-9]+)/
];
//num_re = /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)/
*/

export { isNumber } from "../../core/units.js";
/*
export function isNumber(f) {
  if (f === "NaN" || (typeof f == "number" && isNaN(f))) {
    return false;
  }

  f = ("" + f).trim();

  let ok = false;

  for (let re of num_res) {
    let ret = f.match(re)
    if (!ret) {
      ok = false;
      continue;
    }

    ok = ret[0].length === f.length;
    if (ok) {
      break;
    }
  }

  return ok;
}*/

//window.isNumber = isNumber;

export class NumProperty extends ToolProperty<number> {
  static override STRUCT: string;

  declare range: [number, number];

  constructor(
    type?: number,
    value?: number,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(type, undefined, apiname, uiname, description, flag, icon);

    this.data = 0;
    this.range = [0, 0];
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return (this.data as number) == (b.data as number);
  }

  override loadSTRUCT(reader: StructReader<NumProperty>): void {
    reader(this);
    super.loadSTRUCT(reader as StructReader<ToolProperty<number>>);
  }
}
NumProperty.STRUCT =
  nstructjs.inherit(NumProperty, ToolProperty) +
  `
  range : array(float);
  data  : float;
}
`;

export class _NumberPropertyBase<T = number> extends ToolProperty<T> {
  static override STRUCT: string;

  /** Display simple sliders with exponent divisions, don't
   * confuse with expRate which affects roller
   * slider speed.
   */
  declare sliderDisplayExp: number;

  /** controls roller slider rate */
  declare slideSpeed: number;

  /** exponential rate, used by roller sliders */
  declare expRate: number;
  declare step: number;
  declare stepIsRelative: boolean;
  declare range: [number, number];
  declare uiRange: [number, number] | undefined;

  constructor(
    type?: number,
    value?: number | null,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(type, undefined, apiname, uiname, description, flag, icon);

    this.data = 0.0 as T;

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    this.sliderDisplayExp = 1.0;
    this.slideSpeed = 1.0;
    this.expRate = 1.33;
    this.step = 0.1;

    this.stepIsRelative = false;

    this.range = [-1e17, 1e17] as [number, number];

    /** if undefined this.range will be used */
    this.uiRange = undefined;

    if (value !== undefined && value !== null) {
      this.setValue(value);
      this.wasSet = false;
    }
  }

  get ui_range(): [number, number] | undefined {
    this.report("NumberProperty.ui_range is deprecated");
    return this.uiRange;
  }

  set ui_range(val: [number, number] | undefined) {
    this.report("NumberProperty.ui_range is deprecated");
    this.uiRange = val;
  }

  override calcMemSize(): number {
    return super.calcMemSize() + 8 * 8;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return (this.data as number) === (b.data as number);
  }

  override toJSON(): Record<string, unknown> {
    let json = super.toJSON();

    json.data = this.data;
    json.expRate = this.expRate;

    return json;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);

    let nb = b as _NumberPropertyBase<unknown>;
    nb.displayUnit = this.displayUnit;
    nb.baseUnit = this.baseUnit;
    nb.expRate = this.expRate;
    nb.step = this.step;
    nb.range = this.range ? ([this.range[0], this.range[1]] as [number, number]) : undefined!;
    nb.uiRange = this.uiRange ? ([this.uiRange[0], this.uiRange[1]] as [number, number]) : undefined;
    nb.slideSpeed = this.slideSpeed;
    nb.sliderDisplayExp = this.sliderDisplayExp;

    nb.data = this.data;
  }

  setSliderDisplayExp(f: number): this {
    this.sliderDisplayExp = f;
    return this;
  }

  setSlideSpeed(f: number): this {
    this.slideSpeed = f;

    return this;
  }

  /*
   * non-linear exponent for number sliders
   * in roll mode
   * */
  setExpRate(exp: number): void {
    this.expRate = exp;
  }

  override setValue(val?: T | number | null): void {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== "number") {
      throw new Error("Invalid number " + val);
    }

    this.data = val as T;

    super.setValue(val as T);
  }

  override loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    let get = (key: string): void => {
      if (key in obj) {
        (this as Record<string, unknown>)[key] = obj[key];
      }
    };

    get("range");
    get("step");
    get("expRate");
    get("ui_range");

    return this;
  }
}
_NumberPropertyBase.STRUCT =
  nstructjs.inherit(_NumberPropertyBase, ToolProperty) +
  `
  range            : array(float);
  expRate          : float;
  data             : float;
  step             : float;
  slideSpeed       : float;
  sliderDisplayExp : float;
}
`;
nstructjs.register(_NumberPropertyBase);

export class IntProperty extends _NumberPropertyBase {
  static override STRUCT: string;

  declare radix: number;

  constructor(value?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.INT, value, apiname, uiname, description, flag, icon);

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    /* Integer properties don't use default unit. */
    this.baseUnit = this.displayUnit = "none";

    this.radix = 10;
  }

  override setValue(val?: number | null): void {
    if (val === undefined || val === null) {
      return;
    }
    super.setValue(Math.floor(val));
  }

  setRadix(radix: number): void {
    this.radix = radix;
  }

  override toJSON(): Record<string, unknown> {
    let json = super.toJSON();

    json.data = this.data;
    json.radix = this.radix;

    return json;
  }

  override loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    this.data = (obj.data as number) || (this.data as number);
    this.radix = (obj.radix as number) || this.radix;

    return this;
  }

  override loadSTRUCT(reader: StructReader<IntProperty>): void {
    reader(this);
    super.loadSTRUCT(reader as StructReader<ToolProperty<number>>);
  }
}

IntProperty.STRUCT =
  nstructjs.inherit(IntProperty, _NumberPropertyBase) +
  `
  data : int;
}`;
nstructjs.register(IntProperty);

ToolProperty.internalRegister(IntProperty);

export class ReportProperty extends StringProperty {
  static override STRUCT: string;

  constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(value, apiname, uiname, description, flag, icon);

    this.type = PropTypes.REPORT;
  }
}

ReportProperty.STRUCT =
  nstructjs.inherit(ReportProperty, StringProperty) +
  `
}
`;
nstructjs.register(ReportProperty);
ToolProperty.internalRegister(ReportProperty);

export class BoolProperty extends ToolProperty<boolean> {
  static override STRUCT: string;

  constructor(
    value?: boolean | unknown,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.BOOL, undefined, apiname, uiname, description, flag, icon);

    this.data = !!value;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return this.data == (b as BoolProperty).data;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);
    (b as BoolProperty).data = this.data;
  }

  override setValue(val?: boolean): void {
    this.data = !!val;
    super.setValue(val);
  }

  override getValue(): boolean {
    return this.data as boolean;
  }

  override toJSON(): Record<string, unknown> {
    let ret = super.toJSON();

    return ret;
  }

  override loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    return this;
  }
}

ToolProperty.internalRegister(BoolProperty);
BoolProperty.STRUCT =
  nstructjs.inherit(BoolProperty, ToolProperty) +
  `
  data : bool;
}
`;
nstructjs.register(BoolProperty);

export class FloatProperty<T = number> extends _NumberPropertyBase<T> {
  static override STRUCT: string;

  constructor(
    value?: number | null,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.FLOAT, value, apiname, uiname, description, flag, icon);

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    this.decimalPlaces = 4;
  }

  setDecimalPlaces(n: number): this {
    this.decimalPlaces = n;
    return this;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);
    (b as FloatProperty<T>).data = this.data;
  }

  override setValue(val?: T | number | null): void {
    if (val === undefined || val === null) {
      return;
    }
    this.data = val as T;

    //fire events
    super.setValue(val as T);
  }

  override toJSON(): Record<string, unknown> {
    let json = super.toJSON();

    json.data = this.data;
    json.decimalPlaces = this.decimalPlaces;

    return json;
  }

  override loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    this.data = ((obj.data as number) || (this.data as number)) as T;
    this.decimalPlaces = (obj.decimalPlaces as number) || this.decimalPlaces;

    return this;
  }

  override loadSTRUCT(reader: StructReader<ToolProperty<T>>): void {
    (reader as StructReader<FloatProperty<T>>)(this);
    super.loadSTRUCT(reader);
  }
}

ToolProperty.internalRegister(FloatProperty);
FloatProperty.STRUCT =
  nstructjs.inherit(FloatProperty, _NumberPropertyBase) +
  `
  decimalPlaces : int;
  data          : float;
}
`;
nstructjs.register(FloatProperty);

export class EnumKeyPair {
  static STRUCT: string;

  key: string | number;
  val: string | number;
  key_is_int: boolean;
  val_is_int: boolean;

  constructor(key?: string | number | boolean, val?: string | number | boolean) {
    this.key = "" + key;
    this.val = "" + val;
    this.key_is_int = typeof key === "number" || typeof key === "boolean";
    this.val_is_int = typeof val === "number" || typeof val === "boolean";
  }

  loadSTRUCT(reader: StructReader<EnumKeyPair>): void {
    reader(this);

    if (this.val_is_int) {
      this.val = parseInt(this.val as string);
    }

    if (this.key_is_int) {
      this.key = parseInt(this.key as string);
    }
  }
}

EnumKeyPair.STRUCT = `
EnumKeyPair {
  key        : string;
  val        : string;
  key_is_int : bool;
  val_is_int : bool;
}
`;
nstructjs.register(EnumKeyPair);

export class EnumProperty extends ToolProperty<number> {
  static override STRUCT: string;

  dynamicMetaCB: Function | undefined;
  values: { [k: string | number]: string | number };
  keys: { [k: string | number]: string | number };
  ui_value_names: Record<string, string>;
  descriptions: Record<string, string>;
  iconmap: Record<string, number>;
  iconmap2: Record<string, number>;

  /* These are transient fields used during loadSTRUCT */
  _keys?: EnumKeyPair[];
  _values?: EnumKeyPair[];
  _ui_value_names?: EnumKeyPair[];
  _iconmap?: EnumKeyPair[];
  _iconmap2?: EnumKeyPair[];
  _descriptions?: EnumKeyPair[];
  data_is_int?: boolean;

  constructor(
    string_or_int?: string | number,
    valid_values?: Record<string, number> | string[] | String,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.ENUM, undefined, apiname, uiname, description, flag, icon);

    this.dynamicMetaCB = undefined;
    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.descriptions = {};
    this.iconmap = {};
    this.iconmap2 = {};

    if (valid_values === undefined) return;

    if (valid_values instanceof Array || valid_values instanceof String) {
      for (var i = 0; i < valid_values.length; i++) {
        this.values[valid_values[i] as string] = valid_values[i] as string;
        this.keys[valid_values[i] as string] = valid_values[i] as string;
      }
    } else {
      for (var k in valid_values) {
        this.values[k] = valid_values[k];
        this.keys[valid_values[k]] = k;
      }
    }

    if (string_or_int === undefined) {
      this.data = first(valid_values as Iterable<number>) as number | undefined;
    } else {
      this.setValue(string_or_int);
    }

    for (var k in this.values) {
      let uiname = ToolProperty.makeUIName(k);

      this.ui_value_names[k] = uiname;
      this.descriptions[k] = uiname;
    }

    this.wasSet = false;
  }

  /**
   * Provide a callback to update the enum or flags property dynamically
   * Callback should call enumProp.updateDefinition to update the property.
   *
   * @param metaCB: (enumProp: EnumProperty|FlagsProperty) => void
   */
  dynamicMeta(metaCB: CallbackFn): this {
    this.on("meta", metaCB);
    return this;
  }

  checkMeta(): void {
    this._fire("meta", this);
  }

  calcHash(digest: util.HashDigest = new util.HashDigest()): number {
    this.checkMeta();
    for (let key in this.keys) {
      digest.add(key);
      digest.add(this.keys[key] as string);
    }

    return digest.get();
  }

  updateDefinition(enumdef_or_prop: EnumProperty | Record<string, number | string>): this {
    let descriptions = this.descriptions;
    let ui_value_names = this.ui_value_names;

    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.descriptions = {};

    let enumdef: Record<string, number | string>;

    if (enumdef_or_prop instanceof EnumProperty) {
      enumdef = enumdef_or_prop.values;
    } else {
      enumdef = enumdef_or_prop;
    }

    for (let k in enumdef) {
      let v = enumdef[k];

      this.values[k] = v;
      this.keys[v] = k;
    }

    if (enumdef_or_prop instanceof EnumProperty) {
      let prop = enumdef_or_prop;
      this.iconmap = Object.assign({}, prop.iconmap);
      this.iconmap2 = Object.assign({}, prop.iconmap2);

      this.ui_value_names = Object.assign({}, prop.ui_value_names);
      this.descriptions = Object.assign({}, prop.descriptions);
    } else {
      for (let k in this.values) {
        if (k in ui_value_names) {
          this.ui_value_names[k] = ui_value_names[k];
        } else {
          this.ui_value_names[k] = ToolProperty.makeUIName(k);
        }

        if (k in descriptions) {
          this.descriptions[k] = descriptions[k];
        } else {
          this.descriptions[k] = ToolProperty.makeUIName(k);
        }
      }
    }

    this._fire("metaChange", this);

    return this;
  }

  override calcMemSize(): number {
    this.checkMeta();
    let tot = super.calcMemSize();

    for (let k in this.values) {
      tot += (k.length * 4 + 16) * 4;
    }

    if (this.descriptions) {
      for (let k in this.descriptions) {
        tot += (k.length + this.descriptions[k].length) * 4;
      }
    }

    return tot + 64;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return this.getValue() === (b as EnumProperty).getValue();
  }

  addUINames(map: Record<string, string>): this {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map: Record<string, string>): this {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  addIcons2(iconmap2: Record<string, number>): this {
    if (this.iconmap2 === undefined) {
      this.iconmap2 = {};
    }

    for (let k in iconmap2) {
      this.iconmap2[k] = iconmap2[k];
    }

    return this;
  }

  addIcons(iconmap: Record<string, number>): this {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (let k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  override copyTo(p: ToolProperty<unknown>): void {
    super.copyTo(p);

    let ep = p as EnumProperty;
    ep.data = this.data;

    // copy meta event handlers
    ep.callbacks.meta = Array.from(this.callbacks.meta ?? []);

    ep.keys = Object.assign({}, this.keys);
    ep.values = Object.assign({}, this.values);
    ep.ui_value_names = this.ui_value_names;
    ep.update = this.update;
    ep.api_update = this.api_update;

    ep.iconmap = this.iconmap;
    ep.iconmap2 = this.iconmap2;
    ep.descriptions = this.descriptions;
  }

  override copy(): EnumProperty {
    var p = new (this.constructor as new (
      s: string,
      v: Record<string, number>,
      a?: string,
      u?: string,
      d?: string,
      f?: number
    ) => EnumProperty)("dummy", { "dummy": 0 }, this.apiname, this.uiname, this.description, this.flag);

    this.copyTo(p);
    return p;
  }

  override getValue(): number {
    let d = this.data as string | number;
    if (d in this.values) return this.values[d as string] as number;
    else return d as number;
  }

  override setValue(val?: string | number): void {
    this.checkMeta();
    if (val === undefined) return;
    if (!(val in this.values) && val in this.keys) val = this.keys[val] as string | number;

    if (!(val in this.values)) {
      this.report("Invalid value for enum!", val, this.values);
      return;
    }

    this.data = val as number | undefined;

    //fire events
    super.setValue(val as number);
  }

  _loadMap(obj: EnumKeyPair[] | undefined): Record<string, string | number> {
    if (!obj) {
      return {};
    }

    let ret: Record<string, string | number> = {};
    for (let k of obj) {
      ret[k.key as string] = k.val;
    }

    return ret;
  }

  _saveMap(obj: Record<string, string | number> | undefined): EnumKeyPair[] {
    obj = obj === undefined ? {} : obj;
    let ret: EnumKeyPair[] = [];

    for (let k in obj) {
      ret.push(new EnumKeyPair(k, obj[k]));
    }

    return ret;
  }

  override loadSTRUCT(reader: StructReader<EnumProperty>): void {
    reader(this);
    super.loadSTRUCT(reader as StructReader<ToolProperty<number>>);

    this.keys = this._loadMap(this._keys);
    this.values = this._loadMap(this._values);
    this.ui_value_names = this._loadMap(this._ui_value_names) as Record<string, string>;
    this.iconmap = this._loadMap(this._iconmap) as Record<string, number>;
    this.iconmap2 = this._loadMap(this._iconmap2) as Record<string, number>;
    this.descriptions = this._loadMap(this._descriptions) as Record<string, string>;

    if (this.data_is_int) {
      this.data = parseInt(this.data as unknown as string) as number | undefined;
      delete this.data_is_int;
    } else if ((this.data as unknown as string | number) in this.keys) {
      this.data = this.keys[this.data as unknown as string | number] as number | undefined;
    }
  }

  _is_data_int(): boolean {
    return typeof this.data === "number";
  }
}

ToolProperty.internalRegister(EnumProperty);
EnumProperty.STRUCT =
  nstructjs.inherit(EnumProperty, ToolProperty) +
  `
  data            : string             | ""+this.data;
  data_is_int     : bool               | this._is_data_int();
  _keys           : array(EnumKeyPair) | this._saveMap(this.keys) ;
  _values         : array(EnumKeyPair) | this._saveMap(this.values) ;
  _ui_value_names : array(EnumKeyPair) | this._saveMap(this.ui_value_names) ;
  _iconmap        : array(EnumKeyPair) | this._saveMap(this.iconmap) ;
  _iconmap2       : array(EnumKeyPair) | this._saveMap(this.iconmap2) ;
  _descriptions   : array(EnumKeyPair) | this._saveMap(this.descriptions) ;
}
`;
nstructjs.register(EnumProperty);

export class FlagProperty extends EnumProperty {
  static override STRUCT: string;

  constructor(
    string_or_int?: string | number,
    valid_values?: Record<string, number> | string[] | String,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(string_or_int, valid_values, apiname, uiname, description, flag, icon);

    this.type = PropTypes.FLAG;
    this.wasSet = false;
  }

  override setValue(bitmask?: string | number): void {
    this.checkMeta();
    this.data = bitmask as number | undefined;

    //do not trigger EnumProperty's setValue
    ToolProperty.prototype.setValue.call(this, bitmask as number);
  }
}

ToolProperty.internalRegister(FlagProperty);
FlagProperty.STRUCT =
  nstructjs.inherit(FlagProperty, EnumProperty) +
  `
}
`;
nstructjs.register(FlagProperty);

export class VecPropertyBase<T = number> extends FloatProperty<T> {
  static override STRUCT: string;

  hasUniformSlider: boolean;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(undefined, apiname, uiname, description);

    this.hasUniformSlider = false;
  }

  override calcMemSize(): number {
    return super.calcMemSize() + (this.data as unknown as number[]).length * 8;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    let d1 = this.data as unknown as { vectorDistance(b: unknown): number };
    return d1.vectorDistance((b as VecPropertyBase).data) < 0.00001;
  }

  uniformSlider(state: boolean = true): this {
    this.hasUniformSlider = state;
    return this;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);
    (b as VecPropertyBase).hasUniformSlider = this.hasUniformSlider;
  }
}

VecPropertyBase.STRUCT =
  nstructjs.inherit(VecPropertyBase, FloatProperty) +
  `
  hasUniformSlider : bool | this.hasUniformSlider || false;
}
`;

export class Vec2Property extends FloatProperty<Vector2> {
  static override STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC2;
    this.data = new Vector2(data as number[] | undefined);
  }

  override setValue(v?: unknown): void {
    (this.data as Vector2).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector2);
  }

  override getValue(): Vector2 {
    return this.data as Vector2;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as Vector2).load(this.data as Vector2);
  }
}

Vec2Property.STRUCT =
  nstructjs.inherit(Vec2Property, VecPropertyBase) +
  `
  data : vec2;
}
`;
nstructjs.register(Vec2Property);

ToolProperty.internalRegister(Vec2Property);

export class Vec3Property extends VecPropertyBase<Vector3> {
  static override STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC3;
    this.data = new Vector3(data as number[] | undefined);
  }

  isColor(): this {
    this.subtype = PropSubTypes.COLOR;
    return this;
  }

  override setValue(v?: unknown): void {
    (this.data as Vector3).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector3);
  }

  override getValue(): Vector3 {
    return this.data as Vector3;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as Vector3).load(this.data as Vector3);
  }
}

Vec3Property.STRUCT =
  nstructjs.inherit(Vec3Property, VecPropertyBase) +
  `
  data : vec3;
}
`;
nstructjs.register(Vec3Property);
ToolProperty.internalRegister(Vec3Property);

export class Vec4Property extends FloatProperty<Vector4> {
  static override STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(undefined, apiname, uiname, description);

    this.type = PropTypes.VEC4;
    this.data = new Vector4(data as number[] | undefined);
  }

  override setValue(v?: unknown, w: number = 1.0): void {
    let vec = v as unknown as number[];
    let d = this.data as Vector4;
    d.load(vec);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector4);

    if (vec.length < 3) {
      d[2] = 0.0;
    }
    if (vec.length < 4) {
      d[3] = w;
    }
  }

  isColor(): this {
    this.subtype = PropSubTypes.COLOR;
    return this;
  }

  override getValue(): Vector4 {
    return this.data as Vector4;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as Vector4).load(this.data as Vector4);
  }
}

Vec4Property.STRUCT =
  nstructjs.inherit(Vec4Property, VecPropertyBase) +
  `
  data : vec4;
}
`;
nstructjs.register(Vec4Property);
ToolProperty.internalRegister(Vec4Property);

export class QuatProperty extends ToolProperty<Quat> {
  static override STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.QUAT, undefined, apiname, uiname, description);
    this.data = new Quat(data as number[] | undefined);
  }

  override equals(b: ToolProperty<unknown>): boolean {
    let d = this.data as unknown as { vectorDistance(b: unknown): number };
    return d.vectorDistance(b.data) < 0.00001;
  }

  override setValue(v?: Quat): void {
    (this.data as Quat).load(v as unknown as number[]);
    super.setValue(v);
  }

  override getValue(): Quat {
    return this.data as Quat;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    let data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as unknown as Quat).load(this.data as Quat);
  }
}

QuatProperty.STRUCT =
  nstructjs.inherit(QuatProperty, VecPropertyBase) +
  `
  data : vec4;
}
`;
nstructjs.register(QuatProperty);

ToolProperty.internalRegister(QuatProperty);

export class Mat4Property extends ToolProperty<Matrix4> {
  static override STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.MATRIX4, undefined, apiname, uiname, description);
    this.data = new Matrix4(data as Matrix4 | number[] | undefined);
  }

  override calcMemSize(): number {
    return super.calcMemSize() + 16 * 8 + 32;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    let m1 = (this.data as Matrix4).$matrix;
    let m2 = (b.data as Matrix4).$matrix;

    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 4; j++) {
        let key = `m${i}${j}` as keyof typeof m1;

        if (Math.abs(m1[key] - m2[key]) > 0.00001) {
          return false;
        }
      }
    }

    return true;
  }

  override setValue(v?: Matrix4): void {
    (this.data as Matrix4).load(v as Matrix4 | number[]);
    super.setValue(v);
  }

  override getValue(): Matrix4 {
    return this.data as Matrix4;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    let data = b.data;
    super.copyTo(b);
    b.data = data;

    (b.data as Matrix4).load(this.data as Matrix4);
  }

  override loadSTRUCT(reader: StructReader<Mat4Property>): void {
    reader(this);
    super.loadSTRUCT(reader as StructReader<ToolProperty<Matrix4>>);
  }
}

Mat4Property.STRUCT =
  nstructjs.inherit(Mat4Property, FloatProperty) +
  `
  data           : mat4;
}
`;
nstructjs.register(Mat4Property);
ToolProperty.internalRegister(Mat4Property);

/**
 * List of other tool props (all of one type)
 */
export class ListProperty<ToolPropType extends ToolProperty<unknown> = ToolProperty<unknown>> extends ToolProperty<
  ToolPropType[]
> {
  static override STRUCT: string;

  prop: ToolPropType;
  value: ToolPropType[];

  /*
   * Prop must be a ToolProperty subclass instance
   * */
  constructor(
    prop?: ToolProperty<unknown> | number | ToolPropertyConstructor,
    list: unknown[] = [],
    uiname: string = ""
  ) {
    super(PropTypes.PROPLIST);

    this.uiname = uiname;
    this.flag &= ~PropFlags.SAVE_LAST_VALUE;

    if (typeof prop == "number") {
      let cls = PropClasses[prop];

      if (cls !== undefined) {
        prop = new (cls as unknown as ToolPropertyConstructor)();
      }
    } else if (prop !== undefined) {
      if (prop instanceof ToolProperty) {
        prop = prop.copy();
      } else {
        prop = new (prop as ToolPropertyConstructor)();
      }
    }

    this.prop = prop as ToolPropType;
    this.value = [];

    if (list) {
      for (let val of list) {
        this.push(val as ToolPropType | undefined);
      }
    }

    this.wasSet = false;
  }

  get length(): number {
    return this.value.length;
  }

  set length(val: number) {
    this.value.length = val;
  }

  splice(i: number, deleteCount: number, ...newItems: ToolPropType[]): ToolPropType[] {
    const deletedItems = this.value.splice(i, deleteCount, ...newItems);
    this.length = this.value.length;
    return deletedItems;
  }

  override calcMemSize(): number {
    let tot = super.calcMemSize();

    let psize = this.prop ? this.prop.calcMemSize() + 8 : 8;
    if (!this.prop && this.value.length > 0) {
      psize = this.value[0].calcMemSize();
    }

    tot += psize * this.value.length + 8;
    tot += 16;

    return tot;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    let lb = b as ListProperty<ToolPropType>;
    let l1 = this.value ? this.value.length : 0;
    let l2 = lb.value ? lb.value.length : 0;

    if (l1 !== l2) {
      return false;
    }

    for (let i = 0; i < l1; i++) {
      let prop1 = this.value[i];
      let prop2 = lb.value[i];

      let bad = prop1.constructor !== prop2.constructor;
      bad = bad || !prop1.equals(prop2);

      if (bad) {
        return false;
      }
    }

    return true;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);

    let lb = b as ListProperty<ToolPropType>;
    lb.prop = this.prop.copy() as ToolPropType;
    lb.value = [];

    for (let prop of this.value) {
      lb.value.push(prop.copy() as ToolPropType);
    }
  }

  override copy(): ListProperty<ToolPropType> {
    let ret = new ListProperty<ToolPropType>(this.prop.copy() as ToolPropType);
    this.copyTo(ret);
    return ret;
  }

  push(item?: ToolPropType | unknown): ToolPropType {
    if (item === undefined) {
      item = this.prop.copy();
    }

    if (!(item instanceof ToolProperty)) {
      let prop = this.prop.copy() as ToolPropType;
      prop.setValue(item);
      item = prop;
    }

    this.value.push(item as ToolPropType);
    return item as ToolPropType;
  }

  clear(): this {
    this.value.length = 0;
    return this;
  }

  getListItem(i: number): unknown {
    if (i < 0) {
      i += this.length;
    }
    return this.value[i].getValue();
  }

  setListItem(i: number, val: unknown): void {
    if (i < 0) {
      i += this.length;
    }
    this.value[i].setValue(val);
  }

  override setValue(value?: Iterable<unknown>): void {
    this.clear();

    for (let item of value!) {
      let prop = this.push();

      if (typeof item !== "object") {
        prop.setValue(item);
      } else if (item instanceof prop.constructor) {
        (item as ToolPropType).copyTo(prop);
      } else {
        this.report(item);
        throw new Error("invalid value " + item);
      }
    }

    super.setValue(value as ToolPropType[] | undefined);
  }

  override getValue(): ToolPropType[] {
    return this.value;
  }

  [Symbol.iterator](): IterableIterator<unknown> {
    let list = this.value;

    return (function* () {
      for (let item of list) {
        yield item.getValue();
      }
    })();
  }
}

ListProperty.STRUCT =
  nstructjs.inherit(ListProperty, ToolProperty) +
  `
  prop  : abstract(ToolProperty);
  value : array(abstract(ToolProperty));
}`;
nstructjs.register(ListProperty);

ToolProperty.internalRegister(ListProperty);

//like FlagsProperty but uses strings
export class StringSetProperty extends ToolProperty<UtilStringSet> {
  static override STRUCT: string;

  value: UtilStringSet;
  values: Record<string, string>;
  ui_value_names: Record<string, string>;
  descriptions: Record<string, string>;
  iconmap: Record<string, number>;
  iconmap2: Record<string, number>;

  constructor(
    value?: string | Iterable<string> | Record<string, string> | null,
    definition: string[] | UtilStringSet | Set<string> | Record<string, string> | string = []
  ) {
    super(PropTypes.STRSET);

    let values: string[] = [];

    this.value = new util.set() as UtilStringSet;

    let def = definition;
    if (Array.isArray(def) || def instanceof util.set || def instanceof Set) {
      for (let item of def) {
        values.push(item as string);
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
    this.iconmap2 = {};

    for (let v of values) {
      this.values[v] = v;

      let uiname = ToolProperty.makeUIName(v);
      this.ui_value_names[v] = uiname;
    }

    if (value !== undefined && value !== null) {
      this.setValue(value);
    }

    this.wasSet = false;
  }

  override calcMemSize(): number {
    let tot = super.calcMemSize();

    for (let k in this.values) {
      tot += (k.length + 16) * 5;
    }

    if (this.descriptions) {
      for (let k in this.descriptions) {
        tot += (k.length + this.descriptions[k].length + 8) * 4;
      }
    }

    return tot + 64;
  }

  override equals(b: ToolProperty<unknown>): boolean {
    return this.value.equals((b as StringSetProperty).value);
  }

  /*
   * Values can be a string, undefined/null, or a list/set/object-literal of strings.
   * If destructive is true, then existing set will be cleared.
   * */
  override setValue(
    values?: string | Iterable<string> | Record<string, string> | null,
    destructive: boolean = true,
    soft_fail: boolean = true
  ): void {
    let bad = typeof values !== "string";
    bad = bad && typeof values !== "object";
    bad = bad && values !== undefined && values !== null;

    if (bad) {
      if (soft_fail) {
        this.report("Invalid argument to StringSetProperty.prototype.setValue() " + values);
        return;
      } else {
        throw new Error("Invalid argument to StringSetProperty.prototype.setValue() " + values);
      }
    }

    //handle undefined/null
    if (!values) {
      this.value.clear();
    } else if (typeof values === "string") {
      if (destructive) this.value.clear();

      if (!(values in this.values)) {
        if (soft_fail) {
          this.report(`"${values}" is not in this StringSetProperty`);
          return;
        } else {
          throw new Error(`"${values}" is not in this StringSetProperty`);
        }
      }

      this.value.add(values);
    } else {
      let data: string[] = [];

      if (Array.isArray(values) || values instanceof util.set || values instanceof Set) {
        for (let item of values) {
          data.push(item as string);
        }
      } else {
        //object literal?
        for (let k in values) {
          data.push(k);
        }
      }

      for (let item of data) {
        if (!(item in this.values)) {
          if (soft_fail) {
            this.report(`"${item}" is not in this StringSetProperty`);
            continue;
          } else {
            throw new Error(`"${item}" is not in this StringSetProperty`);
          }
        }

        this.value.add(item);
      }
    }

    super.setValue();
  }

  override getValue(): UtilStringSet {
    return this.value;
  }

  addIcons2(iconmap2: Record<string, number> | undefined): this {
    if (iconmap2 === undefined) return this;

    for (let k in iconmap2) {
      this.iconmap2[k] = iconmap2[k];
    }

    return this;
  }

  addIcons(iconmap: Record<string, number> | undefined): this {
    if (iconmap === undefined) return this;

    for (let k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  addUINames(map: Record<string, string>): this {
    for (let k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map: Record<string, string>): this {
    for (let k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  override copyTo(b: ToolProperty<unknown>): void {
    super.copyTo(b);

    let sb = b as StringSetProperty;

    for (let val of this.value) {
      sb.value.add(val);
    }

    sb.values = {};
    for (let k in this.values) {
      sb.values[k] = this.values[k];
    }

    sb.ui_value_names = {};
    for (let k in this.ui_value_names) {
      sb.ui_value_names[k] = this.ui_value_names[k];
    }

    sb.iconmap = {};
    sb.iconmap2 = {};

    for (let k in this.iconmap) {
      sb.iconmap[k] = this.iconmap[k];
    }

    for (let k in this.iconmap2) {
      sb.iconmap2[k] = this.iconmap2[k];
    }

    sb.descriptions = {};
    for (let k in this.descriptions) {
      sb.descriptions[k] = this.descriptions[k];
    }
  }

  override loadSTRUCT(reader: StructReader<StringSetProperty>): void {
    reader(this);

    let values = this.values as unknown as string[];
    this.values = {};

    for (let s of values) {
      this.values[s] = s;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.value = new util.set(this.value as any) as UtilStringSet;
  }
}

StringSetProperty.STRUCT =
  nstructjs.inherit(StringSetProperty, ToolProperty) +
  `
  value  : iter(string);
  values : iterkeys(string);
}`;
nstructjs.register(StringSetProperty);

ToolProperty.internalRegister(StringSetProperty);
