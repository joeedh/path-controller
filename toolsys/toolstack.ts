"use strict";
import nstructjs from "../util/struct";
import * as util from "../util/util";
import { StructReader } from "../util/nstructjs";
import {
  isFoldableToolOp,
  runToolPhases,
  ToolRefusedError,
  toolopRefusal,
  UndoFlags,
} from "./toolop";
import type { RunnableToolPhase, ToolExecPhase } from "./toolop";
import { IToolOpConstructor, ToolOp } from "./toolop";
import type { Refusal } from "./toolop";
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

  /**
   * The op on top of the stack, read without queueing behind whatever holds the lock.
   * `ctx.last_tool` binds through this, since a datapath resolver cannot await.
   */
  get headOp(): ToolOpAny | undefined {
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
    const check = this._checkCanRun(ctx, tool);
    if (check) {
      await check;
    }

    return this.protect("execOrRedo", () => this._execOrRedo(ctx, tool, compareInputs));
  }

  /**
   * Throws `ToolRefusedError` when `toolop` refuses. Runs outside `protect`, because `canRun` is
   * consumer code and the lock is not reentrant; the answer is therefore a gate rather than a
   * guarantee, and an op that must be certain still checks in `exec`.
   *
   * Answers synchronously whenever `canRun` does — the default — so an ordinary exec still claims
   * the lock in the turn it was issued, and cannot be overtaken by an undo issued right after it.
   * A tool whose `canRun` is async gives that ordering up.
   */
  private _checkCanRun(ctx: ContextCls, toolop: ToolOpAny): void | Promise<void> {
    const cls = toolop.constructor as unknown as IToolOpConstructor;
    const refuse = (refusal: Refusal | undefined) => {
      if (refusal) {
        throw new ToolRefusedError(refusal.reason, toolop, cls.tooldef().toolpath);
      }
    };

    const answer = toolopRefusal(ctx, cls, toolop as never);
    return answer instanceof Promise ? answer.then(refuse) : refuse(answer);
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

  /**
   * Runs `toolop`, or folds it into the head when the two are the same foldable
   * class and their keys match. Returns true when a new entry was pushed.
   *
   * The test and the write share one protected region, so nothing can move the
   * head between them — which is why a gesture coalesces here rather than by
   * reading `head` and driving `undo`/`redo` itself.
   */
  async foldOrExec(ctx: ContextCls, toolop: ToolOpAny): Promise<boolean> {
    // Both branches gate: a gesture whose op starts refusing mid-drag should stop, not fold
    const check = this._checkCanRun(ctx, toolop);
    if (check) {
      await check;
    }

    return this.protect("foldOrExec", async () => {
      const head = this[this.cur] as ToolOpAny | undefined;

      // Folding into an entry with a redo branch after it would leave the branch
      // standing over a value it was never built against
      const atHead = this.cur === this.length - 1;

      if (
        atHead &&
        head?.constructor === toolop.constructor &&
        isFoldableToolOp(head) &&
        isFoldableToolOp(toolop) &&
        head.foldKey() === toolop.foldKey()
      ) {
        await asyncCheck(head.foldFrom(toolop as typeof head, ctx));
        return false;
      }

      await this._execTool(ctx, toolop);
      return true;
    });
  }

  async execTool(ctx: ContextCls, toolop: ToolOpAny, event?: PointerEvent): Promise<void> {
    const check = this._checkCanRun(ctx, toolop);
    if (check) {
      await check;
    }

    return this.protect("execTool", () => {
      return this._execTool(ctx, toolop, event);
    });
  }

  /**
   * Runs `toolop` and pushes it, having taken no authorization decision of its own: the three
   * public wrappers call `_checkCanRun` before taking the lock. It must not check here — `canRun`
   * is consumer code, and awaiting it while holding the non-reentrant lock deadlocks the stack.
   * Undo, redo and `_rerun` reach this unchecked by design.
   */
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

    try {
      if (pushed) {
        await this._runPhases(toolop, tctx as ContextCls, ["undoPre"]);
      }

      if (toolop.is_modal) {
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
          await this._reportExecError(toolop, tctx as ContextCls, error, "modalStart");
          throw error;
        }
      } else {
        await this._runPhases(toolop, tctx as ContextCls, ["execPre", "exec", "execPost"]);
        toolop.saveDefaultInputs();
      }
    } catch (error) {
      this._rollbackPush(pushed);
      throw error;
    }
  }

  /**
   * Runs lifecycle steps in order, reporting whichever one throws to the tool
   * before rethrowing. Restoring the stack is left to the caller.
   */
  private async _runPhases(
    toolop: this[0] | ToolOpAny,
    ctx: ContextCls,
    phases: readonly RunnableToolPhase[]
  ): Promise<void> {
    return runToolPhases(toolop as ToolOp<any, any, ContextCls>, ctx, phases, (error, phase) =>
      this._reportExecError(toolop, ctx, error, phase)
    );
  }

  /**
   * Hands a failed step to the tool. A throw from the handler is reported and
   * dropped, so it cannot displace the error the caller is about to see.
   */
  private async _reportExecError(
    toolop: this[0] | ToolOpAny,
    ctx: ContextCls,
    error: unknown,
    phase: ToolExecPhase
  ): Promise<void> {
    try {
      await asyncCheck(toolop.onExecError(ctx, error, phase));
    } catch (hookError) {
      util.print_stack(hookError as Error);
      console.error("onExecError threw; reporting the error it was handed instead");
    }
  }

  /** Drops the tool the current push added and restores the branch it displaced. */
  private _rollbackPush(pushed: boolean): void {
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

      // cur stays put if undo throws: the tool is still the applied head
      await this._runPhases(tool, tool.execCtx!, ["undo"]);

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

      // Reversing first, so cur stays put if it throws — the tool is still applied
      await this._runPhases(tool, tool.execCtx, ["undo"]);

      tool._was_redo = true; //also set by toolstack.redo

      try {
        await this._runPhases(tool, tool.execCtx, ["undoPre", "execPre", "exec", "execPost"]);
      } catch (error) {
        // The tool is undone and will not re-run, so it stops being the head
        this.pop_i(this.cur);
        this.cur--;
        throw error;
      }
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

      try {
        await this._runPhases(tool, tool.execCtx, ["redo"]);
      } catch (error) {
        // Nothing was reapplied, so cur goes back to the entry before it
        this.cur--;
        throw error;
      }

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

    const start = util.time_ms();

    // A loop rather than a self-calling promise executor: a throw out of the old
    // `next` rejected a promise nobody held, leaving replay's own promise unsettled
    // and the toolstack locked for the life of the page
    for (;;) {
      const last = this.cur;

      if (cb && cb(this.ctx) === false) {
        return undefined;
      }

      if (this.cur < this.length - 1) {
        this.cur++;

        const tool = this[this.cur];
        if (!tool.execCtx) {
          tool.execCtx = this.ctx;
        }

        try {
          await this._runPhases(tool, tool.execCtx, ["undoPre", "execPre", "exec", "execPost"]);
        } catch (error) {
          // Stop at the entry before the one that failed, so cur matches the model
          this.cur--;
          throw error;
        }
      }

      if (last === this.cur) {
        console.warn("time:", (util.time_ms() - start) / 1000.0);
        return this;
      }

      const ret = onStep ? onStep() : true;

      if (ret instanceof Promise) {
        await ret;
      } else {
        await new Promise<void>((accept) => window.setTimeout(accept));
      }
    }
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
