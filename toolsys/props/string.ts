import nstructjs from "../../util/struct";
import { PropTypes } from "../toolprop_abstract";
import { ToolProperty } from "./base";

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
    this.data = val;
    super.setValue(val);
  }
}

export class StringProperty extends StringPropertyBase<PropTypes["STRING"]> {
  static PROP_TYPE_ID = PropTypes.STRING;
  static STRUCT = nstructjs.inlineRegister(this, `StringProperty {}`);

  constructor(
    value?: string,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.STRING, value, apiname, uiname, description, flag, icon);
  }
}
ToolProperty.internalRegister(StringProperty);

export class ReportProperty extends StringPropertyBase<PropTypes["REPORT"]> {
  static PROP_TYPE_ID = PropTypes.REPORT;
  static STRUCT = nstructjs.inlineRegister(this, "ReportProperty {}");

  constructor(
    value?: string,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.REPORT, value, apiname, uiname, description, flag, icon);
    this.type = PropTypes.REPORT;
  }
}
ToolProperty.internalRegister(ReportProperty);
