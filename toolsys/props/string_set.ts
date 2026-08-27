import * as util from "../../util/util";
import { PropTypes } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import type { StructReader } from "../../util/nstructjs";
import {
  ToolProperty,
  type UtilStringSet,
  type UINameMap,
  type DescriptionMap,
  type IconMap,
} from "./base";

//like FlagsProperty but uses strings
export class StringSetProperty extends ToolProperty<UtilStringSet, PropTypes["STRSET"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.StringSetProperty {
  value  : iter(string);
  values : iterkeys(string);
}`
  );
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

    super.setValue(this.value);
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

ToolProperty.internalRegister(StringSetProperty);
