import * as util from "../../util/util";
import { PropTypes } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import type { StructReader } from "../../util/nstructjs";
import {
  ToolProperty,
  type CallbackFn,
  type UINameMap,
  type DescriptionMap,
  type IconMap,
} from "./base";

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

export class EnumPropertyBase<
  TYPE extends number,
  VALUE extends string | number,
> extends ToolProperty<VALUE, TYPE> {
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

  parseArg(arg: unknown): unknown {
    if (typeof arg === "string") {
      if (!(arg in this.values)) {
        throw new Error(`unknown key ${arg}`);
      }
      arg = this.values[arg];
    }
    return arg;
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

  updateDefinition(
    enumdef_or_prop: EnumPropertyBase<TYPE, string | number> | Record<string, number | string>
  ): this {
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

export class EnumProperty<VALUE extends string | number = string | number> //
  extends EnumPropertyBase<PropTypes["ENUM"], VALUE>
{
  static PROP_TYPE_ID = PropTypes["ENUM"];
  static STRUCT = nstructjs.inlineRegister(this, `EnumProperty {}`);

  constructor(
    string_or_int?: string | number,
    valid_values?: Record<string, VALUE> | string[] | EnumPropertyBase<PropTypes["ENUM"], VALUE>,
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

  /** A flag argument may name several bits at once, e.g. `"VERTEX|HANDLE"`. */
  parseArg(arg: unknown): unknown {
    if (typeof arg === "string" && arg.includes("|")) {
      let mask = 0;

      for (const part of arg.split("|")) {
        const key = part.trim();

        if (!(key in this.values)) {
          throw new Error(`unknown key ${key}`);
        }

        mask |= this.values[key] as number;
      }

      return mask;
    }

    return super.parseArg(arg);
  }
}

ToolProperty.internalRegister(FlagProperty);
