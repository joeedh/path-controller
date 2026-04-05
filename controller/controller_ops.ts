import { ToolOp, ToolFlags } from "../toolsys/toolsys.js";
import type { ToolProperty } from "../toolsys/toolprop.js";
import {
  PropTypes,
  PropFlags,
  BoolProperty,
  IntProperty,
  FloatProperty,
  FlagProperty,
  EnumProperty,
  StringProperty,
  Vec3Property,
  Vec2Property,
  Vec4Property,
  QuatProperty,
  Mat4Property,
} from "../toolsys/toolprop.js";

import * as util from "../util/util.js";
import { isVecProperty, getVecClass } from "./controller_base.js";
import { IControllerContextBase } from "./context.js";

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

export class DataPathSetOp<CTX extends IControllerContextBase = IControllerContextBase> extends ToolOp<DataPathSetInputs, {}, CTX> {
  propType: number;
  _undo: Record<string, unknown> | undefined;
  hadError: boolean;
  id: unknown;
  __ctx?: CTX

  constructor() {
    super();

    this.propType = -1;
    this._undo = undefined;
    this.hadError = false;
  }

  setValue(ctx: CTX, val: unknown, object: unknown): void {
    let prop = this.inputs.prop as unknown as Record<string, unknown>;
    let path = this.inputs.dataPath.getValue() as string;

    if ((prop.type as number) & (PropTypes.ENUM | PropTypes.FLAG)) {
      let rdef = ctx.api.resolvePath(ctx, path) as Record<string, unknown>;
      if (rdef.subkey !== undefined) {
        let subkey: unknown = rdef.subkey;
        if (typeof subkey === "string") {
          subkey = (rdef.prop as Record<string, Record<string, unknown>>).values[subkey];
        }

        this.inputs.flagBit.setValue(subkey as number);
        this.inputs.useFlagBit.setValue(true);
      }
    }

    prop.dataref = object;
    prop.ctx = ctx;
    prop.datapath = path;

    try {
      (prop as { setValue(v: unknown): void }).setValue(val);
      this.hadError = false;
    } catch (_error) {
      console.error("Error setting datapath", path);
      this.hadError = true;
    }
  }

  static create<CTX extends IControllerContextBase>(
    ctx: CTX,
    datapath: string,
    value: unknown,
    id: unknown,
    massSetPath?: string
  ): DataPathSetOp<CTX> | undefined {
    let rdef = ctx.api.resolvePath(ctx, datapath)

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("DataPathSetOp failed", rdef, rdef?.prop);
      return;
    }

    let prop = rdef.prop as Record<string, unknown>;
    let tool = new DataPathSetOp();

    tool.propType = prop.type as number;
    tool.inputs.destType.setValue(prop.type as number);

    if (prop && (prop.flag as number) & PropFlags.USE_BASE_UNDO) {
      tool.inputs.fullSaveUndo.setValue(true);
    }

    let mask = PropTypes.FLAG | PropTypes.ENUM;
    mask |= PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT;

    if (rdef.subkey !== undefined && (prop.type as number) & mask) {
      if ((prop.type as number) & (PropTypes.ENUM | PropTypes.FLAG)) {
        let i = datapath.length - 1;

        //chop off enum selector
        while (i >= 0 && datapath[i] !== "[" && datapath[i] !== "=") {
          i--;
        }

        if (i >= 0) {
          if (!value && (prop.type as number) === PropTypes.ENUM) {
            /* This is a no-op. */
            return undefined;
          }

          datapath = datapath.slice(0, i).trim();
        }

        (tool.inputs as Record<string, unknown>).prop = new IntProperty();
      } else {
        (tool.inputs as Record<string, unknown>).prop = new FloatProperty();
      }

      let subkey: unknown = rdef.subkey;
      if (typeof subkey !== "number") {
        subkey = (prop as Record<string, Record<string, unknown>>).values[subkey as string];
      }

      if ((prop.type as number) === PropTypes.FLAG) {
        tool.inputs.flagBit.setValue(subkey as number);
        tool.inputs.useFlagBit.setValue(true);
      }

      if ((prop.type as number) === PropTypes.ENUM) {
        value = subkey;
      } else if ((prop.type as number) === PropTypes.FLAG) {
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

    let ret = "" + massSetPath + ":" + dataPath + ":" + prop + ":" + id;

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

    if (this.__ctx) ctx = this.__ctx 

    this._undo = {};

    let paths = new Set<string>();

    if ((this.inputs.massSetPath.getValue() as string).trim()) {
      let massSetPath = (this.inputs.massSetPath.getValue() as string).trim();

      paths = new Set((ctx.api as Record<string, Function>).resolveMassSetPaths(ctx, massSetPath) as string[]);
    }

    paths.add(this.inputs.dataPath.getValue() as string);

    for (let path of paths) {
      let val = (ctx.api as Record<string, Function>).getValue(ctx, path) as unknown;

      if (typeof val === "object" && val !== null) {
        val = (val as { copy(): unknown }).copy();
      }

      this._undo[path] = val;
    }
  }

  undo(ctx: Record<string, unknown>): void {
    if (this.__ctx) ctx = this.__ctx as unknown as Record<string, unknown>;

    if (this.inputs.fullSaveUndo.getValue()) {
      return super.undo(ctx);
    }

    for (let path in this._undo) {
      let rdef = (ctx.api as Record<string, Function>).resolvePath(ctx, path) as Record<string, unknown>;

      if (
        rdef.prop !== undefined &&
        ((rdef.prop as Record<string, unknown>).type as number) & (PropTypes.ENUM | PropTypes.FLAG)
      ) {
        let old = (rdef.obj as Record<string, unknown>)[rdef.key as string];

        if (rdef.subkey) {
          let key: unknown = rdef.subkey;

          if (typeof key !== "number") {
            key = (rdef.prop as Record<string, Record<string, unknown>>).values[key as string];
          }

          if ((rdef.prop as Record<string, unknown>).type === PropTypes.FLAG) {
            if (this._undo![path]) {
              (rdef.obj as Record<string, number>)[rdef.key as string] |= key as number;
            } else {
              (rdef.obj as Record<string, number>)[rdef.key as string] &= ~(key as number);
            }
          } else {
            (rdef.obj as Record<string, unknown>)[rdef.key as string] = key;
          }
        } else {
          (rdef.obj as Record<string, unknown>)[rdef.key as string] = this._undo![path];
        }

        let rprop = rdef.prop as Record<string, unknown>;
        rprop.dataref = rdef.obj;
        rprop.datapath = path;
        rprop.ctx = ctx;

        (rprop as Record<string, Function>)._fire(
          "change",
          (rdef.obj as Record<string, unknown>)[rdef.key as string],
          old
        );
      } else {
        try {
          (ctx.api as Record<string, Function>).setValue(ctx, path, this._undo![path]);
        } catch (error) {
          util.print_stack(error as Error);
          console.warn("Failed to set property in undo for DataPathSetOp");
        }
      }
    }
  }

  exec(ctx: Record<string, unknown>): void {
    //use saved ctx we got from modal start
    if (this.__ctx) {
      ctx = this.__ctx as unknown as Record<string, unknown>;
    }

    let path = this.inputs.dataPath.getValue() as string;
    let massSetPath = (this.inputs.massSetPath.getValue() as string).trim();

    try {
      (ctx.api as Record<string, Function>).setValue(ctx, path, this.inputs.prop.getValue());
      this.hadError = false;
    } catch (error) {
      console.log((error as Error).stack);
      console.log((error as Error).message);
      console.log("error setting " + path);

      this.hadError = true;
    }

    if (massSetPath) {
      let value = this.inputs.prop.getValue() as number;
      let useFlagBit = this.inputs.useFlagBit.getValue() as boolean;

      if (useFlagBit && (this.inputs.destType.getValue() as number) === PropTypes.FLAG) {
        let bit = this.inputs.flagBit.getValue() as number;

        value = !!(value & bit) as unknown as number;
      }
      try {
        (ctx.api as Record<string, Function>).massSetProp(ctx, massSetPath, value);
      } catch (error) {
        console.log((error as Error).stack);
        console.log((error as Error).message);
        console.log("error setting " + path);

        this.hadError = true;
      }
    }
  }

  modalStart(ctx: CTX) {
    super.modalStart
    this.__ctx = (ctx as { toLocked(): unknown }).toLocked() as typeof this.__ctx;

    //save full, modal ctx
    const result = super.modalStart(this.__ctx!);

    this.exec(this.__ctx as unknown as Record<string, unknown>);
    this.modalEnd(false);
    return result
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
