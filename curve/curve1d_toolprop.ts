import { Curve1D } from "./curve1d.js";
import { ToolProperty, PropTypes, PropFlags } from "../toolsys/toolprop.js";
import * as nstructjs from "../util/nstructjs_es6.js";

import "./curve1d_all.js";

export class Curve1DProperty extends ToolProperty {
  data: Curve1D;

  constructor(curve?: Curve1D, apiname?: string, uiname?: string, description?: string, flag?: number, icon?: number) {
    super(PropTypes.CURVE, undefined, apiname, uiname, description, flag, icon);

    this.data = new Curve1D();

    if (curve !== undefined) {
      this.setValue(curve);
    }

    this.wasSet = false;
  }

  calcMemSize(): number {
    //bleh, just return a largish block size
    return 1024;
  }

  override equals(_b: ToolProperty): boolean {
    return false;
  }

  getValue(): Curve1D {
    return this.data;
  }

  evaluate(t: number): number {
    return this.data.evaluate(t);
  }

  setValue(curve: Curve1D | undefined): void {
    if (curve === undefined) {
      return;
    }

    this.data.load(curve);
    super.setValue(curve);
  }

  override copyTo(b: ToolProperty): void {
    super.copyTo(b);

    (b as Curve1DProperty).setValue(this.data);
  }

  static STRUCT: string;
}

Curve1DProperty.STRUCT =
  nstructjs.inherit(Curve1DProperty, ToolProperty) +
  `
  data : Curve1D;
}
`;

nstructjs.register(Curve1DProperty);
ToolProperty.internalRegister(Curve1DProperty);
