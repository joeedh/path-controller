import nstructjs from "../util/struct";
import type { ContextLike, DataAPI, DataStruct } from "../controller";
import { StructableClass } from "../util/nstructjs";
import { Context } from "../controller/context";
import type { ToolStack } from "./toolstack";
import { IToolOpConstructor, ToolClasses, ToolOp } from "./toolop";
import { SavedToolDefaults, ToolPropertyCache } from "./tooldefaults";
import { defaultRegistry } from "./toolregistry";

/** @deprecated */
export function setContextClass(_cls: unknown): void {
  console.warn("setContextClass is deprecated");
}

/* ------------------------------------------------------------------ */
/*  API builders                                                      */
/* ------------------------------------------------------------------ */

/** Calls `updateDefaults` on the default registry. */
export function updateToolDefaults(
  cls: IToolOpConstructor,
  api?: DataAPI,
  datastruct?: DataStruct
): void {
  defaultRegistry.updateDefaults(cls, api, datastruct);
}

export function updateToolSysAPI(api: DataAPI): void {
  const datastruct = api.mapStruct(ToolPropertyCache, true);
  datastruct.clear();

  for (const cls of ToolClasses) {
    updateToolDefaults(cls, api, datastruct);
  }
}

/** Calls `buildOpAPI` on the default registry. */
export function buildToolOpAPI(api: DataAPI, cls: IToolOpConstructor): unknown {
  return defaultRegistry.buildOpAPI(api, cls);
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
  rootCtxClass?: (new (arg: any) => ContextLike) | undefined,
  insertToolDefaultsIntoContext: boolean = true
): void {
  updateToolSysAPI(api);

  if (rootCtxStruct) {
    rootCtxStruct.struct(
      "toolDefaults",
      "toolDefaults",
      "Tool Defaults",
      api.mapStruct(ToolPropertyCache)
    );
    rootCtxStruct.dynamicStruct("last_tool", "last_tool", "Last Tool");
  }

  if (rootCtxClass && insertToolDefaultsIntoContext) {
    const inst = new rootCtxClass({});

    function haveprop(k: string | symbol): boolean {
      return (
        Reflect.ownKeys(inst).includes(k) || Reflect.ownKeys(rootCtxClass!.prototype).includes(k)
      );
    }

    if (!haveprop("last_tool")) {
      Object.defineProperty(rootCtxClass.prototype, "last_tool", {
        get(this: Record<string, unknown>) {
          return (this.toolstack as ToolStack).head;
        },
      });

      if (Context.isContextSubclass(rootCtxClass)) {
        rootCtxClass.prototype.last_tool_save = () => ({});
        rootCtxClass.prototype.last_tool_load = () => undefined;
      }
    }

    if (!haveprop("toolDefaults")) {
      Object.defineProperty(rootCtxClass.prototype, "toolDefaults", {
        get() {
          return SavedToolDefaults;
        },
      });

      if (Context.isContextSubclass(rootCtxClass)) {
        rootCtxClass.prototype.toolDefaults_save = () => ({});
        rootCtxClass.prototype.toolDefaults_load = () => undefined;
      }
    }
  }

  if (!registerWithNStructjs) {
    return;
  }

  //register tools with nstructjs
  for (const cls of ToolClasses) {
    try {
      if (!nstructjs.isRegistered(cls as unknown as StructableClass)) {
        ToolOp._regWithNstructjs(cls);
      }
    } catch (error) {
      console.log((error as Error).stack);
      console.error("Failed to register a tool with nstructjs");
    }
  }
}
