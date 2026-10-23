import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { resolveVerifiedPresetScene } from "../lib/ai/verified-preset-scene";
import { restoreModelSession } from "../lib/ai/model3d-persistence";
import { compileBlueprintToPascal, createFloorplanBlueprint, sceneToFloorplanBlueprint, validateVariantBlueprint } from "../lib/floorplans/blueprint";
import { createDefaultCalibration, loadSavedVariantDesign, saveVariantDesign } from "../lib/floorplans/variant-persistence";
import { validateImportedScene } from "../lib/floorplans/pascal-v2/imported-two";
import { assertPascalSceneIntegrity } from "../lib/pascal/scene-integrity";
import type { SceneGraph } from "../lib/types";
import { normalizeFloorplan } from "../lib/ai/qwen-floorplan-import";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const close = (actual: number, expected: number, label: string) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);

async function loadPreset(residence: string, option: string) {
  const bytes = await readFile(join(process.cwd(), "public", "preset", "variants", residence, `option-${option}.png`));
  const result = await resolveVerifiedPresetScene(`data:image/png;base64,${bytes.toString("base64")}`, "catalog-roundtrip");
  assert.ok(result, `${residence}-${option} was not recognized by actual image bytes`);
  return result;
}

function assertGeometryIdentity(before: SceneGraph, after: SceneGraph, label: string) {
  for (const type of ["wall", "zone", "door", "window"]) {
    const originals = Object.values(before.nodes).filter((node) => node.type === type);
    assert.equal(Object.values(after.nodes).filter((node) => node.type === type).length, originals.length, `${label}: ${type} count`);
    for (const node of originals) {
      const restored = after.nodes[node.id];
      assert.equal(restored?.type, type, `${label}: ${node.id}`);
      if (type === "wall") {
        assert.deepEqual(restored.start, node.start, `${label}: ${node.id} start`);
        assert.deepEqual(restored.end, node.end, `${label}: ${node.id} end`);
      } else if (type === "zone") {
        assert.deepEqual(restored.polygon, node.polygon, `${label}: ${node.id} polygon`);
      } else {
        assert.equal(restored.wallId, node.wallId, `${label}: ${node.id} host`);
        assert.equal(restored.parentId, node.parentId, `${label}: ${node.id} parent`);
        close(restored.width, node.width, `${label}: ${node.id} width`);
        close(restored.height, node.height, `${label}: ${node.id} height`);
        // Pascal openings are wall-local centres in all three imported packages.
        // This detects the old two-bedroom half-width drift and window sill drift.
        for (let axis = 0; axis < 3; axis++) close(restored.position[axis], node.position[axis], `${label}: ${node.id} position[${axis}]`);
        assert.ok(after.nodes[restored.wallId].children?.includes(node.id), `${label}: ${node.id} reverse host`);
      }
    }
  }
}

for (const residence of ["one", "two", "three"]) {
  for (let index = 1; index <= 8; index++) {
    const option = String(index).padStart(2, "0");
    test(`${residence}-option-${option}: actual catalog load, validate, save, read, restore and compile without geometry drift`, async () => {
      const result = await loadPreset(residence, option);
      const sceneBefore = JSON.stringify(result.scene);
      const blueprint = sceneToFloorplanBlueprint(result.scene);
      const validation = validateVariantBlueprint(blueprint);
      assert.equal(validation.valid, true, `${result.variantId}: ${validation.issues.join("; ")}`);
      assert.equal(assertPascalSceneIntegrity(result.scene).valid, true);
      const records = new Map<string, string>();
      const storage = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); }, removeItem: (key: string) => { records.delete(key); } };
      saveVariantDesign(result.variantId, blueprint, createDefaultCalibration(result.variantId, blueprint), storage, "catalog-roundtrip");
      const saved = loadSavedVariantDesign(result.variantId, storage, "catalog-roundtrip");
      assert.ok(saved, `${result.variantId}: saved Blueprint rejected`);
      assert.deepEqual(saved.blueprint, blueprint, `${result.variantId}: persistence changed geometry`);
      const compiled = compileBlueprintToPascal(saved.blueprint);
      assert.equal(assertPascalSceneIntegrity(compiled).valid, true);
      assertGeometryIdentity(result.scene, compiled, result.variantId);
      const session = clone({ selectedVariant: { variantId: result.variantId }, currentPascalScene: result.scene, generatedFloorplan: { provider: "preset", url: result.scene.nodes.building_house.metadata!.sourceDrawing, sourceVariantId: result.variantId, sourceImageHash: result.sourceImageHash }, modelGenerationPhase: "completed", model3DLoaded: true, currentStep: 3 });
      const restored = restoreModelSession(session);
      assert.equal(restored.modelLoaded, true, `${result.variantId}: full session did not restore`);
      assert.equal(restored.phase, "completed");
      // JSON storage canonically serializes -0 as 0. Compare the complete saved
      // value, retaining every node/material rather than relaxing geometry checks.
      assert.ok(JSON.stringify(restored.scene) === JSON.stringify(clone(result.scene)), `${result.variantId}: restore lost original nodes, furniture, materials or geometry`);
      assert.equal(JSON.stringify(result.scene), sceneBefore, `${result.variantId}: save/compile/restore mutated source`);
    });
  }
}

test("repaired openings are derived from original endpoints on their real hosts", async () => {
  const cases = [
    ["one", "window_one01_kit-window", "wall_one01_o06"],
    ["one", "window_one01_east-window", "wall_one01_o06"],
    ["three", "window_three01_w8", "wall_three01_o4"],
    ["three", "window_three01_w9", "wall_three01_o5"],
  ];
  for (const [residence, openingId, wallId] of cases) {
    const result = await loadPreset(residence, "01");
    const opening = result.scene.nodes[openingId];
    const wall = result.scene.nodes[wallId];
    const [a, b] = opening.metadata!.sourceWallEnds as number[][];
    const ends = opening.metadata!.sourceEnds as number[][];
    const dx = b[0] - a[0], dz = b[1] - a[1], squared = dx * dx + dz * dz;
    const fractions = ends.map((point) => {
      close(dx * (point[1] - a[1]) - dz * (point[0] - a[0]), 0, `${openingId}: original endpoint on host`);
      const fraction = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / squared;
      assert.ok(fraction >= 0 && fraction <= 1, `${openingId}: original endpoint outside host`);
      return fraction;
    });
    const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
    assert.equal(opening.wallId, wallId);
    close(opening.width, (Math.max(...fractions) - Math.min(...fractions)) * length, `${openingId}: traced width`);
    close(opening.position[0], fractions.reduce((sum, fraction) => sum + fraction, 0) / fractions.length * length, `${openingId}: traced centre`);
    assert.ok(opening.width > 0);
    if (residence === "one") assert.equal(opening.metadata!.sourceImageSha256, result.sourceImageHash);
  }
});

test("invalid dimensions, non-finite positions and wrong hosts are rejected, not defaulted or clamped", async () => {
  const result = await loadPreset("three", "01");
  for (const width of [0, -0.04, Number.NaN, Number.POSITIVE_INFINITY]) {
    const scene = clone(result.scene);
    scene.nodes.window_three01_w8.width = width;
    assert.throws(() => validateImportedScene(scene, result.variantId, "regression"));
    const blueprint = sceneToFloorplanBlueprint(scene);
    assert.equal(Object.is(blueprint.windows.find((opening) => opening.id === "window_three01_w8")!.width, width), true);
    assert.equal(validateVariantBlueprint(blueprint).valid, false);
    assert.throws(() => compileBlueprintToPascal(blueprint));
  }
  for (const badValue of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const blueprint = sceneToFloorplanBlueprint(result.scene);
    blueprint.windows[0].offset = badValue;
    assert.equal(validateVariantBlueprint(blueprint).valid, false);
  }
  const wrongHost = clone(result.scene);
  wrongHost.nodes.window_three01_w8.wallId = "wall_three01_o5";
  assert.throws(() => validateImportedScene(wrongHost, result.variantId, "regression"));
  const overrun = sceneToFloorplanBlueprint(result.scene);
  overrun.windows[0].offset = -0.1;
  assert.equal(validateVariantBlueprint(overrun).valid, false);
  const badHeight = sceneToFloorplanBlueprint(result.scene);
  badHeight.windows[0].height = 0;
  assert.equal(validateVariantBlueprint(badHeight).valid, false);
});

test("legacy catalog and Qwen polygon normalization do not manufacture zero-length closure walls", async () => {
  const legacy = JSON.parse(await readFile(join(process.cwd(), "lib", "floorplans", "generated-variant-specs.json"), "utf8"));
  for (const entry of legacy.entries) {
    const validation = validateVariantBlueprint(createFloorplanBlueprint(entry.floorplanSpec));
    assert.equal(validation.valid, true, `${entry.variantId}: ${validation.issues.join("; ")}`);
  }
  // Pure normalization regression: no Qwen request is sent by this test.
  const raw = {
    outerPolygon: [[0, 0], [4, 0], [4, 3], [4, 3], [0, 3], [0, 0]],
    walls: [],
    rooms: [{ id: "room_living", name: "客厅", semantic: "living_room", polygon: [[0, 0], [4, 0], [4, 3], [0, 3]] }],
    doors: [], windows: [],
  };
  const before = JSON.stringify(raw);
  const normalized = normalizeFloorplan(raw, { residenceType: "one", variantId: "one-option-08", imageUrl: "fixture.png" });
  assert.deepEqual(normalized.outerPolygon, [[0, 0], [4, 0], [4, 3], [0, 3]]);
  assert.equal(normalized.walls.length, 4);
  for (const wall of normalized.walls) assert.ok(Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) > 0);
  assert.equal(validateVariantBlueprint(createFloorplanBlueprint(normalized)).valid, true);
  assert.equal(JSON.stringify(raw), before);
});
