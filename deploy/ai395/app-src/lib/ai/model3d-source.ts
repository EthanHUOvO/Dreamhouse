// Hydration may refresh legacy catalog geometry, but generated or explicitly
// verified scenes must remain authoritative when STEP3/STEP4 changes state.
export function isAuthoritativeModelSceneSource(source: unknown) {
  return ["imported-pascal-json", "verified-preset", "mcp-qwen38-vulkan", "qwen-image-import", "source-driven-pascal-v2", "saved-manual-blueprint"].includes(String(source || ""));
}

export function shouldHydrateImportedPreset(source: unknown, blueprintSource = "base") {
  return blueprintSource !== "saved" && source !== "fallback-prebuilt" && !isAuthoritativeModelSceneSource(source);
}

export function canProceedAfterModelGeneration(state: { phase: string; modelLoaded: boolean; experience: string }) {
  if (state.phase === "generating" || state.phase === "error") return false;
  // Persisted valid sessions may hydrate with an idle phase and a loaded model.
  return state.modelLoaded || state.experience === "viewer";
}

export type OriginalFloorplanSelection = {
  provider: "preset";
  model: "original-preset";
  url: string;
  ephemeral: false;
  fallback: false;
  fallbackReason?: string;
  sourceVariantId: string;
  sourceImageHash: string;
  userPrompt: string;
  warnings: string[];
  geometryVerified: false;
};

export function originalFloorplanSelection(variant: { variantId: string; imageUrl: string }, imageHash: string, draft: string): OriginalFloorplanSelection {
  return { provider: "preset", model: "original-preset", url: variant.imageUrl, ephemeral: false, fallback: false, sourceVariantId: variant.variantId, sourceImageHash: imageHash, userPrompt: draft.trim(), geometryVerified: false, warnings: [draft.trim() ? "当前采用原始户型，文字修改要求尚未执行。进入3D空间后可手动调整可编辑隔墙和门。" : "当前采用原始户型，进入3D空间后可手动调整可编辑隔墙和门。"] };
}

export function originalFloorplanMatches(selection: { provider: string; sourceVariantId?: string; sourceImageHash?: string; userPrompt?: string; url: string } | null, variant: { variantId: string; imageUrl: string; imageHash: string | null }, draft: string) {
  return Boolean(selection?.provider === "preset" && selection.sourceVariantId === variant.variantId && selection.sourceImageHash === variant.imageHash && selection.url === variant.imageUrl && selection.userPrompt === draft.trim());
}

export function canSelectOriginalFloorplan(state: { variantLoading: boolean; imageJobActive: boolean; layoutJobActive: boolean; modelJobActive: boolean; selectionActive: boolean; progressActive: boolean }) {
  return !Object.values(state).some(Boolean);
}

type FloorplanIdentity = { url: string; provider?: string; sourceVariantId?: string; sourceImageHash?: string; userPrompt?: string };
type AiFloorplanIdentity = { url: string; sourceVariantId?: string; sourceImageHash?: string; prompt?: string };
type SelectedVersionIdentity = { id: string; sourceVariantId: string; sourceImageHash: string; submittedRequirement: string; result: { url: string } };

function floorplanSourceIdentity(selection: FloorplanIdentity, ai: AiFloorplanIdentity | null | undefined, variantId: string, version?: SelectedVersionIdentity) {
  const sameSelection = selection.sourceVariantId === variantId && Boolean(selection.sourceImageHash);
  const sameVersion = Boolean(sameSelection && version?.sourceVariantId === variantId && version.sourceImageHash === selection.sourceImageHash && version.submittedRequirement === selection.userPrompt);
  const sameAi = Boolean(sameSelection && ai?.sourceVariantId === variantId && ai.sourceImageHash === selection.sourceImageHash && ai.prompt === selection.userPrompt && (!version || sameVersion && version.result.url === ai.url));
  return { sameVersion, sameAi };
}

export function canonicalFloorplanSource(selection: FloorplanIdentity, ai: AiFloorplanIdentity | null | undefined, variantId: string, version?: SelectedVersionIdentity) {
  if (selection.provider === "preset" || !selection.url.startsWith("blob:")) return selection.url;
  const identity = floorplanSourceIdentity(selection, ai, variantId, version);
  if (identity.sameVersion && version && !version.result.url.startsWith("blob:")) return version.result.url;
  if (identity.sameAi && ai && !ai.url.startsWith("blob:")) return ai.url;
  return selection.url;
}

export function confirmedFloorplanSources(saved: Record<string, any>) {
  const variantId = String(saved.selectedVariant?.variantId || "");
  const version = (Array.isArray(saved.floorplanVersions) ? saved.floorplanVersions : []).find((entry) => entry.id === saved.selectedFloorplanVersionId) as SelectedVersionIdentity | undefined;
  const ai = saved.aiFloorplan as AiFloorplanIdentity | null | undefined;
  let selection = saved.generatedFloorplan as FloorplanIdentity | null | undefined;
  if (!selection?.url && version?.sourceVariantId === variantId) selection = { url: version.result.url, sourceVariantId: version.sourceVariantId, sourceImageHash: version.sourceImageHash, userPrompt: version.submittedRequirement };
  if (!selection?.url && ai?.sourceVariantId === variantId) selection = { url: ai.url, sourceVariantId: ai.sourceVariantId, sourceImageHash: ai.sourceImageHash, userPrompt: ai.prompt };
  if (!selection?.url || selection.sourceVariantId && selection.sourceVariantId !== variantId) return [];
  const sources = [selection.url];
  if (selection.provider !== "preset") {
    const identity = floorplanSourceIdentity(selection, ai, variantId, version);
    if (identity.sameAi && ai) sources.push(ai.url);
    if (identity.sameVersion && version) sources.push(version.result.url);
  }
  return [...new Set(sources)];
}
