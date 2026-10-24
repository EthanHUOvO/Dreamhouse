import { loadPlugin } from "@pascal-app/core";
import { builtinPlugin } from "@pascal-app/nodes";
const key = "__dreamhouse_pascal_plugin_ready__";
export function ensurePascalPlugin() {
  const g = globalThis as typeof globalThis & {
    [key: string]: Promise<unknown> | undefined;
  };
  return (g[key] ||= loadPlugin(builtinPlugin));
}
