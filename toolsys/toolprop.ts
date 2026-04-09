import * as util from "../util/util.js";
import { Vector2, Vector3, Vector4, Quat, Matrix4 } from "../util/vectormath.js";
import { ToolPropertyIF, PropTypes, PropFlags } from "./toolprop_abstract.js";
import nstructjs from "../util/struct.js";
import type { StructReader } from "../util/nstructjs_es6.js";
import type { JSONAny } from "../controller.js";

declare global {
  interface SymbolConstructor {
    readonly dispose: symbol;
  }
}

export type EnumDef = Record<string, number | string>;
export type FlagsDef = Record<string, number>;
export type IconMap = Record<string, number>;
export type DescriptionMap = Record<string, string>;
export type UINameMap = Record<string, string>;

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

type UtilStringSet = util.set<any>;

const first = <T>(iter: Iterable<T> | Record<string, T> | undefined): T | string | undefined => {
  if (iter === undefined) {
    return undefined;
  }

  if (!(Symbol.iterator in (iter as object))) {
    for (const item in iter as Record<string, T>) {
      return item;
    }

    return undefined;
  }

  for (const item of iter as Iterable<T>) {
    return item;
  }

  return undefined;
};

//set PropTypes to custom type integers
export function setPropTypes(types: Record<string, number>): void {
  for (const k in types) {
    (PropTypes as any)[k] = types[k];
  }
}

export const customPropertyTypes: (typeof ToolProperty)[] = [];
export const PropClasses: Record<number, typeof ToolProperty> = {};

let customPropTypeBase: number = 17;

export const MakeUINameWordMap: Record<string, string> = {
  sel  : "select",
  unsel: "deselect",
  eid  : "id",
  props: "properties",
  res  : "resource",
};

// XX todo: investivate (i.e. test) dynamic binding of var vs let
// eslint-disable-next-line no-var
export var defaultRadix: number = 10;
// eslint-disable-next-line no-var
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
interface DataAPIExecScope {
  ctx?: unknown;
  dataref?: unknown;
  datapath?: string;
}

class ExecScopeUsing {
  private oldScope: DataAPIExecScope = {};
  private prop?: DataAPIExecScope;

  init(prop: DataAPIExecScope) {
    this.prop = prop;
    this.oldScope.ctx = prop.ctx;
    this.oldScope.datapath = prop.datapath;
    this.oldScope.dataref = prop.dataref;
    return this;
  }

  public get ctx() {
    return this.prop!.ctx;
  }
  public set ctx(v) {
    this.prop!.ctx = v;
  }

  public get dataref() {
    return this.prop!.dataref;
  }
  public set dataref(v) {
    this.prop!.dataref = v;
  }

  public get datapath() {
    return this.prop!.datapath;
  }
  public set datapath(v) {
    this.prop!.datapath = v;
  }

  [Symbol.dispose]() {
    const prop = this.prop!;
    const oldScope = this.oldScope!;

    prop.ctx = oldScope.ctx;
    prop.datapath = oldScope.datapath;
    prop.dataref = oldScope.dataref;

    execScopeUsingStack._popStack();
  }
}

class ExecScopeUsingStack extends Array<ExecScopeUsing> {
  depth = 0;

  constructor(size: number) {
    super(size);
    this.length = size;
    for (let i = 0; i < size; i++) {
      this[i] = new ExecScopeUsing();
    }
  }

  withScope(prop: DataAPIExecScope) {
    return this.pushStack().init(prop);
  }

  private pushStack() {
    return this[this.depth++];
  }
  public _popStack() {
    this.depth--;
  }
}
// eslint-disable-next-line no-var
var execScopeUsingStack = new ExecScopeUsingStack(512);

export class ToolProperty<T = unknown, TYPE extends number = number>
  extends ToolPropertyIF<TYPE>
  implements DataAPIExecScope
{
  static STRUCT: string;
  static PROP_TYPE_ID: number;

  declare data: T;
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

  // these fields are used by the data api system
  ctx?: unknown;
  dataref?: unknown;
  datapath?: string;

  constructor(
    type?: TYPE,
    subtype?: number,
    apiname?: string,
    uiname: string = "",
    description: string = "",
    flag: number = 0,
    icon: number = -1
  ) {
    super(type);

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

  /** Get a data api execution context stack ( for use with the using keyword) */
  execWithContext() {
    return execScopeUsingStack.withScope(this);
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
    const parts: string[] = [""];
    let lastc: string | undefined = undefined;

    const ischar = (c: string): boolean => {
      const code = c.charCodeAt(0);

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

    const subst = (word: string): string => {
      if (word in MakeUINameWordMap) {
        return MakeUINameWordMap[word];
      } else {
        return word;
      }
    };

    const result = parts
      .filter((f) => f.trim().length > 0)
      .map((f) => subst(f))
      .map((f) => f[0].toUpperCase() + f.slice(1, f.length).toLowerCase())
      .join(" ")
      .trim();
    return result;
  }

  static register(cls: typeof ToolProperty & { name: string; PROP_TYPE_ID: number }): number {
    cls.PROP_TYPE_ID = 1 << customPropTypeBase;
    (PropTypes as any)[cls.name] = cls.PROP_TYPE_ID;

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
    for (const k in this.callbacks) {
      tot += 24;
    }

    return tot;
  }

  equals(b: this): boolean {
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
      const cb = stack[i];

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
    for (const cb2 of this.callbacks[type]) {
      if (cb2 instanceof OnceTag && cb2.cb === cb) {
        return this;
      }
    }

    const tag = new OnceTag(cb);

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

  toJSON(): JSONAny {
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
    this.type = obj.type as TYPE;
    this.subtype = obj.subtype as number | undefined;
    this.apiname = obj.apiname as string | undefined;
    this.uiname = obj.uiname as string | undefined;
    this.description = obj.description as string | undefined;
    this.flag = obj.flag as number;
    this.icon = obj.icon as number;
    this.data = obj.data as T;

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

  copyTo(b: this): void {
    b.apiname = this.apiname;

    b.uiname = this.uiname;
    b.description = this.description;
    b.icon = this.icon;
    b.icon2 = this.icon2;

    b.baseUnit = this.baseUnit;
    b.subtype = this.subtype;
    b.displayUnit = this.displayUnit;

    b.flag = this.flag;

    for (const k in this.callbacks) {
      b.callbacks[k] = this.callbacks[k];
    }
  }

  copy(): this {
    //default copy method
    const ret = new (this.constructor as ToolPropertyConstructor)();

    this.copyTo(ret as this);

    return ret as this;
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

  setRelativeStep(step: number): this {
    this.step = step;
    this.stepIsRelative = true;
    return this;
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

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    if (this.uiRange?.[0] === -1e17 && this.uiRange[1] === 1e17) {
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

export class FloatArrayProperty extends ToolProperty<number[], PropTypes["FLOAT_ARRAY"]> {
  static PROP_TYPE_ID = PropTypes.FLOAT_ARRAY;
  static STRUCT: string;

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

  setValue(value?: Iterable<number | boolean>): void {
    super.setValue();

    if (value === undefined) {
      throw new Error("value was undefined in FloatArrayProperty's setValue method");
    }

    this.value.length = 0;

    for (const item of value) {
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

  getValue(): number[] {
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

export class StringPropertyBase<TYPE extends number> extends ToolProperty<string, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    StringPropertyBase {
      data           : string;
      multiLine      : bool;
    }
  `
  );

  multiLine: boolean = false;

  constructor(
    type?: TYPE,
    value?: string,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(type, undefined, apiname, uiname, description, flag, icon);

    this.multiLine = false;
    this.setValue(value ?? "");
  }

  calcMemSize(): number {
    return super.calcMemSize() + (this.data !== undefined ? this.data.length * 4 : 0) + 8;
  }

  equals(b: this): boolean {
    return this.data === b.data;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    (b as StringPropertyBase<TYPE>).data = this.data;
    (b as StringPropertyBase<TYPE>).multiLine = this.multiLine;
  }

  getValue(): string {
    return this.data;
  }

  setValue(val: string): void {
    //fire events
    super.setValue(val);
    this.data = val;
  }
}

export class StringProperty extends StringPropertyBase<PropTypes["STRING"]> {
  static PROP_TYPE_ID = PropTypes.STRING;
  static STRUCT = nstructjs.inlineRegister(this, `StringProperty {}`);

  constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.STRING, value, apiname, uiname, description, flag, icon);
  }
}
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

export class NumProperty<TYPE extends number = number> extends ToolProperty<number, TYPE> {
  static STRUCT: string;

  declare range: [number, number];

  constructor(
    type?: TYPE,
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

  equals(b: this): boolean {
    return this.data == b.data;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);
  }
}
NumProperty.STRUCT =
  nstructjs.inherit(NumProperty, ToolProperty) +
  `
  range : array(float);
  data  : float;
}
`;

export class _NumberPropertyBase<T = number, TYPE extends number = number> extends ToolProperty<T, TYPE> {
  static STRUCT: string;

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
    type?: TYPE,
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

  calcMemSize(): number {
    return super.calcMemSize() + 8 * 8;
  }

  equals(b: this): boolean {
    return this.data === b.data;
  }

  toJSON(): JSONAny {
    const json = super.toJSON();

    json.data = this.data;
    json.expRate = this.expRate;

    return json;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    const nb = b as _NumberPropertyBase<unknown>;
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
  setExpRate(exp: number): this {
    this.expRate = exp;
    return this;
  }

  setValue(val?: T | number | null): void {
    if (val === undefined || val === null) {
      return;
    }

    if (typeof val !== "number") {
      throw new Error("Invalid number " + val);
    }

    this.data = val as T;

    super.setValue(val as T);
  }

  loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    const get = (key: string): void => {
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

export class IntProperty extends _NumberPropertyBase<number, PropTypes["INT"]> {
  static PROP_TYPE_ID = PropTypes.INT;
  static STRUCT: string;

  declare radix: number;

  constructor(value?: number, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.INT, value, apiname, uiname, description, flag, icon);

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    /* Integer properties don't use default unit. */
    this.baseUnit = this.displayUnit = "none";

    this.radix = 10;
  }

  setValue(val?: number | null): void {
    if (val === undefined || val === null) {
      return;
    }
    super.setValue(Math.floor(val));
  }

  setRadix(radix: number): void {
    this.radix = radix;
  }

  toJSON(): JSONAny {
    const json = super.toJSON();

    json.data = this.data;
    json.radix = this.radix;

    return json;
  }

  loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    this.data = (obj.data as number) || (this.data as number);
    this.radix = (obj.radix as number) || this.radix;

    return this;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);
  }
}

IntProperty.STRUCT =
  nstructjs.inherit(IntProperty, _NumberPropertyBase) +
  `
  data : int;
}`;
nstructjs.register(IntProperty);

ToolProperty.internalRegister(IntProperty);

export class ReportProperty extends StringPropertyBase<PropTypes["REPORT"]> {
  static PROP_TYPE_ID = PropTypes.REPORT;
  static STRUCT = nstructjs.inlineRegister(this, "ReportProperty {}");

  constructor(value?: string, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.REPORT, value, apiname, uiname, description, flag, icon);
    this.type = PropTypes.REPORT;
  }
}
ToolProperty.internalRegister(ReportProperty);

export class BoolProperty extends ToolProperty<boolean, PropTypes["BOOL"]> {
  static PROP_TYPE_ID = PropTypes.BOOL;
  static STRUCT: string;

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

  equals(b: this): boolean {
    return this.data == b.data;
  }

  copyTo(b: this): void {
    super.copyTo(b);
    (b as BoolProperty).data = this.data;
  }

  setValue(val?: boolean): void {
    this.data = !!val;
    super.setValue(val);
  }

  getValue(): boolean {
    return this.data as boolean;
  }

  toJSON(): JSONAny {
    const ret = super.toJSON();

    return ret;
  }

  loadJSON(obj: Record<string, unknown>): this {
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

class FloatPropertyBase<T = number, TYPE extends number = number> extends _NumberPropertyBase<T, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    FloatPropertyBase {
      decimalPlaces : int;
      data          : float;
    }`
  );

  constructor(
    type?: TYPE,
    value?: number | null,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(type, value, apiname, uiname, description, flag, icon);

    //remember to update NumberConstraintsBase et al when adding new number
    //constraints

    this.decimalPlaces = 4;
  }

  setDecimalPlaces(n: number): this {
    this.decimalPlaces = n;
    return this;
  }

  copyTo(b: this): void {
    super.copyTo(b);
    (b as FloatPropertyBase<T>).data = this.data;
  }

  setValue(val?: T | number | null): void {
    if (val === undefined || val === null) {
      return;
    }
    this.data = val as T;

    //fire events
    super.setValue(val as T);
  }

  toJSON(): JSONAny {
    const json = super.toJSON();

    json.data = this.data;
    json.decimalPlaces = this.decimalPlaces;

    return json;
  }

  loadJSON(obj: Record<string, unknown>): this {
    super.loadJSON(obj);

    this.data = ((obj.data as number) || (this.data as number)) as T;
    this.decimalPlaces = (obj.decimalPlaces as number) || this.decimalPlaces;

    return this;
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);
  }
}

export class FloatProperty extends FloatPropertyBase<number, PropTypes["FLOAT"]> {
  static PROP_TYPE_ID = PropTypes.FLOAT;
  static STRUCT = nstructjs.inlineRegister(this, "FloatProperty {}");

  constructor(
    value?: number | null,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.FLOAT, value, apiname, uiname, description, flag, icon);
  }
}
ToolProperty.internalRegister(FloatProperty);

export class EnumKeyPair {
  static loadMap<
    KEY extends string | number, //
    VALUE extends string | number,
  >(obj: EnumKeyPair[] | undefined): Record<KEY, VALUE> {
    if (!obj) {
      return {} as Record<KEY, VALUE>;
    }

    const ret: Record<KEY, VALUE> = {} as Record<KEY, VALUE>;
    for (const k of obj) {
      ret[k.key as KEY] = k.val as VALUE;
    }

    return ret;
  }

  static saveMap(obj: Record<string, string | number> | undefined): EnumKeyPair[] {
    obj = obj === undefined ? {} : obj;
    const ret: EnumKeyPair[] = [];

    for (const k in obj) {
      ret.push(new EnumKeyPair(k, obj[k]));
    }

    return ret;
  }

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

  loadSTRUCT(reader: StructReader<this>): void {
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

export class EnumPropertyBase<TYPE extends number, VALUE extends string | number> extends ToolProperty<VALUE, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    EnumPropertyBase {
      data            : string             | ""+this.data;
      data_is_int     : bool               | this._is_data_int();
      _keys           : array(EnumKeyPair) | this._saveMap(this.keys) ;
      _values         : array(EnumKeyPair) | this._saveMap(this.values) ;
      _ui_value_names : array(EnumKeyPair) | this._saveMap(this.ui_value_names) ;
      _iconmap        : array(EnumKeyPair) | this._saveMap(this.iconmap) ;
      _iconmap2       : array(EnumKeyPair) | this._saveMap(this.iconmap2) ;
      _descriptions   : array(EnumKeyPair) | this._saveMap(this.descriptions) ;
    }
  `
  );

  dynamicMetaCB: Function | undefined;
  /** Maps keys to values */
  values: { [k: string | number]: VALUE };
  /** Maps values to keys */
  keys: Record<VALUE, string | number>;

  /** Maps keys to UI strings */
  ui_value_names: { [k: string]: string };
  /** Maps keys to descriptions */
  descriptions: { [k: string]: string };
  /** Maps keys to icons */
  iconmap: { [k: string]: number };
  /** Maps keys to pressed icons */
  iconmap2: { [k: string]: number };

  /* These are transient fields used during loadSTRUCT */
  _keys?: EnumKeyPair[];
  _values?: EnumKeyPair[];
  _ui_value_names?: EnumKeyPair[];
  _iconmap?: EnumKeyPair[];
  _iconmap2?: EnumKeyPair[];
  _descriptions?: EnumKeyPair[];
  data_is_int?: boolean;

  constructor(
    type?: TYPE,
    string_or_int?: string | number,
    valid_values?: Record<string, VALUE> | string[] | EnumPropertyBase<TYPE, VALUE>,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(type, undefined, apiname, uiname, description, flag, icon);

    this.dynamicMetaCB = undefined;
    this.values = {};
    this.keys = {} as typeof this.keys;
    this.ui_value_names = {} as typeof this.ui_value_names;
    this.descriptions = {} as typeof this.descriptions;
    this.iconmap = {} as typeof this.iconmap;
    this.iconmap2 = {} as typeof this.iconmap2;

    if (valid_values === undefined) return;

    if (valid_values instanceof Array) {
      for (let i = 0; i < valid_values.length; i++) {
        this.values[valid_values[i] as string] = valid_values[i] as VALUE;
        this.keys[valid_values[i] as VALUE] = valid_values[i] as string;
      }
    } else {
      for (const k in valid_values) {
        this.values[k] = valid_values[k as keyof typeof valid_values] as VALUE;
        this.keys[valid_values[k as keyof typeof valid_values] as VALUE] = k as string;
      }
    }

    if (string_or_int === undefined) {
      this.data = first(valid_values as Iterable<number>) as VALUE;
    } else {
      this.setValue(string_or_int as VALUE);
    }

    for (const k in this.values) {
      const uiname = ToolProperty.makeUIName(k);

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
    for (const key in this.keys) {
      digest.add(key);
      digest.add(this.keys[key] as string);
    }

    return digest.get();
  }

  updateDefinition(enumdef_or_prop: EnumPropertyBase<TYPE, string | number> | Record<string, number | string>): this {
    const descriptions = this.descriptions;
    const ui_value_names = this.ui_value_names;

    this.values = {} as typeof this.values;
    this.keys = {} as typeof this.keys;
    this.ui_value_names = {};
    this.descriptions = {};

    let enumdef: Record<string, number | string>;

    if (enumdef_or_prop instanceof EnumPropertyBase) {
      enumdef = enumdef_or_prop.values;
    } else {
      enumdef = enumdef_or_prop;
    }

    for (const k in enumdef) {
      const v = enumdef[k];

      this.values[k] = v as VALUE;
      this.keys[v as VALUE] = k;
    }

    if (enumdef_or_prop instanceof EnumPropertyBase) {
      const prop = enumdef_or_prop;
      this.iconmap = Object.assign({}, prop.iconmap);
      this.iconmap2 = Object.assign({}, prop.iconmap2);

      this.ui_value_names = Object.assign({}, prop.ui_value_names);
      this.descriptions = Object.assign({}, prop.descriptions);
    } else {
      for (const k in this.values) {
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

  calcMemSize(): number {
    this.checkMeta();
    let tot = super.calcMemSize();

    for (const k in this.values) {
      tot += (k.length * 4 + 16) * 4;
    }

    if (this.descriptions) {
      for (const k in this.descriptions) {
        tot += (k.length + this.descriptions[k].length) * 4;
      }
    }

    return tot + 64;
  }

  equals(b: this): boolean {
    return this.getValue() === b.getValue();
  }

  addUINames(map: UINameMap): this {
    for (const k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map: DescriptionMap): this {
    for (const k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  addIcons2(iconmap2: IconMap): this {
    if (this.iconmap2 === undefined) {
      this.iconmap2 = {};
    }

    for (const k in iconmap2) {
      this.iconmap2[k] = iconmap2[k];
    }

    return this;
  }

  addIcons(iconmap: IconMap): this {
    if (this.iconmap === undefined) {
      this.iconmap = {};
    }
    for (const k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    const ep = b;
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

  copy(): this {
    const p = new (this as any).constructor("") as unknown as this;
    this.copyTo(p);
    return p;
  }

  getValue(): VALUE {
    const d = this.data as VALUE;
    if (d in this.values) return this.values[d as string] as VALUE;
    else return d as VALUE;
  }

  setValue(val?: VALUE): void {
    this.checkMeta();
    if (val === undefined) return;

    if (!(val in this.values) && val in this.keys) val = this.keys[val] as VALUE;
    if (!(val in this.values)) {
      this.report("Invalid value for enum!", val, this.values);
      return;
    }

    this.data = val;

    //fire events
    super.setValue(val);
  }

  _saveMap = EnumKeyPair.saveMap;

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader);

    this.keys = EnumKeyPair.loadMap<VALUE, string>(this._keys);
    this.values = EnumKeyPair.loadMap(this._values);
    this.ui_value_names = EnumKeyPair.loadMap(this._ui_value_names) as Record<string, string>;
    this.iconmap = EnumKeyPair.loadMap(this._iconmap) as Record<string, number>;
    this.iconmap2 = EnumKeyPair.loadMap(this._iconmap2) as Record<string, number>;
    this.descriptions = EnumKeyPair.loadMap(this._descriptions) as Record<string, string>;

    if (this.data_is_int) {
      this.data = parseInt(this.data as unknown as string) as unknown as VALUE;
      delete this.data_is_int;
    } else if (this.data in this.keys) {
      this.data = this.keys[this.data] as VALUE;
    }
  }

  _is_data_int(): boolean {
    return typeof this.data === "number";
  }
}

export class EnumProperty extends EnumPropertyBase<PropTypes["ENUM"], string | number> {
  static PROP_TYPE_ID = PropTypes["ENUM"];
  static STRUCT = nstructjs.inlineRegister(this, `EnumProperty {}`);

  constructor(
    string_or_int?: string | number,
    valid_values?: Record<string, string | number> | string[] | EnumPropertyBase<PropTypes["ENUM"], string | number>,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.ENUM, string_or_int, valid_values, apiname, uiname, description, flag, icon);
  }
}
ToolProperty.internalRegister(EnumProperty);

export class FlagProperty extends EnumPropertyBase<PropTypes["FLAG"], number> {
  static PROP_TYPE_ID = PropTypes["FLAG"];
  static STRUCT = nstructjs.inlineRegister(this, `FlagProperty {}`);

  constructor(
    string_or_int?: string | number,
    valid_values?: Record<string, number> | string[] | EnumPropertyBase<PropTypes["FLAG"], number>,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.FLAG, string_or_int, valid_values, apiname, uiname, description, flag, icon);

    this.type = PropTypes.FLAG;
    this.wasSet = false;
  }

  setValue(bitmask?: string | number): void {
    this.checkMeta();
    this.data = bitmask as number;

    //do not trigger EnumProperty's setValue
    ToolProperty.prototype.setValue.call(this, bitmask as number);
  }
}

ToolProperty.internalRegister(FlagProperty);

export class VecPropertyBase<
  T extends Vector2 | Vector3 | Vector4 | Quat,
  TYPE extends number,
> extends FloatPropertyBase<T, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    VecPropertyBase {
      hasUniformSlider : bool | this.hasUniformSlider || false;
      descriptions   : array(EnumKeyPair) | this._saveMap(this.descriptions) ;
      iconmap        : array(EnumKeyPair) | this._saveMap(this.iconmap) ;
    }`
  );

  hasUniformSlider: boolean;
  descriptions?: { [k: number]: string };
  icons?: { [k: number]: number };

  constructor(type?: TYPE, data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(type, undefined, apiname, uiname, description);

    this.hasUniformSlider = false;
  }

  setIsColor(): this {
    this.subtype = (this.subtype ?? 0) | PropSubTypes.COLOR;
    return this;
  }

  calcMemSize(): number {
    return super.calcMemSize() + (this.data as unknown as number[]).length * 8;
  }

  equals(b: this): boolean {
    const d1 = this.data;
    return d1.vectorDistance(b.data as any) < 0.00001;
  }

  uniformSlider(state: boolean = true): this {
    this.hasUniformSlider = state;
    return this;
  }

  copyTo(b: this): void {
    // save original b's vector instance
    const origVec = b.data;
    super.copyTo(b);
    b.data = origVec;

    // dumb TS error
    b.data.load(this.data as any);

    b.hasUniformSlider = this.hasUniformSlider;
    b.descriptions = this.descriptions ? { ...this.descriptions } : undefined;
    b.icons = this.icons ? { ...this.icons } : undefined;
  }

  addIcons(iconmap: { [k: number]: number }) {
    this.icons = { ...iconmap };
    return this;
  }

  addDescriptions(descmap: { [k: number]: string }) {
    this.descriptions = { ...descmap };
    return this;
  }

  // needed by STRUCT script
  _saveMap = EnumKeyPair.saveMap;

  loadSTRUCT(reader: StructReader<this>): void {
    super.loadSTRUCT(reader);
    reader(this);

    this.descriptions = EnumKeyPair.loadMap(this.descriptions as unknown as EnumKeyPair[]);
    this.icons = EnumKeyPair.loadMap(this.icons as unknown as EnumKeyPair[]);
  }
}

export class Vec2Property extends VecPropertyBase<Vector2, PropTypes["VEC2"]> {
  static PROP_TYPE_ID = PropTypes.VEC2;
  static STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.VEC2, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC2;
    this.data = new Vector2(data as number[] | undefined);
  }

  setValue(v?: unknown): void {
    (this.data as Vector2).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector2);
  }

  getValue(): Vector2 {
    return this.data as Vector2;
  }

  copyTo(b: this): void {
    const origData = b.data;
    super.copyTo(b);

    b.data = origData;
    origData.load(this.data as Vector2);
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

export class Vec3Property extends VecPropertyBase<Vector3, PropTypes["VEC3"]> {
  static PROP_TYPE_ID = PropTypes.VEC3;
  static STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.VEC3, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC3;
    this.data = new Vector3(data as number[] | undefined);
  }

  isColor(): this {
    this.subtype = PropSubTypes.COLOR;
    return this;
  }

  setValue(v?: unknown): void {
    (this.data as Vector3).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector3);
  }

  getValue(): Vector3 {
    return this.data as Vector3;
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

export class Vec4Property extends VecPropertyBase<Vector4, PropTypes["VEC4"]> {
  static PROP_TYPE_ID = PropTypes.VEC4;
  static STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.VEC4, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC4;
    this.data = new Vector4(data as number[] | undefined);
  }

  setValue(v?: unknown, w: number = 1.0): void {
    const vec = v as unknown as number[];
    const d = this.data as Vector4;
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

  getValue(): Vector4 {
    return this.data as Vector4;
  }

  copyTo(b: this): void {
    const data = b.data;
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

export class QuatProperty extends ToolProperty<Quat, PropTypes["QUAT"]> {
  static PROP_TYPE_ID = PropTypes.QUAT;
  static STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.QUAT, undefined, apiname, uiname, description);
    this.data = new Quat(data as number[] | undefined);
  }

  equals(b: this): boolean {
    const d = this.data;
    return d.vectorDistance(b.data as any) < 0.00001;
  }

  setValue(v?: Quat): void {
    (this.data as Quat).load(v as unknown as number[]);
    super.setValue(v);
  }

  getValue(): Quat {
    return this.data as Quat;
  }

  copyTo(b: this): void {
    const data = b.data;
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

export class Mat4Property extends ToolProperty<Matrix4, PropTypes["MATRIX4"]> {
  static PROP_TYPE_ID = PropTypes.MATRIX4;
  static STRUCT: string;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.MATRIX4, undefined, apiname, uiname, description);
    this.data = new Matrix4(data as Matrix4 | number[] | undefined);
  }

  calcMemSize(): number {
    return super.calcMemSize() + 16 * 8 + 32;
  }

  equals(b: this): boolean {
    const m1 = this.data.$matrix;
    const m2 = b.data.$matrix;

    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 4; j++) {
        const key = `m${i}${j}` as keyof typeof m1;

        if (Math.abs(m1[key] - m2[key]) > 0.00001) {
          return false;
        }
      }
    }

    return true;
  }

  setValue(v?: Matrix4): void {
    (this.data as Matrix4).load(v as Matrix4 | number[]);
    super.setValue(v);
  }

  getValue(): Matrix4 {
    return this.data as Matrix4;
  }

  copyTo(b: this): void {
    const data = b.data;
    super.copyTo(b);
    b.data = data;

    (b.data as Matrix4).load(this.data as Matrix4);
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);
    super.loadSTRUCT(reader as StructReader<this>);
  }
}

Mat4Property.STRUCT =
  nstructjs.inherit(Mat4Property, FloatPropertyBase) +
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
  ToolPropType[],
  PropTypes["PROPLIST"]
> {
  static PROP_TYPE_ID = PropTypes.PROPLIST;
  static STRUCT: string;

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
      const cls = PropClasses[prop];

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
      for (const val of list) {
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

  calcMemSize(): number {
    let tot = super.calcMemSize();

    let psize = this.prop ? this.prop.calcMemSize() + 8 : 8;
    if (!this.prop && this.value.length > 0) {
      psize = this.value[0].calcMemSize();
    }

    tot += psize * this.value.length + 8;
    tot += 16;

    return tot;
  }

  equals(b: this): boolean {
    const lb = b;
    const l1 = this.value ? this.value.length : 0;
    const l2 = lb.value ? lb.value.length : 0;

    if (l1 !== l2) {
      return false;
    }

    for (let i = 0; i < l1; i++) {
      const prop1 = this.value[i];
      const prop2 = lb.value[i];

      let bad = prop1.constructor !== prop2.constructor;
      bad = bad || !prop1.equals(prop2);

      if (bad) {
        return false;
      }
    }

    return true;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    const lb = b as ListProperty<ToolPropType>;
    lb.prop = this.prop.copy() as ToolPropType;
    lb.value = [];

    for (const prop of this.value) {
      lb.value.push(prop.copy() as ToolPropType);
    }
  }

  copy(): this {
    const ret = new ListProperty<ToolPropType>(this.prop.copy() as ToolPropType);
    this.copyTo(ret as unknown as this);
    return ret as unknown as this;
  }

  push(item?: ToolPropType | unknown): ToolPropType {
    if (item === undefined) {
      item = this.prop.copy();
    }

    if (!(item instanceof ToolProperty)) {
      const prop = this.prop.copy() as ToolPropType;
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

  setValue(value?: Iterable<unknown>): void {
    this.clear();

    for (const item of value!) {
      const prop = this.push();

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

  getValue(): ToolPropType[] {
    return this.value;
  }

  [Symbol.iterator](): IterableIterator<unknown> {
    const list = this.value;

    return (function* () {
      for (const item of list) {
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
export class StringSetProperty extends ToolProperty<UtilStringSet, PropTypes["STRSET"]> {
  static STRUCT: string;
  static PROP_TYPE_ID = PropTypes.STRSET;

  value: UtilStringSet;
  values: Record<string, string>;
  ui_value_names: UINameMap;
  descriptions: DescriptionMap;
  iconmap: IconMap;
  iconmap2: IconMap;

  constructor(
    value?: string | Iterable<string> | Record<string, string> | null,
    definition: string[] | UtilStringSet | Set<string> | Record<string, string> | string = []
  ) {
    super(PropTypes.STRSET);

    const values: string[] = [];

    this.value = new util.set() as UtilStringSet;

    const def = definition;
    if (Array.isArray(def) || def instanceof util.set || def instanceof Set) {
      for (const item of def) {
        values.push(item as string);
      }
    } else if (typeof def === "object") {
      for (const k in def) {
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

    for (const v of values) {
      this.values[v] = v;

      const uiname = ToolProperty.makeUIName(v);
      this.ui_value_names[v] = uiname;
    }

    if (value !== undefined && value !== null) {
      this.setValue(value);
    }

    this.wasSet = false;
  }

  calcMemSize(): number {
    let tot = super.calcMemSize();

    for (const k in this.values) {
      tot += (k.length + 16) * 5;
    }

    if (this.descriptions) {
      for (const k in this.descriptions) {
        tot += (k.length + this.descriptions[k].length + 8) * 4;
      }
    }

    return tot + 64;
  }

  equals(b: this): boolean {
    return this.value.equals((b as StringSetProperty).value);
  }

  /*
   * Values can be a string, undefined/null, or a list/set/object-literal of strings.
   * If destructive is true, then existing set will be cleared.
   * */
  setValue(
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
      const data: string[] = [];

      if (Array.isArray(values) || values instanceof util.set || values instanceof Set) {
        for (const item of values) {
          data.push(item as string);
        }
      } else {
        //object literal?
        for (const k in values) {
          data.push(k);
        }
      }

      for (const item of data) {
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

  getValue(): UtilStringSet {
    return this.value;
  }

  addIcons2(iconmap2: Record<string, number> | undefined): this {
    if (iconmap2 === undefined) return this;

    for (const k in iconmap2) {
      this.iconmap2[k] = iconmap2[k];
    }

    return this;
  }

  addIcons(iconmap: Record<string, number> | undefined): this {
    if (iconmap === undefined) return this;

    for (const k in iconmap) {
      this.iconmap[k] = iconmap[k];
    }

    return this;
  }

  addUINames(map: Record<string, string>): this {
    for (const k in map) {
      this.ui_value_names[k] = map[k];
    }

    return this;
  }

  addDescriptions(map: Record<string, string>): this {
    for (const k in map) {
      this.descriptions[k] = map[k];
    }

    return this;
  }

  copyTo(b: this): void {
    super.copyTo(b);

    const sb = b as StringSetProperty;

    for (const val of this.value) {
      sb.value.add(val);
    }

    sb.values = {};
    for (const k in this.values) {
      sb.values[k] = this.values[k];
    }

    sb.ui_value_names = {};
    for (const k in this.ui_value_names) {
      sb.ui_value_names[k] = this.ui_value_names[k];
    }

    sb.iconmap = {};
    sb.iconmap2 = {};

    for (const k in this.iconmap) {
      sb.iconmap[k] = this.iconmap[k];
    }

    for (const k in this.iconmap2) {
      sb.iconmap2[k] = this.iconmap2[k];
    }

    sb.descriptions = {};
    for (const k in this.descriptions) {
      sb.descriptions[k] = this.descriptions[k];
    }
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    const values = this.values as unknown as string[];
    this.values = {};

    for (const s of values) {
      this.values[s] = s;
    }

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
