import type { ToolOp } from "./toolop";
import { defaultRegistry } from "./toolregistry";
import type { ParseToolPathResult } from "./toolpath_parser";

export { buildParser, Parser } from "./toolpath_parser";
export type { ParseToolPathResult } from "./toolpath_parser";

/** The default registry's toolpath map, by identity. */
export const ToolPaths: Record<string, typeof ToolOp> = defaultRegistry.paths;

/** Resolves against the default registry; an api resolves against its own. */
export function parseToolPath(str: string, check_tool_exists: boolean = true): ParseToolPathResult {
  return defaultRegistry.parseToolPath(str, check_tool_exists);
}

export function testToolParser(): ParseToolPathResult {
  const ret = parseToolPath("view3d.sometool(selectmode=1 str='str' bool=true)", false);
  return ret;
}

window.parseToolPath = parseToolPath;

/** Walks the default registry's registered classes into its toolpath map. */
export function initToolPaths(): void {
  defaultRegistry.initPaths();
}
