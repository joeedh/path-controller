import nstructjs from "../../util/struct";
import { PropTypes } from "../toolprop_abstract";
import { ToolProperty } from "./base";

export class FloatArrayProperty extends ToolProperty<number[], PropTypes["FLOAT_ARRAY"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.FloatArrayProperty {
  value : array(float);
}`
  );
  static PROP_TYPE_ID = PropTypes.FLOAT_ARRAY;

  value: number[];

  constructor(
    value?: Iterable<number | boolean>,
    apiname?: string,
    uiname?: string,
    description?: string,
    flag?: number,
    icon?: number
  ) {
    super(PropTypes.FLOAT_ARRAY, undefined, apiname, uiname, description, flag, icon);

    this.value = [];

    if (value !== undefined) {
      this.setValue(value);
    }
  }

  [Symbol.iterator](): IterableIterator<number> {
    return this.value[Symbol.iterator]();
  }

  setValue(value?: Iterable<number | boolean>): void {
    if (value === undefined) {
      throw new Error("value was undefined in FloatArrayProperty's setValue method");
    }

    this.value.length = 0;

    for (const item of value) {
      if (typeof item !== "number" && typeof item !== "boolean") {
        console.log(value);
        throw new Error("bad item for FloatArrayProperty " + item);
      }

      this.value.push(item as number);
    }

    super.setValue(this.value);
  }

  push(item: number | boolean): void {
    if (typeof item !== "number" && typeof item !== "boolean") {
      throw new Error("bad item for FloatArrayProperty " + item);
    }

    this.value.push(item as number);
  }

  getValue(): number[] {
    return this.value;
  }

  equals(b: this): boolean {
    if (this.value.length !== b.value.length) {
      return false;
    }

    for (let i = 0; i < this.value.length; i++) {
      if (this.value[i] !== b.value[i]) {
        return false;
      }
    }

    return true;
  }

  clear(): this {
    this.value.length = 0;
    return this;
  }
}

export class ArrayBufferProperty extends ToolProperty<ArrayBuffer, PropTypes["ARRAY_BUFFER"]> {
  data: ArrayBuffer = new ArrayBuffer(0);

  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    toolprop.ArrayBufferProperty {
      data : arraybuffer(byte);
    }
  `
  );

  constructor(buffer?: ArrayBuffer) {
    super(PropTypes.ARRAY_BUFFER);
    this.data = buffer ?? this.data;
  }

  setValue(buffer: ArrayBuffer) {
    this.data = buffer;
    super.setValue(buffer);
  }

  getValue(): ArrayBuffer {
    return this.data;
  }

  equals(b: this): boolean {
    if (this.data.byteLength !== b.data.byteLength) {
      return false;
    }

    const va = new Uint8Array(this.data);
    const vb = new Uint8Array(b.data);

    for (let i = 0; i < va.length; i++) {
      if (va[i] !== vb[i]) {
        return false;
      }
    }

    return true;
  }

  copyTo(b: this): void {
    super.copyTo(b);
    // how do you copy arraybuffers properly?
    b.data = new Uint8Array(Array.from(new Uint8Array(this.data))).buffer;
  }

  calcMemSize(): number {
    return super.calcMemSize() + this.data.byteLength;
  }
}
