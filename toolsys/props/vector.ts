import { Vector2, Vector3, Vector4, Quat } from "../../util/vectormath";
import { PropTypes } from "../toolprop_abstract";
import nstructjs from "../../util/struct";
import type { StructReader } from "../../util/nstructjs";
import type { Vector2Like, Vector3Like, Vector4Like } from "../../controller";
import { ToolProperty, PropSubTypes } from "./base";
import { FloatPropertyBase } from "./number";
import { EnumKeyPair } from "./enum";

export class VecPropertyBase<
  T extends Vector2 | Vector3 | Vector4 | Quat,
  TYPE extends number,
> extends FloatPropertyBase<T, TYPE> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    VecPropertyBase {
      hasUniformSlider : bool | this.hasUniformSlider || false;
      descriptions   : array(EnumKeyPair) | this._saveMap(this.descriptions) ;
      iconmap        : array(EnumKeyPair) | this._saveMap(this.iconmap) ;
    }`
  );

  hasUniformSlider: boolean;
  descriptions?: { [k: number]: string };
  icons?: { [k: number]: number };

  constructor(
    type?: TYPE,
    data?: unknown,
    apiname?: string,
    uiname?: string,
    description?: string
  ) {
    super(type, undefined, apiname, uiname, description);

    this.hasUniformSlider = false;
  }

  setIsColor(): this {
    this.subtype = (this.subtype ?? 0) | PropSubTypes.COLOR;
    return this;
  }

  calcMemSize(): number {
    return super.calcMemSize() + (this.data as unknown as number[]).length * 8;
  }

  equals(b: this): boolean {
    const d1 = this.data;
    return d1.vectorDistance(b.data as any) < 0.00001;
  }

  uniformSlider(state: boolean = true): this {
    this.hasUniformSlider = state;
    return this;
  }

  copyTo(b: this): void {
    // save original b's vector instance
    const origVec = b.data;
    super.copyTo(b);
    b.data = origVec;

    // dumb TS error
    b.data.load(this.data as any);

    b.hasUniformSlider = this.hasUniformSlider;
    b.descriptions = this.descriptions ? { ...this.descriptions } : undefined;
    b.icons = this.icons ? { ...this.icons } : undefined;
  }

  addIcons(iconmap: { [k: number]: number }) {
    this.icons = { ...iconmap };
    return this;
  }

  addDescriptions(descmap: { [k: number]: string }) {
    this.descriptions = { ...descmap };
    return this;
  }

  // needed by STRUCT script
  _saveMap = EnumKeyPair.saveMap;

  loadSTRUCT(reader: StructReader<this>): void {
    super.loadSTRUCT(reader);
    reader(this);

    this.descriptions = EnumKeyPair.loadMap(this.descriptions as unknown as EnumKeyPair[]);
    this.icons = EnumKeyPair.loadMap(this.icons as unknown as EnumKeyPair[]);
  }
}

export class Vec2Property extends VecPropertyBase<Vector2, PropTypes["VEC2"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.Vec2Property {
  data : vec2;
}
`
  );
  static PROP_TYPE_ID = PropTypes.VEC2;

  constructor(
    data?: Vector2Like | number[],
    apiname?: string,
    uiname?: string,
    description?: string
  ) {
    super(PropTypes.VEC2, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC2;
    this.data = new Vector2(data as number[] | undefined);
  }

  setValue(v?: unknown): void {
    (this.data as Vector2).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector2);
  }

  getValue(): Vector2 {
    return this.data as Vector2;
  }

  copyTo(b: this): void {
    const origData = b.data;
    super.copyTo(b);

    b.data = origData;
    origData.load(this.data as Vector2);
  }
}

ToolProperty.internalRegister(Vec2Property);

export class Vec3Property extends VecPropertyBase<Vector3, PropTypes["VEC3"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.Vec3Property {
  data : vec3;
}
`
  );
  static PROP_TYPE_ID = PropTypes.VEC3;

  constructor(
    data?: Vector3Like | number[],
    apiname?: string,
    uiname?: string,
    description?: string
  ) {
    super(PropTypes.VEC3, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC3;
    this.data = new Vector3(data as number[] | undefined);
  }

  isColor(): this {
    this.subtype = PropSubTypes.COLOR;
    return this;
  }

  setValue(v?: unknown): void {
    (this.data as Vector3).load(v as unknown as number[]);

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, v as Vector3);
  }

  getValue(): Vector3 {
    return this.data as Vector3;
  }
}

ToolProperty.internalRegister(Vec3Property);

export class Vec4Property extends VecPropertyBase<Vector4, PropTypes["VEC4"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.Vec4Property {
  data : vec4;
}
`
  );
  static PROP_TYPE_ID = PropTypes.VEC4;

  constructor(
    data?: Vector4Like | number[],
    apiname?: string,
    uiname?: string,
    description?: string
  ) {
    super(PropTypes.VEC4, undefined, apiname, uiname, description);

    this.type = PropTypes.VEC4;
    this.data = new Vector4(data as number[] | undefined);
  }

  setValue(v?: unknown, w: number = 1.0): void {
    const vec = v as unknown as number[];
    const d = this.data as Vector4;
    d.load(vec);

    if (vec.length < 3) {
      d[2] = 0.0;
    }
    if (vec.length < 4) {
      d[3] = w;
    }

    //do not trigger parent classes's setValue
    ToolProperty.prototype.setValue.call(this, d);
  }

  isColor(): this {
    this.subtype = PropSubTypes.COLOR;
    return this;
  }

  getValue(): Vector4 {
    return this.data as Vector4;
  }

  copyTo(b: this): void {
    const data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as Vector4).load(this.data as Vector4);
  }
}

ToolProperty.internalRegister(Vec4Property);

export class QuatProperty extends ToolProperty<Quat, PropTypes["QUAT"]> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolprop.QuatProperty {
  data : vec4;
}
`
  );
  static PROP_TYPE_ID = PropTypes.QUAT;

  constructor(
    data?: Vector4Like | Quat | number[],
    apiname?: string,
    uiname?: string,
    description?: string
  ) {
    super(PropTypes.QUAT, undefined, apiname, uiname, description);
    this.data = new Quat(data as number[] | undefined);
  }

  equals(b: this): boolean {
    const d = this.data;
    return d.vectorDistance(b.data as any) < 0.00001;
  }

  setValue(v?: Quat): void {
    (this.data as Quat).load(v as unknown as number[]);
    super.setValue(v);
  }

  getValue(): Quat {
    return this.data as Quat;
  }

  copyTo(b: this): void {
    const data = b.data;
    super.copyTo(b);

    b.data = data;
    (b.data as unknown as Quat).load(this.data as Quat);
  }
}

ToolProperty.internalRegister(QuatProperty);
