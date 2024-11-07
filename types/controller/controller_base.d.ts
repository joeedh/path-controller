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

declare class DataAPI {
  mapStruct(cls: Function, autoCreate?: boolean): DataStruct;
  mapStructCustom(cls: Function, callback: Function): DataStruct

  hasStruct(cls: Function): Boolean;

  resolvePath(ctx: any, path: string): PathPropMeta;

  getValue(ctx: any, path: string): any;

  setValue(ctx: any, path: string, val: any): void;

  massSetProp(ctx: any, massSetPath: string, value: any): void;

  execTool(ctx: any, path: string, inputs?: any): ToolOp;
  execTool(ctx: any, tool: ToolOp, inputs?: any): ToolOp;
}

declare interface BoundProperty {
  dataref: any;
  ctx: any;
}

declare interface DataPathCallBack {
  (this: BoundProperty, ...args: any[]);
}

declare class DataPath {
  readOnly(): DataPath;

  customGetSet(get: DataPathCallBack, set?: DataPathCallBack): DataPath;

  customSet(set: DataPathCallBack): DataPath;

  customGet(get: DataPathCallBack): DataPath;

  on(type: string, callback: DataPathCallBack): DataPath;

  off(type: string, callback: DataPathCallBack): DataPath;

  simpleSlider(): DataPath;

  rollarSlider: DataPath;

  noUnits(): DataPath;

  baseUnit(unit: string): DataPath;

  displayUnit(unit: string): DataPath;

  /** Sets both baseUnit and displayUnit */
  unit(unit: string): DataPath

  range(min: number, max: number): DataPath;

  uiRange(min: number, max: number): DataPath;

  decimalPlaces(places: number): DataPath;

  uiNameGetter(callback: Function): DataPath;

  expRate(exp: number): DataPath;

  uniformSlider(state: boolean): DataPath;

  radix(r: number): DataPath;

  relativeStep(s: number): DataPath;

  step(s: number): DataPath;

  fullSaveUndo(): DataPath;

  icon(i: number): DataPath;

  icons(iconmap: any): DataPath;

  descriptions(dmap: any): DataPath;

  uiNames(namemap: any): DataPath;

  description(tooltip: string): DataPath;

  /* Evaluate mass set path filters using eval() */
  evalMassSetFilter(): DataPath

  checkStrip(state?: boolean): DataPath

  data: ToolProperty<any>
}

declare enum StructFlags {
  NO_UNDO = 1,
}

declare interface ListIFace<ListType = any, KeyType = any, ObjType = any> {
  getStruct(api: DataAPI, list: ListType, key: any): DataStruct;

  get(api: DataAPI, list: ListType, key: KeyType): ObjType;

  getKey(api: DataAPI, list: ListType, obj: ObjType): any;

  getActive?(api: DataAPI, list: ListType): ObjType;

  setActive?(api: DataAPI, list: ListType, val: ObjType): void;

  set?(api: DataAPI, list: ListType, key: KeyType, val: ObjType): void;

  getIter?(api: DataAPI, list: ListType): any;

  filter?(api: DataAPI, list: ListType, filter: string): any;

  getLength(api: DataAPI, list: ListType): number;
}

export type DataPathMap = {
  [key: string]: DataPath;
};

declare class DataStruct {
  pathmap: DataPathMap;

  clear(): this;

  dynamicStruct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct): DataStruct;

  struct(path: string, apiname: string, uiname: string, existingStruct?: DataStruct): DataStruct;

  color3(path: string, apiname: string, uiname: string, description?: string): DataPath;

  color4(path: string, apiname: string, uiname: string, description?: string): DataPath;

  arrayList(path: string, apiname: string, existingStruct: DataStruct, uiname: string, description?: string): DataPath;

  vectorList(size: number, path: string, apiname: string, uiname: string, description?: string): DataPath;

  string(path: string, apiname: string, uiname: string, description?: string): DataPath;

  bool(path: string, apiname: string, uiname: string, description?: string): DataPath;

  float(path: string, apiname: string, uiname: string, description?: string): DataPath;

  int(path: string, apiname: string, uiname: string, description?: string): DataPath;

  textblock(path: string, apiname: string, uiname: string, description?: string): DataPath;

  vec2(path: string, apiname: string, uiname: string, description?: string): DataPath;

  vec3(path: string, apiname: string, uiname: string, description?: string): DataPath;

  vec4(path: string, apiname: string, uiname: string, description?: string): DataPath;

  curve1d(path: string, apiname: string, uiname: string, description?: string): DataPath;

  enum(path: string, apiname: string, enumdef: {}, uiname?: string, description?: string): DataPath;
  enum(path: string, apiname: string, enumdef: EnumProperty, uiname?: string, description?: string): DataPath;

  list<ListType, KeyType, ObjType>(
    path: string,
    apiname: string,
    callbacks: ListIFace<ListType, KeyType, ObjType>
  ): DataPath;

  flags(path: string, apiname: string, enumdef: {}, uiname?: string, description?: string): DataPath;
  flags(path: string, apiname: string, enumdef: FlagProperty, uiname?: string, description?: string): DataPath;

  /** if `apiname` is undefined, will use `prop.apiname` if it's not empty, otherwise `path` */
  fromToolProp(path: string, prop: ToolProperty<any>, apiname?: string): DataPath;

  add(dpath: DataPath): DataStruct;
}
