import { print_stack } from "../util/util";
import { PropFlags, PropTypes } from "../toolsys/toolprop_abstract";
import {
  ToolPropertyTypes,
  VecPropertyTypes,
  isVecProperty,
  ToolDef,
  ToolOp,
  ToolProperty,
} from "../toolsys";
import { DataList, DataPath, DataPathError } from "./controller_base";
import type { DataAPI, DataStruct } from "./controller";
import type { Screen } from "../../screen/FrameManager";

export type ToolOpAny = ToolOp<any, any, any, any> | ToolOp;

// this interface exists to avoid circular type references, bleh
export interface IToolStack {
  head?: ToolOpAny;
  [k: number]: ToolOpAny;
  length: number;
  cur: number;
  limitMemory(maxmem?: number, ctx?: unknown): number;
  calcMemSize(ctx?: unknown): number;
  setRestrictedToolContext(ctx: unknown): void;
  reset(ctx?: unknown): void;
  execOrRedo(ctx: unknown, tool: ToolOpAny, compareInputs?: boolean): boolean;
  execTool(ctx: unknown, toolop: ToolOpAny, event?: PointerEvent): void;
  toolCancel(ctx: unknown, toolop: ToolOpAny): void;
  undo(ctx: unknown): void;
  redo(ctx: unknown): void;
  rerun(tool?: ToolOpAny): void;
  save(): number[];
  rewind(): this;
  replay(cb?: (ctx: unknown) => unknown, onStep?: () => unknown): Promise<unknown>;
}

export interface ContextLike<AppState = any, TS extends IToolStack = IToolStack> {
  state: AppState;
  api: DataAPI<this>;
  toolstack: TS;
  toLocked?(): this;
  screen: Screen<this>;
}

/**
 * Result of resolvePath().
 */
export interface ResolvePathResult<CTX extends ContextLike = ContextLike> {
  dpath: DataPath;
  parent: any;
  obj: any;
  value: any;
  key: string;
  dstruct: DataStruct;
  prop?: ToolPropertyTypes;
  subkey?: string | number;
  mass_set?: string;
}

export class ModelInterface<CTX extends ContextLike = ContextLike> {
  prefix: string;

  constructor() {
    this.prefix = "";
  }

  getToolDef(path: string): ToolDef | undefined {
    throw new Error("implement me");
  }

  getToolPathHotkey(ctx: CTX, path: string): string | undefined {
    return undefined;
  }

  createTool<T extends ToolOp = ToolOp>(
    ctxOrPath: ContextLike | string,
    pathOrInputs?: string | Record<string, unknown>,
    inputsOrUnused?: Record<string, unknown> | unknown,
    unused?: unknown
  ): T {
    throw new Error("implement me");
  }

  //returns tool class, or undefined if one cannot be found for path
  parseToolPath(path: string): typeof ToolOp | undefined {
    throw new Error("implement me");
  }

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  execOrRedo(ctx: CTX, toolop: ToolOp, compareInputs: boolean = false): unknown {
    return ctx.toolstack.execOrRedo(ctx, toolop, compareInputs);
  }

  execTool<T extends ToolOpAny | unknown = unknown>(
    ctx: CTX,
    path: string | (T extends ToolOpAny ? T : ToolOpAny),
    inputs?: T extends ToolOpAny ? Partial<ReturnType<T["getInputs"]>> : Record<string, any>,
    unused?: unknown,
    event?: PointerEvent | undefined
  ): Promise<T extends ToolOpAny ? T : ToolOpAny> {
    type Tool = T extends ToolOpAny ? T : ToolOpAny;

    return new Promise((accept, reject) => {
      let tool: string | Tool = path;

      try {
        if (typeof tool == "string" || !(tool instanceof ToolOp)) {
          tool = this.createTool<Tool>(ctx, tool as string, inputs, unused);
        }
      } catch (error) {
        print_stack(error as Error);
        reject(error);
        return;
      }

      if (typeof path !== "string") {
        // assign inputs since we didn't go through createTool
        for (const k in inputs) {
          if (!(k in tool.inputs)) {
            console.warn('Unknown tool property "' + k + '"', "in tool", tool);
            continue;
          }
          tool.inputs[k].setValue(inputs[k]);
        }
      }

      //give client a chance to change tool instance directly
      accept(tool);

      //execute
      try {
        ctx.toolstack.execTool(ctx, tool, event);
      } catch (error) {
        //for some reason chrome is suppressing errors
        print_stack(error as Error);
        throw error;
      }
    });
  }

  //used by simple_controller.js for tagging error messages
  pushReportContext(name: string): void {}

  //used by simple_controller.js for tagging error messages
  popReportContext(): void {}

  static toolRegistered(tool: typeof ToolOp): boolean {
    throw new Error("implement me");
  }

  static registerTool(tool: typeof ToolOp): void {
    throw new Error("implement me");
  }

  //not yet supported by path.ux's controller implementation
  massSetProp(ctx: CTX, mass_set_path: string, value: unknown): void {
    throw new Error("implement me");
  }

  /** takes a mass_set_path and returns an array of individual paths */
  resolveMassSetPaths(ctx: CTX, mass_set_path: string): string[] {
    throw new Error("implement me");
  }

  /**
   * @example
   *
   * return {
   *   obj      : [object owning property key]
   *   parent   : [parent of obj]
   *   key      : [property key]
   *   subkey   : used by flag properties, represents a key within the property
   *   value    : [value of property]
   *   prop     : [optional toolprop.ToolProperty representing the property definition]
   *   struct   : [optional datastruct representing the type, if value is an object]
   *   mass_set : mass setter string, if controller implementation supports it
   * }
   */
  resolvePath(
    ctx: CTX,
    path: string,
    ignoreExistence?: boolean,
    rootStruct?: unknown
  ): ResolvePathResult<CTX> | undefined {
    return undefined;
  }

  setValue<T = unknown>(ctx: CTX, path: string, val: T, rootStruct?: unknown): void {
    const res = this.resolvePath(ctx, path, undefined, rootStruct)!;
    const prop = res.prop;

    if (prop !== undefined && prop.flag & PropFlags.READ_ONLY) {
      throw new DataPathError("Tried to set read only property");
    }

    if (prop !== undefined && prop.flag & PropFlags.USE_CUSTOM_GETSET) {
      using execCtx = prop.execWithContext();
      execCtx.dataref = res.obj;
      execCtx.ctx = ctx;
      execCtx.datapath = path;

      if (res.subkey !== undefined) {
        let val2: any = prop.getValue();
        if (typeof val2 === "object" && val2 !== null && "copy" in val2) {
          val2 = (val2 as { copy(): unknown }).copy();
        }

        if (prop.type === PropTypes.FLAG) {
          if (val) {
            val2 = (val2 as number) | prop.values[res.subkey];
          } else {
            val2 = (val2 as number) & ~prop.values[res.subkey];
          }

          val = val2;
        } else if (prop.type === PropTypes.ENUM) {
          val = prop.values[res.subkey!] as T;
        } else {
          val2[res.subkey] = val;
          val = val2;
        }
      }

      // @ts-expect-error TS is resolving the type union'd
      // ToolPropertyTypes.setValue's argument to `never`
      prop.setValue(val);
      return;
    }

    if (prop !== undefined) {
      if (prop.type === PropTypes.CURVE && !val) {
        throw new DataPathError("can't set curve data to nothing");
      }

      let use_range: boolean | number = prop.type & (PropTypes.INT | PropTypes.FLOAT);

      use_range =
        use_range ||
        (res.subkey ? prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4) : 0);
      use_range = use_range && prop.range ? 1 : 0;
      use_range =
        use_range && prop.range !== undefined && !(prop.range[0] === 0.0 && prop.range[1] === 0.0)
          ? 1
          : 0;
      use_range = use_range && typeof val === "number" ? 1 : 0;

      if (use_range && prop.range !== undefined) {
        val = Math.min(Math.max(val as number, prop.range[0]), prop.range[1]) as T;
      }
    }

    const old = res.obj[res.key];

    if (res.subkey !== undefined && res.prop?.type === PropTypes.ENUM) {
      const ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] = ival;
      }
    } else if (res.prop?.type === PropTypes.FLAG) {
      if (res.subkey !== undefined) {
        const ival = res.prop.values[res.subkey];

        if (val) {
          res.obj[res.key] = (res.obj[res.key] as number) | ival;
        } else {
          res.obj[res.key] = (res.obj[res.key] as number) & ~ival;
        }
      } else if (typeof val === "number" || typeof val === "boolean") {
        val = (typeof val === "boolean" ? (val as unknown as number) & 1 : val) as T;

        res.obj[res.key] = val;
      } else {
        throw new DataPathError("Expected a number for a bitmask property");
      }
    } else if (res.subkey !== undefined && isVecProperty(res.prop)) {
      if (res.key !== "") {
        (res.obj[res.key] as Record<string, unknown>)[res.subkey] = val;
      } else {
        res.obj[res.subkey] = val;
      }
    } else if (res.key === "" && isVecProperty(res.prop)) {
      for (let i = 0; i < (res.obj as unknown as unknown[]).length; i++) {
        (res.obj as Record<number, unknown>)[i] = (val as Record<number, unknown>)[i];
      }
    } else if (!(prop !== undefined && prop instanceof DataList)) {
      res.obj[res.key] = val;
    }

    if (prop !== undefined && prop instanceof DataList) {
      prop.set(this, res.obj, res.key, val);
    } else if (prop !== undefined) {
      using execCtx = prop.execWithContext();
      execCtx.dataref = res.obj;
      execCtx.datapath = path;
      execCtx.ctx = ctx;

      prop._fire("change", res.obj[res.key], old);
    }
  }

  getDescription(ctx: CTX, path: string): string {
    const rdef = this.resolvePath(ctx, path);
    if (rdef === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    if (!rdef.prop || !(rdef.prop instanceof ToolProperty)) {
      return "";
    }

    const prop = rdef.prop as ToolPropertyTypes;

    if (rdef.subkey !== undefined) {
      let subkey: string | number = rdef.subkey;

      if (
        prop.type !== undefined &&
        prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)
      ) {
        if (typeof subkey === "string") {
          subkey = parseInt(subkey);
        }

        const vecProp = prop as VecPropertyTypes;
        if (vecProp.descriptions && subkey in vecProp.descriptions) {
          return vecProp.descriptions[subkey];
        }
      } else if (prop.type === PropTypes.ENUM || prop.type === PropTypes.FLAG) {
        if (!(subkey in prop.values) && subkey in prop.keys) {
          subkey = prop.keys[subkey as keyof typeof prop.keys];
        }
        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (prop.type === PropTypes.PROPLIST) {
        const val = rdef.value;
        if (typeof val === "object" && val instanceof ToolProperty) {
          return val.description ?? "";
        }
      }
    }

    return prop.description ? prop.description : prop.uiname ?? "";
  }

  validPath(ctx: CTX, path: string, rootStruct?: unknown): boolean {
    try {
      this.getValue(ctx, path, rootStruct);
      return true;
    } catch (error) {
      if (!(error instanceof DataPathError)) {
        throw error;
      }
    }

    return false;
  }

  getPropName(ctx: CTX, path: string): string {
    let i = path.length - 1;
    while (i >= 0 && path[i] !== ".") {
      i--;
    }

    path = path.slice(i + 1, path.length).trim();

    if (path.endsWith("]")) {
      i = path.length - 1;
      while (i >= 0 && path[i] !== "[") {
        i--;
      }

      path = path.slice(0, i).trim();

      return this.getPropName(ctx, path);
    }

    return path;
  }

  getValue<T = unknown>(ctx: CTX, path: string, rootStruct?: T): T | undefined {
    if (typeof ctx == "string") {
      throw new Error("You forgot to pass context to getValue");
    }

    const ret = this.resolvePath(ctx, path, undefined, rootStruct);

    if (ret === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    let exec: boolean | number =
      ret.prop !== undefined && ret.prop.flag & PropFlags.USE_CUSTOM_GETSET;

    //resolvePath handles the case of vector properties with custom callbacks for us
    //(and possibly all the other cases too, need to check)
    exec =
      exec &&
      !(
        ret.prop?.type !== undefined &&
        ret.prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4 | PropTypes.QUAT)
      );

    if (exec) {
      const prop = ret.prop!;

      // set up `this` context for any getter callbacks
      let val: unknown;
      {
        using execCtx = prop.execWithContext();
        execCtx.dataref = ret.obj;
        execCtx.datapath = path;
        execCtx.ctx = ctx;
        val = prop.getValue();
      }

      if (prop.type === PropTypes.ENUM || prop.type === PropTypes.FLAG) {
        if (typeof val === "string" && val in prop.values) {
          val = prop.values[val as keyof typeof prop.values];
        }
      }

      if (ret.subkey && prop.type === PropTypes.ENUM) {
        val = val === prop.values[ret.subkey];
      } else if (ret.subkey && prop.type === PropTypes.FLAG) {
        val = (val as number) & prop.values[ret.subkey];
      }

      return val as T;
    }

    return ret.value;
  }
}
