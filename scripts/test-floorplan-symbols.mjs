import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const cache = new Map();
function loadTs(rel) {
  const file = path.resolve(root, rel);
  if (cache.has(file)) return cache.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }, fileName: file }).outputText;
  const mod = { exports: {} }; cache.set(file, mod);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    const resolved = path.resolve(path.dirname(file), id);
    if (resolved.endsWith(".json")) return JSON.parse(fs.readFileSync(resolved, "utf8"));
    for (const candidate of [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return loadTs(path.relative(root, candidate));
    throw new Error(`Cannot resolve ${id}`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, file, path.dirname(file));
  return mod.exports;
}

const { floorplan } = loadTs("lib/floorplans/pascal-v2/one/option-01.ts");
const { compilePascalV2Floorplan } = loadTs("lib/floorplans/pascal-v2/compiler.ts");
const fail = (message) => { throw new Error(message); };
if (floorplan.recognitionRulesVersion !== "gray-wall-band-v2") fail("回归图未使用集中图纸符号规则");
if (floorplan.doors.length !== 4) fail(`回归图应保留4处门洞，实际 ${floorplan.doors.length}`);
if (!floorplan.doors.every((door) => door.sourceEvidence?.className.includes("door_opening"))) fail("门洞证据未与门扇/开启弧分离");
if (floorplan.walls.some((wall) => wall.sourceEvidence?.className !== "wall_band")) fail("存在没有灰色实体墙带证据的实体墙");
const scene = compilePascalV2Floorplan(floorplan);
const compiledWalls = Object.values(scene.nodes).filter((node) => node.type === "wall");
if (compiledWalls.some((wall) => String(wall.metadata?.sourceEvidence?.className || "wall_band") === "door_arc")) fail("门开启弧被编译为墙");
console.log(JSON.stringify({ plan: floorplan.id, doorCount: floorplan.doors.length, windowCount: floorplan.windows.length, wallCount: compiledWalls.length, virtualBoundaryCount: floorplan.virtualBoundaries.length, result: "PASS" }, null, 2));
