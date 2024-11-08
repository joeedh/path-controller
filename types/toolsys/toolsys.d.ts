import { ToolProperty } from "./toolprop";

export as namespace toolsys;

import { Context } from "../core/context";

import * as toolsys from "../../../path-controller/toolsys/toolsys.js";
import { INumVector, Vector2 } from "../controller";

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
declare type PropertySlots = { [k: string]: ToolProperty<any> }
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

  resetTempGeom(): void
  makeTempLine(v1: INumVector, v2: INumVector, color?: string)
}

declare class ToolMacro extends ToolOp<any, any> {
  add(tool: ToolOp);
}

declare const ToolClasses: (typeof ToolOp)[];
