import { DataPath } from "../controller/controller_base";
import type { DataAPI, DataStruct } from "../controller";
import { PropFlags, ToolProperty } from "./toolprop";
import { SavedToolDefaults, ToolPropertyCache } from "./tooldefaults";
import type { IToolOpConstructor, ToolOp } from "./toolop";
import type { MacroClassType } from "./toolmacro";

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
    this.updateDefaults(cls);
  }

  unregister(cls: IToolOpConstructor): void {
    if (this.classes.includes(cls)) {
      (this.classes as unknown as unknown[]).remove(cls);
    }
  }

  isRegistered(cls: IToolOpConstructor): boolean {
    return this.classes.includes(cls);
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
