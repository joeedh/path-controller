import { Curve1D } from "./curve1d";
import { ToolProperty, PropTypes, PropFlags } from "../toolsys/toolprop";
import * as nstructjs from "../util/nstructjs";

import "./curve1d_all";

export class Curve1DProperty extends ToolProperty<Curve1D, PropTypes["CURVE"]> {
  static PROP_TYPE_ID = PropTypes.CURVE;
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
      Curve1DProperty {
        data:   Curve1D;
      }
    `
  );
  data: Curve1D;

  constructor(
    curve?: Curve1D,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
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

  /** Compares the curves' authored state through JSON mode, which writes only STRUCT fields. Each side passes through a load round trip first, because loadSTRUCT canonicalizes derived ordering (the bspline point sort) that a freshly edited curve has not applied yet. */
  override equals(b: this): boolean {
    const authored = (c: Curve1D) => {
      const settled = nstructjs.readJSON(nstructjs.writeJSON(c), Curve1D);
      return JSON.stringify(nstructjs.writeJSON(settled));
    };

    return authored(this.data) === authored(b.data);
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

  override copyTo(b: this): void {
    super.copyTo(b);
    b.setValue(this.data);
  }
}
ToolProperty.internalRegister(Curve1DProperty);
