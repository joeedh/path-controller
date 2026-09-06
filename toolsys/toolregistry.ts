import { DataPath, DataPathError } from "../controller/controller_base";
import type { DataAPI, DataStruct } from "../controller";
import { PropFlags, ToolProperty } from "./toolprop";
import { SavedToolDefaults, ToolPropertyCache } from "./tooldefaults";
import type { IToolOpConstructor, ToolOp } from "./toolop";
import type { MacroClassType } from "./toolmacro";
import { Parser } from "./toolpath_parser";
import type { ParseToolPathResult } from "./toolpath_parser";

/**
 * Marks the registry a class belongs to. A symbol so it cannot collide with a tooldef
 * field, and so nothing that walks a class's keys picks it up.
 */
const REGISTRY_KEY = Symbol("toolRegistry");

/** A tool class carrying the mark `register` leaves on it. */
type Stamped = { [REGISTRY_KEY]?: ToolRegistry };

/**
 * The tool tables on an object, so a subsystem can be handed its own set.
 *
 * `defaultRegistry` holds the ones the module-level `ToolClasses`, `ToolPaths`,
 * `MacroClasses` and `SavedToolDefaults` name, by identity rather than by copy, and is
 * the only registry in play until a caller builds a second. There is no parent chaining
 * and no disposal.
 */
export class ToolRegistry {
  readonly classes: IToolOpConstructor[] = [];
  readonly paths: Record<string, typeof ToolOp> = {};
  readonly macros: Record<string, MacroClassType> = {};

  /** Saved input values, keyed by toolpath rather than by class. */
  readonly defaults: ToolPropertyCache;

  /** Whether `initToolPaths` has walked `classes` into `paths` yet. */
  pathsScanned = false;

  /**
   * Next macro type id. Every registry carries the counter, but `_getTypeClass` only
   * ever advances `defaultRegistry`'s, because ids repeating across registries would
   * collide inside a saved file.
   */
  macroIdGen = 0;

  constructor(defaults: ToolPropertyCache = new ToolPropertyCache()) {
    this.defaults = defaults;
  }

  register(cls: IToolOpConstructor): void {
    if (this.classes.includes(cls)) {
      console.warn("Tried to register same ToolOp class twice:", cls.name, cls);
      return;
    }

    this.classes.push(cls);
    this.stamp(cls);
    this.updateDefaults(cls);
  }

  /**
   * Marks `cls` as belonging here. The `ToolOp` constructor reads defaults and has no
   * ctx to reach a registry through, so the class itself has to carry the answer.
   *
   * Macro type classes never reach `register`, so `_getTypeClass` calls this directly.
   */
  stamp(cls: IToolOpConstructor | MacroClassType): void {
    (cls as Stamped)[REGISTRY_KEY] = this;
  }

  unregister(cls: IToolOpConstructor): void {
    if (this.classes.includes(cls)) {
      (this.classes as unknown as unknown[]).remove(cls);
    }

    // Another registry's claim on the class is not ours to drop, and an inherited mark
    // belongs to the parent rather than to `cls`
    if (
      Object.prototype.hasOwnProperty.call(cls, REGISTRY_KEY) &&
      (cls as Stamped)[REGISTRY_KEY] === this
    ) {
      delete (cls as Stamped)[REGISTRY_KEY];
    }
  }

  isRegistered(cls: IToolOpConstructor): boolean {
    return this.classes.includes(cls);
  }

  /** Walks the registered classes into the toolpath map. */
  initPaths(): void {
    for (const cls of this.classes) {
      if (!Object.prototype.hasOwnProperty.call(cls, "tooldef")) {
        //ignore abstract classes
        continue;
      }

      const def = cls.tooldef();
      this.paths[def.toolpath as string] = cls as unknown as typeof ToolOp;
    }
  }

  /** Resolves `"some.tool(a=1 b='x')"` to the class and its parsed arguments. */
  parseToolPath(str: string, checkExists: boolean = true): ParseToolPathResult {
    if (!this.pathsScanned) {
      this.pathsScanned = true;
      this.initPaths();
    }

    const startstr = str;

    const i1 = str.search(/\(/);
    const i2 = str.search(/\)/);
    let argsStr = "";

    if (i1 >= 0 && i2 >= 0) {
      argsStr = str.slice(i1 + 1, i2).trim();
      str = str.slice(0, i1).trim();
    }

    // The scan above runs once, so an addon enabled later registers its ToolOps
    // behind it: a miss means the map may be stale, not that the tool is absent.
    if (!(str in this.paths)) {
      this.initPaths();
    }

    if (!(str in this.paths) && checkExists) {
      throw new DataPathError("unknown tool " + str);
    }

    let args: Record<string, unknown>;

    try {
      args = Parser.parse(argsStr) as Record<string, unknown>;
    } catch (error) {
      console.log(error);
      throw new DataPathError(`"${startstr}"\n  ${(error as Error).message}`);
    }

    const toolclass = this.paths[str];

    if (toolclass !== undefined) {
      // note: we parse args here for validation,
      // args are also parsed in the invoke static method.
      args = toolclass.parseArgs(args);
    }

    return {
      toolclass,
      args,
    };
  }

  /** Builds the accessors this registry's defaults cache reads `cls`'s inputs through. */
  updateDefaults(cls: IToolOpConstructor, api?: DataAPI, datastruct?: DataStruct): void {
    const def = cls._getFinalToolDef();

    if (datastruct === undefined) {
      datastruct = this.defaults.dstruct;
    }
    if (api === undefined) {
      api = this.defaults.api;
    }

    if (datastruct === undefined || api === undefined) {
      // buildToolSysAPI has not run, so there is nowhere to build them yet
      return;
    }

    this.buildOpAPI(api, cls);

    for (const k in def.inputs) {
      const prop = def.inputs[k];

      if (!(prop.flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY))) {
        this.defaults._buildAccessors(cls, k, prop, datastruct, api);
      }
    }
  }

  /** Gives `cls` a struct whose paths read and write a live op's inputs. */
  buildOpAPI(api: DataAPI, cls: IToolOpConstructor): unknown {
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
        // we can type erase here safely,
        // since this is part of a strongly typed
        // runtime type system
        function (this: { dataref: ToolOp }) {
          return (this.dataref.inputs as any)[k].getValue();
        },
        function (this: { dataref: ToolOp }, val: unknown) {
          (this.dataref.inputs as any)[k].setValue(val);
        }
      );
    }

    for (const k in def.inputs) {
      makeProp(k);
    }

    return st;
  }
}

/**
 * The registry every module-level tool table names. It takes `SavedToolDefaults` rather
 * than building a cache of its own, which keeps `tooldefaults.ts` free of any import of
 * this module and so keeps the two out of a module-scope cycle.
 */
export const defaultRegistry = new ToolRegistry(SavedToolDefaults);

/**
 * The registry `cls` was registered into, or the default one when it was registered
 * nowhere. A subclass inherits its parent's answer through the static prototype chain,
 * deliberately: an unregistered subclass belongs wherever its parent does, and falling
 * back to the default registry instead would send it to a different one's defaults.
 */
export function registryOf(cls: IToolOpConstructor | MacroClassType): ToolRegistry {
  return (cls as Stamped)[REGISTRY_KEY] ?? defaultRegistry;
}

/** The saved input values `cls` reads its defaults out of. */
export function defaultsFor(cls: IToolOpConstructor | MacroClassType): ToolPropertyCache {
  return registryOf(cls).defaults;
}
