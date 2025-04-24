import { ToolProperty } from "./toolprop";

export as namespace toolsys;

import { Context } from "../core/context";

import * as toolsys from "../../../path-controller/toolsys/toolsys.js";
import { DataAPI, DataStruct, INumVector, Vector2 } from "../controller";

declare enum ToolFlags {
  PRIVATE = toolsys.ToolFlags.PRIVATE,
}

declare enum UndoFlags {
  NO_UNDO = toolsys.UndoFlags.NO_UNDO,
  IS_UNDO_ROOT = toolsys.UndoFlags.IS_UNDO_ROOT,
  UNDO_BARRIER = toolsys.UndoFlags.UNDO_BARRIER,
  HAS_UNDO_DATA = toolsys.UndoFlags.HAS_UNDO_DATA,
}

declare interface InheritFlag<Slots> {
  slots: Slots;
}

declare interface ToolDef<InputSlots = any, OutputSlots = any> {
  uiname?: string;
  toolpath: string;
  inputs: InputSlots & InheritFlag<InputSlots>;
  outputs?: OutputSlots & InheritFlag<OutputSlots>;
  icon?: number;
  is_modal?: boolean;
  flag?: number;
  undoflag?: number;
}

declare interface IToolOpConstructor<ToolOpCls extends ToolOp, InputSlots = {}, OutputSlots = {}, ContextCls = any> {
  new (): ToolOpCls;

  tooldef(): ToolDef;

  inherit<Slots>(slots: Slots): InheritFlag<Slots>;

  register(cls: IToolOpConstructor<any, any, any>);
}

declare type SlotType<slot extends ToolProperty<any>> = slot["ValueTypeAlias"];
declare type PropertySlots = { [k: string]: ToolProperty<any> };
declare class ToolOp<
  InputSlots extends PropertySlots = {},
  OutputSlots extends PropertySlots = {},
  ContextCls = Context,
  ModalContextCls = ContextCls,
> {
  ["constructor"]: IToolOpConstructor<this, InputSlots, OutputSlots>;

  modal_ctx?: ModalContextCls;
  modalRunning: boolean;

  inputs: InputSlots;
  outputs: OutputSlots;

  getInputs(): { [k in keyof InputSlots]: SlotType<InputSlots[k]> };

  getOutputs(): { [k: string]: SlotType<OutputSlots[k]> };

  static onTick(): void;

  static canRun(ctx: ContextCls): boolean;

  static invoke(ctx: ModalContextCls, args: { [k: string]: any }): any;

  static inherit<Slots>(slots: Slots): InheritFlag<Slots>;

  static register(cls: IToolOpConstructor<any, any, any>);

  static tooldef(): ToolDef;

  undoPre(ctx: ContextCls): void;

  undo(ctx: ContextCls): void;

  redo(ctx: ContextCls): void;

  execPre(ctx: ContextCls): void;

  exec(ctx: ContextCls): void;

  execPost(ctx: ContextCls): void;

  modalStart(ctx: ContextCls): void;

  modalEnd(wasCancelled: boolean): void;

  resetTempGeom(): void;
  makeTempLine(v1: INumVector, v2: INumVector, color?: string);
}

declare class ToolMacro extends ToolOp<any, any> {
  add(tool: ToolOp);
}

declare const ToolClasses: (typeof ToolOp)[];

declare class ToolStack<ContextCls = Context, ModalContextCls = ContextCls> extends Array<
  ToolOp<any, any, ContextCls, ModalContextCls>
> {
  head: ToolOp<any, any, ContextCls, ModalContextCls> | undefined;

  limitMemory(maxmem?: number, ctx?: ContextCls | ModalContextCls): number;

  calcMemSize(ctx?: ContextCls | ModalContextCls): number;

  setRestrictedToolContext(ctx: ContextCls | ModalContextCls): void;

  reset(ctx): void;

  execOrRedo(
    ctx: ContextCls | ModalContextCls,
    tool: ToolOp<any, any, ContextCls, ModalContextCls>,
    compareInputs?: boolean
  ): boolean;

  execTool(ctx: ContextCls | ModalContextCls, tool: ToolOp<any, any, ContextCls, ModalContextCls>, event?: PointerEvent): void;

  toolCancel(ctx: ContextCls | ModalContextCls, tool: ToolOp<any, any, ContextCls, ModalContextCls>): void;

  undo(): void;

  rerun(tool: ToolOp<any, any, ContextCls, ModalContextCls>);

  redo(): void;

  /** returns raw bytes (TODO: spit out an array buffer) */
  save(): number[];

  rewind(): this;

  replay(shouldStopCB?: (ctx: ContextCls | ModalContextCls) => boolean, onStep?: () => Promise<void>): Promise<this>;

  /** note: makes sure tool classes are registered with nstructjs during save*/
  _save(): void;
}

declare function buildToolOpAPI(api: DataAPI, clsToMap: new (...args: any[]) => any);

/**
 * Call this to build the tool property cache data binding API.
 *
 * If rootCtxClass is not undefined and insertToolDefaultsIntoContext is true
 * then ".toolDefaults" will be automatically added to rootCtxClass's prototype
 * if necessary.
 *
 * @param registerWithNStructjs defaults to true
 * @param insertToolDefaultsIntoContext defaults to true.  automatically inserts `last_tool` and `toolDefaults`
 *                                      into context class if necassary.
 */
declare function buildToolSysAPI(
  api: DataAPI,
  registerWithNStructjs?: boolean,
  rootCtxStruct?: DataStruct,
  rootCtxClass?: Context,
  insertToolDefaultsIntoContext?: boolean
);

type AnyClass = new (...args: any) => any;
declare class ToolPropertyCache {
  static getPropKey(cls: AnyClass, key: string, prop: ToolProperty<any>): string;
  
  useDefault(cls: AnyClass, key: string, prop: ToolProperty<any>): string;
  
  has(cls: AnyClass, key: string, prop: ToolProperty<any>): boolean;

  get<T>(cls: AnyClass, key: string, prop: ToolProperty<T>): T | undefined
  set<T>(cls: AnyClass, key: string, prop: ToolProperty<T>): this | undefined
}

declare const SavedToolDefaults: ToolPropertyCache
