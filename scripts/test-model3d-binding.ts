import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { advanceSelectionEpoch, canUseBoundModel, floorplanModelBinding, restoreBoundModelSession, sameModelBinding, selectionJobCurrent } from "../lib/ai/model3d-binding";
import { consumeModel3dSse } from "../lib/ai/model3d-stream";
import { addPartitionWall } from "../lib/floorplans/wall-edit";
import { compileBlueprintToPascal, sceneToFloorplanBlueprint } from "../lib/floorplans/blueprint";
import { prepareDreamHouseScene } from "../lib/floorplans/pascal-v2/imported-two";

const variantId = "two-option-01";
const instruction = "在客餐厅上侧新增独立书房";
const v1 = { id: "V1", sourceVariantId: variantId, sourceImageHash: "same-input", submittedRequirement: instruction, result: { url: "/api/generated-images/v1.png", provider: "qwen", sourceVariantId: variantId, sourceImageHash: "same-input", userPrompt: instruction } };
const v2 = { ...v1, id: "V2", result: { ...v1.result, url: "/api/generated-images/v2.png" } };
const b1 = floorplanModelBinding(variantId, v1.result, v1.id)!;
const b2 = floorplanModelBinding(variantId, v2.result, v2.id)!;

async function committedSaved() {
  const scene = JSON.parse(await readFile(join(process.cwd(), "public/preset/pascal-v2/two/two-01.pascal.json"), "utf8"));
  prepareDreamHouseScene(scene, { variantId, residenceType: "two", optionIndex: 1, imageUrl: "/preset/variants/two/option-01.png", imageHash: "same-input", imageDataUrl: null }, "版本回归");
  Object.assign(scene.nodes.building_house.metadata ||= {}, { floorplanSource: "mcp-qwen38-vulkan", variantId, sourceDrawing: b1.canonicalImageUrl, modelBinding: b1 });
  return { selectedVariant: { variantId, imageUrl: "/preset/variants/two/option-01.png" }, currentPascalScene: scene, generatedFloorplan: v1.result, aiFloorplan: { ...v1.result, prompt: instruction }, floorplanVersions: [v1, v2], selectedFloorplanVersionId: v1.id, confirmedBinding: b1, modelBinding: b1, customRequirement: instruction, floorPlanConfirmed: true, model3DLoaded: true, modelGenerationPhase: "completed", currentStep: 4 };
}

test("V1 and V2 with identical input hashes/prompts remain different model sources", () => {
  assert.equal(sameModelBinding(b1, b2), false);
  assert.equal(canUseBoundModel({ confirmed: true, phase: "completed", loaded: true, experience: "viewer", selection: b2, confirmedBinding: b1, modelBinding: b1 }), false);
  assert.equal(canUseBoundModel({ confirmed: true, phase: "completed", loaded: true, experience: "viewer", selection: b1, confirmedBinding: b1, modelBinding: b1 }), true);
});

test("a real SSE parser cannot commit a delayed V1 completion after switching to V2", async () => {
  const job = { sequence: 1, binding: b1 };
  let live = { ...job };
  let committed = 0;
  const response = new Response(new ReadableStream({ start(controller) {
    live = advanceSelectionEpoch(live, b2);
    controller.enqueue(new TextEncoder().encode('event: complete\ndata: {"result":{"scene":{"nodes":{}}}}\n\n'));
    controller.close();
  } }));
  await consumeModel3dSse(response, (event) => { if (event === "complete" && selectionJobCurrent(job, live)) committed += 1; });
  assert.equal(committed, 0);
  assert.equal(selectionJobCurrent(job, advanceSelectionEpoch(live, b1)), false, "switching back to V1 does not revive the old task");
});

test("draft/version changes also invalidate pending image/blob/render/BOM jobs", () => {
  const live = { sequence: 4, binding: b1 };
  const draft = advanceSelectionEpoch(live, null);
  for (const name of ["image", "blob", "render", "bom", "fallback", "error"]) assert.equal(selectionJobCurrent(live, draft), false, name);
  assert.equal(selectionJobCurrent({ sequence: 4, binding: null }, { sequence: 5, binding: null }), false, "null selection jobs still carry an epoch");
});

test("preview/fallback/error states cannot enable STEP4 even with loaded/viewer flags", () => {
  for (const phase of ["idle", "generating", "preparing", "error"]) assert.equal(canUseBoundModel({ confirmed: true, phase, loaded: true, experience: "viewer", selection: b1, confirmedBinding: b1, modelBinding: b1 }), false, phase);
  assert.equal(canUseBoundModel({ confirmed: false, phase: "completed", loaded: true, experience: "viewer", selection: b1, confirmedBinding: b1, modelBinding: b1 }), false);
});

test("same-source confirmation/reload preserves a saved manual partition exactly", async () => {
  const saved = await committedSaved();
  saved.currentPascalScene = addPartitionWall(saved.currentPascalScene, [2, 2], [3, 2], { id: "manual-saved-wall", snap: false }).scene;
  const restored = restoreBoundModelSession(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.modelLoaded, true);
  assert.equal(restored.confirmed, true);
  assert.equal(restored.step, 4);
  assert.equal(JSON.stringify(restored.scene), JSON.stringify(saved.currentPascalScene), "serialized scene geometry must remain identical");
  assert.ok(restored.scene!.nodes["manual-saved-wall"]);
  assert.equal(sameModelBinding(restored.binding, b1), true);
});

test("reload rejects V2 with a V1 model and rejects scene/session binding conflicts", async () => {
  const saved = await committedSaved();
  const changed = { ...saved, selectedFloorplanVersionId: v2.id, generatedFloorplan: v2.result, aiFloorplan: { ...v2.result, prompt: instruction } };
  assert.equal(restoreBoundModelSession(changed).modelLoaded, false);
  assert.equal(restoreBoundModelSession(changed).step, 1);
  saved.currentPascalScene.nodes.building_house.metadata.sourceDrawing = v2.result.url;
  assert.equal(restoreBoundModelSession(saved).modelLoaded, false, "canonical drawing and binding must agree");
  saved.currentPascalScene.nodes.building_house.metadata.sourceDrawing = v1.result.url;
  saved.currentPascalScene.nodes.building_house.metadata.modelBinding = b2;
  assert.equal(restoreBoundModelSession(saved).modelLoaded, false);
});

test("reload refuses interrupted, fallback, undefined-phase and changed-draft snapshots", async () => {
  const saved = await committedSaved();
  for (const phase of ["generating", "preparing", "idle", "error", undefined]) assert.equal(restoreBoundModelSession({ ...saved, modelGenerationPhase: phase }).modelLoaded, false, String(phase));
  assert.equal(restoreBoundModelSession({ ...saved, customRequirement: "不同的未生成草稿" }).modelLoaded, false);
  saved.currentPascalScene.nodes.building_house.metadata.floorplanSource = "fallback-prebuilt";
  assert.equal(restoreBoundModelSession(saved).modelLoaded, false);
});

test("repeated blob aliases retain canonical V1 identity and cannot authorize V2", async () => {
  const saved = await committedSaved();
  for (const url of ["blob:frame-1", "blob:frame-2"]) {
    const selection = { ...v1.result, url };
    assert.deepEqual(floorplanModelBinding(variantId, selection, v1.id, saved.aiFloorplan, v1), b1);
    assert.equal(restoreBoundModelSession({ ...saved, generatedFloorplan: selection }).modelLoaded, true);
  }
  assert.equal(floorplanModelBinding(variantId, { ...v1.result, url: "blob:unbound" }), null);
  assert.equal(restoreBoundModelSession({ ...saved, selectedFloorplanVersionId: v2.id, generatedFloorplan: { ...v2.result, url: "blob:v2" }, aiFloorplan: { ...v2.result, prompt: instruction } }).modelLoaded, false);
});

test("legacy committed source aliases migrate only when their exact image matches", async () => {
  const saved = await committedSaved();
  delete saved.currentPascalScene.nodes.building_house.metadata.modelBinding;
  const legacy = { ...saved, modelBinding: undefined, confirmedBinding: undefined };
  assert.equal(restoreBoundModelSession(legacy).modelLoaded, true);
  assert.equal(restoreBoundModelSession({ ...legacy, selectedFloorplanVersionId: v2.id }).modelLoaded, false, "legacy stale V1 URL cannot authorize selected V2");
  legacy.currentPascalScene.nodes.building_house.metadata.sourceDrawing = v2.result.url;
  assert.equal(restoreBoundModelSession(legacy).modelLoaded, false);
});

test("a source-less legacy Blueprint cannot manufacture completion for a new version", async () => {
  const saved = await committedSaved();
  const compiled = compileBlueprintToPascal(sceneToFloorplanBlueprint(saved.currentPascalScene));
  const legacy = { ...saved, currentPascalScene: compiled, modelBinding: undefined, confirmedBinding: undefined };
  assert.equal(restoreBoundModelSession(legacy, { source: "saved", scene: compiled }).modelLoaded, false);
});
