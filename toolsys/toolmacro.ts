"use strict";
import nstructjs from "../util/struct";

import { StructableClass, StructReader } from "../util/nstructjs";
import { SavedToolDefaults } from "./tooldefaults";
import { PropFlags, ToolProperty } from "./toolprop";
import { IToolOpConstructor, ResolvedToolDef, ToolDef, ToolOp } from "./toolop";
import { ContextLike, ToolOpAny } from "../controller/controller_abstract";
export const MacroClasses: Record<string, MacroClassType> = {};

const asyncCheck = async (p: unknown) => (p instanceof Promise ? await p : undefined);

/** Runtime-generated macro class shape */
export type MacroClassType = (new () => ToolOp) & {
  __tooldef: Record<string, unknown>;
  ready: boolean;
  _macroTypeId?: number;
  tooldef(): ToolDef;
  _getFinalToolDef(): ResolvedToolDef;
  name: string;
  STRUCT?: string;
};

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

export class MacroLink {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    toolsys.MacroLink {
      source         : int;
      dest           : int;
      sourcePropKey  : string;
      destPropKey    : string;
      sourceProps    : string;
      destProps      : string;
    }
    `
  );

  source: number;
  dest: number;
  sourceProps: string;
  destProps: string;
  sourcePropKey: string;
  destPropKey: string;

  constructor(
    sourcetool_idx?: number,
    srckey?: string,
    srcprops: string = "outputs",
    desttool_idx?: number,
    dstkey?: string,
    dstprops: string = "inputs"
  ) {
    // note: nstructjs requires constructors take no required arguments
    this.source = sourcetool_idx ?? -1;
    this.dest = desttool_idx ?? -1;

    this.sourceProps = srcprops;
    this.destProps = dstprops;

    this.sourcePropKey = srckey ?? "";
    this.destPropKey = dstkey ?? "";
  }

  loadSTRUCT(reader: StructReader<this>) {
    reader(this);
  }
}

export class ToolMacro<CTX extends ContextLike, ModalCTX extends CTX = CTX> extends ToolOp<
  any,
  any,
  CTX,
  ModalCTX
> {
  static override STRUCT: string;
  // Flag indicating this class is a ToolMacro
  // used to break a cyclical dependency between ToolMacro and ToolOp
  static _IsToolMacro = true;

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
  static override canRun(_ctx: ContextLike, _toolop?: ToolOp | undefined): boolean {
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
        toolpath: (this.constructor as unknown as IToolOpConstructor).tooldef().toolpath || "",
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
      key += ":" + (this.constructor as unknown as IToolOpConstructor).tooldef().toolpath;
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
      const def = (tool.constructor as unknown as IToolOpConstructor).tooldef();

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
    const selfInputs = this.inputs;

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
    const inputs = this.inputs;

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
    const selfInputs = this.inputs;

    if (srcprops === "inputs") {
      const tool = this.tools[i1];
      const toolInputs = tool.inputs as any;

      const prop = toolInputs[srcoutput as string] as ToolProperty;
      if (prop === selfInputs[srcoutput as string]) {
        delete selfInputs[srcoutput as string];
      }
    }

    if (dstprops === "inputs") {
      const tool = this.tools[i2];
      const toolInputs = tool.inputs as any;
      const prop = toolInputs[dstinput as string] as ToolProperty;

      if (selfInputs[dstinput as string] === prop) {
        delete selfInputs[dstinput as string];
      }
    }

    this.connectLinks.push(
      new MacroLink(i1, srcoutput as string, srcprops, i2, dstinput as string, dstprops)
    );
    return this;
  }

  connectCB(
    srctool: ToolOp,
    dsttool: ToolOp,
    callback: (src: ToolOp, dst: ToolOp) => void,
    thisvar: unknown
  ): this {
    this.connects.push({
      srctool : srctool,
      dsttool : dsttool,
      callback: callback,
      thisvar : thisvar,
    });

    return this;
  }

  add(tool: ToolOpAny): this {
    if (tool.is_modal) {
      this.is_modal = true;
    }

    const toolInputs = tool.inputs as any;
    const selfInputs = this.inputs as any;

    for (const k in toolInputs) {
      const prop = toolInputs[k];

      if (!(prop.flag & PropFlags.PRIVATE)) {
        selfInputs[k] = prop;
      }
    }

    this.tools.push(tool);

    return this;
  }

  _do_connections(_tool: ToolOp): void {
    const i = this.tools.indexOf(_tool);

    // type erase tool
    const tool = _tool as any;
    for (const c of this.connectLinks) {
      if (c.source === i) {
        const tool2 = this.tools[c.dest] as any;
        tool2[c.destProps][c.destPropKey].setValue(tool[c.sourceProps][c.sourcePropKey].getValue());
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

  /** Note: resolves when the modalEnd is called */
  override async modalStart(ctx: ModalCTX): Promise<unknown> {
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

      await asyncCheck(this.tools[i].undoPre(ctx));
      await asyncCheck(this.tools[i].execPre(ctx));
      await asyncCheck(this.tools[i].exec(ctx));
      await asyncCheck(this.tools[i].execPost(ctx));
      this._do_connections(this.tools[i]);
    }

    const on_modal_end = async () => {
      this._do_connections(this.tools[this.curtool]);
      this.curtool++;

      while (this.curtool < this.tools.length && !this.tools[this.curtool].is_modal) {
        await asyncCheck(this.tools[this.curtool].undoPre(ctx));
        await asyncCheck(this.tools[this.curtool].execPre(ctx));
        await asyncCheck(this.tools[this.curtool].exec(ctx));
        await asyncCheck(this.tools[this.curtool].execPost(ctx));
        this._do_connections(this.tools[this.curtool]);

        this.curtool++;
      }

      if (this.curtool < this.tools.length) {
        await asyncCheck(this.tools[this.curtool].undoPre(ctx));
        this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
      } else {
        this._accept!(this, false);
      }
    };

    if (i < this.tools.length) {
      this.curtool = i;
      await asyncCheck(this.tools[this.curtool].undoPre(ctx));
      this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
    }

    return await this._promise;
  }

  override loadDefaults(force: boolean = true): this {
    return super.loadDefaults(force);
  }

  override async exec(ctx: CTX): Promise<void> {
    //macros obviously can't call loadDefaults in the constructor
    //like normal tool ops can.
    //note that this will detect if the user changes property values

    this.loadDefaults(false);

    for (let i = 0; i < this.tools.length; i++) {
      await asyncCheck(this.tools[i].undoPre(ctx));
      await asyncCheck(this.tools[i].execPre(ctx));
      await asyncCheck(this.tools[i].exec(ctx));
      await asyncCheck(this.tools[i].execPost(ctx));
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

  override async undo(ctx: CTX): Promise<void> {
    for (let i = this.tools.length - 1; i >= 0; i--) {
      await asyncCheck(this.tools[i].undo(ctx));
    }
  }
}

ToolMacro.STRUCT =
  nstructjs.inherit(
    ToolMacro as unknown as StructableClass,
    ToolOp as unknown as StructableClass,
    "toolsys.ToolMacro"
  ) +
  `
  tools        : array(abstract(toolsys.ToolOp));
  connectLinks : array(toolsys.MacroLink);
}
`;
nstructjs.register(ToolMacro as unknown as StructableClass);
