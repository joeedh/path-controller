export type VecPropertyTypes = Vec2Property | Vec3Property | Vec4Property;
export type StringPropertyTypes = StringProperty | ReportProperty;
export type NumPropertyTypes = IntProperty | FloatProperty;
export function isNumProperty(p?: ToolProperty): p is NumPropertyTypes {
  if (p === undefined) return false;
  return p instanceof IntProperty || p instanceof FloatProperty;
}

import { Curve1DProperty } from "../controller";
import {
  BoolProperty,
  EnumProperty,
  FlagProperty,
  FloatProperty,
  IntProperty,
  ListProperty,
  Mat4Property,
  QuatProperty,
  ReportProperty,
  StringProperty,
  StringSetProperty,
  ToolProperty,
  Vec2Property,
  Vec3Property,
  Vec4Property,
} from "./toolprop";
import * as toolprop_abstract from "./toolprop_abstract";
import { PropTypes } from "./toolprop_abstract";

export function isVecProperty(prop: unknown): prop is VecPropertyTypes {
  if (!prop || typeof prop !== "object" || prop === null) return false;

  let ok = false;

  ok = ok || prop instanceof toolprop_abstract.Vec2PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec3PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec4PropertyIF;
  ok = ok || prop instanceof Vec2Property;
  ok = ok || prop instanceof Vec3Property;
  ok = ok || prop instanceof Vec4Property;
  ok = ok || prop instanceof QuatProperty;

  ok = ok || (prop as ToolProperty).type === PropTypes.VEC2;
  ok = ok || (prop as ToolProperty).type === PropTypes.VEC3;
  ok = ok || (prop as ToolProperty).type === PropTypes.VEC4;
  ok = ok || (prop as ToolProperty).type === PropTypes.QUAT;

  return ok;
}

export type ToolPropertyTypes =
  | StringProperty
  | IntProperty
  | FloatProperty
  | BoolProperty
  | EnumProperty
  | FlagProperty
  | Vec2Property
  | Vec3Property
  | Vec4Property
  | QuatProperty
  | Mat4Property
  | ListProperty
  | StringSetProperty
  | ReportProperty
  | Curve1DProperty;
