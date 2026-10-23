import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { prepareDreamHouseScene } from "../lib/floorplans/pascal-v2/imported-two";
import { enumerateStructureEditCandidates } from "../lib/floorplans/structure-edit";
import { runLocalStructureEdit } from "../lib/ai/structure-edit-agent";
import { commitStructureScene } from "../lib/ai/structure-commit";

async function fixture() {
  const scene = JSON.parse(await readFile("public/preset/pascal-v2/one/option-01.pascal.json", "utf8"));
  prepareDreamHouseScene(scene, { residenceType: "one", variantId: "one-option-01", optionIndex: 1,
    imageUrl: "/preset/variants/one/option-01.png", imageDataUrl: null, imageHash: "fixture" }, "一居");
  return scene;
}
function tool(plan: Record<string, unknown>) { return { choices: [{ finish_reason: "tool_calls", message: { tool_calls: [{ function: { name: "select_structure_edit", arguments: JSON.stringify(plan) } }] } }] }; }
function selected(scene: any) {
  const available = enumerateStructureEditCandidates(scene);
  assert.ok(available.candidates.length, available.rejections.join(";"));
  const c = available.candidates[0];
  return { action: "create_study", targetZoneId: c.targetRoomId, candidateId: c.id,
    inputFingerprint: available.inputFingerprint, furnitureMoves: c.furnitureMoves, reason: "在客餐厅上侧新建书房" };
}
test("program-only: accepted model contract applies geometry without changing source or dropping furniture", async () => {
  const scene = await fixture(), before = JSON.stringify(scene), plan = selected(scene);
  const result = await runLocalStructureEdit({ scene, instruction: "在客餐厅上侧新增独立书房" }, async (body) => {
    assert.equal(body.tool_choice, "required"); assert.equal(body.tools.length, 1); return tool(plan);
  });
  assert.equal(result.ok, true, result.issues.join(";")); assert.equal(result.validation?.valid, true);
  assert.equal(JSON.stringify(scene), before); assert.notEqual(result.scene, scene);
  const oldBlocks = Object.values(scene.nodes).filter((n: any) => n.type === "block");
  assert.equal(Object.values(result.scene.nodes).filter((n: any) => n.type === "block").length, oldBlocks.length);
});
test("program-only: wrong room, stale fingerprint, unknown candidate and unapproved moves roll back", async () => {
  for (const patch of [{ targetZoneId: "zone_one01_bath" }, { inputFingerprint: "old-v1" },
    { candidateId: "invented" }, { furnitureMoves: [{ furnitureId: "f001", delta: [1, 1] }] }]) {
    const scene = await fixture(), before = JSON.stringify(scene);
    const result = await runLocalStructureEdit({ scene, instruction: "新增书房" }, async () => tool({ ...selected(scene), ...patch }));
    assert.equal(result.ok, false); assert.equal(result.scene, scene); assert.equal(JSON.stringify(scene), before);
  }
});
test("program-only: model rejection and malformed or duplicate tools do not commit", async () => {
  const scene = await fixture();
  for (const response of [tool({ action: "reject", reason: "需求不支持" }),
    { choices: [{ message: { content: "已生成漂亮图片" } }] },
    { choices: [{ finish_reason: "length", message: { tool_calls: [{ function: { name: "select_structure_edit", arguments: "{" } }] } }] }]) {
    const result = await runLocalStructureEdit({ scene, instruction: "改卫生间" }, async () => response);
    assert.equal(result.ok, false); assert.equal(result.scene, scene);
  }
});
test("program-only: incompatible scene and cancellation never call model or mutate input", async () => {
  const scene = await fixture(); scene.nodes.zone_one01_living.polygon[0][0] += 0.1;
  let calls = 0;
  const result = await runLocalStructureEdit({ scene, instruction: "新增书房" }, async () => { calls++; return {}; });
  assert.equal(result.ok, false); assert.equal(calls, 0); assert.equal(result.scene, scene);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runLocalStructureEdit({ scene: await fixture(), instruction: "新增书房", signal: controller.signal }, async () => { calls++; return {}; }));
  assert.equal(calls, 0);
});
test("program-only: explicit furniture immobility rejects all colliding candidates without calling model", async () => {
  const scene = await fixture(); let calls = 0;
  const result = await runLocalStructureEdit({ scene, instruction: "在客餐厅上侧新增书房，不允许移动任何家具，家具原位不动。" }, async () => { calls++; return {}; });
  assert.equal(result.ok, false); assert.equal(result.scene, scene); assert.equal(calls, 0);
});
test("program-only: partially failing Pascal store write compensates to the exact previous scene", async () => {
  const original = await fixture(), next = JSON.parse(JSON.stringify(original)); next.nodes.building_house.name = "new";
  let store = original, calls = 0;
  const result = commitStructureScene(original, next, (scene) => { store = scene; if (++calls === 1) throw new Error("simulated partial store error"); });
  assert.equal(result.ok, false); assert.equal(store, original); assert.equal(calls, 2);
});
