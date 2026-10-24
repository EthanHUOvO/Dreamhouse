import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Same transpile-only loader used by the existing wall/door regression tests.
// This suite is deterministic geometry testing; it never calls an AI model.
const require = createRequire(import.meta.url);
const ts = process.env.DREAMHOUSE_TEST_TYPESCRIPT ? require(process.env.DREAMHOUSE_TEST_TYPESCRIPT) : require("typescript");
const root = process.cwd(), cache = new Map();
function loadTs(rel) {
  const file = path.resolve(root, rel.endsWith(".ts") ? rel : `${rel}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true }, fileName: file }).outputText;
  const mod = { exports: {} }; cache.set(file, mod);
  const localRequire = (id) => {
    if (!id.startsWith(".")) return require(id);
    const resolved = path.resolve(path.dirname(file), id);
    for (const candidate of [resolved, `${resolved}.ts`, path.join(resolved, "index.ts")]) if (fs.existsSync(candidate)) return loadTs(path.relative(root, candidate));
    throw new Error(`Cannot resolve ${id} from ${file}`);
  };
  new Function("require", "module", "exports", output)(localRequire, mod, mod.exports);
  return mod.exports;
}

const { enumerateStructureEditCandidates, applyStructureEditPlan, structureEditFingerprint, structureFurnitureFootprints } = loadTs("lib/floorplans/structure-edit.ts");
const { sceneToFloorplanBlueprint, validateVariantBlueprint } = loadTs("lib/floorplans/blueprint.ts");
const { polygonArea } = loadTs("lib/floorplans/types.ts");
const clone = (v) => JSON.parse(JSON.stringify(v));
// Equivalent normalization for this narrow geometry test; the 24-catalog suite
// separately covers the real importer and Pascal schema with installed deps.
function fixture() {
  const scene = JSON.parse(fs.readFileSync(path.join(root, "public/preset/pascal-v2/one/option-01.pascal.json"), "utf8"));
  const original = scene.nodes.building_one01;
  delete scene.nodes.building_one01;
  scene.nodes.building_house = { ...original, id: "building_house" };
  for (const node of Object.values(scene.nodes)) {
    if (node.parentId === "building_one01") node.parentId = "building_house";
    if (node.children) node.children = node.children.map((id) => id === "building_one01" ? "building_house" : id);
    if (node.type === "door" || node.type === "window") node.metadata.blueprintOffset = node.position[0] - node.width / 2;
    if (node.type === "zone") node.metadata.semantic_type = node.metadata.roomType;
  }
  const outer = scene.nodes.slab_one01_base.polygon;
  scene.nodes.building_house.metadata = { variantId: "one-option-01", floorplanBlueprint: { schema: "dreamhouse-floorplan-blueprint/v1", unit: "meter", id: "one-option-01", name: "一居01", factory: "imported-pascal-json", sourceImage: "/preset/variants/one/option-01.png", outerPolygon: outer, walls: [], rooms: [], doors: [], windows: [], furniture: [], expected: { roomCount: 6, doorCount: 6, windowCount: 3, approximateArea: polygonArea(outer), sceneBounds: { width: 6.63, depth: 8.333 } } } };
  return scene;
}

const source = fixture(), untouched = JSON.stringify(source);
const options = enumerateStructureEditCandidates(source);
console.log(JSON.stringify({ evidenceType: "pure-program-no-model", candidates: options.candidates, rejections: options.rejections, compatibilityIssues: options.issues }, null, 2));
assert.equal(options.issues.length, 0, `Fixture baseline invalid: ${options.issues.join("; ")}`);
assert.ok(options.candidates.length, "No safe structure candidate; do not treat image generation or wall creation as success");
const selected = options.candidates.find((candidate) => !candidate.furnitureMoves.length) || options.candidates[0];
const success = applyStructureEditPlan(source, { candidateId: selected.id, inputFingerprint: options.inputFingerprint, furnitureMoves: selected.furnitureMoves });
assert.equal(success.ok, true, success.issues.join("; "));
assert.equal(JSON.stringify(source), untouched, "Successful transaction mutated its input");
assert.ok(success.validation.valid);
assert.ok(Object.values(success.validation.checks).every(Boolean));
assert.equal(success.validation.retainedFurnitureBlocks, structureFurnitureFootprints(source).reduce((sum, f) => sum + f.nodeIds.length, 0));
assert.equal(success.validation.originalReachableRoomIds.length, 6);
assert.equal(success.validation.editedReachableRoomIds.length, 7);
assert.equal(success.validation.clearanceRadiusM, 0.30);
assert.ok(success.validation.originalAccessibleDoorIds.includes("door_one01_kit-door"));
assert.ok(success.validation.originalAccessibleDoorIds.includes("door_one01_south-bal-door"));
assert.ok(success.validation.originalAccessibleDoorIds.every((id) => success.validation.editedAccessibleDoorIds.includes(id)));
assert.equal(success.scene.nodes.wall_one01_study_ai_east.height, source.nodes.ceiling_one01_living.height);
assert.deepEqual(success.scene.nodes.spawn_one01, source.nodes.spawn_one01);
assert.deepEqual(success.scene.materials, source.materials);
assert.deepEqual(success.scene.metadata, source.metadata);
assert.equal(success.scene.nodes.wall_one01_study_ai_east.parentId, "level_one01");
assert.equal(success.scene.nodes.door_one01_study_ai.wallId, "wall_one01_study_ai_east");
const blueprint = sceneToFloorplanBlueprint(success.scene);
assert.ok(validateVariantBlueprint(blueprint).valid);
assert.equal(blueprint.rooms.length, 7);
assert.equal(blueprint.doors.length, 7);
for (const room of blueprint.rooms) assert.deepEqual(room.polygon, success.scene.nodes[room.id].polygon);
for (const wall of blueprint.walls) { assert.deepEqual(wall.start, success.scene.nodes[wall.id].start); assert.deepEqual(wall.end, success.scene.nodes[wall.id].end); }

function rollback(scene, plan, reason) {
  const before = JSON.stringify(scene), result = applyStructureEditPlan(scene, plan);
  assert.equal(result.ok, false, reason);
  assert.equal(result.scene, scene, "Failure must return original scene object");
  assert.equal(JSON.stringify(scene), before, "Failure modified input");
  assert.deepEqual(result.operations, []);
  return result.issues;
}
const plan = { candidateId: selected.id, inputFingerprint: options.inputFingerprint, furnitureMoves: selected.furnitureMoves };
rollback(source, { ...plan, inputFingerprint: "old-version" }, "Stale source response accepted");
rollback(source, { ...plan, candidateId: "invented-by-model" }, "Unknown candidate accepted");
rollback(source, { ...plan, furnitureMoves: [{ furnitureId: "f000", delta: [0, 1] }] }, "Unrelated furniture move accepted");
const changed = clone(source); changed.nodes.block_one01_0077.position[2] += 0.01;
rollback(changed, plan, "Furniture edit should invalidate previous response");
const invalidOpening = clone(source); Object.values(invalidOpening.nodes).find((node) => node.type === "window").width = -1;
const invalidResult = enumerateStructureEditCandidates(invalidOpening);
assert.equal(invalidResult.candidates.length, 0, "Invalid baseline opening was silently repaired");
assert.ok(invalidResult.issues.some((issue) => /门窗/.test(issue)));
const concaveChanged = clone(source); concaveChanged.nodes.zone_one01_living.polygon[5] = [0, 0];
rollback(concaveChanged, { ...plan, inputFingerprint: structureEditFingerprint(concaveChanged) }, "Incompatible concavity accepted");
const incompatible = clone(source); incompatible.nodes.building_house.metadata.variantId = "three-option-01";
rollback(incompatible, { ...plan, inputFingerprint: structureEditFingerprint(incompatible) }, "Unsupported catalog accepted");
const translated = clone(source); translated.nodes.building_house.position[0] = 10;
rollback(translated, { ...plan, inputFingerprint: structureEditFingerprint(translated) }, "Unsupported world translation accepted");
const editedWall = clone(source); editedWall.nodes["wall_one01_bed-west"].metadata.wall_edit_updated = true;
rollback(editedWall, { ...plan, inputFingerprint: structureEditFingerprint(editedWall) }, "Previously edited walls require new geometry planning");
const noDoorPath = clone(source);
// Preserve the tea table's blocks but intentionally place its full group in
// the entrance corridor to ensure furniture-aware reachability rejects it.
for (const node of Object.values(noDoorPath.nodes)) if (node.metadata?.furnitureId === "f009") { node.position[0] += 2.0; node.position[2] -= 1.10; }
const blockedOptions = enumerateStructureEditCandidates(noDoorPath);
assert.equal(blockedOptions.candidates.length, 0, "Blocked entrance corridor was accepted");
assert.ok(blockedOptions.rejections.some((r) => r.issues.some((issue) => /不可达/.test(issue))));
const moveCandidate = options.rejections.find((candidate) => candidate.id.endsWith("-move-tv"));
assert.ok(options.rejections.some((candidate) => candidate.issues.some((issue) => /碰撞家具/.test(issue))), "Original furniture collision should be reported");
assert.ok(moveCandidate || options.candidates.some((candidate) => candidate.furnitureMoves.length));
assert.ok(options.rejections.some((candidate) => candidate.id === "one01-study-197x220-move-tv" && candidate.issues.some((issue) => /原有门.*阻断/.test(issue))), "Study-only reachability must not hide blocked access to old doors");
for (const candidate of options.candidates) {
  const result = applyStructureEditPlan(source, { candidateId: candidate.id, inputFingerprint: options.inputFingerprint, furnitureMoves: candidate.furnitureMoves });
  assert.equal(result.ok, true, `${candidate.id}: ${result.issues.join("; ")}`);
  assert.equal(JSON.stringify(source), untouched);
  if (candidate.furnitureMoves.length) rollback(source, { candidateId: candidate.id, inputFingerprint: options.inputFingerprint, furnitureMoves: [] }, "Furniture movement requires explicit approval in model plan");
}
rollback(success.scene, { ...plan, inputFingerprint: structureEditFingerprint(success.scene) }, "Duplicate structure edit accepted");
console.log(JSON.stringify({ status: "PASS", evidenceType: "pure-program-no-model", safeCandidates: options.candidates.map((candidate) => candidate.id), selectedCandidate: selected.id, newRoomAreaM2: success.validation.studyAreaM2, clearWidthM: selected.clearWidthM, pathSamples: success.validation.pathSamples.length, clearanceRadiusM: success.validation.clearanceRadiusM, preservedFurnitureBlocks: success.validation.retainedFurnitureBlocks, reachableRoomsBefore: success.validation.originalReachableRoomIds.length, reachableRoomsAfter: success.validation.editedReachableRoomIds.length, checks: success.validation.checks, regressionCases: 14 }, null, 2));
