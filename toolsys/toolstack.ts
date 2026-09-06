"use strict";
import nstructjs from "../util/struct";
import * as util from "../util/util";
import { StructReader } from "../util/nstructjs";
import { UndoFlags } from "./toolop";
import type { ToolExecPhase } from "./toolop";
import { IToolOpConstructor, ToolOp } from "./toolop";
import { ContextLike, ToolOpAny } from "../controller/controller_abstract";

const asyncCheck = async (p: unknown) => (p instanceof Promise ? await p : undefined);

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
  commandQueue: any[] = [];
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

  /**
   * Milliseconds a queued toolstack operation may wait before it is reported
   * as a probable deadlock. Zero disables the watchdog.
   */
  static lockWarnTimeoutMS = 5000;

  /** Called instead of the default console report when the watchdog fires. */
  onPossibleDeadlock?: (waiter: string, holder: string | undefined, ms: number) => void;

  /** Resolves when the operation currently holding the lock releases it. */
  private _lockTail: Promise<unknown> = Promise.resolve();
  /** Label of the operation holding the lock, for deadlock reports. */
  private _lockLabel?: string;
  /** Operations waiting on the lock, not counting the holder. */
  private _lockQueue = 0;

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
    this.modal_running = false;

    this._undo_branch = undefined; //used to save undo branch in case of tool cancel
  }

  prepend(tool: this[number]) {
    this.splice(0, 0, tool);
  }

  get head(): Promise<ToolOpAny | undefined> {
    return this.protect("toolstackHead", async () => this[this.cur]);
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
    this.modal_running = false;
    this.cur = -1;
    this.length = 0;
  }

  /** True while an operation holds the lock. */
  get locked(): boolean {
    return this._lockLabel !== undefined;
  }

  /** Operations waiting on the lock, not counting the one holding it. */
  get lockQueueLength(): number {
    return this._lockQueue;
  }

  /**
   * Resolves once every operation queued so far has finished.
   *
   * Tools dispatched and not awaited — a gesture committing on release, a
   * delegate running an op — land here.
   */
  async idle(): Promise<void> {
    while (this.locked || this._lockQueue > 0) {
      await this._lockTail;
    }
  }

  /**
   * Runs cb with exclusive use of the toolstack, queued behind whatever is
   * already running so no two operations interleave their awaits.
   *
   * Never call this from inside another protected region — the lock is not
   * reentrant, and the inner call would wait forever on its own caller. Every
   * internal caller uses the unlocked `_`-prefixed implementation instead.
   */
  private async protect<T>(label: string, cb: () => Promise<T>): Promise<T> {
    const prev = this._lockTail;

    let release!: () => void;
    // published before the first await, or two callers claim the same slot
    this._lockTail = new Promise<void>((resolve) => (release = resolve));

    this._lockQueue++;
    const watchdog = this._startDeadlockWatchdog(label);

    try {
      await prev;
    } finally {
      this._lockQueue--;
      watchdog();
    }

    this._lockLabel = label;
    try {
      return await cb();
    } finally {
      this._lockLabel = undefined;
      release();
    }
  }

  /** Arms the deadlock report, returning the function that disarms it. */
  private _startDeadlockWatchdog(label: string): () => void {
    const timeout = ToolStack.lockWarnTimeoutMS;
    if (!timeout) {
      return () => {};
    }

    const start = util.time_ms();
    const timer = setTimeout(() => {
      const ms = util.time_ms() - start;
      if (this.onPossibleDeadlock) {
        this.onPossibleDeadlock(label, this._lockLabel, ms);
      } else {
        console.error(
          `ToolStack: possible deadlock, "${label}" has waited ${ms | 0}ms ` +
            `for "${this._lockLabel ?? "(nothing)"}" to release the toolstack`
        );
      }
    }, timeout);

    return () => clearTimeout(timer);
  }

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  async execOrRedo(
    ctx: ContextCls,
    tool: ToolOp<any, any, ContextCls, ModalContextCls>,
    compareInputs: boolean = false
  ): Promise<boolean> {
    return this.protect("execOrRedo", () => this._execOrRedo(ctx, tool, compareInputs));
  }

  private async _execOrRedo(
    ctx: ContextCls,
    tool: ToolOp<any, any, ContextCls, ModalContextCls>,
    compareInputs: boolean
  ): Promise<boolean> {
    const head = this[this.cur]!;

    const ok = compareInputs
      ? ToolOp.Equals<ContextCls, ModalContextCls>(head, tool)
      : !!head && head.constructor === tool.constructor;

    tool.__memsize = undefined; //reset cache memsize

    if (ok) {
      //console.warn("Same tool detected");

      if (compareInputs) {
        // inputs match, so the head can just run again; _rerun undoes it first
        await this._rerun(head);
      } else {
        //inputs may differ, so drop the head and execute the new instance
        await this._undo();
        await this._execTool(ctx, tool);
      }

      return false;
    } else {
      await this._execTool(ctx, tool);
      return true;
    }
  }

  private getUndoFlag(toolop: ToolOpAny) {
    let undoflag = (toolop.constructor as unknown as IToolOpConstructor).tooldef().undoflag;
    if (toolop.undoflag !== undefined) {
      undoflag = toolop.undoflag;
    }
    undoflag = undoflag === undefined ? 0 : undoflag;
    return undoflag;
  }

  async execTool(ctx: ContextCls, toolop: ToolOpAny, event?: PointerEvent): Promise<void> {
    return this.protect("execTool", () => {
      return this._execTool(ctx, toolop, event);
    });
  }

  private async _execTool(
    ctx: ContextCls | ModalContextCls,
    toolop: this[0] | ToolOpAny,
    event?: PointerEvent
  ): Promise<void> {
    // Mutates the stack without taking the lock, so every caller must already hold it
    if (!this.locked) {
      throw new Error("_execTool ran outside a protected region");
    }

    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit, ctx as ContextCls);
    }

    const undoflag = this.getUndoFlag(toolop);
    const pushed = !(undoflag & UndoFlags.NO_UNDO);

    if (pushed) {
      // Saved for a cancel or a throw, and taken before cur moves: the slot cur
      // lands on is the first redo entry, and the push is about to overwrite it
      this._undo_branch = this.slice(this.cur + 1, this.length);

      this.cur++;
      this[this.cur] = toolop as Op;

      //truncate
      this.length = this.cur + 1;
    }

    if (!("toLocked" in ctx)) {
      console.warn("warning: context does not support locking, could lead to undo errors");
    }
    const tctx = ctx.toLocked ? ctx.toLocked() : ctx;

    //if (!(undoflag & UndoFlags.IS_UNDO_ROOT) && !(undoflag & UndoFlags.NO_UNDO)) {
    //tctx = new SavedContext(ctx, ctx.datalib);
    //}

    toolop.execCtx = tctx as ContextCls;

    let phase: ToolExecPhase = "undoPre";

    try {
      if (pushed) {
        await asyncCheck(toolop.undoPre(tctx));
      }

      if (toolop.is_modal) {
        phase = "modalStart";
        toolop.modal_ctx = ctx as ModalContextCls;

        this.modal_running = true;
        const clear = () => (this.modal_running = false);

        toolop._on_cancel = (tool: this[0]) => {
          if (tool.undoflag & UndoFlags.NO_UNDO) {
            return;
          }
          // queued rather than awaited; modalEnd does not wait on this
          void this.protect("modalCancel", async () => {
            await asyncCheck(this[this.cur].undo(ctx as ContextCls));
            this.pop_i(this.cur);
            this.cur--;
          });
        };

        if (event !== undefined) {
          toolop._pointerId = event.pointerId;
        }

        try {
          // Releases the toolstack as soon as the op owns the modal stack. A
          // gesture commits by running another tool before its modalEnd, which
          // would deadlock against a lock held for the whole gesture.
          const modal = toolop.modalStart(ctx as ModalContextCls);
          modal.then(clear, clear);
        } catch (error) {
          // A synchronous throw never reaches the promise handlers above
          clear();
          throw error;
        }
      } else {
        phase = "execPre";
        await toolop.execPre(tctx);
        phase = "exec";
        await toolop.exec(tctx);
        phase = "execPost";
        await toolop.execPost(tctx);
        toolop.saveDefaultInputs();
      }
    } catch (error) {
      await this._abortTool(toolop, tctx as ContextCls, error, phase, pushed);
      throw error;
    }
  }

  /**
   * Drops a tool whose lifecycle threw and puts the stack back the way the push
   * found it, redo branch included.
   *
   * Deliberately does not call the tool's own undo. Whether a half-applied effect
   * is safe to reverse depends on the tool and on which step failed, so that
   * decision belongs to `onExecError`.
   */
  private async _abortTool(
    toolop: this[0] | ToolOpAny,
    ctx: ContextCls,
    error: unknown,
    phase: ToolExecPhase,
    pushed: boolean
  ): Promise<void> {
    try {
      await asyncCheck(toolop.onExecError(ctx, error, phase));
    } catch (hookError) {
      util.print_stack(hookError as Error);
      console.error("onExecError threw; reporting the error it was handed instead");
    }

    if (!pushed) {
      return;
    }

    this.pop_i(this.cur);
    this.cur--;

    if (this._undo_branch !== undefined) {
      for (const item of this._undo_branch) {
        this.push(item as this[0]);
      }
    }
  }

  async toolCancel(ctx: ContextCls, tool: ToolOp): Promise<void> {
    return this.protect("toolCancel", () => this._toolCancel(ctx, tool));
  }

  private async _toolCancel(ctx: ContextCls, tool: ToolOp): Promise<void> {
    if (tool._was_redo) {
      //also set by toolstack.redo
      //ignore tool cancel requests on redo
      return;
    }

    if (tool !== this[this.cur]) {
      console.warn("toolCancel called in error", this, tool);
      return;
    }

    await this._undo();
    this.length = this.cur + 1;

    if (this._undo_branch !== undefined) {
      for (const item of this._undo_branch) {
        this.push(item as this[0]);
      }
    }
  }

  async undo(): Promise<void> {
    return this.protect("undo", () => this._undo());
  }

  private async _undo(): Promise<void> {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit);
    }

    if (this.cur >= 0 && !(this[this.cur].undoflag & UndoFlags.IS_UNDO_ROOT)) {
      const tool = this[this.cur];

      await asyncCheck(tool.undo(tool.execCtx!));

      this.cur--;
    }
  }

  //reruns a tool if it's at the head of the stack
  async rerun(tool?: this[0]): Promise<void> {
    return this.protect("rerun", () => this._rerun(tool));
  }

  private async _rerun(tool?: this[0]): Promise<void> {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit);
    }

    if (tool === this[this.cur]) {
      tool._was_redo = false;

      if (!tool.execCtx) {
        tool.execCtx = this.ctx;
      }

      await asyncCheck(tool.undo(tool.execCtx));

      tool._was_redo = true; //also set by toolstack.redo
      let p: unknown;

      await asyncCheck(tool.undoPre(tool.execCtx));
      await asyncCheck(tool.execPre(tool.execCtx));
      await asyncCheck(tool.exec(tool.execCtx));
      await asyncCheck(tool.execPost(tool.execCtx));
    } else {
      console.warn("Tool wasn't at head of stack", tool);
    }
  }

  async redo(): Promise<void> {
    return this.protect("redo", () => this._redo());
  }

  private async _redo(): Promise<void> {
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
      await asyncCheck(tool.redo(tool.execCtx));

      tool.saveDefaultInputs();
    }
  }

  save(): number[] {
    const data: number[] = [];
    nstructjs.writeObject(data, this);
    return data;
  }

  async rewind(): Promise<this> {
    return this.protect("rewind", () => this._rewind());
  }

  private async _rewind(): Promise<this> {
    while (this.cur >= 0) {
      const last = this.cur;
      await this._undo();

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

   Holds the toolstack for the whole playback, so neither callback may run
   another toolstack operation.
   */
  async replay(
    cb?: (ctx: ContextCls) => unknown,
    onStep?: () => unknown | Promise<unknown>,
    rewind?: () => Promise<this>
  ): Promise<unknown> {
    return this.protect("replay", () => this._replay(cb, onStep, rewind));
  }

  private async _replay(
    cb?: (ctx: ContextCls) => unknown,
    onStep?: () => unknown | Promise<unknown>,
    rewind: () => Promise<this> = () => this._rewind()
  ): Promise<unknown> {
    await rewind();

    let last = this.cur;

    const start = util.time_ms();

    return new Promise((accept, reject) => {
      const next = async () => {
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
          await tool.undoPre(tool.execCtx);
          await tool.execPre(tool.execCtx);
          await tool.exec(tool.execCtx);
          await tool.execPost(tool.execCtx);
        }

        if (last === this.cur) {
          console.warn("time:", (util.time_ms() - start) / 1000.0);
          accept(this);
        } else {
          const ret = onStep ? onStep() : true;

          if (ret && ret instanceof Promise) {
            ret.then(async () => {
              await next();
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
