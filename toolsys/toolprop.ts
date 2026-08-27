export { PropTypes, PropFlags } from "./toolprop_abstract";
export { isNumber } from "../../core/units";

export type {
  EnumDef,
  FlagsDef,
  IconMap,
  DescriptionMap,
  UINameMap,
  NumberConstraintBase,
  IntegerConstraint,
  FloatConstraint,
  NumberConstraint,
  CallbackFn,
} from "./props/base";
export {
  NumberConstraintsBase,
  IntegerConstraints,
  FloatConstrinats,
  NumberConstraints,
  PropSubTypes,
  setPropTypes,
  customPropertyTypes,
  PropClasses,
  MakeUINameWordMap,
  defaultRadix,
  defaultDecimalPlaces,
  ToolProperty,
} from "./props/base";

export { FloatArrayProperty, ArrayBufferProperty } from "./props/array";
export { StringPropertyBase, StringProperty, ReportProperty } from "./props/string";
export { NumProperty, _NumberPropertyBase, IntProperty, FloatProperty } from "./props/number";
export { BoolProperty } from "./props/bool";
export { EnumKeyPair, EnumPropertyBase, EnumProperty, FlagProperty } from "./props/enum";
export {
  VecPropertyBase,
  Vec2Property,
  Vec3Property,
  Vec4Property,
  QuatProperty,
} from "./props/vector";
export { Mat4Property } from "./props/matrix";
export { ListProperty } from "./props/list";
export { StringSetProperty } from "./props/string_set";
