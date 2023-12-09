export as namespace toolprop;

import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../util/vectormath';

declare interface IToolPropConstructor<any> {
  new(): ToolProperty<any>;
}

declare class ToolProperty<T> {
  constructor(PropTypeMember: number);

  ValueTypeAlias: T; //This is not a real property, just an alias for the type system
  apiname: string;
  uiname: string;
  flag: number;
  description: string;

  private(): this;

  copy(): this;

  calcMemSize(): number;

  setStep(s: number): ToolProperty<T>;

  copyTo(b: this): void;

  setValue(value: T): void;

  getValue(): T;

  saveLastValue(): this;

  static calcRelativeStep(step: number, value: number, logBase: number): number;

  uiname: string;
  icon: number;

  static makeUIName(name: string): string;

  static register(cls: any): number;

  setIcon(i: number): ToolProperty<T>;

  type: number;

  /* Set by path controller system. */
  dataref: any;
  ctx: any;
}

declare interface NumberPropertyBase {
  setRange(min: number, max: number): this;

  noUnits(): this;
}

declare class FloatProperty extends ToolProperty<number> implements NumberPropertyBase {
  constructor(val: number);

  setRange(min: number, max: number): this;

  noUnits(): this;
}

declare class IntProperty extends ToolProperty<number> implements NumberPropertyBase {
  constructor(val: number);

  setRange(min: number, max: number): this;

  noUnits(): this;
}

declare class BoolProperty extends ToolProperty<boolean> {
  constructor(val: boolean);
}

declare class StringProperty extends ToolProperty<string> {
  constructor(val: string);
}

declare class Vec2Property extends ToolProperty<Vector2> implements NumberPropertyBase {
  constructor(val: Vector2);

  setRange(min: number, max: number): this;

}

declare class Vec3Property extends ToolProperty<Vector3> implements NumberPropertyBase {
  constructor(val: Vector3);

  setRange(min: number, max: number): this;

}

declare class Vec4Property extends ToolProperty<Vector4> implements NumberPropertyBase {
  constructor(val: Vector4);

  setRange(min: number, max: number): this;

}

declare class EnumProperty extends ToolProperty<number> {
  constructor(value: any, enumdef: {}, apiname?: string, uiname?: string, desription?: string);

  addIcons(iconmap: {}): this;

  addUINames(uinames: {}): this;
}

declare class FlagProperty extends ToolProperty<number> {
  constructor(val: number, flagdef: { [k: string]: number });
}

declare class ListProperty<ToolPropType extends ToolProperty<any>> extends ToolProperty<ToolPropType[]> {
  constructor(type: IToolPropConstructor, data: any[]);

  [Symbol.iterator](): Iterator<typeof this.ValueTypeAlias.getValue>;
}

export declare enum PropSubTypes {
  COLOR = 1
}

export declare enum PropFlags {
  SELECT = 1,
  PRIVATE = 2,
  LABEL = 4,
  USE_ICONS = 64, /* Implies FORCE_ENUM_CHECKBOXES (for enum/flag properties). */
  USE_CUSTOM_GETSET = 128, //used by controller.js interface
  SAVE_LAST_VALUE = 256,
  READ_ONLY = 512,
  SIMPLE_SLIDER = 1 << 10,
  FORCE_ROLLER_SLIDER = 1 << 11,
  USE_BASE_UNDO = 1 << 12, //internal to simple_controller.js
  EDIT_AS_BASE_UNIT = 1 << 13, //user textbox input should be interpreted in display unit
  NO_UNDO = 1 << 14,
  USE_CUSTOM_PROP_GETTER = 1 << 15, //hrm, not sure I need this
  FORCE_ENUM_CHECKBOXES = 1 << 16,/* Use a strip of checkboxes, also applies to flag properties. */
  NO_DEFAULT = 1 << 17,
}

export declare const PropTypes: {
  [k: string]: number;
};

declare class Mat4Property extends ToolProperty<Matrix4> {
  constructor(val: Mat4);
}
