"use strict";
import nstructjs from "../util/struct";

import * as events from "../util/events";
import { keymap } from "../util/simple_events";
import { EnumProperty, PropFlags, PropTypes, ToolProperty } from "./toolprop";
import { DataPath } from "../controller/controller_base";
import * as util from "../util/util";
import { Context } from "../controller/context";
import { ContextLike, DataAPI, DataStruct, ToolOpAny } from "../controller";
import { StructableClass, StructReader } from "../util/nstructjs";
import { IToolOpConstructor, ToolOp, UndoFlags } from "../toolsys";

/* ------------------------------------------------------------------ */
/*  ToolStack                                                         */
/* ------------------------------------------------------------------ */

// we can't ContextLike due to cyclic dependency
// created with the TS default in ContextLike itself
export class ToolStack<
  ContextCls extends ContextLike = ContextLike,
  ModalContextCls extends ContextCls = ContextCls,
  Op extends ToolOp<any, any, ContextCls, ModalContextCls> = ToolOp<
    any,
    any,
    ContextCls,
    ModalContextCls
  >,
> extends Array<Op> {
  static STRUCT: string;

  memLimit!: number;
  enforceMemLimit!: boolean;
  cur!: number;
  ctx: ContextCls;
  modalRunning!: number;
  modal_running!: boolean;
  toolctx?: ContextCls;
  _undo_branch: ToolOp[] | undefined;
  _stack?: this[0][];

  constructor(ctx?: ContextCls) {
    // note: nstructjs requires constructors take no required arguments
    super();

    this.memLimit = 512 * 1024 * 1024;
    this.enforceMemLimit = false;

    // ctx will be properly added later
    // TODO: remove ctx parameter from constructor
    this.cur = -1;
    this.ctx = ctx!;

    this.modalRunning = 0;

    this._undo_branch = undefined; //used to save undo branch in case of tool cancel
  }

  prepend(tool: this[number]) {
    this.splice(0, 0, tool);
  }

  get head(): (typeof this)[0] | undefined {
    return this[this.cur];
  }

  limitMemory(maxmem: number = this.memLimit, ctx = this.ctx): number {
    if (maxmem === undefined) {
      throw new Error("maxmem cannot be undefined");
    }

    let size = this.calcMemSize();

    let start = 0;

    while (start < this.cur - 2 && size > maxmem) {
      size -= this[start].calcMemSize(ctx);
      start++;
    }

    if (start === 0) {
      return size;
    }

    for (let i = 0; i < start; i++) {
      this[i].onUndoDestroy();
    }

    this.cur -= start;

    for (let i = 0; i < this.length - start; i++) {
      this[i] = this[i + start];
    }
    this.length -= start;

    return this.calcMemSize(ctx);
  }

  calcMemSize(ctx: ContextCls = this.ctx): number {
    let tot = 0;

    for (const tool of this) {
      try {
        tot += tool.calcMemSize(ctx);
      } catch (error) {
        util.print_stack(error as Error);
        console.error("Failed to execute a calcMemSize method");
      }
    }

    return tot;
  }

  setRestrictedToolContext(ctx: ContextCls): void {
    this.toolctx = ctx;
  }

  reset(ctx?: ContextCls): void {
    if (ctx !== undefined) {
      this.ctx = ctx;
    }

    this.modalRunning = 0;
    this.cur = -1;
    this.length = 0;
  }

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  execOrRedo(
    ctx: ContextCls,
    tool: ToolOp<any, any, ContextCls, ModalContextCls>,
    compareInputs: boolean = false
  ): boolean {
    const head = this.head;

    const ok = compareInputs
      ? ToolOp.Equals<ContextCls, ModalContextCls>(head, tool)
      : !!head && head.constructor === tool.constructor;

    tool.__memsize = undefined; //reset cache memsize

    if (ok) {
      //console.warn("Same tool detected");

      this.undo();

      //can inputs differ? in that case, execute new tool
      if (!compareInputs) {
        this.execTool(ctx, tool);
      } else {
        this.rerun(this.head);
      }

      return false;
    } else {
      this.execTool(ctx, tool);
      return true;
    }
  }

  execTool(
    ctx: ContextCls | ModalContextCls,
    toolop: this[0] | ToolOpAny,
    event?: PointerEvent
  ): void {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit, ctx as ContextCls);
    }

    if (
      !(toolop.constructor as unknown as IToolOpConstructor).canRun<ContextCls, ModalContextCls>(
        ctx as ContextCls,
        toolop as unknown as this[0]
      )
    ) {
      console.log("toolop.constructor.canRun returned false");
      return;
    }

    if (!("toLocked" in ctx)) {
      console.warn("warning: context does not support locking, could lead to undo errors");
    }
    const tctx = ctx.toLocked ? ctx.toLocked() : ctx;

    let undoflag = (toolop.constructor as unknown as IToolOpConstructor).tooldef().undoflag;
    if (toolop.undoflag !== undefined) {
      undoflag = toolop.undoflag;
    }
    undoflag = undoflag === undefined ? 0 : undoflag;

    //if (!(undoflag & UndoFlags.IS_UNDO_ROOT) && !(undoflag & UndoFlags.NO_UNDO)) {
    //tctx = new SavedContext(ctx, ctx.datalib);
    //}

    toolop.execCtx = tctx as ContextCls;

    if (!(undoflag & UndoFlags.NO_UNDO)) {
      this.cur++;

      //save branch for if tool cancel
      this._undo_branch = this.slice(this.cur + 1, this.length);

      //truncate
      this.length = this.cur + 1;

      this[this.cur] = toolop as this[0];
      toolop.undoPre(tctx as unknown as ContextCls);
    }

    if (toolop.is_modal) {
      toolop.modal_ctx = ctx as ModalContextCls;

      this.modal_running = true;

      toolop._on_cancel = (tool: this[0]) => {
        if (!(tool.undoflag & UndoFlags.NO_UNDO)) {
          this[this.cur].undo(ctx);
          this.pop_i(this.cur);
          this.cur--;
        }
      };

      if (event !== undefined) {
        toolop._pointerId = event.pointerId;
      }
      //will handle calling .exec itself
      toolop.modalStart(ctx as ModalContextCls);
    } else {
      toolop.execPre(tctx);
      toolop.exec(tctx);
      toolop.execPost(tctx);
      toolop.saveDefaultInputs();
    }
  }

  toolCancel(ctx: ContextCls, tool: ToolOp): void {
    if (tool._was_redo) {
      //also set by toolstack.redo
      //ignore tool cancel requests on redo
      return;
    }

    if (tool !== this[this.cur]) {
      console.warn("toolCancel called in error", this, tool);
      return;
    }

    this.undo();
    this.length = this.cur + 1;

    if (this._undo_branch !== undefined) {
      for (const item of this._undo_branch) {
        this.push(item as this[0]);
      }
    }
  }

  undo(): void {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit);
    }

    if (this.cur >= 0 && !(this[this.cur].undoflag & UndoFlags.IS_UNDO_ROOT)) {
      const tool = this[this.cur];

      tool.undo(tool.execCtx!);

      this.cur--;
    }
  }

  //reruns a tool if it's at the head of the stack
  rerun(tool?: this[0]): void {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit);
    }

    if (tool === this[this.cur]) {
      tool._was_redo = false;

      if (!tool.execCtx) {
        tool.execCtx = this.ctx;
      }

      tool.undo(tool.execCtx);

      tool._was_redo = true; //also set by toolstack.redo

      tool.undoPre(tool.execCtx);
      tool.execPre(tool.execCtx);
      tool.exec(tool.execCtx);
      tool.execPost(tool.execCtx);
    } else {
      console.warn("Tool wasn't at head of stack", tool);
    }
  }

  redo(): void {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit);
    }

    if (this.cur >= -1 && this.cur + 1 < this.length) {
      //console.log("redo!", this.cur, this.length);

      this.cur++;
      const tool = this[this.cur];

      if (!tool.execCtx) {
        tool.execCtx = this.ctx;
      }

      tool._was_redo = true;
      tool.redo(tool.execCtx);

      tool.saveDefaultInputs();
    }
  }

  save(): number[] {
    const data: number[] = [];
    nstructjs.writeObject(data, this);
    return data;
  }

  rewind(): this {
    while (this.cur >= 0) {
      const last = this.cur;
      this.undo();

      //prevent infinite loops
      if (last === this.cur) {
        break;
      }
    }

    return this;
  }

  /**cb is a function(ctx), if it returns the value false then playback stops
   promise will still be fulfilled.

   onstep is a callback, if it returns a promise that promise will be
   waited on, otherwise execution is queue with window.setTimeout().
   */
  replay(
    cb?: (ctx: ContextCls) => unknown,
    onStep?: () => unknown | Promise<unknown>,
    rewind: () => void = () => this.rewind()
  ): Promise<unknown> {
    rewind();

    let last = this.cur;

    const start = util.time_ms();

    return new Promise((accept, reject) => {
      const next = () => {
        last = this.cur;

        if (cb && cb(this.ctx) === false) {
          accept(undefined);
          return;
        }

        if (this.cur < this.length - 1) {
          this.cur++;

          const tool = this[this.cur];
          if (!tool.execCtx) {
            tool.execCtx = this.ctx;
          }
          tool.undoPre(tool.execCtx);
          tool.execPre(tool.execCtx);
          tool.exec(tool.execCtx);
          tool.execPost(tool.execCtx);
        }

        if (last === this.cur) {
          console.warn("time:", (util.time_ms() - start) / 1000.0);
          accept(this);
        } else {
          const ret = onStep ? onStep() : true;

          if (ret && ret instanceof Promise) {
            ret.then(() => {
              next();
            });
          } else {
            window.setTimeout(() => {
              next();
            });
          }
        }
      };

      next();
    });
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    for (const item of this._stack!) {
      this.push(item);
    }

    delete this._stack;
  }

  //note that this makes sure tool classes are registered with nstructjs
  //during save
  _save(): this {
    for (const tool of this) {
      const cls = tool.constructor as unknown as IToolOpConstructor;

      if (!nstructjs.isRegistered(cls)) {
        cls._regWithNstructjs(cls);
      }
    }

    return this;
  }

  /** Remove element at index (Array polyfill) */
  pop_i(idx: number): ToolOp | undefined {
    if (idx < 0 || idx >= this.length) return undefined;
    return this.splice(idx, 1)[0];
  }
}

ToolStack.STRUCT = `
toolsys.ToolStack {
  cur    : int;
  _stack : array(abstract(toolsys.ToolOp)) | this._save();
}
`;
nstructjs.register(ToolStack);
