import nstructjs from "../../util/struct";
import { PropTypes } from "../toolprop_abstract";
import type { JSONAny } from "../../controller";
import { ToolProperty } from "./base";

export class BoolProperty extends ToolProperty<boolean, PropTypes["BOOL"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.BoolProperty {
  data : bool;
}
`
  );
  static PROP_TYPE_ID = PropTypes.BOOL;

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
