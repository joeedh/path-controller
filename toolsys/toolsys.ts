"use strict";
import nstructjs from "../util/struct.js";

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

import * as events from "../util/events.js";
import { keymap } from "../util/simple_events.js";
import { PropFlags, PropTypes, ToolProperty } from "./toolprop.js";
import { DataPath } from "../controller/controller_base.js";
import * as util from "../util/util.js";
import { Context } from "../controller/context.js";
import { ContextLike, DataAPI, DataStruct, ToolOpAny } from "../controller.js";
import { StructReader } from "../util/nstructjs.js";

// Window globals (_ToolClasses, _MacroClasses, etc.) are declared in global.d.ts

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
/* ------------------------------------------------------------------ */

/** The shape returned by ToolOp.tooldef() */
export interface ToolDef<InputSlots = PropertySlots, OutputSlots = PropertySlots> {
  uiname?: string;
  toolpath?: string;
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
interface ResolvedToolDef {
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
interface ToolOpConstructor {
  new (): ToolOp;
  name: string;
  STRUCT?: string;
  tooldef(): ToolDef;
  _getFinalToolDef(): ResolvedToolDef;
  _regWithNstructjs(cls: ToolOpConstructor, structName?: string): void;
  canRun<CTX extends ContextLike, ModalCTX extends CTX = CTX>(
    ctx: CTX,
    toolop?: ToolOp<any, any, CTX, ModalCTX>
  ): boolean;
  isRegistered(cls: ToolOpConstructor): boolean;
  register(cls: ToolOpConstructor): void;
  unregister(cls: ToolOpConstructor): void;
  searchBoxOk(ctx: unknown): boolean;
  onTick(): void;
  invoke(ctx: unknown, args: Record<string, unknown>): ToolOp;
  inherit<Slots>(slots: Slots): InheritFlag<Slots>;
  Equals(a: ToolOp | undefined | null, b: ToolOp | undefined | null): boolean;
  prototype: ToolOp & { __proto__: { constructor: ToolOpConstructor } };
}

/** Runtime-generated macro class shape */
type MacroClassType = (new () => ToolOp) & {
  __tooldef: Record<string, unknown>;
  ready: boolean;
  _macroTypeId?: number;
  tooldef(): ToolDef;
  _getFinalToolDef(): ResolvedToolDef;
  name: string;
  STRUCT?: string;
};

/* ------------------------------------------------------------------ */
/*  Exported generic-type aliases                                     */
/* ------------------------------------------------------------------ */

export type PropertySlots = { [k: string]: ToolProperty<unknown> };
export type SlotType<slot extends ToolProperty<unknown>> = slot extends ToolProperty<infer T> ? T : unknown;

/* ------------------------------------------------------------------ */
/*  Module-level state                                                */
/* ------------------------------------------------------------------ */

export const ToolClasses: ToolOpConstructor[] = [];

export function setContextClass(_cls: unknown): void {
  console.warn("setContextClass is deprecated");
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

export function setDefaultUndoHandlers(undoPre: (ctx: unknown) => void, undo: (ctx: unknown) => void): void {
  if (!undoPre || !undo) {
    throw new Error("invalid parameters to setDefaultUndoHandlers");
  }

  defaultUndoHandlers.undoPre = undoPre;
  defaultUndoHandlers.undo = undo;
}

/* ------------------------------------------------------------------ */
/*  ToolPropertyCache                                                 */
/* ------------------------------------------------------------------ */

export class ToolPropertyCache {
  map: Map<unknown, unknown>;
  pathmap: Map<string, Record<string, unknown>>;
  accessors: Record<string, unknown>;
  userSetMap: Set<string>;
  api: unknown;
  dstruct: unknown;

  constructor() {
    this.map = new Map();
    this.pathmap = new Map();
    this.accessors = {};

    this.userSetMap = new Set();

    this.api = undefined;
    this.dstruct = undefined;
  }

  static getPropKey(_cls: unknown, key: string, prop: ToolProperty): string {
    return prop.apiname && prop.apiname.length > 0 ? prop.apiname : key;
  }

  _buildAccessors(
    cls: ToolOpConstructor | MacroClassType,
    key: string,
    prop: ToolProperty,
    dstruct: DataStruct,
    api: DataAPI
  ): void {
    const tdef = (cls as ToolOpConstructor)._getFinalToolDef();

    this.api = api;
    this.dstruct = dstruct;

    if (!tdef.toolpath) {
      console.warn("Bad tool property", cls, "it's tooldef was missing a toolpath field");
      return;
    }

    const path = tdef.toolpath
      .trim()
      .split(".")
      .filter((f: string) => f.trim().length > 0);
    let obj = this.accessors;

    let st = dstruct;
    let partial = "";

    for (let i = 0; i < path.length; i++) {
      const k = path[i];
      let pathk = k;

      if (i === 0) {
        pathk = "accessors." + k;
      }

      if (i > 0) {
        partial += ".";
      }
      partial += k;

      if (!(k in obj)) {
        obj[k] = {};
      }

      const st2 = api.mapStruct(obj[k], true, k);
      if (!(st.pathmap && k in st.pathmap)) {
        st.struct(pathk, k, k, st2);
      }
      st = st2;

      this.pathmap.set(partial, obj[k] as any);
      obj = obj[k] as any;
    }

    const name = prop.apiname !== undefined && prop.apiname.length > 0 ? prop.apiname : key;
    const prop2 = prop.copy();

    const dpath = new DataPath(name, name, prop2);
    let uiname = prop.uiname;

    if (!uiname || uiname.trim().length === 0) {
      uiname = prop.apiname;
    }
    if (!uiname || uiname.trim().length === 0) {
      uiname = key;
    }

    uiname = ToolProperty.makeUIName(uiname);

    prop2.uiname = uiname;
    prop2.description = prop2.description || prop2.uiname;

    st.add(dpath);
    obj[name] = prop2.getValue();
  }

  _getAccessor(cls: ToolOpConstructor | MacroClassType): Record<string, unknown> | undefined {
    const toolpath = cls.tooldef().toolpath;
    if (!toolpath) return undefined;
    return this.pathmap.get(toolpath.trim());
  }

  useDefault(cls: ToolOpConstructor | MacroClassType, key: string, _prop: ToolProperty): string {
    const k = this.userSetMap.has(
      cls.tooldef().toString().trim() + "." + (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, _prop)
    ) as unknown as string;
    return k as unknown as string;
  }

  has(cls: ToolOpConstructor | MacroClassType, key: string, prop: ToolProperty): boolean {
    if (prop.flag & PropFlags.NO_DEFAULT) {
      return false;
    }

    const obj = this._getAccessor(cls);

    key = (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, prop);
    return !!obj && key in obj;
  }

  get<T>(cls: ToolOpConstructor | MacroClassType, key: string, prop: ToolProperty<T>): T | undefined {
    if ((cls as unknown) === ToolMacro) {
      return undefined;
    }

    const obj = this._getAccessor(cls);
    key = (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, prop);

    if (obj) {
      return obj[key] as T | undefined;
    }

    return undefined;
  }

  set<T>(cls: ToolOpConstructor | MacroClassType, key: string, prop: ToolProperty<T>): this | undefined {
    if ((cls as unknown) === ToolMacro) {
      return;
    }

    let toolpath = cls.tooldef().toolpath;
    if (!toolpath) {
      console.error("Malformed toolpath in toolop definition: undefined");
      return;
    }
    toolpath = toolpath.trim();
    let obj = this._getAccessor(cls);

    if (!obj) {
      console.warn("Warning, toolop " + cls.name + " was not in the default map; unregistered?");
      this._buildAccessors(
        cls as ToolOpConstructor,
        key,
        prop,
        this.dstruct as Record<string, unknown>,
        this.api as Record<string, unknown>
      );

      obj = this.pathmap.get(toolpath);
    }

    if (!obj) {
      console.error("Malformed toolpath in toolop definition: " + toolpath);
      return;
    }

    key = (this.constructor as typeof ToolPropertyCache).getPropKey(cls, key, prop);

    //copy prop first in case we're a non-primitive-value type, e.g. vector properties
    obj[key] = prop.copy().getValue();

    const path = toolpath + "." + key;
    this.userSetMap.add(path);

    return this;
  }
}

export const SavedToolDefaults: ToolPropertyCache = new ToolPropertyCache();

export class ToolOp<
  InputSlots extends PropertySlots = {},
  OutputSlots extends PropertySlots = {},
  CTX extends ContextLike = ContextLike,
  ModalCTX extends CTX = CTX,
> extends events.EventHandler {
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
  _on_cancel: ((tool: ToolOp<any, any, CTX, ModalCTX>) => void) | undefined;
  _was_redo!: boolean;
  inputs!: InputSlots;
  outputs!: OutputSlots;
  drawlines!: unknown[];
  is_modal!: boolean;
  modal_ctx?: ModalCTX;
  modalRunning!: boolean;
  execCtx?: CTX;

  constructor() {
    super();

    this._pointerId = undefined;
    this._overdraw = undefined;
    this.__memsize = undefined;

    const def = (this.constructor as unknown as ToolOpConstructor).tooldef();

    if (def.undoflag !== undefined) {
      this.undoflag = def.undoflag;
    }

    if (def.flag !== undefined) {
      this.flag = def.flag;
    }

    this._accept = this._reject = undefined;
    this._promise = undefined;

    for (const k in def) {
      (this as Record<string, unknown>)[k] = def[k];
    }

    const getSlots = (
      slots: Record<string, ToolProperty> | InheritFlag | undefined,
      key: string
    ): Record<string, ToolProperty> => {
      if (slots === undefined) return {};

      if (!(slots instanceof InheritFlag)) {
        return slots as Record<string, ToolProperty>;
      }

      const result: Record<string, ToolProperty> = {};
      let p: ToolOpConstructor | undefined = this.constructor as unknown as ToolOpConstructor;
      let lastp: ToolOpConstructor | undefined = undefined;

      while (p !== undefined && (p as unknown) !== Object && (p as unknown) !== ToolOp && p !== lastp) {
        if (p.tooldef) {
          const pdef = p.tooldef();

          if (pdef[key] !== undefined) {
            let slots2: Record<string, ToolProperty> | InheritFlag = pdef[key] as
              | Record<string, ToolProperty>
              | InheritFlag;
            const stop = !(slots2 instanceof InheritFlag);

            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (const sk in slots2) {
              if (!(sk in result)) {
                result[sk] = (slots2 as Record<string, ToolProperty>)[sk];
              }
            }

            if (stop) {
              break;
            }
          }
        }

        lastp = p;
        p = (p as any).__proto__?.constructor as unknown as ToolOpConstructor | undefined;
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
          (this.inputs as Record<string, ToolProperty>)[ik] = prop;
          continue;
        }

        try {
          prop.setValue(this.getDefault(prop, ik));
        } catch (error) {
          console.log((error as Error).stack);
          console.log((error as Error).message);
        }

        prop.wasSet = false;
        (this.inputs as Record<string, ToolProperty>)[ik] = prop;
      }
    }

    if (doutputs) {
      for (const ok in doutputs) {
        const prop = doutputs[ok].copy();
        prop.apiname = prop.apiname && prop.apiname.length > 0 ? prop.apiname : ok;

        (this.outputs as Record<string, ToolProperty>)[ok] = prop;
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

  /** Returns a map of input property values,
   *  e.g. `let {prop1, prop2} = this.getInputs()` */
  getInputs(): { [k in keyof InputSlots]: SlotType<InputSlots[k]> } {
    const result = {} as { [k in keyof InputSlots]: SlotType<InputSlots[k]> };
    for (const k in this.inputs) {
      (result as Record<string, unknown>)[k] = (this.inputs as Record<string, ToolProperty>)[k].getValue();
    }
    return result;
  }

  /** Returns a map of output property values */
  getOutputs(): { [k in keyof OutputSlots]: SlotType<OutputSlots[k]> } {
    const result = {} as { [k in keyof OutputSlots]: SlotType<OutputSlots[k]> };
    for (const k in this.outputs) {
      (result as Record<string, unknown>)[k] = (this.outputs as Record<string, ToolProperty>)[k].getValue();
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
    const ai = a.inputs as Record<string, ToolProperty>;
    const bi = b.inputs as Record<string, ToolProperty>;

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

  static inherit<Slots>(slots: Slots): InheritFlag<Slots> {
    return new InheritFlag<Slots>(slots);
  }

  /**

   Creates a new instance of this toolop from args and a context.
   This is often use to fill properties with default arguments
   stored somewhere in the context.

   */
  static invoke<CTX extends ContextLike>(ctx: CTX, args: Record<string, unknown>): ToolOp {
    const tool = new (this as unknown as new () => ToolOp)();
    const inputs = tool.inputs as Record<string, ToolProperty>;

    for (const k in args) {
      if (!(k in inputs)) {
        console.warn("Unknown tool argument " + k);
        continue;
      }

      const prop = inputs[k];
      let val = args[k];

      if (typeof val === "string" && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        if (val in (prop as unknown as Record<string, Record<string, unknown>>).values) {
          val = (prop as unknown as Record<string, Record<string, unknown>>).values[val];
        } else {
          console.warn("Possible invalid enum/flag:", val);
          continue;
        }
      }

      inputs[k].setValue(val);
    }

    return tool;
  }

  static register(cls: ToolOpConstructor): void {
    if (ToolClasses.includes(cls)) {
      console.warn("Tried to register same ToolOp class twice:", cls.name, cls);
      return;
    }

    ToolClasses.push(cls);
  }

  static _regWithNstructjs(cls: ToolOpConstructor, structName: string = cls.name): void {
    if (nstructjs.isRegistered(cls as unknown as import("../util/nstructjs_es6.js").StructableClass)) {
      return;
    }

    const parent = (cls.prototype as any).__proto__?.constructor as unknown as ToolOpConstructor;

    // eslint-disable-next-line no-prototype-builtins
    if (!cls.hasOwnProperty("STRUCT")) {
      if ((parent as unknown) !== ToolOp && (parent as unknown) !== ToolMacro && (parent as unknown) !== Object) {
        this._regWithNstructjs(parent);
      }

      (cls as unknown as Record<string, string>).STRUCT =
        nstructjs.inherit(
          cls as unknown as import("../util/nstructjs_es6.js").StructableClass,
          parent as unknown as import("../util/nstructjs_es6.js").StructableClass
        ) + "}\n";
    }

    nstructjs.register(cls as unknown as import("../util/nstructjs_es6.js").StructableClass);
  }

  static isRegistered(cls: ToolOpConstructor): boolean {
    return ToolClasses.includes(cls);
  }

  static unregister(cls: any): void {
    if (ToolClasses.includes(cls)) {
      (ToolClasses as unknown as unknown[]).remove(cls);
    }
  }

  static _getFinalToolDef(): ResolvedToolDef {
    const def = this.tooldef() as ResolvedToolDef;

    const getSlots = (
      slots: Record<string, ToolProperty> | InheritFlag | undefined,
      key: string
    ): Record<string, ToolProperty> => {
      if (slots === undefined) return {};

      if (!(slots instanceof InheritFlag)) {
        return slots as Record<string, ToolProperty>;
      }

      const result: Record<string, ToolProperty> = {};
      let p: ToolOpConstructor | undefined = this as unknown as ToolOpConstructor;

      while (p !== undefined && (p as unknown) !== Object && (p as unknown) !== ToolOp) {
        if (p.tooldef) {
          const pdef = p.tooldef();

          if (pdef[key] !== undefined) {
            let slots2: Record<string, ToolProperty> | InheritFlag = pdef[key] as
              | Record<string, ToolProperty>
              | InheritFlag;
            const stop = !(slots2 instanceof InheritFlag);

            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (const sk in slots2) {
              if (!(sk in result)) {
                result[sk] = (slots2 as Record<string, ToolProperty>)[sk];
              }
            }

            if (stop) {
              break;
            }
          }
        }
        p = (p.prototype as any).__proto__?.constructor as unknown as ToolOpConstructor | undefined;
      }

      return result;
    };

    const dinputs = getSlots(def.inputs as Record<string, ToolProperty> | InheritFlag | undefined, "inputs");
    const doutputs = getSlots(def.outputs as Record<string, ToolProperty> | InheritFlag | undefined, "outputs");

    def.inputs = dinputs;
    def.outputs = doutputs;

    return def;
  }

  static onTick(): void {
    for (const toolop of modalstack) {
      toolop.on_tick();
    }
  }

  static searchBoxOk<CTX extends ContextLike>(ctx: CTX): boolean {
    const flag = this.tooldef().flag;
    let ret = !(flag && flag & ToolFlags.PRIVATE);
    ret = ret && this.canRun(ctx);

    return ret;
  }

  //toolop is an optional instance of this class, may be undefined
  static canRun<CTX extends ContextLike>(_ctx: CTX, _toolop?: ToolOp | undefined): boolean {
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
      const props = (step ? this.outputs : this.inputs) as Record<string, ToolProperty>;

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
    const inputs = this.inputs as Record<string, ToolProperty>;

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
    return SavedToolDefaults.has(this.constructor as unknown as ToolOpConstructor, key, toolprop);
  }

  getDefault(toolprop: ToolProperty, key: string = toolprop.apiname ?? ""): unknown {
    const cls = this.constructor as unknown as ToolOpConstructor;

    if (SavedToolDefaults.has(cls, key, toolprop)) {
      return SavedToolDefaults.get(cls, key, toolprop);
    } else {
      return toolprop.getValue();
    }
  }

  saveDefaultInputs(): this {
    const inputs = this.inputs as Record<string, ToolProperty>;

    for (const k in inputs) {
      const prop = inputs[k];

      if (prop.flag & PropFlags.SAVE_LAST_VALUE) {
        SavedToolDefaults.set(this.constructor as unknown as ToolOpConstructor, k, prop);
      }
    }

    return this;
  }

  genToolString(): string {
    const def = (this.constructor as unknown as ToolOpConstructor).tooldef();
    let path = (def.toolpath || "") + "(";
    const inputs = this.inputs as Record<string, ToolProperty>;

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

  undoPre(_ctx: CTX): void {
    throw new Error("implement me!");
  }

  undo(_ctx: CTX): void {
    throw new Error("implement me!");
    //_appstate.loadUndoFile(this._undo);
  }

  redo(ctx: CTX): void {
    this._was_redo = true; //also set by toolstack.redo

    this.undoPre(ctx);
    this.execPre(ctx);
    this.exec(ctx);
    this.execPost(ctx);
  }

  //for compatibility with fairmotion
  exec_pre(ctx: CTX): void {
    this.execPre(ctx);
  }

  execPre(_ctx: CTX): void {}

  exec(_ctx: CTX): void {}

  execPost(_ctx: CTX): void {}

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
      this._overdraw.start((this.modal_ctx as Record<string, unknown>).screen);
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

  modalEnd(was_cancelled: boolean): void {
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

  loadSTRUCT(reader: (obj: Record<string, unknown>) => void): void {
    reader(this as unknown as Record<string, unknown>);

    const outs = this.outputs as unknown as { key: string; val: ToolProperty }[];
    const ins = this.inputs as unknown as { key: string; val: ToolProperty }[];

    this.inputs = {} as InputSlots;
    this.outputs = {} as OutputSlots;

    const inputsRec = this.inputs as Record<string, ToolProperty>;
    const outputsRec = this.outputs as Record<string, ToolProperty>;

    for (const pair of ins) {
      inputsRec[pair.key] = pair.val;
    }

    for (const pair of outs) {
      outputsRec[pair.key] = pair.val;
    }
  }

  _save_inputs(): PropKey[] {
    const ret: PropKey[] = [];
    const inputs = this.inputs as Record<string, ToolProperty>;
    for (const k in inputs) {
      ret.push(new PropKey(k, inputs[k]));
    }

    return ret;
  }

  _save_outputs(): PropKey[] {
    const ret: PropKey[] = [];
    const outputs = this.outputs as Record<string, ToolProperty>;
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
nstructjs.register(ToolOp as unknown as import("../util/nstructjs_es6.js").StructableClass);

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
nstructjs.register(PropKey as unknown as import("../util/nstructjs_es6.js").StructableClass);

/* ------------------------------------------------------------------ */
/*  MacroLink                                                         */
/* ------------------------------------------------------------------ */

export class MacroLink {
  static STRUCT: string;
  source: number;
  dest: number;
  sourceProps: string;
  destProps: string;
  sourcePropKey: string;
  destPropKey: string;

  constructor(
    sourcetool_idx: number,
    srckey: string,
    srcprops: string = "outputs",
    desttool_idx: number,
    dstkey: string,
    dstprops: string = "inputs"
  ) {
    this.source = sourcetool_idx;
    this.dest = desttool_idx;

    this.sourceProps = srcprops;
    this.destProps = dstprops;

    this.sourcePropKey = srckey;
    this.destPropKey = dstkey;
  }
}

MacroLink.STRUCT = `
toolsys.MacroLink {
  source         : int;
  dest           : int;
  sourcePropKey  : string;
  destPropKey    : string;
  sourceProps    : string;
  destProps      : string;
}
`;
nstructjs.register(MacroLink);

export const MacroClasses: Record<string, MacroClassType> = {};

let macroidgen: number = 0;

/* ------------------------------------------------------------------ */
/*  ToolMacro                                                         */
/* ------------------------------------------------------------------ */

interface ConnectCB {
  srctool: ToolOp;
  dsttool: ToolOp;
  callback: (src: ToolOp, dst: ToolOp) => void;
  thisvar: unknown;
}

export class ToolMacro<CTX extends ContextLike, ModalCTX extends CTX = CTX> extends ToolOp<any, any, CTX, ModalCTX> {
  static override STRUCT: string;

  tools: ToolOp[];
  curtool: number;
  has_modal: boolean;
  connects: ConnectCB[];
  connectLinks: MacroLink[];
  private _macro_class: MacroClassType | undefined;

  constructor() {
    super();

    this.tools = [];
    this.curtool = 0;
    this.has_modal = false;
    this.connects = [];
    this.connectLinks = [];

    this._macro_class = undefined;
  }

  static override tooldef(): ToolDef {
    return {
      uiname: "Tool Macro",
    };
  }

  //toolop is an optional instance of this class, may be undefined
  static override canRun<CTX extends ContextLike = ContextLike>(_ctx: CTX, _toolop?: ToolOp | undefined): boolean {
    return true;
  }

  _getTypeClass(): MacroClassType {
    if (this._macro_class?.ready) {
      return this._macro_class;
    }

    if (!this._macro_class) {
      this._macro_class = class MacroTypeClass extends ToolOp {
        static override tooldef(): ToolDef {
          return (this as unknown as MacroClassType).__tooldef as unknown as ToolDef;
        }
      } as unknown as MacroClassType;

      this._macro_class.__tooldef = {
        toolpath: (this.constructor as unknown as ToolOpConstructor).tooldef().toolpath || "",
      };
      this._macro_class.ready = false;
    }

    if (!this.tools || this.tools.length === 0) {
      /* We've been invoked by ToolOp constructor,
       *  for now just return an empty class  */
      return this._macro_class;
    }

    let key = "";
    for (const tool of this.tools) {
      key = tool.constructor.name + ":";
    }

    /* Handle child classes of ToolMacro */
    if (this.constructor !== ToolMacro) {
      key += ":" + (this.constructor as unknown as ToolOpConstructor).tooldef().toolpath;
    }

    for (const k in this.inputs) {
      key += k + ":";
    }

    if (key in MacroClasses) {
      this._macro_class = MacroClasses[key];
      return this._macro_class;
    }

    let name = "Macro(";
    let i = 0;
    let is_modal: boolean | undefined;

    for (const tool of this.tools) {
      const def = (tool.constructor as unknown as ToolOpConstructor).tooldef();

      if (i > 0) {
        name += ", ";
      } else {
        is_modal = def.is_modal;
      }

      if (def.uiname) {
        name += def.uiname;
      } else if (def.toolpath) {
        name += def.toolpath;
      } else {
        name += tool.constructor.name;
      }

      i++;
    }

    const inputs: Record<string, ToolProperty> = {};
    const selfInputs = this.inputs as Record<string, ToolProperty>;

    for (const k in selfInputs) {
      inputs[k] = selfInputs[k].copy().clearEventCallbacks();
      inputs[k].wasSet = false;
    }

    const tdef: Record<string, unknown> = {
      uiname  : name,
      toolpath: key,
      inputs,
      outputs: {},
      is_modal,
    };

    const cls = this._macro_class;
    cls.__tooldef = tdef;
    cls._macroTypeId = macroidgen++;
    cls.ready = true;

    /*
    let cls = {
      name : key,
      tooldef() {
        return tdef
      },
      _getFinalToolDef() {
        return this.tooldef();
      }
    };//*/

    MacroClasses[key] = cls;

    return cls;
  }

  override saveDefaultInputs(): this {
    const inputs = this.inputs as Record<string, ToolProperty>;

    for (const k in inputs) {
      const prop = inputs[k];

      if (prop.flag & PropFlags.SAVE_LAST_VALUE) {
        SavedToolDefaults.set(this._getTypeClass(), k, prop);
      }
    }

    return this;
  }

  override hasDefault(toolprop: ToolProperty, key: string = toolprop.apiname ?? ""): boolean {
    return SavedToolDefaults.has(this._getTypeClass(), key, toolprop);
  }

  override getDefault(toolprop: ToolProperty, key: string = toolprop.apiname ?? ""): unknown {
    const cls = this._getTypeClass();

    if (SavedToolDefaults.has(cls, key, toolprop)) {
      return SavedToolDefaults.get(cls, key, toolprop);
    } else {
      return toolprop.getValue();
    }
  }

  connect(
    srctool: ToolOp,
    srcoutput: string | ((src: ToolOp, dst: ToolOp) => void),
    dsttool: ToolOp | unknown,
    dstinput?: string | unknown,
    srcprops: string = "outputs",
    dstprops: string = "inputs"
  ): this {
    if (typeof dsttool === "function") {
      return this.connectCB(
        srctool,
        srcoutput as unknown as ToolOp,
        dsttool as (src: ToolOp, dst: ToolOp) => void,
        dstinput
      );
    }

    const i1 = this.tools.indexOf(srctool);
    const i2 = this.tools.indexOf(dsttool as ToolOp);

    if (i1 < 0 || i2 < 0) {
      throw new Error("tool not in macro");
    }

    //remove linked properties from this.inputs
    const selfInputs = this.inputs as Record<string, ToolProperty>;

    if (srcprops === "inputs") {
      const tool = this.tools[i1];
      const toolInputs = tool.inputs as Record<string, ToolProperty>;

      const prop = toolInputs[srcoutput as string];
      if (prop === selfInputs[srcoutput as string]) {
        delete selfInputs[srcoutput as string];
      }
    }

    if (dstprops === "inputs") {
      const tool = this.tools[i2];
      const toolInputs = tool.inputs as Record<string, ToolProperty>;
      const prop = toolInputs[dstinput as string];

      if (selfInputs[dstinput as string] === prop) {
        delete selfInputs[dstinput as string];
      }
    }

    this.connectLinks.push(new MacroLink(i1, srcoutput as string, srcprops, i2, dstinput as string, dstprops));
    return this;
  }

  connectCB(srctool: ToolOp, dsttool: ToolOp, callback: (src: ToolOp, dst: ToolOp) => void, thisvar: unknown): this {
    this.connects.push({
      srctool : srctool,
      dsttool : dsttool,
      callback: callback,
      thisvar : thisvar,
    });

    return this;
  }

  add(tool: ToolOp): this {
    if (tool.is_modal) {
      this.is_modal = true;
    }

    const toolInputs = tool.inputs as Record<string, ToolProperty>;
    const selfInputs = this.inputs as Record<string, ToolProperty>;

    for (const k in toolInputs) {
      const prop = toolInputs[k];

      if (!(prop.flag & PropFlags.PRIVATE)) {
        selfInputs[k] = prop;
      }
    }

    this.tools.push(tool);

    return this;
  }

  _do_connections(tool: ToolOp): void {
    const i = this.tools.indexOf(tool);

    for (const c of this.connectLinks) {
      if (c.source === i) {
        const tool2 = this.tools[c.dest];

        (tool2 as unknown as Record<string, Record<string, ToolProperty>>)[c.destProps][c.destPropKey].setValue(
          (tool as unknown as Record<string, Record<string, ToolProperty>>)[c.sourceProps][c.sourcePropKey].getValue()
        );
      }
    }

    for (const c2 of this.connects) {
      if (c2.srctool === tool) {
        c2.callback.call(c2.thisvar, c2.srctool, c2.dsttool);
      }
    }
  }

  /*
  canRun(ctx) {
    if (this.tools.length == 0)
      return false;

    //poll first tool only in list
    return this.tools[0].constructor.canRun(ctx);
  }//*/

  override modalStart(ctx: ModalCTX): Promise<unknown> {
    //macros obviously can't call loadDefaults in the constructor
    //like normal tool ops can.
    this.loadDefaults(false);

    this._promise = new Promise((accept: Function, reject: Function) => {
      this._accept = accept as (ctx: unknown, wasCancelled: boolean) => void;
      this._reject = reject as (reason?: unknown) => void;
    });

    this.curtool = 0;

    let i: number;

    for (i = 0; i < this.tools.length; i++) {
      if (this.tools[i].is_modal) break;

      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }

    const on_modal_end = () => {
      this._do_connections(this.tools[this.curtool]);
      this.curtool++;

      while (this.curtool < this.tools.length && !this.tools[this.curtool].is_modal) {
        this.tools[this.curtool].undoPre(ctx);
        this.tools[this.curtool].execPre(ctx);
        this.tools[this.curtool].exec(ctx);
        this.tools[this.curtool].execPost(ctx);
        this._do_connections(this.tools[this.curtool]);

        this.curtool++;
      }

      if (this.curtool < this.tools.length) {
        this.tools[this.curtool].undoPre(ctx);
        this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
      } else {
        this._accept!(this, false);
      }
    };

    if (i < this.tools.length) {
      this.curtool = i;
      this.tools[this.curtool].undoPre(ctx);
      this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
    }

    return this._promise;
  }

  override loadDefaults(force: boolean = true): this {
    return super.loadDefaults(force);
  }

  override exec(ctx: CTX): void {
    //macros obviously can't call loadDefaults in the constructor
    //like normal tool ops can.
    //note that this will detect if the user changes property values

    this.loadDefaults(false);

    for (let i = 0; i < this.tools.length; i++) {
      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }
  }

  override calcUndoMem(_ctx: CTX): number {
    let tot = 0;

    for (const tool of this.tools) {
      tot += tool.calcUndoMem(_ctx);
    }

    return tot;
  }

  override calcMemSize(ctx: CTX): number {
    let tot = 0;

    for (const tool of this.tools) {
      tot += tool.calcMemSize(ctx);
    }

    return tot;
  }

  override undoPre(): void {
    return; //undoPre is handled in exec() or modalStart()
  }

  override undo(ctx: CTX): void {
    for (let i = this.tools.length - 1; i >= 0; i--) {
      this.tools[i].undo(ctx);
    }
  }
}

ToolMacro.STRUCT =
  nstructjs.inherit(
    ToolMacro as unknown as import("../util/nstructjs_es6.js").StructableClass,
    ToolOp as unknown as import("../util/nstructjs_es6.js").StructableClass,
    "toolsys.ToolMacro"
  ) +
  `
  tools        : array(abstract(toolsys.ToolOp));
  connectLinks : array(toolsys.MacroLink);
}
`;
nstructjs.register(ToolMacro as unknown as import("../util/nstructjs_es6.js").StructableClass);

/* ------------------------------------------------------------------ */
/*  ToolStack                                                         */
/* ------------------------------------------------------------------ */

// we can't ContextLike due to cyclic dependency
// created with the TS default in ContextLike itself
export class ToolStack<
  ContextCls extends ContextLike = ContextLike,
  ModalContextCls extends ContextCls = ContextCls,
> extends Array<ToolOp<any, any, ContextCls, ModalContextCls>> {
  static STRUCT: string;

  memLimit!: number;
  enforceMemLimit!: boolean;
  cur!: number;
  ctx: ContextCls;
  modalRunning!: number;
  modal_running!: boolean;
  toolctx?: ContextCls;
  _undo_branch: ToolOp[] | undefined;
  _stack!: this[0][];

  constructor(ctx: ContextCls) {
    super();

    this.memLimit = 512 * 1024 * 1024;
    this.enforceMemLimit = false;

    this.cur = -1;
    this.ctx = ctx;

    this.modalRunning = 0;

    this._undo_branch = undefined; //used to save undo branch in case of tool cancel
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

  execTool(ctx: ContextCls | ModalContextCls, toolop: this[0] | ToolOpAny, event?: PointerEvent): void {
    if (this.enforceMemLimit) {
      this.limitMemory(this.memLimit, ctx as ContextCls);
    }

    if (
      !(toolop.constructor as unknown as ToolOpConstructor).canRun<ContextCls, ModalContextCls>(
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

    let undoflag = (toolop.constructor as unknown as ToolOpConstructor).tooldef().undoflag;
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
    nstructjs.writeObject(data, this as unknown as Record<string, unknown>);
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
  replay(cb?: (ctx: ContextCls) => unknown, onStep?: () => unknown): Promise<unknown> {
    this.rewind();

    let last = this.cur;

    const start = util.time_ms();

    return new Promise((accept, reject) => {
      const next = () => {
        last = this.cur;

        if (cb && cb(this.ctx) === false) {
          accept(undefined);
          return;
        }

        if (this.cur < this.length) {
          this.cur++;
          this.rerun(this[this.cur]);
        }

        if (last === this.cur) {
          console.warn("time:", (util.time_ms() - start) / 1000.0);
          accept(this);
        } else {
          if (onStep) {
            const ret = onStep();

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
        }
      };

      next();
    });
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);

    for (const item of this._stack) {
      this.push(item);
    }

    delete (this as Record<string, unknown>)._stack;
  }

  //note that this makes sure tool classes are registered with nstructjs
  //during save
  _save(): this {
    for (const tool of this) {
      const cls = tool.constructor as unknown as ToolOpConstructor;

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

/*
(window as any)._testToolStackIO = function (): ToolStack {
  let data: number[] = [];
  let cls = ((window as Window)._appstate as Record<string, unknown>).toolstack!
    .constructor as unknown as import("../util/nstructjs_es6.js").StructableClass;

  nstructjs.writeObject(
    data,
    ((window as Window)._appstate as Record<string, unknown>).toolstack as Record<string, unknown>
  );
  let dataView = new DataView(new Uint8Array(data).buffer);

  let toolstack = nstructjs.readObject(dataView, cls) as unknown as ToolStack;

  (((window as Window)._appstate as Record<string, unknown>).toolstack as ToolStack).rewind();

  toolstack.cur = -1;
  toolstack.ctx = (((window as Window)._appstate as Record<string, unknown>).toolstack as ToolStack).ctx;
  ((window as Window)._appstate as Record<string, unknown>).toolstack = toolstack;

  return toolstack;
};
*/

/* ------------------------------------------------------------------ */
/*  API builders                                                      */
/* ------------------------------------------------------------------ */

export function buildToolOpAPI(api: DataAPI, cls: ToolOpConstructor): unknown {
  const st = api.mapStruct(cls, true);
  const def = cls._getFinalToolDef();

  function makeProp(k: string): void {
    const prop = def.inputs[k];

    if (prop.flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY)) {
      return;
    }

    prop.uiname = prop.uiname || ToolProperty.makeUIName(k);

    const dpath = new DataPath(k, k, prop);
    st.add(dpath);

    dpath.customGetSet(
      function (this: { dataref: ToolOp }) {
        return (this.dataref.inputs as Record<string, ToolProperty>)[k].getValue();
      },
      function (this: { dataref: ToolOp }, val: unknown) {
        (this.dataref.inputs as Record<string, ToolProperty>)[k].setValue(val);
      }
    );
  }

  for (const k in def.inputs) {
    makeProp(k);
  }

  return st;
}

/**
 * Call this to build the tool property cache data binding API.
 *
 * If rootCtxClass is not undefined and insertToolDefaultsIntoContext is true
 * then ".toolDefaults" will be automatically added to rootCtxClass's prototype
 * if necessary.
 */
export function buildToolSysAPI(
  api: DataAPI,
  registerWithNStructjs: boolean = true,
  rootCtxStruct?: DataStruct,
  rootCtxClass?: (new (arg: Record<string, unknown>) => unknown) | undefined,
  insertToolDefaultsIntoContext: boolean = true
): void {
  const datastruct = api.mapStruct(ToolPropertyCache, true);

  for (const cls of ToolClasses) {
    const def = cls._getFinalToolDef();

    buildToolOpAPI(api, cls);

    for (const k in def.inputs) {
      const prop = def.inputs[k];

      if (!(prop.flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY))) {
        SavedToolDefaults._buildAccessors(
          cls,
          k,
          prop,
          datastruct as unknown as Record<string, unknown>,
          api as unknown as Record<string, unknown>
        );
      }
    }
  }

  if (rootCtxStruct) {
    rootCtxStruct.struct("toolDefaults", "toolDefaults", "Tool Defaults", api.mapStruct(ToolPropertyCache));
    rootCtxStruct.dynamicStruct("last_tool", "last_tool", "Last Tool");
  }

  if (rootCtxClass && insertToolDefaultsIntoContext) {
    const inst = new rootCtxClass({}) as Record<string | symbol, unknown>;

    function haveprop(k: string | symbol): boolean {
      return (
        Reflect.ownKeys(inst).includes(k) ||
        Reflect.ownKeys(rootCtxClass!.prototype as Record<string, unknown>).includes(k)
      );
    }

    if (!haveprop("last_tool")) {
      Object.defineProperty(rootCtxClass.prototype, "last_tool", {
        get(this: Record<string, unknown>) {
          return (this.toolstack as ToolStack).head;
        },
      });

      if (Context.isContextSubclass(rootCtxClass)) {
        (rootCtxClass.prototype as Record<string, unknown>).last_tool_save = () => ({});
        (rootCtxClass.prototype as Record<string, unknown>).last_tool_load = () => undefined;
      }
    }

    if (!haveprop("toolDefaults")) {
      Object.defineProperty(rootCtxClass.prototype, "toolDefaults", {
        get() {
          return SavedToolDefaults;
        },
      });

      if (Context.isContextSubclass(rootCtxClass)) {
        (rootCtxClass.prototype as Record<string, unknown>).toolDefaults_save = () => ({});
        (rootCtxClass.prototype as Record<string, unknown>).toolDefaults_load = () => undefined;
      }
    }
  }

  if (!registerWithNStructjs) {
    return;
  }

  //register tools with nstructjs
  for (const cls of ToolClasses) {
    try {
      if (!nstructjs.isRegistered(cls as unknown as import("../util/nstructjs_es6.js").StructableClass)) {
        ToolOp._regWithNstructjs(cls);
      }
    } catch (error) {
      console.log((error as Error).stack);
      console.error("Failed to register a tool with nstructjs");
    }
  }
}
