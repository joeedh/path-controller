import { Matrix4 } from "../../util/vectormath";
import { PropTypes } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import { ToolProperty } from "./base";

export class Mat4Property extends ToolProperty<Matrix4, PropTypes["MATRIX4"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.Mat4Property {
  data           : mat4;
}
`
  );
  static PROP_TYPE_ID = PropTypes.MATRIX4;

  constructor(data?: unknown, apiname?: string, uiname?: string, description?: string) {
    super(PropTypes.MATRIX4, undefined, apiname, uiname, description);
    this.data = new Matrix4(data as Matrix4 | number[] | undefined);
  }

  calcMemSize(): number {
    return super.calcMemSize() + 16 * 8 + 32;
  }

  equals(b: this): boolean {
    const m1 = this.data.$matrix;
    const m2 = b.data.$matrix;

    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 4; j++) {
        const key = `m${i}${j}` as keyof typeof m1;

        if (Math.abs(m1[key] - m2[key]) > 0.00001) {
          return false;
        }
      }
    }

    return true;
  }

  setValue(v?: Matrix4): void {
    (this.data as Matrix4).load(v as Matrix4 | number[]);
    super.setValue(v);
  }

  getValue(): Matrix4 {
    return this.data as Matrix4;
  }

  copyTo(b: this): void {
    const data = b.data;
    super.copyTo(b);
    b.data = data;
    (b.data as Matrix4).load(this.data as Matrix4);
  }
}

ToolProperty.internalRegister(Mat4Property);
