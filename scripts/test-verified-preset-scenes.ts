import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { test } from "node:test";
import { resolveVerifiedPresetScene } from "../lib/ai/verified-preset-scene";
import { addPartitionWall } from "../lib/floorplans/wall-edit";
import { assertPascalSceneIntegrity } from "../lib/pascal/scene-integrity";
import { restoreModelSession } from "../lib/ai/model3d-persistence";
import { canonicalFloorplanSource, canProceedAfterModelGeneration, confirmedFloorplanSources, shouldHydrateImportedPreset } from "../lib/ai/model3d-source";
import { compileBlueprintToPascal, sceneToFloorplanBlueprint } from "../lib/floorplans/blueprint";

test("all 24 built-in images preserve the corresponding server scene geometry", async () => {
  for (const residence of ['one', 'two', 'three']) {
    for (let optionIndex = 1; optionIndex <= 8; optionIndex += 1) {
      const option = String(optionIndex).padStart(2, '0');
      const bytes = await readFile(join(process.cwd(), 'public', 'preset', 'variants', residence, `option-${option}.png`));
      const sceneName = residence === 'two' ? `two-${option}.pascal.json` : `option-${option}.pascal.json`;
      const original = JSON.parse(await readFile(join(process.cwd(), 'public', 'preset', 'pascal-v2', residence, sceneName), 'utf8'));
      const result = await resolveVerifiedPresetScene(`data:image/png;base64,${bytes.toString('base64')}`, 'regression');
      assert.ok(result, `${residence}-${option}`);
      assert.equal(result.source, 'verified-preset');
      assert.equal(result.variantId, `${residence}-option-${option}`);
      assert.equal(result.sourceImageHash, createHash('sha256').update(bytes).digest('hex'));
      assert.equal(result.scene.nodes.building_house.metadata?.floorplanSource, 'verified-preset');
      for (const type of ['wall', 'zone', 'door', 'window']) {
        const before = Object.values(original.nodes).filter((node: any) => node.type === type) as any[];
        const after = Object.values(result.scene.nodes).filter((node) => node.type === type);
        assert.equal(after.length, before.length, `${result.variantId}: ${type} count`);
        for (const node of before) {
          const matched = result.scene.nodes[node.id];
          assert.ok(matched, `${result.variantId}: ${node.id}`);
          assert.equal(matched.name, node.name);
          if (type === 'wall') {
            assert.deepEqual(matched.start, node.start);
            assert.deepEqual(matched.end, node.end);
          }
          if (type === 'zone') assert.deepEqual(matched.polygon, node.polygon);
        }
      }
    }
  }
});

test("changed image bytes cannot select a preset even with the same image type", async () => {
  const bytes = await readFile(join(process.cwd(), 'public', 'preset', 'variants', 'two', 'option-01.png'));
  const changed = Buffer.concat([bytes, Buffer.from('edited-output')]);
  assert.equal(await resolveVerifiedPresetScene(`data:image/png;base64,${changed.toString('base64')}`, 'regression'), null);
  assert.equal(await resolveVerifiedPresetScene('data:image/png;base64,Zm9yZ2VkLWltYWdl', 'forged-catalog-session'), null);
});

test("adding a partition to all imported presets uses their real level and preserves existing walls/openings", async () => {
  for (const residence of ['one', 'two', 'three']) {
    for (let optionIndex = 1; optionIndex <= 8; optionIndex += 1) {
      const option = String(optionIndex).padStart(2, '0');
      const bytes = await readFile(join(process.cwd(), 'public', 'preset', 'variants', residence, `option-${option}.png`));
      const original = await resolveVerifiedPresetScene(`data:image/png;base64,${bytes.toString('base64')}`, 'wall-edit-regression');
      assert.ok(original);
      const before = JSON.stringify(original.scene);
      const level = Object.values(original.scene.nodes).find((node) => node.type === 'level')!;
      const room = Object.values(original.scene.nodes).find((node) => node.type === 'zone' && /bedroom/.test(String(node.metadata?.roomType || node.metadata?.semantic_type)))!;
      const center = room.polygon.reduce((sum: number[], point: number[]) => [sum[0] + point[0] / room.polygon.length, sum[1] + point[1] / room.polygon.length], [0, 0]);
      const changed = addPartitionWall(original.scene, [center[0] - .2, center[1]], [center[0] + .2, center[1]], { snap: false });
      const wall = changed.scene.nodes[changed.wallIds[0]];
      assert.equal(wall.parentId, level.id, original.variantId);
      assert.ok(changed.scene.nodes[level.id].children?.includes(wall.id));
      assert.equal(wall.metadata?.structural_type, 'partition');
      assert.equal(assertPascalSceneIntegrity(changed.scene).valid, true);
      assert.equal(JSON.stringify(original.scene), before, 'input scene is immutable');
      for (const node of Object.values(original.scene.nodes).filter((node) => ['wall', 'door', 'window'].includes(node.type))) assert.equal(JSON.stringify(changed.scene.nodes[node.id]), JSON.stringify(node), `${original.variantId}: existing ${node.type} ${node.id} preserved`);
    }
  }
});

async function restorableSnapshot() {
  const bytes = await readFile(join(process.cwd(), 'public', 'preset', 'variants', 'two', 'option-01.png'));
  const preset = await resolveVerifiedPresetScene(`data:image/png;base64,${bytes.toString('base64')}`, 'persistence-regression');
  assert.ok(preset);
  return { selectedVariant: { variantId: preset.variantId }, currentPascalScene: preset.scene, generatedFloorplan: { url: '/preset/variants/two/option-01.png' }, modelGenerationPhase: 'completed', model3DLoaded: true, currentStep: 3 };
}

test("reloading a generated edited scene preserves its exact authoritative geometry", async () => {
  const saved = await restorableSnapshot();
  saved.currentPascalScene = addPartitionWall(saved.currentPascalScene, [2, 2], [3, 2], { id: 'edited-geometry', snap: false }).scene;
  saved.currentPascalScene.nodes.building_house.metadata!.floorplanSource = 'mcp-qwen38-vulkan';
  saved.currentPascalScene.nodes.building_house.metadata!.sourceDrawing = '/api/generated-images/edited.png';
  saved.generatedFloorplan.url = '/api/generated-images/edited.png';
  const restored = restoreModelSession(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.phase, 'completed');
  assert.equal(restored.modelLoaded, true);
  assert.equal(restored.step, 3);
  assert.equal(JSON.stringify(restored.scene), JSON.stringify(saved.currentPascalScene));
  assert.ok(restored.scene!.nodes['edited-geometry']);
});

test("reloading a failed fallback cannot unlock later steps, including legacy sessions", async () => {
  const saved = await restorableSnapshot();
  saved.currentPascalScene.nodes.building_house.metadata!.floorplanSource = 'fallback-prebuilt';
  saved.currentPascalScene.nodes.building_house.metadata!.fallbackReason = 'generation failed';
  const restored = restoreModelSession({ ...saved, modelGenerationPhase: undefined, currentStep: 4 });
  assert.equal(restored.phase, 'error');
  assert.equal(restored.modelLoaded, false);
  assert.equal(restored.step, 2);
  assert.equal(restored.scene, null);
  assert.equal(canProceedAfterModelGeneration({ phase: restored.phase, modelLoaded: restored.modelLoaded, experience: restored.experience }), false);
});

test("reloading manually edited catalog geometry cannot refresh it back to a preset", async () => {
  const saved = await restorableSnapshot();
  saved.currentPascalScene = addPartitionWall(saved.currentPascalScene, [2, 2], [3, 2], { id: 'saved-manual-partition', snap: false }).scene;
  const restored = restoreModelSession(JSON.parse(JSON.stringify(saved)));
  assert.ok(restored.scene!.nodes['saved-manual-partition']);
  assert.equal(restored.phase, 'completed');
  assert.equal(shouldHydrateImportedPreset(undefined, 'saved'), false, 'compiled saved Blueprints may lack source metadata');
  assert.equal(shouldHydrateImportedPreset(restored.scene!.nodes.building_house.metadata!.floorplanSource), false);
});

test("obsolete, corrupted, or interrupted persisted models remain blocked until regeneration", async () => {
  const saved = await restorableSnapshot();
  const interrupted = restoreModelSession({ ...saved, modelGenerationPhase: 'generating', currentStep: 4 });
  assert.equal(interrupted.modelLoaded, false);
  assert.equal(interrupted.phase, 'idle');
  assert.equal(interrupted.step, 2);
  const corrupted = JSON.parse(JSON.stringify(saved));
  corrupted.currentPascalScene.nodes.building_house.parentId = 'missing-parent';
  assert.equal(restoreModelSession(corrupted).modelLoaded, false);
  const wrongSelection = restoreModelSession({ ...saved, selectedVariant: { variantId: 'one-option-01' } });
  assert.equal(wrongSelection.modelLoaded, false);
});

test("legacy valid scenes without a saved phase remain compatible", async () => {
  const saved = await restorableSnapshot();
  const restored = restoreModelSession({ ...saved, modelGenerationPhase: undefined });
  assert.equal(restored.phase, 'completed');
  assert.equal(restored.modelLoaded, true);
  assert.equal(restored.experience, 'viewer');
});

async function blobRestoredSnapshot() {
  const saved = await restorableSnapshot();
  const prompt = '增加独立书房';
  const canonical = '/api/generated-images/selected-version.png';
  const variantId = saved.selectedVariant.variantId;
  saved.currentPascalScene.nodes.building_house.metadata!.floorplanSource = 'mcp-qwen38-vulkan';
  saved.currentPascalScene.nodes.building_house.metadata!.sourceDrawing = canonical;
  return { ...saved, generatedFloorplan: { provider: 'qwen', url: 'blob:restored-frame-2', sourceVariantId: variantId, sourceImageHash: 'same-original-input', userPrompt: prompt }, aiFloorplan: { url: canonical, sourceVariantId: variantId, sourceImageHash: 'same-original-input', prompt }, selectedFloorplanVersionId: 'current-version', floorplanVersions: [
    { id: 'old-version', sourceVariantId: variantId, sourceImageHash: 'same-original-input', submittedRequirement: prompt, result: { url: '/api/generated-images/old-version.png' } },
    { id: 'current-version', sourceVariantId: variantId, sourceImageHash: 'same-original-input', submittedRequirement: prompt, result: { url: canonical } },
  ] };
}

test("repeated IndexedDB blob aliases retain the canonical edited-scene identity", async () => {
  const saved = await blobRestoredSnapshot();
  assert.equal(restoreModelSession(saved).modelLoaded, true);
  saved.generatedFloorplan.url = 'blob:restored-frame-3';
  assert.equal(restoreModelSession(saved).modelLoaded, true);
  assert.ok(confirmedFloorplanSources(saved).includes(saved.aiFloorplan.url));
  assert.equal(canonicalFloorplanSource(saved.generatedFloorplan, saved.aiFloorplan, saved.selectedVariant.variantId, saved.floorplanVersions[1]), saved.aiFloorplan.url);
});

test("older versions and other-variant AI URLs cannot authorize a blob-restored scene", async () => {
  const saved = await blobRestoredSnapshot();
  saved.currentPascalScene.nodes.building_house.metadata!.sourceDrawing = '/api/generated-images/old-version.png';
  assert.equal(restoreModelSession(saved).modelLoaded, false);
  assert.ok(!confirmedFloorplanSources(saved).includes('/api/generated-images/old-version.png'));
  const otherAi = { ...saved.aiFloorplan, sourceVariantId: 'one-option-01' };
  assert.equal(canonicalFloorplanSource(saved.generatedFloorplan, otherAi, saved.selectedVariant.variantId), saved.generatedFloorplan.url);
});

test("only explicitly saved, validated legacy manual Blueprints can restore completion", async () => {
  const saved = await restorableSnapshot();
  const modified = addPartitionWall(saved.currentPascalScene, [2, 2], [3, 2], { id: 'legacy-manual-partition', snap: false }).scene;
  const compiled = compileBlueprintToPascal(sceneToFloorplanBlueprint(modified));
  assert.equal(compiled.nodes.building_house.metadata?.floorplanSource, undefined);
  const legacy = { ...saved, currentPascalScene: compiled, modelGenerationPhase: undefined };
  assert.equal(restoreModelSession(legacy).modelLoaded, false);
  assert.equal(restoreModelSession(legacy, { source: 'base', scene: compiled }).modelLoaded, false);
  const restored = restoreModelSession(legacy, { source: 'saved', scene: compiled });
  assert.equal(restored.modelLoaded, true);
  assert.equal(restored.phase, 'completed');
  assert.ok(restored.scene!.nodes['legacy-manual-partition']);
  assert.equal(restored.scene!.nodes.building_house.metadata!.floorplanSource, 'saved-manual-blueprint');
  assert.equal(restoreModelSession({ ...legacy, modelGenerationPhase: 'error' }, { source: 'saved', scene: compiled }).modelLoaded, false);
  assert.equal(restoreModelSession({ ...legacy, modelGenerationPhase: 'generating' }, { source: 'saved', scene: compiled }).modelLoaded, false);
});
