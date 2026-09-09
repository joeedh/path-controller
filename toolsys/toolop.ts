/**

 ToolOps are base operators for modifying application state.
 They operate on Contexts and can use the datapath API.
 They make up the undo stack.

 ToolOp subclasses handle undo with their undoPre (run before tool execution)
 and undo methods.  You can set default handlers (most commonly this is just
 saving/reloading the app state) with setDefaultUndoHandlers.

 ToolOps have inputs and outputs (which are ToolProperties) and can also
 be modal.

 ## Rules

 Tools are never, EVER allowed to store direct pointers to the application state,
 with one exception: tools in modal mode may store such pointers, but they must
 delete them when existing modal mode by overriding modalEnd.

 This is to prevent very evil and difficult to debug bugs in the undo stack
 and nasty memory leaks.

 ## Example

 <pre>

 const ExampleEnum = {
  ITEM1 : 0,
  ITEM2 : 1
}

 class MyTool extends ToolOp {
  static tooldef() {
    return {
      uiname     : "Tool Name",
      toolpath   : "my.tool",
      inputs     : {
          input1 : new IntProperty(),
          input2 : new EnumProperty(0, ExampleEnum)
      },
      outputs    : {
          someoutput : new IntProperty
      }
    }
  }

  undoPre(ctx) {
    //run before tool starts
  }

  undo(ctx) {
    //undo handler
  }

  execPre(ctx) {
    //run right before exec
  }
  exec(ctx) {
    //main execution method
  }
  execPost(ctx) {
    //run right after exec
  }
}
 ToolOp.register(MyTool);

 </pre>
 */

import nstructjs from "../util/struct";
import * as events from "../util/events";
import { keymap } from "../util/simple_events";
import { PropFlags, PropTypes, ToolProperty } from "./toolprop";
import { ContextLike, ToolOpAny } from "../controller";
import { StructableClass, StructReader } from "../util/nstructjs";
import { defaultRegistry, defaultsFor } from "./toolregistry";

/** The default registry's class list, by identity — the array `register` pushes to. */
export const ToolClasses: IToolOpConstructor[] = defaultRegistry.classes;

/**
 * Which step of a tool's lifecycle threw. An op's undo snapshot is only complete
 * from `execPre` onward, so a handler deciding whether to reverse itself has to
 * know which of these it is looking at. `redo` is reported whole rather than by
 * inner step, because an overridden one is opaque to the stack.
 */
export type ToolExecPhase =
  "undo" | "undoPre" | "execPre" | "exec" | "execPost" | "redo" | "modalStart";

/** The phases that name a method `runToolPhases` can call. */
export type RunnableToolPhase = Exclude<ToolExecPhase, "modalStart">;

/**
 * Runs lifecycle steps in order, awaiting each before starting the next.
 *
 * `onError` sees the step that threw, and the error is rethrown either way;
 * putting the stack back together is the caller's job, since only it knows what
 * the run displaced.
 */
export async function runToolPhases<CTX extends ContextLike>(
  op: ToolOp<any, any, CTX, any>,
  ctx: CTX,
  phases: readonly RunnableToolPhase[],
  onError?: (error: unknown, phase: RunnableToolPhase) => void | Promise<void>
): Promise<void> {
  for (const phase of phases) {
    try {
      const result = op[phase](ctx);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      if (onError) {
        await onError(error, phase);
      }
      throw error;
    }
  }
}

const REDO_PHASES = ["undoPre", "execPre", "exec", "execPost"] as const;

/**
 * An op that can absorb a later invocation of itself, so a gesture sending one
 * op per frame leaves a single undo entry holding the last value.
 */
export interface FoldableToolOp<CTX extends ContextLike = ContextLike> {
  /**
   * Coalescing identity. Two ops of the same class fold when their keys match,
   * so anything that must end a run — a different widget, a different path, an
   * `undoBreakPoint` — belongs in the key.
   */
  foldKey(): string;

  /**
   * Absorbs `next`'s inputs and applies them, keeping the undo snapshot taken
   * when this op was pushed. Runs in place of the whole lifecycle, so it has to
   * extend that snapshot itself if what the op writes has widened.
   */
  foldFrom(next: this, ctx: CTX): void | Promise<void>;
}

export function isFoldableToolOp(op: unknown): op is ToolOpAny & FoldableToolOp {
  const candidate = op as Partial<FoldableToolOp> | undefined;
  return typeof candidate?.foldKey === "function" && typeof candidate?.foldFrom === "function";
}

export const ToolFlags: Record<string, number> = {
  PRIVATE: 1,
};

export const UndoFlags: Record<string, number> = {
  NO_UNDO      : 2,
  IS_UNDO_ROOT : 4,
  UNDO_BARRIER : 8,
  HAS_UNDO_DATA: 16,
};

/** @deprecated inheritance is now forced (at least for inputs/outputs) */
export class InheritFlag<Slots = Record<string, ToolProperty>> {
  slots: Slots;

  constructor(slots: Slots = {} as Slots) {
    this.slots = slots;
  }
}

const modalstack: ToolOp[] = [];

const defaultUndoHandlers: { undoPre: (ctx: unknown) => void; undo: (ctx: unknown) => void } = {
  undoPre(_ctx: unknown): void {
    throw new Error("implement me");
  },
  undo(_ctx: unknown): void {
    throw new Error("implement me");
  },
};

export function setDefaultUndoHandlers(
  undoPre: (ctx: unknown) => void,
  undo: (ctx: unknown) => void
): void {
  if (!undoPre || !undo) {
    throw new Error("invalid parameters to setDefaultUndoHandlers");
  }

  defaultUndoHandlers.undoPre = undoPre;
  defaultUndoHandlers.undo = undo;
}

/**
 * Why something refused, written for the person who pressed the control. The same shape a
 * widget holds, so an op's answer reaches a tooltip without an adapter in between. A class
 * rather than an interface so a struct field can name it and the two halves keep their shape
 * across IPC.
 *
 * Do not write `instanceof Refusal`. Every refusal in the tree is an object literal, which
 * satisfies the class structurally without inheriting from it, so the test is false for all of
 * them. Check `reason` instead.
 */
export class Refusal {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
toolsys.Refusal {
  reason      : string;
  description?: string;
}
`
  );

  /** One sentence, shown on the control itself. */
  reason = "";
  /** The longer explanation, shown behind the tooltip's expander. */
  description?: string;
}

/** What `canRun` answers. An object always means refused; there is no object form for yes. */
export type CanRunResult = boolean | Refusal;

/** Stands in for a refusal that supplied no sentence of its own. */
const UNSPECIFIED_REFUSAL = "the tool refused to run";

function refusalOf(result: CanRunResult): Refusal | undefined {
  if (result === true) {
    return undefined;
  }
  if (result === false) {
    return { reason: UNSPECIFIED_REFUSAL };
  }
  // An empty reason still refuses, or an op could allow itself by returning {reason: ""}
  return result.reason ? result : { ...result, reason: UNSPECIFIED_REFUSAL };
}

/**
 * Whether the tool may run. A refusal object normalizes to false, so callers written against
 * the boolean contract cannot read one as permission.
 */
export async function toolopCanRunAsync<CTX extends ContextLike, ModalCTX extends CTX = CTX>(
  ctx: CTX,
  cls: IToolOpConstructor,
  toolop?: ToolOp<any, any, CTX, ModalCTX>
): Promise<boolean> {
  return (await toolopRefusal(ctx, cls, toolop)) === undefined;
}

/**
 * The refusal, or undefined when the tool may run. Stays synchronous when `canRun` does, so a
 * caller on a hot path — or one building UI that cannot await — is not forced through a
 * microtask; `await` works either way.
 */
export function toolopRefusal<CTX extends ContextLike, ModalCTX extends CTX = CTX>(
  ctx: CTX,
  cls: IToolOpConstructor,
  toolop?: ToolOp<any, any, CTX, ModalCTX>
): Refusal | undefined | Promise<Refusal | undefined> {
  const answer = cls.canRun(ctx, toolop);
  return answer instanceof Promise ? answer.then(refusalOf) : refusalOf(answer);
}

/**
 * Thrown by the toolstack's public entry points when `canRun` refuses. Reaching the exec path
 * with a refusal means something bypassed a disabled control — a hotkey, a script, or a race.
 */
export class ToolRefusedError extends Error {
  override readonly name = "ToolRefusedError";

  constructor(
    readonly reason: string,
    readonly toolop?: ToolOpAny,
    readonly toolpath?: string
  ) {
    super(reason);
  }

  /** `instanceof` is unreliable when a bundle holds two copies of this module. */
  static is(e: unknown): e is ToolRefusedError {
    return e instanceof Error && e.name === "ToolRefusedError";
  }
}

/** The shape returned by ToolOp.tooldef() */
export interface ToolDef<InputSlots = PropertySlots, OutputSlots = PropertySlots> {
  uiname?: string;
  toolpath?: string;
  /* A stable name for saved per-tool settings, so renaming the toolpath does
     not orphan them. */
  apiname?: string;
  icon?: number;
  description?: string;
  is_modal?: boolean;
  hotkey?: unknown;
  undoflag?: number;
  flag?: number;
  inputs?: (InputSlots & InheritFlag<InputSlots>) | InputSlots | InheritFlag<InputSlots>;
  outputs?: (OutputSlots & InheritFlag<OutputSlots>) | OutputSlots | InheritFlag<OutputSlots>;
  [key: string]: unknown;
}

/** A resolved tool definition (inputs/outputs are plain records) */
export interface ResolvedToolDef {
  uiname?: string;
  toolpath?: string;
  icon?: number;
  description?: string;
  is_modal?: boolean;
  hotkey?: unknown;
  undoflag?: number;
  flag?: number;
  inputs: Record<string, ToolProperty>;
  outputs: Record<string, ToolProperty>;
  [key: string]: unknown;
}

/** ToolOp constructor shape for static-side typing */
export interface IToolOpConstructor {
  new (): ToolOp;
  name: string;
  STRUCT?: string;
  tooldef(): ToolDef;
  _getFinalToolDef(): ResolvedToolDef;
  _regWithNstructjs(cls: IToolOpConstructor, structName?: string): void;
  parseArgs(args: Record<string, unknown>): Record<string, unknown>;
  canRun<CTX extends ContextLike, ModalCTX extends CTX = CTX>(
    ctx: CTX,
    toolop?: ToolOp<any, any, CTX, ModalCTX>
  ): CanRunResult | Promise<CanRunResult>;
  isRegistered(cls: IToolOpConstructor): boolean;
  register(cls: IToolOpConstructor): void;
  unregister(cls: IToolOpConstructor): void;
  searchBoxOk(ctx: unknown): Promise<boolean>;
  onTick(): void;
  invoke(ctx: unknown, args: Record<string, unknown>): ToolOp;
  inherit<Slots>(slots: Slots): InheritFlag<Slots>;
  Equals(a: ToolOp | undefined | null, b: ToolOp | undefined | null): boolean;
  prototype: ToolOp & { __proto__?: { constructor: IToolOpConstructor } };
}

/* ------------------------------------------------------------------ */
/*  Exported generic-type aliases                                     */
/* ------------------------------------------------------------------ */

export type PropertySlots = { [k: string]: ToolProperty<unknown> };
export type SlotType<slot extends ToolProperty<unknown>> = ReturnType<slot["getValue"]>;

export class ToolOp<
  InputSlots extends PropertySlots = {},
  OutputSlots extends PropertySlots = {},
  CTX extends ContextLike = ContextLike,
  ModalCTX extends CTX = CTX,
>
  extends events.EventHandler
{
  /**
   Main ToolOp constructor.  It reads the inputs/outputs properties from
   this.constructor.tooldef() and copies them to build this.inputs and this.outputs.
   If inputs or outputs are wrapped in ToolOp.inherit(), it will walk up the class
   chain to fetch parent class properties.


   Default input values are loaded from SavedToolDefaults.  If initialized (buildToolSysAPI
   has been called) SavedToolDefaults will have a copy of all the default
   property values of all registered ToolOps.
   **/

  static STRUCT: string;

  /* Typed Function by default, which loses the statics every
     tool.constructor.tooldef() call needs. */
  declare ["constructor"]: typeof ToolOp;

  _pointerId: number | undefined;
  _overdraw:
    | (HTMLElement & {
        start(screen: unknown): void;
        end(): void;
        line(v1: unknown, v2: unknown, style: unknown): unknown;
      })
    | undefined;
  __memsize: number | undefined;
  undoflag!: number;
  flag!: number;
  _accept: ((ctx: unknown, wasCancelled: boolean) => void) | undefined;
  _reject: ((reason?: unknown) => void) | undefined;
  _promise: Promise<unknown> | undefined;
  _on_cancel: ((tool: any) => void) | undefined;
  _was_redo!: boolean;
  inputs!: InputSlots;
  outputs!: OutputSlots;
  drawlines!: unknown[];
  /* Copied onto the instance from tooldef() by the constructor below, along
     with everything else the definition carries.  Optional because tooldef()
     may leave any of them out, and `declare` so the emitted class does not
     gain own properties the runtime never had. */
  declare uiname?: string;
  declare toolpath?: string;
  declare icon?: number;
  declare description?: string;
  declare hotkey?: unknown;
  is_modal!: boolean;
  modal_ctx?: ModalCTX;
  modalRunning!: boolean;
  execCtx?: CTX;

  constructor() {
    super();

    this._pointerId = undefined;
    this._overdraw = undefined;
    this.__memsize = undefined;

    const def = (this.constructor as unknown as IToolOpConstructor).tooldef();

    if (def.undoflag !== undefined) {
      this.undoflag = def.undoflag;
    }

    if (def.flag !== undefined) {
      this.flag = def.flag;
    }

    this._accept = this._reject = undefined;
    this._promise = undefined;

    for (const k in def) {
      (this as any)[k] = def[k];
    }

    const getSlots = (
      slots: Record<string, ToolProperty> | InheritFlag | undefined,
      key: string
    ): Record<string, ToolProperty> => {
      if (slots === undefined) return {};

      const result: Record<string, ToolProperty> = {};
      let p: IToolOpConstructor | undefined = this.constructor as unknown as IToolOpConstructor;
      let lastp: IToolOpConstructor | undefined = undefined;

      while (
        p !== undefined &&
        (p as unknown) !== Object &&
        (p as unknown) !== ToolOp &&
        p !== lastp
      ) {
        if (p.tooldef) {
          const pdef = p.tooldef();

          if (pdef[key] !== undefined) {
            let slots2: Record<string, ToolProperty> | InheritFlag = pdef[key] as
              Record<string, ToolProperty> | InheritFlag;

            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (const sk in slots2) {
              if (!(sk in result)) {
                result[sk] = slots2[sk];
              }
            }
          }
        }

        lastp = p;
        //p = (p as any).prototype?.constructor as unknown as ToolOpConstructor | undefined;
        p = (p as any).__proto__ as unknown as IToolOpConstructor | undefined;
      }

      return result;
    };

    const dinputs = getSlots(def.inputs, "inputs");
    const doutputs = getSlots(def.outputs, "outputs");

    this.inputs = {} as InputSlots;
    this.outputs = {} as OutputSlots;

    if (dinputs) {
      for (const ik in dinputs) {
        const prop = dinputs[ik].copy();
        prop.apiname = prop.apiname && prop.apiname.length > 0 ? prop.apiname : ik;

        if (!this.hasDefault(prop, ik)) {
          (this.inputs as any)[ik] = prop;
          continue;
        }

        try {
          prop.setValue(this.getDefault(prop, ik));
        } catch (error) {
          console.log((error as Error).stack);
          console.log((error as Error).message);
        }

        prop.wasSet = false;
        (this.inputs as any)[ik] = prop;
      }
    }

    if (doutputs) {
      for (const ok in doutputs) {
        const prop = doutputs[ok].copy();
        prop.apiname = prop.apiname && prop.apiname.length > 0 ? prop.apiname : ok;
        (this.outputs as any)[ok] = prop;
      }
    }

    this.drawlines = [];
  }

  /**
   ToolOp definition.

   An example:
   <pre>
   static tooldef() {
    return {
      uiname   : "Tool Name",
      toolpath : "logical_module.tool", //logical_module need not match up to a real module
      icon     : -1, //tool's icon, or -1 if there is none
      description : "tooltip",
      is_modal : false, //tool is interactive and takes control of events
      hotkey   : undefined,
      undoflag : 0, //see UndoFlags
      flag     : 0,
      inputs   : ToolOp.inherit({
        f32val : new Float32Property(1.0),
        path   : new StringProperty("./path");
      }),
      outputs  : {}
      }
    }
   </pre>
   */
  static tooldef(): ToolDef {
    if (this === ToolOp) {
      throw new Error("Tools must implemented static tooldef() methods!");
    }

    return {};
  }

  /**
   * Goes through each argument, ensures an input exists for it then
   * then passes the arg through the input property's parseArg method
   */
  static parseArgs(args: Record<string, unknown>): Record<string, unknown> {
    const def = this._getFinalToolDef();
    const inputs = def.inputs;

    for (const k in args) {
      if (!(k in inputs)) {
        console.warn(`unknown argument ${k} in tool ${this}`);
        throw new Error(`unknown argument ${k}`);
      }
      const prop = inputs[k];
      args[k] = prop.parseArg(args[k]);
    }
    return args;
  }

  /** Returns a map of input property values,
   *  e.g. `let {prop1, prop2} = this.getInputs()` */
  getInputs(): { [k in keyof InputSlots]: SlotType<InputSlots[k]> } {
    const result = {} as { [k in keyof InputSlots]: SlotType<InputSlots[k]> };
    for (const k in this.inputs) {
      (result as any)[k] = this.inputs[k].getValue();
    }
    return result;
  }

  /** Returns a map of output property values */
  getOutputs(): { [k in keyof OutputSlots]: SlotType<OutputSlots[k]> } {
    const result = {} as { [k in keyof OutputSlots]: SlotType<OutputSlots[k]> };
    for (const k in this.outputs) {
      (result as any)[k] = this.outputs[k].getValue();
    }
    return result;
  }

  static Equals<CTX extends ContextLike, ModalCTX extends CTX = CTX>(
    a: ToolOp<any, any, CTX, ModalCTX> | undefined | null,
    b: ToolOp<any, any, CTX, ModalCTX> | undefined | null
  ): boolean {
    if (!a || !b) return false;
    if (a.constructor !== b.constructor) return false;

    let bad = false;
    const ai = a.inputs;
    const bi = b.inputs;

    for (const k in ai) {
      bad = bad || !(k in bi);
      bad = bad || ai[k].constructor !== bi[k].constructor;
      bad = bad || !ai[k].equals(bi[k]);

      if (bad) {
        break;
      }
    }

    return !bad;
  }

  /** @deprecated inheritance is now forced */
  static inherit<Slots = Record<string, ToolProperty>>(slots?: Slots): InheritFlag<Slots> {
    return new InheritFlag<Slots>(slots);
  }

  /**

   Creates a new instance of this toolop from args and a context.
   This is often use to fill properties with default arguments
   stored somewhere in the context.

   */
  static invoke(_ctx: any, args: Record<string, unknown>): ToolOpAny {
    args = this.parseArgs(args);

    const tool = new (this as unknown as new () => ToolOp)();
    const inputs = tool.inputs as any;

    for (const k in args) {
      if (!(k in inputs)) {
        console.warn("Unknown tool argument " + k);
        continue;
      }

      // parseArgs now handles validation
      inputs[k].setValue(args[k]);
    }

    return tool;
  }

  // use `any` to avoid extremely nasty constructor typing errors
  static register(cls: any): void {
    defaultRegistry.register(cls);
  }

  static _regWithNstructjs(cls: IToolOpConstructor, structName: string = cls.name): void {
    if (nstructjs.isRegistered(cls as unknown as StructableClass)) {
      return;
    }

    const parent = cls.prototype.__proto__?.constructor as unknown as IToolOpConstructor;

    // eslint-disable-next-line no-prototype-builtins
    if (!cls.hasOwnProperty("STRUCT")) {
      if (
        (parent as unknown) !== ToolOp &&
        !(parent as any)._IsToolMacro &&
        (parent as unknown) !== Object
      ) {
        this._regWithNstructjs(parent);
      }

      cls.STRUCT =
        nstructjs.inherit(cls as unknown as StructableClass, parent as unknown as StructableClass) +
        "}\n";
    }

    nstructjs.register(cls as unknown as StructableClass);
  }

  /**
   * Whether `cls` is in the *default* registry. `ToolOp`'s statics are that registry's
   * API, so a class registered only into another one answers `false` here — which is the
   * answer `setDataPathToolOp` wants, since it re-registers into the default.
   */
  static isRegistered(cls: IToolOpConstructor): boolean {
    return defaultRegistry.isRegistered(cls);
  }

  static unregister(cls: any): void {
    defaultRegistry.unregister(cls);
  }

  static _getFinalToolDef(): ResolvedToolDef {
    // this method is allowed to use Record types

    const def = this.tooldef() as ResolvedToolDef;

    const getSlots = (
      slots: Record<string, ToolProperty> | InheritFlag | undefined,
      key: string
    ): Record<string, ToolProperty> => {
      if (slots === undefined) return {};

      const result: Record<string, ToolProperty> = {};
      let p: IToolOpConstructor | undefined = this as unknown as IToolOpConstructor;

      while (p !== undefined && (p as unknown) !== Object && (p as unknown) !== ToolOp) {
        if (p.tooldef) {
          const pdef = p.tooldef();

          if (pdef[key] !== undefined) {
            let slots2: Record<string, ToolProperty> | InheritFlag = pdef[key] as
              Record<string, ToolProperty> | InheritFlag;
            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (const sk in slots2) {
              if (!(sk in result)) {
                result[sk] = slots2[sk];
              }
            }
          }
        }
        p = (p as any).__proto__ as unknown as IToolOpConstructor | undefined;
      }

      return result;
    };

    const dinputs = getSlots(def.inputs, "inputs");
    const doutputs = getSlots(def.outputs, "outputs");

    def.inputs = dinputs;
    def.outputs = doutputs;

    return def;
  }

  static onTick(): void {
    for (const toolop of modalstack) {
      toolop.on_tick();
    }
  }

  static async searchBoxOk<CTX extends ContextLike>(ctx: CTX): Promise<boolean> {
    const flag = this.tooldef().flag;
    let ret = !(flag && flag & ToolFlags.PRIVATE);
    ret = ret && (await toolopCanRunAsync(ctx, this as unknown as IToolOpConstructor));

    return ret;
  }

  /**
   * Whether this tool may run. Return `true`, or `{reason}` naming the refusal in a sentence
   * the person who pressed the control can read.
   *
   * Must not call into `ctx.toolstack`. This is polled from the exec path and from UI build
   * code; `head`, `idle`, `execTool`, `undo`, `redo`, `rerun` and `rewind` all take the
   * toolstack lock, which is not reentrant. Read `ctx.toolstack.headOp` if the head is
   * genuinely needed.
   *
   * note: you can use a derivation of ContextLike if you like for ctx
   * @param toolop: an optional instance of this class, may be undefined
   */
  static canRun(
    ctx: ContextLike,
    toolop?: ToolOp | undefined
  ): CanRunResult | Promise<CanRunResult> {
    return true;
  }

  /** Called when the undo system needs to destroy
   *  this toolop to save memory*/
  onUndoDestroy(): void {}

  /** Used by undo system to limit memory */
  calcMemSize(ctx: CTX): number {
    if (this.__memsize !== undefined) {
      return this.__memsize;
    }

    let tot = 0;

    for (let step = 0; step < 2; step++) {
      const props = step ? this.outputs : this.inputs;

      for (const k in props) {
        const prop = props[k];

        const size = prop.calcMemSize();

        if (isNaN(size) || !isFinite(size)) {
          console.warn("Got NaN when calculating mem size for property", prop);
          continue;
        }

        tot += size;
      }
    }

    const size = this.calcUndoMem(ctx);

    if (isNaN(size) || !isFinite(size)) {
      console.warn("Got NaN in calcMemSize", this);
    } else {
      tot += size;
    }

    this.__memsize = tot;

    return tot;
  }

  loadDefaults(force: boolean = true): this {
    const inputs = this.inputs;

    for (const k in inputs) {
      const prop = inputs[k];

      if (!force && prop.wasSet) {
        continue;
      }

      if (this.hasDefault(prop, k)) {
        prop.setValue(this.getDefault(prop, k));
        prop.wasSet = false;
      }
    }

    return this;
  }

  hasDefault(toolprop: ToolProperty, key: string = toolprop.apiname ?? ""): boolean {
    const cls = this.constructor as unknown as IToolOpConstructor;
    return defaultsFor(cls).has(cls, key, toolprop);
  }

  getDefault(toolprop: ToolProperty, key: string = toolprop.apiname ?? ""): unknown {
    const cls = this.constructor as unknown as IToolOpConstructor;
    const defaults = defaultsFor(cls);

    if (defaults.has(cls, key, toolprop)) {
      return defaults.get(cls, key, toolprop);
    } else {
      return toolprop.getValue();
    }
  }

  saveDefaultInputs(): this {
    const cls = this.constructor as unknown as IToolOpConstructor;
    const defaults = defaultsFor(cls);
    const inputs = this.inputs;

    for (const k in inputs) {
      const prop = inputs[k];

      if (prop.flag & PropFlags.SAVE_LAST_VALUE) {
        defaults.set(cls, k, prop);
      }
    }

    return this;
  }

  genToolString(): string {
    const def = (this.constructor as unknown as IToolOpConstructor).tooldef();
    let path = (def.toolpath || "") + "(";
    const inputs = this.inputs;

    for (const k in inputs) {
      const prop = inputs[k];

      path += k + "=";
      if (prop.type === PropTypes.STRING) path += "'";

      if (prop.type === PropTypes.FLOAT) {
        path += (prop.getValue() as number).toFixed(3);
      } else {
        path += prop.getValue();
      }

      if (prop.type === PropTypes.STRING) path += "'";
      path += " ";
    }
    path += ")";
    return path;
  }

  on_tick(): void {}

  /**default on_keydown implementation for modal tools,
   no need to call super() to execute this if you don't want to*/
  on_keydown(e: KeyboardEvent): void {
    switch (e.keyCode) {
      case keymap["Enter"]:
      case keymap["Space"]:
        this.modalEnd(false);
        break;
      case keymap["Escape"]:
        this.modalEnd(true);
        break;
    }
  }

  //called after undoPre
  calcUndoMem(_ctx: CTX): number {
    console.warn("ToolOp.prototype.calcUndoMem: implement me!");
    return 0;
  }

  undoPre(_ctx: CTX): void | Promise<void> {
    throw new Error("implement me!");
  }

  /**
   * Called when a lifecycle step threw, before the toolstack drops this op and
   * restores the branch it replaced. Reverse a partial effect here if reversing is
   * safe — the stack never calls `undo` on its own, because whether that is correct
   * depends on the op and on which step failed. A throw from here is reported and
   * discarded, so the original error still reaches the caller.
   */
  onExecError(_ctx: CTX, _error: unknown, _phase: ToolExecPhase): void | Promise<void> {}

  undo(_ctx: CTX): void | Promise<void> {
    throw new Error("implement me!");
    //_appstate.loadUndoFile(this._undo);
  }

  /** Returns the promise, so a caller can wait on an async phase and see it throw. */
  redo(ctx: CTX): void | Promise<void> {
    this._was_redo = true; //also set by toolstack.redo

    return runToolPhases(this, ctx, REDO_PHASES);
  }

  //for compatibility with fairmotion
  exec_pre(ctx: CTX): void {
    this.execPre(ctx);
  }

  execPre(_ctx: CTX): void | Promise<void> {}

  exec(_ctx: CTX): void | Promise<void> {}

  execPost(_ctx: CTX): void | Promise<void> {}

  /**for use in modal mode only*/
  resetTempGeom(): void {
    for (const dl of this.drawlines) {
      (dl as { remove(): void }).remove();
    }

    this.drawlines.length = 0;
  }

  error(msg: string): void {
    console.warn(msg);
  }

  getOverdraw(): HTMLElement & {
    start(screen: unknown): void;
    end(): void;
    line(v1: unknown, v2: unknown, style: unknown): unknown;
  } {
    if (this._overdraw === undefined) {
      this._overdraw = document.createElement("overdraw-x") as HTMLElement & {
        start(screen: unknown): void;
        end(): void;
        line(v1: unknown, v2: unknown, style: unknown): unknown;
      };
      this._overdraw.start(this.modal_ctx!.screen);
    }

    return this._overdraw;
  }

  /**for use in modal mode only*/
  makeTempLine(v1: unknown, v2: unknown, style: unknown): unknown {
    const line = this.getOverdraw().line(v1, v2, style);
    this.drawlines.push(line);
    return line;
  }

  pushModal(_node: unknown): void {
    throw new Error("cannot call this; use modalStart");
  }

  popModal(): void {
    throw new Error("cannot call this; use modalEnd");
  }

  /**returns promise to be executed on modalEnd*/
  modalStart(ctx: ModalCTX): Promise<unknown> {
    if (this.modalRunning) {
      console.warn("Warning, tool is already in modal mode consuming events");
      return this._promise!;
    }

    this.modal_ctx = ctx as ModalCTX;
    this.modalRunning = true;

    this._promise = new Promise((accept, reject) => {
      this._accept = accept as (ctx: unknown, wasCancelled: boolean) => void;
      this._reject = reject;

      modalstack.push(this as unknown as ToolOp);

      if (this._pointerId !== undefined) {
        super.pushPointerModal(ctx.screen!, this._pointerId);
      } else {
        super.pushModal(ctx.screen!);
      }
    });

    return this._promise;
  }

  /*eek, I've not been using this.
    guess it's a non-enforced contract, I've been naming
    cancel methods 'cancel' all this time.

    XXX fix
  */
  toolCancel(): void {}

  modalEnd(was_cancelled?: boolean): void {
    if (this._modalstate) {
      modalstack.pop();
    }

    if (this._overdraw !== undefined) {
      this._overdraw.end();
      this._overdraw = undefined;
    }

    if (was_cancelled && this._on_cancel !== undefined) {
      if (this._accept) {
        this._accept(this.modal_ctx, true);
      }

      // note: we deliberately do not wait for this._on_cancel,
      // in the belief that tools should always pop off the modal
      // stack even if callbacks like this error
      this._on_cancel(this);
      this._on_cancel = undefined;
    }

    this.resetTempGeom();

    const ctx = this.modal_ctx;

    this.modal_ctx = undefined;
    this.modalRunning = false;
    this.is_modal = false;

    super.popModal();

    this._promise = undefined;

    if (this._accept) {
      this._accept(ctx, false); //Context, was_cancelled
      this._accept = this._reject = undefined;
    }

    this.saveDefaultInputs();
  }

  loadSTRUCT(reader: StructReader<this>): void {
    reader(this);

    const outs = this.outputs as unknown as { key: string; val: ToolProperty }[];
    const ins = this.inputs as unknown as { key: string; val: ToolProperty }[];

    this.inputs = {} as InputSlots;
    this.outputs = {} as OutputSlots;

    const inputsRec = this.inputs as any;
    const outputsRec = this.outputs as any;

    for (const pair of ins) {
      inputsRec[pair.key] = pair.val;
    }

    for (const pair of outs) {
      outputsRec[pair.key] = pair.val;
    }
  }

  _save_inputs(): PropKey[] {
    const ret: PropKey[] = [];
    const inputs = this.inputs;
    for (const k in inputs) {
      ret.push(new PropKey(k, inputs[k]));
    }

    return ret;
  }

  _save_outputs(): PropKey[] {
    const ret: PropKey[] = [];
    const outputs = this.outputs;
    for (const k in outputs) {
      ret.push(new PropKey(k, outputs[k]));
    }

    return ret;
  }
}

ToolOp.STRUCT = `
toolsys.ToolOp {
  inputs  : array(toolsys.PropKey) | this._save_inputs();
  outputs : array(toolsys.PropKey) | this._save_outputs();
}
`;
nstructjs.register(ToolOp as unknown as StructableClass);

class PropKey {
  static STRUCT: string;
  key: string;
  val: ToolProperty;

  constructor(key: string, val: ToolProperty) {
    this.key = key;
    this.val = val;
  }
}

PropKey.STRUCT = `
toolsys.PropKey {
  key : string;
  val : abstract(ToolProperty);
}
`;
nstructjs.register(PropKey as unknown as StructableClass);
