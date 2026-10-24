import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd(), cache = new Map();
function loadTs(rel) {
  const file = path.resolve(root, rel.endsWith(".ts") ? rel : `${rel}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true, resolveJsonModule: true },
    fileName: file,
  }).outputText;
  const mod = { exports: {} }; cache.set(file, mod);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    const resolved = path.resolve(path.dirname(file), id);
    if (path.extname(resolved) === ".json" && fs.existsSync(resolved)) return JSON.parse(fs.readFileSync(resolved, "utf8"));
    for (const candidate of [resolved, `${resolved}.ts`, `${resolved}.json`, path.join(resolved, "index.ts")]) {
      if (!fs.existsSync(candidate)) continue;
      if (candidate.endsWith(".json")) return JSON.parse(fs.readFileSync(candidate, "utf8"));
      return loadTs(path.relative(root, candidate));
    }
    throw new Error(`Cannot resolve ${id} from ${file}`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, file, path.dirname(file));
  return mod.exports;
}
const assert = (value, message) => { if (!value) throw new Error(message); };
const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
const persistence = loadTs("lib/floorplans/variant-persistence.ts");
const blueprintTools = loadTs("lib/floorplans/blueprint.ts");
const doorTools = loadTs("lib/floorplans/door-edit.ts");
const furnitureTools = loadTs("lib/furniture-edit.ts");

const variantId = "three-option-05";
const initial = persistence.loadVariantBlueprintState(variantId, storage);
assert(initial.source === "golden", "Golden must win when no Saved Blueprint exists");
let scene = blueprintTools.compileBlueprintToPascal(initial.blueprint);
const door = Object.values(scene.nodes).find((node) => node.type === "door");
assert(door, "V2 Blueprint must contain at least one door");
const oldWallId = door.hostWallId;
const oldOffset = door.offset;
const targetWallId = "wall_partition_6";
scene = doorTools.moveDoor(scene, door.id, targetWallId, 0.7).scene;
const furniture = Object.values(scene.nodes).find((node) => node.type === "item");
assert(furniture, "Golden Blueprint must contain furniture");
scene = furnitureTools.moveFurniture(scene, furniture.id, 0.35, -0.2);
scene = furnitureTools.rotateFurniture(scene, furniture.id, 90);
const savedBlueprint = blueprintTools.sceneToFloorplanBlueprint(scene);
persistence.saveVariantDesign(variantId, savedBlueprint, initial.calibration, storage);

const key = persistence.variantStorageKey(variantId);
assert(key === `dreamhouse:variant:${variantId}`, "Variant key format changed");
assert(memory.has(key), "Saved Blueprint was not written under the exact variant key");
const reloaded = persistence.loadVariantBlueprintState(variantId, storage);
assert(reloaded.source === "saved", "Saved Blueprint must win over Golden and Base");
const restored = blueprintTools.compileBlueprintToPascal(reloaded.blueprint);
const restoredDoor = restored.nodes[door.id];
assert(restoredDoor.hostWallId === targetWallId, "Door hostWallId was not restored");
assert(Math.abs(restoredDoor.offset - 0.7) < 1e-9, "Door offset was not restored");
assert(!doorTools.wallOpenings(restored, oldWallId).some((opening) => opening.id === door.id), "Old wall opening survived reload");
assert(doorTools.wallOpenings(restored, targetWallId).some((opening) => opening.id === door.id), "New wall opening was lost on reload");
const restoredFurniture = restored.nodes[furniture.id];
assert(Math.abs(restoredFurniture.position[0] - furniture.position[0] - 0.35) < 1e-9, "Furniture X was not restored");
assert(Math.abs(restoredFurniture.position[2] - furniture.position[2] + 0.2) < 1e-9, "Furniture Z was not restored");
assert(Math.abs(restoredFurniture.rotation[1] - Math.PI / 2) < 1e-9, "Furniture rotation was not restored");
const storedFurniture = reloaded.blueprint.furniture.find((item) => item.id === furniture.id);
assert(storedFurniture?.roomId && storedFurniture.size?.length === 3, "Furniture roomId/size missing from Blueprint");

persistence.clearSavedVariantDesign(variantId, storage);
const afterClear = persistence.loadVariantBlueprintState(variantId, storage);
assert(afterClear.source === "golden", "Clearing Saved Blueprint must restore Golden priority");

const sessionA = "session-test-a";
const sessionB = "session-test-b";
persistence.saveVariantDesign(variantId, savedBlueprint, initial.calibration, storage, sessionA);
persistence.saveVariantDesign(variantId, savedBlueprint, initial.calibration, storage, sessionB);
const sessionAKey = persistence.variantStorageKey(variantId, sessionA);
const sessionBKey = persistence.variantStorageKey(variantId, sessionB);
assert(sessionAKey !== sessionBKey, "Different sessions must not share a variant key");
assert(sessionAKey === `dreamhouse:session:${sessionA}:variant:${variantId}`, "Session variant key format changed");
assert(memory.has(sessionAKey) && memory.has(sessionBKey), "Both session variants must be persisted independently");
persistence.clearSavedVariantDesign(variantId, storage, sessionA);
assert(!memory.has(sessionAKey), "Clearing Session A must remove its variant");
assert(memory.has(sessionBKey), "Clearing Session A must not remove Session B's variant");
assert(persistence.loadVariantBlueprintState(variantId, storage, sessionA).source === "golden", "Cleared Session A must fall back to Golden");
assert(persistence.loadVariantBlueprintState(variantId, storage, sessionB).source === "saved", "Session B must retain its Saved Blueprint");

const baseOnly = persistence.loadVariantBlueprintState("two-option-01", storage);
assert(baseOnly.source === "base", "Uncalibrated variant must fall back to Base");
const goldenReports = ["one-option-01", "three-option-05"].map((id) => {
  const loaded = persistence.loadVariantBlueprintState(id, storage);
  const report = persistence.validateVariantCalibration(loaded.blueprint, loaded.calibration);
  assert(report.status === "PASS", `${id} Golden calibration should pass`);
  return { variantId: id, ...report.metrics };
});
const reviewReport = persistence.validateVariantCalibration(baseOnly.blueprint, baseOnly.calibration);
assert(reviewReport.status === "NEEDS REVIEW", "Unconfirmed Base calibration must remain NEEDS REVIEW");

console.log("Variant Blueprint persistence test: PASS");
console.log(JSON.stringify({
  key,
  priority: "Saved > Golden > Base",
  variantId,
  oldWallId,
  targetWallId,
  oldOffset,
  restoredOffset: restoredDoor.offset,
  furnitureId: furniture.id,
  furniturePosition: restoredFurniture.position,
  furnitureRotation: restoredFurniture.rotation[1],
  furnitureSize: storedFurniture.size,
  reloadSource: reloaded.source,
  afterClearSource: afterClear.source,
  sessionIsolation: { sessionAKey, sessionBKey, sessionBRetained: memory.has(sessionBKey) },
  goldenReports,
  uncalibratedStatus: reviewReport.status,
}, null, 2));
