import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { prepareDreamHouseScene } from "../lib/floorplans/pascal-v2/imported-two";
import { runLocalStructureEdit } from "../lib/ai/structure-edit-agent";

async function main() {
  const image = await readFile("public/preset/variants/one/option-01.png");
  const scene = JSON.parse(await readFile("public/preset/pascal-v2/one/option-01.pascal.json", "utf8"));
  prepareDreamHouseScene(scene, { residenceType: "one", variantId: "one-option-01", optionIndex: 1,
    imageUrl: "/preset/variants/one/option-01.png", imageDataUrl: null,
    imageHash: createHash("sha256").update(image).digest("hex") }, "一居");
  const before = JSON.stringify(scene), started = Date.now();
  const result = await runLocalStructureEdit({ scene, instruction: "在客餐厅上侧新增独立书房，保留入户通道和全部原有家具；可以在客厅内平移电视柜避让，不得删除家具或改动其他房间。" });
  assert.equal(JSON.stringify(scene), before, "model task mutated original scene");
  const summary = { type: "real-local-Qwen-inference-and-geometry", elapsedMs: Date.now() - started,
    status: result.status, ok: result.ok, aiSuccess: result.aiSuccess, requestId: result.requestId,
    model: result.model, plan: result.plan, operations: result.operations, validation: result.validation,
    issues: result.issues, originalSceneUnchanged: true };
  await mkdir(".runtime/structure-edit-20261013", { recursive: true });
  await writeFile(".runtime/structure-edit-20261013/real-structure-edit.json", JSON.stringify(summary, null, 2));
  if (result.ok) await writeFile(".runtime/structure-edit-20261013/real-structure-scene.json", JSON.stringify(result.scene));
  console.log(JSON.stringify(summary, null, 2));
  if (!result.ok || !result.validation?.valid) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
