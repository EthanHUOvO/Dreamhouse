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
    for (const candidate of [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")]) if (fs.existsSync(candidate)) return loadTs(path.relative(root, candidate));
    throw new Error(`Cannot resolve ${id} from ${file}`);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(localRequire, mod, mod.exports, file, path.dirname(file));
  return mod.exports;
}
function assert(value, message) { if (!value) throw new Error(message); }
function close(a, b, tolerance = 1e-6) { return Math.abs(a - b) <= tolerance; }

const { createVariantFloorplanScene } = loadTs("lib/floorplans/variants.ts");
const { sceneToFloorplanBlueprint } = loadTs("lib/floorplans/blueprint.ts");
const { wallOpenings, wallLength } = loadTs("lib/floorplans/door-edit.ts");
const {
  addPartitionWall,
  bridgeWallGap,
  mergeCollinearWalls,
  moveWallParallel,
  removeWallSafe,
  straightenWallChain,
  updateWallEndpoint,
} = loadTs("lib/floorplans/wall-edit.ts");
const { saveVariantDesign, loadVariantBlueprintState, createDefaultCalibration } = loadTs("lib/floorplans/variant-persistence.ts");
const { assertPascalSceneIntegrity } = loadTs("lib/pascal/scene-integrity.ts");

const source = createVariantFloorplanScene({
  residenceType: "three",
  variantId: "three-option-05",
  optionIndex: 5,
  imageUrl: "/preset/variants/three/option-05.png",
  imageDataUrl: null,
  imageHash: "test",
});
const partition = Object.values(source.nodes).find((node) => node.type === "wall" && node.metadata?.structural_type === "partition" && !wallOpenings(source, node.id).length);
assert(partition, "Expected an editable partition without openings");

const oldLength = wallLength(partition);
const dx = partition.end[0] - partition.start[0], dz = partition.end[1] - partition.start[1], length = Math.hypot(dx, dz);
const endpointTarget = [partition.end[0] + dx / length * 0.3, partition.end[1] + dz / length * 0.3];
const extended = updateWallEndpoint(source, partition.id, "end", endpointTarget, { snap: false });
assert(close(wallLength(extended.scene.nodes[partition.id]), oldLength + 0.3), "Wall did not extend by 0.30m");

const moved = moveWallParallel(extended.scene, partition.id, 0.2);
assert(close(wallLength(moved.scene.nodes[partition.id]), oldLength + 0.3), "Parallel move changed wall length");
assert(moved.scene.nodes.building_house.metadata.collisionRevision > source.nodes.building_house.metadata.collisionRevision, "Collision revision did not update");
assert(moved.scene.nodes.building_house.metadata.bomOutdated === true, "BOM was not marked outdated");

let chain = addPartitionWall(moved.scene, [20, 0], [21, 0], { id: "wall_test_a", snap: false }).scene;
chain = addPartitionWall(chain, [21, 0], [22, 0.25], { id: "wall_test_b", snap: false }).scene;
chain = addPartitionWall(chain, [22, 0.25], [23, 0], { id: "wall_test_c", snap: false }).scene;
const straight = straightenWallChain(chain, ["wall_test_a", "wall_test_b", "wall_test_c"]);
for (const id of ["wall_test_a", "wall_test_b", "wall_test_c"]) {
  assert(close(straight.scene.nodes[id].start[1], 0) && close(straight.scene.nodes[id].end[1], 0), `${id} was not straightened`);
}
const merged = mergeCollinearWalls(straight.scene, ["wall_test_a", "wall_test_b", "wall_test_c"]);
assert(merged.scene.nodes.wall_test_a && !merged.scene.nodes.wall_test_b && !merged.scene.nodes.wall_test_c, "Collinear walls did not merge");

let gap = addPartitionWall(merged.scene, [30, 0], [31, 0], { id: "wall_gap_a", snap: false }).scene;
gap = addPartitionWall(gap, [31.2, 0], [32, 0], { id: "wall_gap_b", snap: false }).scene;
const bridged = bridgeWallGap(gap, "wall_gap_a", "wall_gap_b");
const bridgeId = bridged.wallIds[0];
assert(close(wallLength(bridged.scene.nodes[bridgeId]), 0.2), "Gap bridge length is not 0.20m");

const deleteCandidate = Object.values(bridged.scene.nodes).find((node) => node.type === "wall" && node.metadata?.structural_type === "partition" && !wallOpenings(bridged.scene, node.id).length && !node.id.startsWith("wall_test") && !node.id.startsWith("wall_gap") && node.id !== bridgeId);
assert(deleteCandidate, "Expected a removable partition");
const wallCountBeforeDelete = Object.values(bridged.scene.nodes).filter((node) => node.type === "wall").length;
const removed = removeWallSafe(bridged.scene, deleteCandidate.id);
assert(!removed.scene.nodes[deleteCandidate.id], "Deleted wall remains in Scene");
assert(Object.values(removed.scene.nodes).filter((node) => node.type === "wall").length === wallCountBeforeDelete - 1, "Wall count did not decrement");
assert(!sceneToFloorplanBlueprint(removed.scene).walls.some((wall) => wall.id === deleteCandidate.id), "Deleted wall remains in Blueprint");

const loadBearing = Object.values(source.nodes).find((node) => node.type === "wall" && node.metadata?.structural_type === "load_bearing");
let protectedRejected = false;
try { removeWallSafe(source, loadBearing.id); } catch { protectedRejected = true; }
assert(protectedRejected, "Load-bearing wall deletion was not rejected");

const persistedBlueprint = sceneToFloorplanBlueprint(removed.scene);
const calibration = createDefaultCalibration("three-option-05", persistedBlueprint, true);
const values = new Map();
const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
saveVariantDesign("three-option-05", persistedBlueprint, calibration, storage);
const reloaded = loadVariantBlueprintState("three-option-05", storage);
assert(reloaded.source === "saved", "Saved Blueprint did not win on reload");
assert(!reloaded.blueprint.walls.some((wall) => wall.id === deleteCandidate.id), "Deleted wall returned after reload");
assert(assertPascalSceneIntegrity(removed.scene).valid, "Wall-edited Pascal Scene integrity failed");

console.log("Wall Edit transactions: PASS");
console.log(JSON.stringify({
  extendedByM: 0.3,
  parallelMovedByM: 0.2,
  straightenedWalls: 3,
  mergedWalls: 3,
  bridgedGapM: 0.2,
  deletedWallId: deleteCandidate.id,
  protectedWallRejected: protectedRejected,
  collisionUpdated: true,
  bomOutdated: true,
  reloadSource: reloaded.source,
}, null, 2));
