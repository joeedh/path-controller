import { DataPath, DataPathError } from "../controller/controller_base";
import type { DataAPI, DataStruct } from "../controller";
import { PropFlags, ToolProperty } from "./toolprop";
import { SavedToolDefaults, ToolPropertyCache } from "./tooldefaults";
import type { IToolOpConstructor, ToolOp } from "./toolop";
import type { MacroClassType } from "./toolmacro";
import { Parser, splitToolPath } from "./toolpath_parser";
import type { ParseToolPathResult } from "./toolpath_parser";

/**
 * Marks the registry a class belongs to. A symbol so it cannot collide with a tooldef
 * field, and so nothing that walks a class's keys picks it up.
 */
const REGISTRY_KEY = Symbol("toolRegistry");

/** A tool class carrying the mark `register` leaves on it. */
type Stamped = { [REGISTRY_KEY]?: ToolRegistry };

/** Names the struct of a registry that was not given one. See `structName`. */
let structNameGen = 0;

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

  /**
   * Names this registry in a diagnostic, such as the duplicate-toolpath error. Once the
   * defaults struct became the api's there is nothing left for it to name in a struct
   * table, so it no longer has to differ between registries — but it still does, since a
   * message naming two registries the same would say nothing.
   */
  readonly structName: string;

  /**
   * The APIs `buildAPI` has run against. Weak because `defineGraphApi`-style callers build
   * one per pane, and a strong list would pin every closed pane's struct graph.
   */
  private readonly _builtAPIs: WeakRef<DataAPI>[] = [];

  constructor(defaults: ToolPropertyCache = new ToolPropertyCache(), structName?: string) {
    this.defaults = defaults;
    this.structName = structName ?? `ToolPropertyCache.${++structNameGen}`;

    if (defaults.registry !== undefined) {
      console.warn(
        "A ToolPropertyCache belongs to one registry; this one already had",
        defaults.registry
      );
    }
    defaults.registry = this;
  }

  /** The APIs built against this registry, dropping any that have been collected. */
  apis(): DataAPI[] {
    const live: DataAPI[] = [];
    let kept = 0;

    for (const ref of this._builtAPIs) {
      const api = ref.deref();

      if (api !== undefined) {
        this._builtAPIs[kept++] = ref;
        live.push(api);
      }
    }

    this._builtAPIs.length = kept;
    return live;
  }

  register(cls: IToolOpConstructor): void {
    if (this.classes.includes(cls)) {
      console.warn("Tried to register same ToolOp class twice:", cls.name, cls);
      return;
    }

    this.classes.push(cls);
    this.stamp(cls);
    this._setPath(cls, cls as unknown as typeof ToolOp);
    this.updateDefaults(cls);
    this.notifyToolPaths();
  }

  /**
   * Keeps `paths` level with `classes` across one registration. Only once the scan has
   * run: before that `ensurePaths` walks the whole list anyway.
   */
  private _setPath(cls: IToolOpConstructor, value: typeof ToolOp | undefined): void {
    if (!this.pathsScanned || !Object.prototype.hasOwnProperty.call(cls, "tooldef")) {
      return;
    }

    const path = cls.tooldef().toolpath as string;

    if (value === undefined) {
      // Another class may have taken the path over, and dropping that one is not ours
      if (this.paths[path] === (cls as unknown as typeof ToolOp)) {
        delete this.paths[path];
      }
      return;
    }

    this.paths[path] = value;
  }

  /**
   * Tells every api built against this registry that its merged toolpath table no longer
   * describes what is here. The table rebuilds on its next read, which is also where a
   * duplicate across two registries is caught.
   */
  notifyToolPaths(): void {
    for (const api of this.apis()) {
      api.invalidateToolPaths();
    }
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

    this._setPath(cls, undefined);
    this.notifyToolPaths();
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

  /**
   * The toolpath map, walked out of `classes` if that has not happened yet. A caller that
   * merges this registry into a table of its own reads it through here.
   */
  ensurePaths(): Record<string, typeof ToolOp> {
    if (!this.pathsScanned) {
      this.pathsScanned = true;
      this.initPaths();
    }

    return this.paths;
  }

  /** Resolves `"some.tool(a=1 b='x')"` to the class and its parsed arguments. */
  parseToolPath(str: string, checkExists: boolean = true): ParseToolPathResult {
    this.ensurePaths();

    const startstr = str;
    const { path, argsStr } = splitToolPath(str);

    str = path;

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

  /**
   * Seeds `cls`'s saved inputs and gives every api that should know about them a chance
   * to rebuild.
   *
   * `register` calls this with no api, which reaches every api built against this registry
   * rather than whichever one happened to build last. An api gets a tool's `buildOpAPI`
   * struct that way too, which is what `ctx.last_tool.<input>` resolves through.
   */
  updateDefaults(cls: IToolOpConstructor, api?: DataAPI): void {
    this.seedDefaults(cls);

    if (api !== undefined) {
      this.buildOpAPI(api, cls);
      api.invalidateToolDefaults();
      return;
    }

    // No apis yet means buildToolSysAPI has not run, and there is nowhere to build into
    for (const built of this.apis()) {
      this.buildOpAPI(built, cls);
      built.invalidateToolDefaults();
    }
  }

  /**
   * Gives every saveable input of `cls` a stored value if it has none. Needs no api: the
   * toolpath alone says where the value lives.
   */
  seedDefaults(cls: IToolOpConstructor): void {
    const def = cls._getFinalToolDef();

    for (const k in def.inputs) {
      const prop = def.inputs[k];

      if (!(prop.flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY))) {
        this.defaults._ensureValues(cls, k, prop);
      }
    }
  }

  /**
   * Seeds every registered class and builds their op structs into `api`, then answers the
   * api's merged defaults struct.
   *
   * The defaults binding is the api's rather than this registry's, because an api may list
   * several registries and a toolpath prefix can span them.
   */
  buildAPI(api: DataAPI): DataStruct {
    if (!this.apis().includes(api)) {
      this._builtAPIs.push(new WeakRef(api));
    }

    for (const cls of this.classes) {
      this.seedDefaults(cls);
      this.buildOpAPI(api, cls);
    }

    api.invalidateToolDefaults();

    return api.toolDefaultsStruct();
  }

  /**
   * Gives `cls` a struct whose paths read and write a live op's inputs. Takes a macro type
   * class too, which is how `ctx.last_tool` reaches a running macro's inputs.
   */
  buildOpAPI(api: DataAPI, cls: IToolOpConstructor | MacroClassType): DataStruct {
    const st = api.mapStruct(cls, true);
    const def = cls._getFinalToolDef();

    function makeProp(k: string): void {
      if (def.inputs[k].flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY)) {
        return;
      }

      // A copy because customGetSet below rewrites getValue/setValue on whatever it is
      // handed. A normal tooldef() hands out fresh properties every call and would not
      // notice, but a macro type class returns one `__tooldef` forever, so mutating it
      // there would leave the macro's declared inputs permanently bound to a live op
      const prop = def.inputs[k].copy();

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
 *
 * Its struct keeps the class's own name, so `getStructByName("ToolPropertyCache")` still
 * answers with the struct it did before registries existed.
 */
export const defaultRegistry = new ToolRegistry(SavedToolDefaults, "ToolPropertyCache");

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
