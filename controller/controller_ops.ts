import { ToolOp, ToolFlags } from "../toolsys/toolsys.js";
import type { FlagProperty, ToolProperty } from "../toolsys/toolprop.js";
import {
  PropTypes,
  PropFlags,
  BoolProperty,
  IntProperty,
  FloatProperty,
  EnumProperty,
  StringProperty,
} from "../toolsys/toolprop.js";

import * as util from "../util/util.js";
import { ContextLike } from "./controller_abstract.js";

type DataPathSetInputs = {
  dataPath: StringProperty;
  massSetPath: StringProperty;
  fullSaveUndo: BoolProperty;
  flagBit: IntProperty;
  useFlagBit: BoolProperty;
  destType: EnumProperty;
  prop: ToolProperty;
  [k: string]: ToolProperty;
};

export class DataPathSetOp<CTX extends ContextLike = ContextLike> extends ToolOp<DataPathSetInputs, {}, CTX> {
  propType: number;
  _undo: Record<string, unknown> | undefined;
  hadError: boolean;
  id: unknown;
  __ctx?: CTX;

  constructor() {
    super();

    this.propType = -1;
    this._undo = undefined;
    this.hadError = false;
  }

  setValue(ctx: CTX, val: unknown, object: unknown): void {
    const prop = this.inputs.prop;
    const path = this.inputs.dataPath.getValue() as string;

    if (prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
      const rdef = ctx.api.resolvePath(ctx, path);
      if (rdef?.subkey !== undefined) {
        let subkey: unknown = rdef.subkey;
        if (typeof subkey === "string") {
          subkey = (rdef.prop as unknown as EnumProperty).values[subkey];
        }

        this.inputs.flagBit.setValue(subkey as number);
        this.inputs.useFlagBit.setValue(true);
      }
    }

    using execCtx = prop.execWithContext();
    execCtx.dataref = object;
    execCtx.ctx = ctx;
    execCtx.datapath = path;

    try {
      prop.setValue(val);
      this.hadError = false;
    } catch (_error) {
      console.error("Error setting datapath", path);
      this.hadError = true;
    }
  }

  static create<CTX extends ContextLike>(
    ctx: CTX,
    datapath: string,
    value: unknown,
    id: unknown,
    massSetPath?: string
  ): DataPathSetOp<CTX> | undefined {
    const rdef = ctx.api.resolvePath(ctx, datapath);

    if (rdef?.prop === undefined) {
      console.warn("DataPathSetOp failed", rdef, rdef?.prop);
      return;
    }

    const prop = rdef.prop;
    const tool = new DataPathSetOp<CTX>();

    tool.propType = prop.type;
    tool.inputs.destType.setValue(prop.type);

    if (prop && prop.flag & PropFlags.USE_BASE_UNDO) {
      tool.inputs.fullSaveUndo.setValue(true);
    }

    let mask = PropTypes.FLAG | PropTypes.ENUM;
    mask |= PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT;

    if (rdef.subkey !== undefined && prop.type & mask) {
      if (prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        let i = datapath.length - 1;

        //chop off enum selector
        while (i >= 0 && datapath[i] !== "[" && datapath[i] !== "=") {
          i--;
        }

        if (i >= 0) {
          if (!value && prop.type === PropTypes.ENUM) {
            /* This is a no-op. */
            return undefined;
          }

          datapath = datapath.slice(0, i).trim();
        }

        tool.inputs.prop = new IntProperty();
      } else {
        tool.inputs.prop = new FloatProperty();
      }

      let subkey: unknown = rdef.subkey;
      if (typeof subkey !== "number" && prop.type & (PropTypes.ENUM | PropTypes.FLAG)) {
        // fetch the key from the enum/flag value
        subkey = (prop as unknown as EnumProperty).values[subkey as string];
      }

      if (prop.type === PropTypes.FLAG) {
        tool.inputs.flagBit.setValue(subkey as number);
        tool.inputs.useFlagBit.setValue(true);
      }

      if (prop.type === PropTypes.ENUM) {
        value = subkey;
      } else if (prop.type === PropTypes.FLAG) {
        let value2 = ctx.api.getValue(ctx, datapath) as unknown;

        if (typeof value2 !== "number") {
          value2 = typeof value2 === "boolean" ? (value as number) & 1 : 0;
        }

        if (value) {
          value2 = (value2 as number) | (subkey as number);
        } else {
          value2 = (value2 as number) & ~(subkey as number);
        }

        value = value2;
      }
    } else {
      (tool.inputs as Record<string, unknown>).prop = (prop as { copy(): unknown }).copy();
    }

    tool.inputs.dataPath.setValue(datapath);

    if (massSetPath) {
      tool.inputs.massSetPath.setValue(massSetPath);
    } else {
      tool.inputs.massSetPath.setValue("");
    }

    tool.id = id;

    tool.setValue(ctx, value, rdef.obj);
    return tool;
  }

  hash(massSetPath: string | undefined | null, dataPath: string, prop: unknown, id: unknown): string {
    massSetPath = massSetPath === undefined ? "" : massSetPath;
    massSetPath = massSetPath === null ? "" : massSetPath;

    const ret = "" + massSetPath + ":" + dataPath + ":" + prop + ":" + id;

    return ret;
  }

  hashThis(): string {
    return this.hash(
      this.inputs.massSetPath.getValue() as string,
      this.inputs.dataPath.getValue() as string,
      this.propType,
      this.id
    );
  }

  undoPre(ctx: CTX): void {
    if (this.inputs.fullSaveUndo.getValue()) {
      return super.undoPre(ctx);
    }

    if (this.__ctx) ctx = this.__ctx;

    this._undo = {};

    let paths = new Set<string>();

    if ((this.inputs.massSetPath.getValue() as string).trim()) {
      const massSetPath = (this.inputs.massSetPath.getValue() as string).trim();

      paths = new Set(ctx.api.resolveMassSetPaths(ctx, massSetPath) as string[]);
    }

    paths.add(this.inputs.dataPath.getValue() as string);

    for (const path of paths) {
      let val = ctx.api.getValue(ctx, path) as unknown;

      if (typeof val === "object" && val !== null) {
        val = (val as { copy(): unknown }).copy();
      }

      this._undo[path] = val;
    }
  }

  undo(ctx: CTX): void {
    if (this.__ctx) ctx = this.__ctx as CTX;

    if (this.inputs.fullSaveUndo.getValue()) {
      return super.undo(ctx);
    }

    for (const path in this._undo) {
      const rdef = ctx.api.resolvePath(ctx, path);

      if (rdef !== undefined && (rdef.prop?.type ?? 0) & (PropTypes.ENUM | PropTypes.FLAG)) {
        const old = (rdef.obj as Record<string, unknown>)[rdef.key as string];

        if (rdef.subkey) {
          let key: unknown = rdef.subkey;
          const prop = rdef.prop as unknown as EnumProperty | FlagProperty;

          if (typeof key !== "number") {
            key = prop.values[key as string];
          }

          if (prop.type === PropTypes.FLAG) {
            if (this._undo![path]) {
              rdef.obj[rdef.key as string] |= key as number;
            } else {
              rdef.obj[rdef.key as string] &= ~(key as number);
            }
          } else {
            rdef.obj[rdef.key as string] = key;
          }
        } else {
          rdef.obj[rdef.key as string] = this._undo![path];
        }

        const rprop = rdef.prop as ToolProperty;

        using execCtx = rprop.execWithContext();
        execCtx.dataref = rdef.obj;
        execCtx.datapath = path;
        execCtx.ctx = ctx;

        rprop._fire("change", (rdef.obj as Record<string, unknown>)[rdef.key as string], old);
      } else {
        try {
          ctx.api.setValue(ctx, path, this._undo![path]);
        } catch (error) {
          util.print_stack(error as Error);
          console.warn("Failed to set property in undo for DataPathSetOp");
        }
      }
    }
  }

  exec(ctx: CTX): void {
    //use saved ctx we got from modal start
    if (this.__ctx) {
      ctx = this.__ctx;
    }

    const path = this.inputs.dataPath.getValue() as string;
    const massSetPath = (this.inputs.massSetPath.getValue() as string).trim();

    try {
      ctx.api.setValue(ctx, path, this.inputs.prop.getValue());
      this.hadError = false;
    } catch (error) {
      console.log((error as Error).stack);
      console.log((error as Error).message);
      console.log("error setting " + path);

      this.hadError = true;
    }

    if (massSetPath) {
      let value = this.inputs.prop.getValue() as number;
      const useFlagBit = this.inputs.useFlagBit.getValue() as boolean;

      if (useFlagBit && (this.inputs.destType.getValue() as number) === PropTypes.FLAG) {
        const bit = this.inputs.flagBit.getValue() as number;

        value = !!(value & bit) as unknown as number;
      }
      try {
        ctx.api.massSetProp(ctx, massSetPath, value);
      } catch (error) {
        console.log((error as Error).stack);
        console.log((error as Error).message);
        console.log("error setting " + path);

        this.hadError = true;
      }
    }
  }

  modalStart(ctx: CTX) {
    if (ctx.toLocked === undefined) {
      console.warn("Warning: no toLocked in context class, this may lead to subtle undo behaviours");
      console.warn("  (ctx locking creates a copy with values of the context at the time it as locked)");
    }
    this.__ctx = (ctx.toLocked ? ctx.toLocked() : ctx) as typeof this.__ctx;

    //save full, modal ctx
    const result = super.modalStart(this.__ctx!);

    this.exec(this.__ctx!);
    this.modalEnd(false);
    return result;
  }

  static tooldef() {
    return {
      uiname  : "Property Set",
      toolpath: "app.prop_set",
      icon    : -1,
      flag    : ToolFlags.PRIVATE,
      is_modal: true,
      inputs: {
        dataPath    : new StringProperty(),
        massSetPath : new StringProperty(),
        fullSaveUndo: new BoolProperty(false),
        flagBit     : new IntProperty(),
        useFlagBit  : new BoolProperty(),
        destType    : new EnumProperty(PropTypes.INT, PropTypes),
      },
    };
  }
}

ToolOp.register(DataPathSetOp as unknown as Parameters<typeof ToolOp.register>[0]);
