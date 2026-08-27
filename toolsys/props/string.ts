import nstructjs from "../../util/struct";
import { PropFlags, PropTypes } from "../toolprop_abstract";
import { ToolProperty } from "./base";

export class StringPropertyBase<TYPE extends number> extends ToolProperty<string, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    StringPropertyBase {
      data                  : string;
      multiLineIdleTimeout ?: int;
    }
  `
  );

  /**
   * Idle timeout for multiline textboxes (that aren't in realtime mode).
   * Uses a default value if undefined.  In miliseconds.
   */
  multiLineIdleTimeout?: number;

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
    b.multiLineIdleTimeout = this.multiLineIdleTimeout;
    b.data = this.data;
  }

  getValue(): string {
    return this.data;
  }

  setValue(val: string): void {
    this.data = val;
    super.setValue(val);
  }

  setIdleTimeout(timeout: number) {
    this.multiLineIdleTimeout = timeout;
    return this;
  }

  /** Should a textarea be used to edit this property? */
  setMultiline(multiline: boolean): this {
    if (multiline) {
      this.flag |= PropFlags.MULTILINE_STRING;
    } else {
      this.flag &= ~PropFlags.MULTILINE_STRING;
    }
    return this;
  }

  setRichText(state: boolean) {
    if (state) {
      this.flag |= PropFlags.RICH_TEXT_STRING;
    } else {
      this.flag &= ~PropFlags.RICH_TEXT_STRING;
    }
  }

  /** Should a textarea be used to edit this property? */
  get multiLine(): boolean {
    return (this.flag & PropFlags.MULTILINE_STRING) !== 0;
  }

  set multiLine(multiline: boolean) {
    if (multiline) {
      this.flag |= PropFlags.MULTILINE_STRING;
    } else {
      this.flag &= ~PropFlags.MULTILINE_STRING;
    }
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
