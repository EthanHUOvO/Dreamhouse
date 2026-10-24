import { canonicalFloorplanSource } from "./model3d-source";
import { restoreModelSession } from "./model3d-persistence";

// Step2's image hash identifies the input. It cannot identify V1 versus V2.
export type FloorplanModelBinding = { variantId: string; versionId: string; canonicalImageUrl: string };
type Selection = { url: string; provider?: string; sourceVariantId?: string; sourceImageHash?: string; userPrompt?: string };

export function floorplanModelBinding(variantId: string, selection: Selection | null | undefined, versionId?: string | null, ai?: any, version?: any): FloorplanModelBinding | null {
  if (!selection?.url || !variantId || selection.sourceVariantId && selection.sourceVariantId !== variantId) return null;
  const canonicalImageUrl = canonicalFloorplanSource(selection, ai, variantId, version);
  // A blob without its persisted source alias is not a reloadable identity.
  if (!canonicalImageUrl || canonicalImageUrl.startsWith("blob:")) return null;
  return { variantId, versionId: selection.provider === "preset" ? "original" : versionId || canonicalImageUrl, canonicalImageUrl };
}

export function sameModelBinding(a: FloorplanModelBinding | null | undefined, b: FloorplanModelBinding | null | undefined) {
  return Boolean(a && b && a.variantId === b.variantId && a.versionId === b.versionId && a.canonicalImageUrl === b.canonicalImageUrl);
}

export type SelectionEpoch = { sequence: number; binding: FloorplanModelBinding | null };
export function advanceSelectionEpoch(current: SelectionEpoch, binding: FloorplanModelBinding | null): SelectionEpoch {
  return { sequence: current.sequence + 1, binding };
}
export function selectionJobCurrent(job: SelectionEpoch, live: SelectionEpoch) {
  return job.sequence === live.sequence && (job.binding === null && live.binding === null || sameModelBinding(job.binding, live.binding));
}

export function canUseBoundModel(state: { confirmed: boolean; phase: string; loaded: boolean; experience: string; selection: FloorplanModelBinding | null; confirmedBinding: FloorplanModelBinding | null; modelBinding: FloorplanModelBinding | null }) {
  return state.confirmed && state.phase === "completed" && state.loaded && state.experience === "viewer" && sameModelBinding(state.selection, state.confirmedBinding) && sameModelBinding(state.selection, state.modelBinding);
}

export function savedFloorplanBinding(saved: Record<string, any>) {
  const variantId = String(saved.selectedVariant?.variantId || "");
  const version = (Array.isArray(saved.floorplanVersions) ? saved.floorplanVersions : []).find((entry: any) => entry.id === saved.selectedFloorplanVersionId && entry.sourceVariantId === variantId);
  const selection = saved.generatedFloorplan?.provider === "preset" ? saved.generatedFloorplan : version ? { ...version.result, sourceVariantId: version.sourceVariantId, sourceImageHash: version.sourceImageHash, userPrompt: version.submittedRequirement } : saved.generatedFloorplan;
  return floorplanModelBinding(variantId, selection, version?.id, saved.aiFloorplan, version);
}

// Keep the existing geometry/blob restoration checks, then enforce the
// committed selection. A streaming preview must never become a saved model.
export function restoreBoundModelSession(saved: Record<string, any>, manualBlueprint?: Parameters<typeof restoreModelSession>[1]) {
  const binding = savedFloorplanBinding(saved);
  const candidate = saved.currentPascalScene || saved.pascalScene;
  const metadata = candidate?.nodes?.building_house?.metadata;
  const recorded = metadata?.modelBinding;
  const confirmed = saved.confirmedBinding;
  // Old alias sets may include a stale generatedFloorplan URL after a version
  // switch. Only the selected version's canonical source can migrate a model.
  const legacySourceMatches = !recorded && metadata?.sourceDrawing === binding?.canonicalImageUrl && (!metadata?.variantId || metadata.variantId === binding?.variantId);
  const version = (saved.floorplanVersions || []).find((entry: any) => entry.id === saved.selectedFloorplanVersionId);
  const expectedDraft = saved.generatedFloorplan?.provider === "preset" ? saved.generatedFloorplan.userPrompt : version?.submittedRequirement || saved.generatedFloorplan?.userPrompt;
  const draftMatches = typeof saved.customRequirement !== "string" || typeof expectedDraft !== "string" || saved.customRequirement.trim() === expectedDraft.trim();
  const committed = saved.floorPlanConfirmed === true && saved.model3DLoaded === true && saved.modelGenerationPhase === "completed";
  const bound = Boolean(binding && draftMatches && (!metadata?.sourceDrawing || metadata.sourceDrawing === binding.canonicalImageUrl) && (sameModelBinding(binding, recorded) || legacySourceMatches) && (!saved.modelBinding || sameModelBinding(binding, saved.modelBinding)) && (!confirmed || sameModelBinding(binding, confirmed)));
  const result = restoreModelSession(committed && bound ? saved : { ...saved, currentPascalScene: undefined, pascalScene: undefined, model3DLoaded: false }, committed && bound ? manualBlueprint : undefined);
  if (!result.modelLoaded || !result.scene) return { ...result, confirmed: false, binding: null, step: Math.min(result.step, 1) };
  Object.assign(result.scene.nodes.building_house.metadata ||= {}, { modelBinding: binding });
  return { ...result, confirmed: true, binding };
}
