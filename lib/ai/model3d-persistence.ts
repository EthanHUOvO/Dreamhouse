import type { SceneGraph } from "../types";
import type { FloorplanBlueprint } from "../floorplans/types";
import { sceneToFloorplanBlueprint, validateVariantBlueprint } from "../floorplans/blueprint";
import { assertPascalSceneIntegrity } from "../pascal/scene-integrity";
import { confirmedFloorplanSources, isAuthoritativeModelSceneSource } from "./model3d-source";

export function restoreModelSession(saved: Record<string, any>, manualBlueprint?: { source: string; scene: SceneGraph }) {
  const candidate = (saved.currentPascalScene || saved.pascalScene) as SceneGraph | undefined;
  const metadata = candidate?.nodes?.building_house?.metadata;
  const failed = saved.modelGenerationPhase === "error" || metadata?.floorplanSource === "fallback-prebuilt";
  const interrupted = ["generating", "preparing"].includes(String(saved.modelGenerationPhase || ""));
  let scene: SceneGraph | null = null;
  let blueprint: FloorplanBlueprint | null = null;
  if (candidate && !failed && !interrupted && isAuthoritativeModelSceneSource(metadata?.floorplanSource)) {
    try {
      const selectedVariantId = saved.selectedVariant?.variantId;
      const confirmedImages = confirmedFloorplanSources(saved);
      const hasConfirmedSelection = Boolean(saved.generatedFloorplan?.url || saved.aiFloorplan?.url || saved.selectedFloorplanVersionId);
      const imageMatches = metadata?.floorplanSource === "saved-manual-blueprint" || !metadata?.sourceDrawing || confirmedImages.includes(metadata.sourceDrawing) || !hasConfirmedSelection && (!saved.selectedVariant?.imageUrl || saved.selectedVariant.imageUrl === metadata.sourceDrawing);
      const selectionMatches = (!metadata?.variantId || !selectedVariantId || metadata.variantId === selectedVariantId) && imageMatches;
      const candidateBlueprint = sceneToFloorplanBlueprint(candidate);
      if (selectionMatches && assertPascalSceneIntegrity(candidate).valid && validateVariantBlueprint(candidateBlueprint).valid) {
        scene = JSON.parse(JSON.stringify(candidate));
        blueprint = candidateBlueprint;
      }
    } catch { /* Invalid or obsolete snapshots must be regenerated. */ }
  }
  // Old explicitly saved manual Blueprints may have lost provenance when
  // compiled. The caller supplies this only for source='saved', never 'base'.
  if (!scene && !failed && !interrupted && !metadata?.floorplanSource && manualBlueprint?.source === "saved") {
    try {
      const manualScene = manualBlueprint.scene;
      const manualSpec = sceneToFloorplanBlueprint(manualScene);
      if (assertPascalSceneIntegrity(manualScene).valid && validateVariantBlueprint(manualSpec).valid) {
        scene = JSON.parse(JSON.stringify(manualScene));
        blueprint = manualSpec;
        Object.assign(scene!.nodes.building_house.metadata ||= {}, { floorplanSource: "saved-manual-blueprint", model: "saved-user-blueprint", variantId: saved.selectedVariant?.variantId });
      }
    } catch { /* Invalid manual records are also rejected. */ }
  }
  const modelLoaded = Boolean(scene && saved.model3DLoaded === true);
  const phase = failed ? "error" as const : modelLoaded ? "completed" as const : "idle" as const;
  const experience = modelLoaded ? "viewer" as const : "intro" as const;
  const requestedStep = Number.isInteger(saved.currentStep) && saved.currentStep >= 0 && saved.currentStep <= 4 ? saved.currentStep : 0;
  const step = modelLoaded ? requestedStep : Math.min(requestedStep, 2);
  return { scene, blueprint, phase, experience, modelLoaded, step, failed, interrupted, reason: failed ? String(metadata?.fallbackReason || "上次3D生成未完成，请重新创建") : undefined };
}
