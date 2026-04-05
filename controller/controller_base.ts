import { PropFlags, PropTypes } from "../toolsys/toolprop_abstract.js";
import { Quat, Vector2, Vector3, Vector4 } from "../util/vectormath.js";
import * as toolprop_abstract from "../toolsys/toolprop_abstract.js";
import * as toolprop from "../toolsys/toolprop.js";
import { print_stack, cachering } from "../util/util.js";
import { ToolProperty } from "../toolsys/toolprop.js";

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
interface DataPathToolProperty extends ToolProperty {
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

export class DataPath {
  type: DataTypeValue;
  data: DataPathToolProperty;
  apiname: string;
  path: string;
  flag: number;
  struct: unknown;
  propGetter?: (prop: ToolProperty) => void;
  getSet?: DataPathGetSet;
  ui_name_get?: (this: ToolProperty) => string;

  constructor(path?: string, apiname?: string, prop?: ToolProperty, type: DataTypeValue = DataTypes.PROP) {
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
    this.data.dynamicMeta(metaCB);
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
    this.data.flag |= PropFlags.NO_UNDO;
    return this;
  }

  setProp(prop: ToolProperty): void {
    this.data = prop as DataPathToolProperty;
  }

  readOnly(): this {
    this.flag |= DataFlags.READ_ONLY;

    if (this.type === DataTypes.PROP) {
      this.data.flag |= PropFlags.READ_ONLY;
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
    this.data.flag |= PropFlags.USE_CUSTOM_PROP_GETTER;
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
      this.data.flag |= PropFlags.USE_CUSTOM_GETSET;
      this.data._getValue = this.data.getValue;
      this.data._setValue = this.data.setValue;

      if (get) this.data.getValue = get;

      if (set) this.data.setValue = set;
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
      this.data.on(type, cb);
    } else {
      throw new Error("invalid call to DataPath.on");
    }

    return this;
  }

  off(type: string, cb: (...args: unknown[]) => void): void {
    if (this.type === DataTypes.PROP) {
      this.data.off(type, cb);
    }
  }

  simpleSlider(): this {
    this.data.flag |= PropFlags.SIMPLE_SLIDER;
    this.data.flag &= ~PropFlags.FORCE_ROLLER_SLIDER;
    return this;
  }

  rollerSlider(): this {
    this.data.flag &= ~PropFlags.SIMPLE_SLIDER;
    this.data.flag |= PropFlags.FORCE_ROLLER_SLIDER;

    return this;
  }

  checkStrip(state: boolean = true): this {
    if (state) {
      this.data.flag |= PropFlags.FORCE_ENUM_CHECKBOXES;
    } else {
      this.data.flag &= ~PropFlags.FORCE_ENUM_CHECKBOXES;
    }

    return this;
  }

  noUnits(): this {
    this.baseUnit("none");
    this.displayUnit("none");
    return this;
  }

  baseUnit(unit: string): this {
    this.data.setBaseUnit(unit);
    return this;
  }

  displayUnit(unit: string): this {
    this.data.setDisplayUnit(unit);
    return this;
  }

  unit(unit: string): this {
    return this.baseUnit(unit).displayUnit(unit);
  }

  editAsBaseUnit(): this {
    this.data.flag |= PropFlags.EDIT_AS_BASE_UNIT;
    return this;
  }

  range(min: number, max: number): this {
    this.data.setRange(min, max);
    return this;
  }

  uiRange(min: number, max: number): this {
    this.data.setUIRange(min, max);
    return this;
  }

  decimalPlaces(n: number): this {
    this.data.setDecimalPlaces(n);
    return this;
  }

  sliderDisplayExp(f: number): this {
    this.data.setSliderDisplayExp(f);
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
    this.data.setExpRate(exp);
    return this;
  }

  slideSpeed(speed: number): this {
    this.data.setSlideSpeed(speed);
    return this;
  }

  /**adds a slider for moving vector component sliders simultaneously*/
  uniformSlider(state: boolean = true): this {
    this.data.uniformSlider(state);

    return this;
  }

  radix(r: number): this {
    this.data.setRadix(r);
    return this;
  }

  relativeStep(s: number): this {
    this.data.setRelativeStep(s);
    return this;
  }

  step(s: number): this {
    this.data.setStep(s);
    return this;
  }

  /**
   *
   * Tell DataPathSetOp to save/load entire app state for undo/redo
   *
   * */
  fullSaveUndo(): this {
    this.flag |= DataFlags.USE_FULL_UNDO;
    this.data.flag |= PropFlags.USE_BASE_UNDO;

    return this;
  }

  icon(i: number): this {
    this.data.setIcon(i);
    return this;
  }

  icon2(i: number): this {
    this.data.setIcon2(i);
    return this;
  }

  icons(icons: Record<string, number>): this {
    //for enum/flag properties
    this.data.addIcons(icons);
    return this;
  }

  /** secondary icons (e.g. disabled states) */
  icons2(icons: Record<string, number>): this {
    this.data.addIcons2(icons);
    return this;
  }

  descriptions(description_map: Record<string, string>): this {
    //for enum/flag properties
    this.data.addDescriptions(description_map);
    return this;
  }

  uiNames(uinames: Record<string, string>): this {
    this.data.addUINames(uinames);
    return this;
  }

  description(d: string): this {
    this.data.description = d;
    return this;
  }
}

export const StructFlags = {
  NO_UNDO: 1, //struct and its child structs can't participate in undo
  //via the DataPathToolOp
} as const;

/** Minimal interface for ModelInterface to avoid circular imports */
interface ModelInterfaceLike {
  prefix: string;
}

export class ListIface {
  getStruct(api: ModelInterfaceLike, list: unknown, key: string | number): unknown {
    return undefined;
  }

  get(api: ModelInterfaceLike, list: unknown, key: string | number): unknown {
    return undefined;
  }

  getKey(api: ModelInterfaceLike, list: unknown, obj: unknown): string | number | undefined {
    return undefined;
  }

  getActive(api: ModelInterfaceLike, list: unknown): unknown {
    return undefined;
  }

  setActive(api: ModelInterfaceLike, list: unknown, val: unknown): void {}

  set(api: ModelInterfaceLike, list: Record<string | number, unknown>, key: string | number, val: unknown): void {
    list[key] = val;
  }

  getIter(): Iterable<unknown> | undefined {
    return undefined;
  }

  filter(api: ModelInterfaceLike, list: unknown, filter: unknown): unknown {
    return undefined;
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
