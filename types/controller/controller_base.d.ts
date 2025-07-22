export as namespace controller_base;

import { ToolOp } from "../toolsys/toolsys";
import { ToolProperty, EnumProperty, FlagProperty } from "../toolsys/toolprop";

declare interface PathPropMeta<T = any, PropType extends ToolProperty<any> = ToolProperty<any>> {
  value?: T;
  obj: any;
  dstruct: DataStruct;
  dpath: DataPath;
  prop: PropType;
}

declare class DataAPI<CTX = any> {
  mapStruct(cls: Function, autoCreate?: boolean): DataStruct<CTX>;
  mapStructCustom(cls: Function, callback: Function): DataStruct<CTX>;

  hasStruct(cls: Function): Boolean;

  resolvePath(ctx: CTX, path: string): PathPropMeta;

  getValue(ctx: CTX, path: string): any;

  setValue(ctx: CTX, path: string, val: any): void;

  massSetProp(ctx: CTX, massSetPath: string, value: any): void;

  execTool(ctx: CTX, path: string, inputs?: any, _unused?: undefined, event?: PointerEvent): ToolOp;
  execTool(ctx: CTX, tool: ToolOp, inputs?: any, _unused?: undefined, event?: PointerEvent): ToolOp;
}

declare interface BoundProperty<CTX = any> {
  dataref: any;
  ctx: CTX;
}

declare interface DataPathCallBack<CTX = any> {
  (this: BoundProperty<CTX>, ...args: any[]);
}

export declare type BasicEvents = "change";
export declare type EnumEvents = BasicEvents | "meta" | "metaChange";

export declare class DataPath<CTX = any, EVENTS extends string = BasicEvents> {
  readOnly(): DataPath;

  customGetSet(get: DataPathCallBack<CTX>, set?: DataPathCallBack<CTX>): DataPath<CTX>;

  customSet(set: DataPathCallBack<CTX>): DataPath<CTX>;

  customGet(get: DataPathCallBack<CTX>): DataPath<CTX>;

  dynamicMeta(metaCB: (enumProp: EnumProperty | FlagProperty) => void): DataPath<CTX>;

  on(type: EVENTS, callback: DataPathCallBack<CTX>): DataPath<CTX>;

  off(type: EVENTS, callback: DataPathCallBack<CTX>): DataPath<CTX>;

  simpleSlider(): DataPath<CTX>;

  rollerSlider(): DataPath<CTX>;

  noUnits(): DataPath<CTX>;

  baseUnit(unit: string): DataPath<CTX>;

  displayUnit(unit: string): DataPath<CTX>;

  /** Sets both baseUnit and displayUnit */
  unit(unit: string): DataPath<CTX>;

  range(min: number, max: number): DataPath<CTX>;

  uiRange(min: number, max: number): DataPath<CTX>;

  decimalPlaces(places: number): DataPath<CTX>;

  uiNameGetter(callback: Function): DataPath<CTX>;

  expRate(exp: number): DataPath<CTX>;

  uniformSlider(state: boolean): DataPath<CTX>;

  radix(r: number): DataPath<CTX>;

  relativeStep(s: number): DataPath<CTX>;

  step(s: number): DataPath<CTX>;

  fullSaveUndo(): DataPath<CTX>;

  icon(i: number): DataPath<CTX>;

  icons(iconmap: any): DataPath<CTX>;

  descriptions(dmap: any): DataPath<CTX>;

  uiNames(namemap: any): DataPath<CTX>;

  description(tooltip: string): DataPath<CTX>;

  /* Evaluate mass set path filters using eval() */
  evalMassSetFilter(): DataPath<CTX>;

  checkStrip(state?: boolean): DataPath<CTX>;

  data: ToolProperty<any>;
}

declare enum StructFlags {
  NO_UNDO = 1,
}

declare interface ListIFace<ListType = any, KeyType = any, ObjType = any, CTX = any> {
  getStruct(api: DataAPI<CTX>, list: ListType, key: any): DataStruct<CTX>;

  get(api: DataAPI<CTX>, list: ListType, key: KeyType): ObjType;

  getKey(api: DataAPI<CTX>, list: ListType, obj: ObjType): any;

  getActive?(api: DataAPI<CTX>, list: ListType): ObjType | undefined;

  setActive?(api: DataAPI<CTX>, list: ListType, val: ObjType): void;

  set?(api: DataAPI<CTX>, list: ListType, key: KeyType, val: ObjType): void;

  getIter?(api: DataAPI<CTX>, list: ListType): any;

  filter?(api: DataAPI<CTX>, list: ListType, filter: string): any;

  getLength(api: DataAPI<CTX>, list: ListType): number;
}

export type DataPathMap = {
  [key: string]: DataPath<CTX>;
};

declare class DataStruct<CTX = any> {
  pathmap: DataPathMap<CTX>;

  clear(): this;

  dynamicStruct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct<CTX>): DataStruct<CTX>;

  struct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct<CTX>): DataStruct<CTX>;

  color3(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  color4(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  arrayList(
    path: string,
    apiname: string,
    existingStruct: DataStruct,
    uiname: string,
    description?: string
  ): DataPath<CTX>;

  vectorList(size: number, path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  string(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  bool(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  float(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  int(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  textblock(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  vec2(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  vec3(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  vec4(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  curve1d(path: string, apiname: string, uiname: string, description?: string): DataPath<CTX>;

  enum(path: string, apiname: string, enumdef: {}, uiname?: string, description?: string): DataPath<CTX, EnumEvents>;
  enum(
    path: string,
    apiname: string,
    enumdef: EnumProperty,
    uiname?: string,
    description?: string
  ): DataPath<CTX, EnumEvents>;

  list<ListType, KeyType, ObjType>(
    path: string,
    apiname: string,
    callbacks: ListIFace<ListType, KeyType, ObjType, CTX>
  ): DataPath;

  flags(path: string, apiname: string, enumdef: {}, uiname?: string, description?: string): DataPath<CTX, EnumEvents>;
  flags(
    path: string,
    apiname: string,
    enumdef: FlagProperty,
    uiname?: string,
    description?: string
  ): DataPath<CTX, EnumEvents>;

  /** if `apiname` is undefined, will use `prop.apiname` if it's not empty, otherwise `path` */
  fromToolProp(path: string, prop: ToolProperty<any>, apiname?: string): DataPath<CTX>;

  add(dpath: DataPath): DataStruct<CTX>;
}
