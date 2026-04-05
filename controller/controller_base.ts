import { PropFlags, PropTypes } from "../toolsys/toolprop_abstract.js";
import { Quat, Vector2, Vector3, Vector4 } from "../util/vectormath.js";
import * as toolprop_abstract from "../toolsys/toolprop_abstract.js";
import * as toolprop from "../toolsys/toolprop.js";
import { cachering } from "../util/util.js";
import { ToolProperty } from "../toolsys/toolprop.js";
import type { DataAPI, DataStruct } from "./controller.js";
import type { ContextLike, ModelInterface } from "./controller_abstract.js";

declare global {
  interface Window {
    DEBUG: {
      datapaths?: boolean;
    };
  }
}

export const DataFlags = {
  READ_ONLY              : 1,
  USE_CUSTOM_GETSET      : 2,
  USE_FULL_UNDO          : 4, //DataPathSetOp in controller_ops.js saves/loads entire file for undo/redo
  USE_CUSTOM_PROP_GETTER : 8,
  USE_EVAL_MASS_SET_PATHS: 16,
} as const;

export const DataTypes = {
  STRUCT        : 0,
  DYNAMIC_STRUCT: 1,
  PROP          : 2,
  ARRAY         : 3,
} as const;

type DataTypeValue = (typeof DataTypes)[keyof typeof DataTypes];

/**
 * Extended ToolProperty interface covering methods on various subclasses
 * (FloatProperty, EnumProperty, VecProperty, etc.) that DataPath uses
 * via its fluent builder pattern. These methods exist at runtime but live
 * on subclasses rather than the ToolProperty base class.
 */
export interface DataPathToolProperty extends ToolProperty {
  /* Narrow nullable base-class fields for builder usage */
  flag: number;
  uiname: string;
  description: string;

  setDecimalPlaces(n: number): this;
  setSliderDisplayExp(f: number): this;
  setExpRate(exp: number): this;
  setSlideSpeed(f: number): this;
  uniformSlider(state: boolean): this;
  setRadix(radix: number): this;
  addIcons(iconmap: Record<string, number>): void;
  addIcons2(iconmap: Record<string, number>): void;
  addDescriptions(map: Record<string, string>): void;
  addUINames(map: Record<string, string>): void;
  dynamicMeta(metaCB: (prop: ToolProperty) => void): this;
  _getValue?: () => unknown;
  _setValue?: (val: unknown) => void;
}

let propCacheRings: Record<number, cachering<ToolProperty>> = {};

export function getTempProp(type: number): ToolProperty {
  if (!(type in propCacheRings)) {
    const cls = ToolProperty.getClass(type);
    if (!cls) {
      throw new Error("Unknown property type " + type);
    }
    propCacheRings[type] = cachering.fromConstructor(cls as unknown as new () => ToolProperty, 32);
  }

  return propCacheRings[type].next();
}

export class DataPathError extends Error {}

export function getVecClass(proptype: number): typeof Vector2 | typeof Vector3 | typeof Vector4 | typeof Quat {
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

export function isVecProperty(prop: unknown): boolean {
  if (!prop || typeof prop !== "object" || prop === null) return false;

  let ok = false;

  ok = ok || prop instanceof toolprop_abstract.Vec2PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec3PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec4PropertyIF;
  ok = ok || prop instanceof toolprop.Vec2Property;
  ok = ok || prop instanceof toolprop.Vec3Property;
  ok = ok || prop instanceof toolprop.Vec4Property;

  ok = ok || (prop as ToolProperty).type === PropTypes.VEC2;
  ok = ok || (prop as ToolProperty).type === PropTypes.VEC3;
  ok = ok || (prop as ToolProperty).type === PropTypes.VEC4;
  ok = ok || (prop as ToolProperty).type === PropTypes.QUAT;

  return ok;
}

interface DataPathGetSet {
  get: ((this: ToolProperty) => unknown) | undefined;
  set: ((this: ToolProperty, val: unknown) => void) | undefined;
  dataref: unknown;
  datapath: string | undefined;
  ctx: unknown;
}

export class DataPath<CTX extends ContextLike = ContextLike> {
  type: DataTypeValue;
  data: DataPathToolProperty | DataList | DataStruct<CTX>;
  apiname: string;
  path: string;
  flag: number;
  struct: unknown;
  parent?: unknown;
  propGetter?: (prop: ToolProperty) => void;
  getSet?: DataPathGetSet;
  ui_name_get?: (this: ToolProperty) => string;

  constructor(path?: string, apiname?: string, prop?: ToolProperty | DataList, type: DataTypeValue = DataTypes.PROP) {
    this.type = type;
    this.data = prop as DataPathToolProperty;
    this.apiname = apiname!;
    this.path = path!;
    this.flag = 0;
    this.struct = undefined;

    if (type === DataTypes.PROP && this.data && ("" + this.data.uiname).trim().length === 0) {
      this.data.uiname = ToolProperty.makeUIName(apiname!) as unknown as string;
    }
  }

  /**
   * Provide a callback to update an enum or flags property dynamically
   * Callback should call enumProp.updateDefinition to update the property.
   *
   * @param metaCB: (enumProp: EnumProperty|FlagsProperty) => void
   */
  dynamicMeta(metaCB: (prop: ToolProperty) => void): this {
    (this.data as DataPathToolProperty).dynamicMeta(metaCB);
    return this;
  }

  evalMassSetFilter(): this {
    this.flag |= DataFlags.USE_EVAL_MASS_SET_PATHS;
    return this;
  }

  copy(): DataPath {
    let ret = new DataPath();

    ret.flag = this.flag;
    ret.type = this.type;
    ret.data = this.data;
    ret.apiname = this.apiname;
    ret.path = this.path;
    ret.struct = this.struct;

    return ret;
  }

  /** this property should not be treated as something
   *  that should be kept track off in the undo stack*/
  noUndo(): this {
    (this.data as DataPathToolProperty).flag |= PropFlags.NO_UNDO;
    return this;
  }

  setProp(prop: ToolProperty): void {
    this.data = prop as DataPathToolProperty;
  }

  readOnly(): this {
    this.flag |= DataFlags.READ_ONLY;

    if (this.type === DataTypes.PROP) {
      (this.data as DataPathToolProperty).flag |= PropFlags.READ_ONLY;
    }

    return this;
  }

  read_only(): this {
    console.warn("DataPath.read_only is deprecated; use readOnly");
    return this.readOnly();
  }

  /** used to override tool property settings,
   *  e.g. ranges, units, etc; returns a
   *  base class instance of ToolProperty.
   *
   *  The this context points to the original ToolProperty and contains
   *  a few useful references:
   *
   *  this.dataref - an object instance of this struct type
   *  this.ctx - a context
   *
   *  callback takes one argument, a new (freshly copied of original)
   *  tool property to modify
   *
   * */
  customPropCallback(callback: (prop: ToolProperty) => void): this {
    this.flag |= DataFlags.USE_CUSTOM_PROP_GETTER;
    (this.data as DataPathToolProperty).flag |= PropFlags.USE_CUSTOM_PROP_GETTER;
    this.propGetter = callback;

    return this;
  }

  /**
   *
   * For the callbacks 'this' points to an internal ToolProperty;
   * Referencing object lives in 'this.dataref'; calling context in 'this.ctx';
   * and the datapath is 'this.datapath'
   **/
  customGetSet(
    get: ((this: ToolProperty) => unknown) | undefined,
    set: ((this: ToolProperty, val: unknown) => void) | undefined
  ): this {
    this.flag |= DataFlags.USE_CUSTOM_GETSET;

    if (this.type !== DataTypes.DYNAMIC_STRUCT && this.type !== DataTypes.STRUCT) {
      const data = this.data as DataPathToolProperty;
      data.flag |= PropFlags.USE_CUSTOM_GETSET;
      data._getValue = data.getValue;
      data._setValue = data.setValue;

      if (get) data.getValue = get;

      if (set) data.setValue = set;
    } else {
      this.getSet = {
        get,
        set,
      } as DataPathGetSet;

      this.getSet.dataref = undefined;
      this.getSet.datapath = undefined;
      this.getSet.ctx = undefined;
    }

    return this;
  }

  customSet(set: ((this: ToolProperty, val: unknown) => void) | undefined): this {
    this.customGetSet(undefined, set);
    return this;
  }

  customGet(get: ((this: ToolProperty) => unknown) | undefined): this {
    this.customGetSet(get, undefined);
    return this;
  }

  /**db will be executed with underlying data object
   that contains this path in 'this.dataref'

   main event is 'change'
   */
  on(type: string, cb: (...args: unknown[]) => void): this {
    if (this.type == DataTypes.PROP) {
      (this.data as DataPathToolProperty).on(type, cb);
    } else {
      throw new Error("invalid call to DataPath.on");
    }

    return this;
  }

  off(type: string, cb: (...args: unknown[]) => void): void {
    if (this.type === DataTypes.PROP) {
      (this.data as DataPathToolProperty).off(type, cb);
    }
  }

  simpleSlider(): this {
    const data = this.data as DataPathToolProperty;
    data.flag |= PropFlags.SIMPLE_SLIDER;
    data.flag &= ~PropFlags.FORCE_ROLLER_SLIDER;
    return this;
  }

  rollerSlider(): this {
    (this.data as DataPathToolProperty).flag &= ~PropFlags.SIMPLE_SLIDER;
    (this.data as DataPathToolProperty).flag |= PropFlags.FORCE_ROLLER_SLIDER;

    return this;
  }

  checkStrip(state: boolean = true): this {
    if (state) {
      (this.data as DataPathToolProperty).flag |= PropFlags.FORCE_ENUM_CHECKBOXES;
    } else {
      (this.data as DataPathToolProperty).flag &= ~PropFlags.FORCE_ENUM_CHECKBOXES;
    }

    return this;
  }

  noUnits(): this {
    this.baseUnit("none");
    this.displayUnit("none");
    return this;
  }

  baseUnit(unit: string): this {
    (this.data as DataPathToolProperty).setBaseUnit(unit);
    return this;
  }

  displayUnit(unit: string): this {
    (this.data as DataPathToolProperty).setDisplayUnit(unit);
    return this;
  }

  unit(unit: string): this {
    return this.baseUnit(unit).displayUnit(unit);
  }

  editAsBaseUnit(): this {
    (this.data as DataPathToolProperty).flag |= PropFlags.EDIT_AS_BASE_UNIT;
    return this;
  }

  range(min: number, max: number): this {
    (this.data as DataPathToolProperty).setRange(min, max);
    return this;
  }

  uiRange(min: number, max: number): this {
    (this.data as DataPathToolProperty).setUIRange(min, max);
    return this;
  }

  decimalPlaces(n: number): this {
    (this.data as DataPathToolProperty).setDecimalPlaces(n);
    return this;
  }

  sliderDisplayExp(f: number): this {
    (this.data as DataPathToolProperty).setSliderDisplayExp(f);
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
  uiNameGetter(func: (this: ToolProperty) => string): this {
    this.ui_name_get = func;
    return this;
  }

  expRate(exp: number): this {
    (this.data as DataPathToolProperty).setExpRate(exp);
    return this;
  }

  slideSpeed(speed: number): this {
    (this.data as DataPathToolProperty).setSlideSpeed(speed);
    return this;
  }

  /**adds a slider for moving vector component sliders simultaneously*/
  uniformSlider(state: boolean = true): this {
    (this.data as DataPathToolProperty).uniformSlider(state);

    return this;
  }

  radix(r: number): this {
    (this.data as DataPathToolProperty).setRadix(r);
    return this;
  }

  relativeStep(s: number): this {
    (this.data as DataPathToolProperty).setRelativeStep(s);
    return this;
  }

  step(s: number): this {
    (this.data as DataPathToolProperty).setStep(s);
    return this;
  }

  /**
   *
   * Tell DataPathSetOp to save/load entire app state for undo/redo
   *
   * */
  fullSaveUndo(): this {
    this.flag |= DataFlags.USE_FULL_UNDO;
    (this.data as DataPathToolProperty).flag |= PropFlags.USE_BASE_UNDO;

    return this;
  }

  icon(i: number): this {
    (this.data as DataPathToolProperty).setIcon(i);
    return this;
  }

  icon2(i: number): this {
    (this.data as DataPathToolProperty).setIcon2(i);
    return this;
  }

  icons(icons: Record<string, number>): this {
    //for enum/flag properties
    (this.data as DataPathToolProperty).addIcons(icons);
    return this;
  }

  /** secondary icons (e.g. disabled states) */
  icons2(icons: Record<string, number>): this {
    (this.data as DataPathToolProperty).addIcons2(icons);
    return this;
  }

  descriptions(description_map: Record<string, string>): this {
    //for enum/flag properties
    (this.data as DataPathToolProperty).addDescriptions(description_map);
    return this;
  }

  uiNames(uinames: Record<string, string>): this {
    (this.data as DataPathToolProperty).addUINames(uinames);
    return this;
  }

  description(d: string): this {
    (this.data as DataPathToolProperty).description = d;
    return this;
  }
}

export const StructFlags = {
  NO_UNDO: 1, //struct and its child structs can't participate in undo
  //via the DataPathToolOp
} as const;

export interface ListIFace<
  DataAPIType extends ModelInterface = ModelInterface,
  ListType = any,
  KeyType = any,
  ValType = any,
  CTX extends ContextLike = ContextLike,
> {
  getStruct(api: DataAPIType, list: ListType, key: KeyType): DataStruct | undefined;
  get(api: DataAPIType, list: ListType, key: KeyType): ValType;
  getKey(api: DataAPIType, list: ListType, obj: ValType): any;
  getActive?(api: DataAPIType, list: ListType): ValType | undefined;
  setActive?(api: DataAPIType, list: ListType, val: ValType): void;
  set?(api: DataAPIType, list: ListType, key: KeyType, val: ValType): void;
  getIter?(api: DataAPIType, list: ListType): Iterable<ValType>;
  filter?(api: DataAPIType, list: ListType, filter: number | string): Iterable<ValType>;
  getLength(api: DataAPIType, list: ListType): number;
}

//second form of list interface
export type ListFuncs<
  DataAPIType extends ModelInterface = ModelInterface,
  ListType = any,
  KeyType = any,
  ObjType = any,
  CTX extends ContextLike = ContextLike,
> = (
  | Required<ListIFace<DataAPIType, ListType, KeyType, ObjType, CTX>>[keyof ListIFace]
  | ((api: ModelInterface<CTX>, list: ListType, key: KeyType, val: ObjType) => void)
)[];

/* eslint-disable @typescript-eslint/no-explicit-any */
type ListCallback = (...args: any[]) => any;
type ListCallbackMap = Record<string, ListCallback>;

export class DataList<
  DataAPIType extends ModelInterface = ModelInterface,
  ListType = any,
  KeyType = any,
  ValType = any,
  CTX extends ContextLike = ContextLike,
> implements ListIFace<DataAPIType, ListType, KeyType, ValType, CTX>
{
  cb: ListCallbackMap;

  // XXX
  constructor(callbacks: any) {
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

    let check = (key: string) => {
      if (!(key in this.cb)) {
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

  copy(): DataList {
    let ret = new DataList([this.cb.get]);

    for (let k in this.cb) {
      ret.cb[k] = this.cb[k];
    }

    return ret;
  }

  get(api: DataAPIType, list: ListType, key: KeyType): ValType {
    return this.cb.get(api, list, key);
  }

  getLength(api: DataAPIType, list: ListType): number {
    this._check("getLength");
    return this.cb.getLength(api, list);
  }

  _check(cb: string): void {
    if (!(cb in this.cb)) {
      throw new DataPathError(cb + " not supported by this list");
    }
  }

  set(api: DataAPIType, list: ListType, key: KeyType, val: ValType): void {
    if (this.cb.set !== undefined) {
      this.cb.set(api, list, key, val);
    }
  }

  getIter(api: DataAPIType, list: ListType): Iterable<ValType> {
    this._check("getIter");
    return this.cb.getIter(api, list);
  }

  filter(api: DataAPIType, list: ListType, filter: number | string): Iterable<ValType> {
    this._check("filter");
    return this.cb.filter(api, list, filter);
  }

  getActive(api: DataAPIType, list: ListType): ValType | undefined {
    this._check("getActive");
    return this.cb.getActive(api, list);
  }

  setActive(api: DataAPIType, list: ListType, value: ValType): void {
    this._check("setActive");
    this.cb.setActive(api, list, value);
  }

  getKey(api: DataAPIType, list: ListType, value: ValType): string | number | undefined {
    this._check("getKey");
    return this.cb.getKey(api, list, value);
  }

  getStruct(api: DataAPIType, list: ListType, key: KeyType): DataStruct | undefined {
    if (this.cb.getStruct !== undefined) {
      return this.cb.getStruct(api, list, key);
    }

    let obj = this.get(api, list, key) as any | undefined;
    if (obj === undefined) return undefined;

    return (api as unknown as DataAPI<CTX>).getStruct(obj.constructor);
  }
}

interface ToolDefResult {
  uiname: string;
  icon: number;
  toolpath: string;
  description: string | undefined;
  is_modal: boolean;
  inputs: Record<string, ToolProperty>;
  outputs: Record<string, ToolProperty>;
}

export class ToolOpIface {
  constructor() {}

  static tooldef(): ToolDefResult {
    return {
      uiname     : "!untitled tool",
      icon       : -1,
      toolpath   : "logical_module.tool", //logical_module need not match up to real module name
      description: undefined,
      is_modal   : false,
      inputs     : {}, //tool properties
      outputs    : {}, //tool properties
    };
  }
}

interface DataAPIClassLike {
  registerTool(cls: Function): void;
}

let DataAPIClass: DataAPIClassLike | undefined = undefined;

export function setImplementationClass(cls: DataAPIClassLike): void {
  DataAPIClass = cls;
}

export function registerTool(cls: Function): void {
  if (DataAPIClass === undefined) {
    throw new Error("data api not initialized properly; call setImplementationClass");
  }

  return DataAPIClass.registerTool(cls);
}
