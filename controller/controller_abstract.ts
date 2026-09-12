import { print_stack } from "../util/util";

import { PropFlags, PropTypes } from "../toolsys/toolprop_abstract";
import {
  ToolPropertyTypes,
  VecPropertyTypes,
  isVecProperty,
  ToolDef,
  ToolOp,
  ToolProperty,
  ToolRefusedError,
} from "../toolsys";
import { DataList, DataPath, DataPathError } from "./controller_base";
import { defaultRegistry } from "../toolsys/toolregistry";
import { Parser, splitToolPath } from "../toolsys/toolpath_parser";
import type { ParseToolPathResult } from "../toolsys/toolpath_parser";
import type { ToolRegistry } from "../toolsys/toolregistry";
import { notifyPathChange } from "./pathwatch";
import type { DataAPI, DataStruct } from "./controller";
import type { Screen } from "../../screen/FrameManager";

export type ToolOpAny = ToolOp<any, any, any, any> | ToolOp;

/** A refused tool is an expected outcome of an unexpected route, so it reports as a sentence. */
function reportToolError(error: unknown): void {
  if (ToolRefusedError.is(error)) {
    console.warn(`could not run "${error.toolpath ?? "tool"}": ${error.reason}`);
    return;
  }

  print_stack(error as Error);
}

// this interface exists to avoid circular type references, bleh
export interface IToolStack {
  head: Promise<ToolOpAny | undefined>;
  /** The same op as `head`, without the wait. */
  headOp: ToolOpAny | undefined;
  /** True while an operation holds the lock. */
  readonly locked: boolean;
  [k: number]: ToolOpAny;
  length: number;
  cur: number;
  limitMemory(maxmem?: number, ctx?: unknown): number;
  calcMemSize(ctx?: unknown): number;
  setRestrictedToolContext(ctx: unknown): void;
  reset(ctx?: unknown): void;
  execOrRedo(ctx: unknown, tool: ToolOpAny, compareInputs?: boolean): Promise<boolean>;
  execTool(ctx: unknown, toolop: ToolOpAny, event?: PointerEvent): Promise<void>;
  /** Runs the op, or folds it into a matching head; true when it pushed. */
  foldOrExec(ctx: unknown, toolop: ToolOpAny): Promise<boolean>;
  toolCancel(ctx: unknown, toolop: ToolOpAny): void;
  undo(ctx: unknown): Promise<void>;
  redo(ctx: unknown): Promise<void>;
  rerun(tool?: ToolOpAny): Promise<void>;
  save(): number[];
  rewind(): Promise<this>;
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
export interface ResolvePathResult {
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

/** What a merged toolpath resolves to, and which registry supplied it. */
export interface ToolPathEntry {
  cls: typeof ToolOp;
  registry: ToolRegistry;
}

export class ModelInterface<CTX extends ContextLike = ContextLike> {
  prefix: string;

  private _registries: ToolRegistry[];

  /** Built on demand from `_registries`, and dropped whenever one of them changes. */
  private _toolPaths: Map<string, ToolPathEntry> | undefined;

  constructor() {
    this.prefix = "";
    this._registries = [defaultRegistry];
  }

  /**
   * The tool tables this api resolves toolpaths and tool defaults against, in the order
   * they are merged. Listing a second registry is how a subsystem gets its own namespace
   * without losing the built-ins, and two APIs may order the same two registries
   * differently.
   */
  get registries(): ToolRegistry[] {
    return this._registries;
  }

  set registries(registries: ToolRegistry[]) {
    this._registries = [...registries];
    this.invalidateToolPaths();
  }

  /** The first listed registry. Assigning replaces it rather than the whole list. */
  get registry(): ToolRegistry {
    return this._registries[0];
  }

  set registry(registry: ToolRegistry) {
    this._registries[0] = registry;
    this.invalidateToolPaths();
  }

  /**
   * Every toolpath the listed registries offer, merged in list order. A toolpath names
   * one tool within one api, which is what makes the bare string usable as an identity.
   */
  get toolPaths(): ReadonlyMap<string, ToolPathEntry> {
    if (this._toolPaths === undefined) {
      this._toolPaths = this._mergeToolPaths();
    }

    return this._toolPaths;
  }

  /** Whether the defaults tree still describes what the listed registries hold. */
  protected _toolDefaultsDirty = true;

  /**
   * Drops the merged table, so the next read rebuilds it. The defaults tree is derived
   * from the same table, so it owes a rebuild too.
   */
  invalidateToolPaths(): void {
    this._toolPaths = undefined;
    this.invalidateToolDefaults();
  }

  /** Marks the defaults tree as owing a rebuild, which the next read does. */
  invalidateToolDefaults(): void {
    this._toolDefaultsDirty = true;
  }

  /**
   * Merging is also the collision scan, which is why a stale table is dropped and rebuilt
   * rather than rescanned in place: a rescan cannot see a duplicate it introduces.
   */
  private _mergeToolPaths(): Map<string, ToolPathEntry> {
    const merged = new Map<string, ToolPathEntry>();
    const macroKeys = new Set<string>();

    const claim = (path: string, cls: typeof ToolOp, registry: ToolRegistry, macro: boolean) => {
      const held = merged.get(path);

      if (held === undefined) {
        merged.set(path, { cls, registry });
        if (macro) {
          macroKeys.add(path);
        }
        return;
      }

      // A macro key is structural, so two registries holding one is two macros of the
      // same shape and the first stands. Everything else has no principled winner
      if (macro || macroKeys.has(path)) {
        return;
      }

      // Not a DataPathError: `parseToolPath` answers undefined for one of those, and a
      // collision is a wiring mistake rather than a path that does not resolve
      throw new Error(
        `two registries offer the tool "${path}": ` +
          `${held.registry.structName} and ${registry.structName}`
      );
    };

    for (const registry of this._registries) {
      const paths = registry.ensurePaths();

      for (const path in paths) {
        claim(path, paths[path], registry, false);
      }

      for (const key in registry.macros) {
        const cls = registry.macros[key];

        // The bootstrap class the ToolOp constructor asks for carries no shape yet
        if (cls.ready) {
          claim(key, cls as unknown as typeof ToolOp, registry, true);
        }
      }
    }

    return merged;
  }

  /**
   * Resolves `"some.tool(a=1)"` against the merged table. A miss rebuilds it first, since
   * a registry that never had `buildAPI` run against it cannot have said it changed.
   */
  resolveToolPath(str: string, checkExists: boolean = true): ParseToolPathResult {
    const { path, argsStr } = splitToolPath(str);

    let entry = this.toolPaths.get(path);

    if (entry === undefined) {
      this.invalidateToolPaths();
      entry = this.toolPaths.get(path);
    }

    if (entry === undefined && checkExists) {
      throw new DataPathError("unknown tool " + path);
    }

    let args: Record<string, unknown>;

    try {
      args = Parser.parse(argsStr) as Record<string, unknown>;
    } catch (error) {
      console.log(error);
      throw new DataPathError(`"${str}"
  ${(error as Error).message}`);
    }

    if (entry !== undefined) {
      // Parsed here for validation; the invoke static parses them again
      args = entry.cls.parseArgs(args);
    }

    return { toolclass: entry?.cls, args };
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

  /**
   *  Note: modal tools resolve on aquiring the modal stack,
   *  not tool modal end.
   */
  execTool<T extends ToolOpAny | unknown = unknown>(
    ctx: CTX,
    path: string | (T extends ToolOpAny ? T : ToolOpAny),
    inputs?: T extends ToolOpAny ? Partial<ReturnType<T["getInputs"]>> : Record<string, any>,
    unused?: unknown,
    event?: PointerEvent | undefined,
    resolveBeforeRun = false
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

      if (resolveBeforeRun) {
        //give client a chance to change tool instance directly
        accept(tool);
      }

      //execute
      try {
        if (!resolveBeforeRun) {
          // have tool resolve after execution
          ctx.toolstack
            .execTool(ctx, tool, event)
            .then(() => accept(tool))
            .catch(reject);
        } else {
          // The caller already has the instance, so nothing else can receive this rejection
          ctx.toolstack.execTool(ctx, tool, event).catch(reportToolError);
        }
      } catch (error) {
        //for some reason chrome is suppressing errors
        reportToolError(error);
        reject(error);
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
  ): ResolvePathResult | undefined {
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
      notifyPathChange(path);
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

    notifyPathChange(path);
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

    return prop.description ? prop.description : (prop.uiname ?? "");
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
