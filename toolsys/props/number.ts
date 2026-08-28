import { PropTypes } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import type { JSONAny } from "../../controller";
import { ToolProperty } from "./base";

export class NumProperty<TYPE extends number = number> extends ToolProperty<number, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.NumProperty {
  range : array(float);
  data  : float;
}
`
  );

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
}
export class _NumberPropertyBase<T = number, TYPE extends number = number> extends ToolProperty<
  T,
  TYPE
> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop._NumberPropertyBase {
  range            : array(float);
  expRate          : float;
  data             : float;
  step             : float;
  slideSpeed       : float;
  sliderDisplayExp : float;
}
`
  );

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

  parseArg(arg: unknown) {
    if (typeof arg !== "number") {
      throw new Error("expected a number for a number property");
    }
    return arg;
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
    nb.uiRange = this.uiRange
      ? ([this.uiRange[0], this.uiRange[1]] as [number, number])
      : undefined;
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
export class IntProperty extends _NumberPropertyBase<number, PropTypes["INT"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.IntProperty {
  data : int;
}`
  );
  static PROP_TYPE_ID = PropTypes.INT;

  declare radix: number;

  constructor(
    value?: number,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
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
}

ToolProperty.internalRegister(IntProperty);

export class FloatPropertyBase<
  T = number,
  TYPE extends number = number,
> extends _NumberPropertyBase<T, TYPE> {
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
