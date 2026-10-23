import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd(), cache = new Map();
function loadTs(rel) {
  const file = path.resolve(root, rel.endsWith(".ts") ? rel : `${rel}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true }, fileName: file }).outputText;
  const mod = { exports: {} }; cache.set(file, mod);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    const resolved = path.resolve(path.dirname(file), id);
    if (path.extname(resolved) === ".json" && fs.existsSync(resolved)) return JSON.parse(fs.readFileSync(resolved, "utf8"));
    for (const candidate of [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")])
      if (fs.existsSync(candidate)) return loadTs(path.relative(root, candidate));
    throw new Error(`Cannot resolve ${id} from ${file}`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, file, path.dirname(file));
  return mod.exports;
}
function assert(value, message) { if (!value) throw new Error(message); }

const { createVariantFloorplanScene } = loadTs("lib/floorplans/variants.ts");
const { wallOpenings } = loadTs("lib/floorplans/door-edit.ts");
const { createFloorplanBlueprint, compileBlueprintToPascal, validateVariantBlueprint, blueprintWallCoordinateError } = loadTs("lib/floorplans/blueprint.ts");
const { executeLayoutTool } = loadTs("lib/layout-tools.ts");
const { assertPascalSceneIntegrity } = loadTs("lib/pascal/scene-integrity.ts");
const { doorWorldXZ, isWalkthroughPositionBlocked } = loadTs("lib/walkthrough-runtime.ts");

const catalog = JSON.parse(fs.readFileSync(path.join(root, "lib/floorplans/generated-variant-specs.json"), "utf8"));
for (const entry of catalog.entries) {
  const blueprint = createFloorplanBlueprint(entry.floorplanSpec);
  const validation = validateVariantBlueprint(blueprint);
  assert(validation.valid, `${entry.variantId} Blueprint invalid: ${validation.issues.join("; ")}`);
  const compiled = compileBlueprintToPascal(blueprint);
  assert(assertPascalSceneIntegrity(compiled).valid, `${entry.variantId} compiled Scene invalid`);
  assert(blueprintWallCoordinateError(compiled, blueprint) < 1e-9, `${entry.variantId} compiled wall coordinate drift`);
}

const scene = createVariantFloorplanScene({
  residenceType: "one",
  variantId: "one-option-01",
  optionIndex: 1,
  imageUrl: "/preset/variants/one/option-01.png",
  imageDataUrl: null,
  imageHash: "40d5fa7466806844710e86a2591efa438923f02201c05a3085c54a21ada3371e",
});
const integrity = assertPascalSceneIntegrity(scene);
assert(integrity.valid, `Initial Pascal scene invalid: ${integrity.issues.join("; ")}`);
const beforeDoors = Object.values(scene.nodes).filter((node) => node.type === "door").length;
const movableDoor = Object.values(scene.nodes).find((node) => node.type === "door" && node.id !== "door_entry");
assert(movableDoor, "V2 regression plan has no movable interior door");
const targetWall = Object.values(scene.nodes).find((node) => node.type === "wall" && node.metadata?.editable && node.id !== movableDoor.hostWallId);
assert(targetWall, "V2 regression plan has no editable target wall");
const targetOffset = 0.7;
const targetWallLength = Math.hypot(targetWall.end[0] - targetWall.start[0], targetWall.end[1] - targetWall.start[1]);
const beforeWorld = doorWorldXZ(scene, movableDoor);
const moved = executeLayoutTool(scene, "move_door", { doorId: movableDoor.id, targetWallId: targetWall.id, positionRatio: (targetOffset + Number(movableDoor.width || 0.8) / 2) / targetWallLength });
assert(moved.ok, moved.message);
const after = moved.scene;
const afterDoors = Object.values(after.nodes).filter((node) => node.type === "door").length;
assert(beforeDoors === afterDoors, "Door count changed during move");
assert(!wallOpenings(after, movableDoor.hostWallId).some((opening) => opening.id === movableDoor.id), "Old wall opening was not restored");
assert(wallOpenings(after, targetWall.id).some((opening) => opening.id === movableDoor.id), "New wall opening was not created");
assert(after.nodes[movableDoor.id].parentId === targetWall.id, "Door parent was not updated");
assert(Math.abs(after.nodes[movableDoor.id].metadata.blueprintOffset - targetOffset) < 1e-9, "Blueprint offset was not persisted");
const afterWorld = doorWorldXZ(after, after.nodes[movableDoor.id]);
assert(beforeWorld && afterWorld && (beforeWorld.x !== afterWorld.x || beforeWorld.z !== afterWorld.z), "Door world position did not change");
const target = afterWorld;
const collisionScene = JSON.parse(JSON.stringify(after));
for (const node of Object.values(collisionScene.nodes)) if (node.type === "item") delete collisionScene.nodes[node.id];
assert(isWalkthroughPositionBlocked(collisionScene, target.x, target.z, new Set()), "Closed door should block walkthrough");
assert(!isWalkthroughPositionBlocked(collisionScene, target.x, target.z, new Set([movableDoor.id])), "Open door should allow walkthrough");
const finalIntegrity = assertPascalSceneIntegrity(after);
assert(finalIntegrity.valid, `Moved Pascal scene invalid: ${finalIntegrity.issues.join("; ")}`);
console.log("Door Blueprint move test: PASS");
console.log(JSON.stringify({ blueprintsValidated: catalog.entries.length, compileCoordinateErrorM: 0, oldWall: movableDoor.hostWallId, newWall: targetWall.id, beforeDoors, afterDoors, oldOpeningRestored: true, newOpeningCreated: true, closedBlocks: true, openPasses: true }, null, 2));
