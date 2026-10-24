import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareDreamHouseScene, validateImportedScene } from "../floorplans/pascal-v2/imported-two";
import type { SceneGraph, SelectedVariant } from "../types";

type PresetEntry = { variant: SelectedVariant; imageHash: string; sceneFile: string };
let presetIndex: Promise<Map<string, PresetEntry>> | undefined;

async function loadPresetIndex() {
  if (!presetIndex) {
    presetIndex = (async () => {
      const entries = await Promise.all((['one', 'two', 'three'] as const).flatMap((residenceType) => Array.from({ length: 8 }, async (_, index) => {
        const option = String(index + 1).padStart(2, '0');
        const imageUrl = `/preset/variants/${residenceType}/option-${option}.png`;
        const bytes = await readFile(join(process.cwd(), 'public', imageUrl));
        const imageHash = createHash('sha256').update(bytes).digest('hex');
        const sceneName = residenceType === 'two' ? `two-${option}.pascal.json` : `option-${option}.pascal.json`;
        return { imageHash, sceneFile: join(process.cwd(), 'public', 'preset', 'pascal-v2', residenceType, sceneName), variant: { residenceType, variantId: `${residenceType}-option-${option}`, optionIndex: index + 1, imageUrl, imageDataUrl: null, imageHash } };
      })));
      return new Map(entries.map((entry) => [entry.imageHash, entry]));
    })().catch((error) => { presetIndex = undefined; throw error; });
  }
  return presetIndex;
}

// Recognition is based exclusively on actual image bytes and server-owned
// assets. Client hashes, source URLs, and fallback scenes are never consulted.
export async function resolveVerifiedPresetScene(sourceImageDataUrl: string, sessionId: string) {
  const base64 = /^data:image\/(?:png|jpeg|webp);base64,([a-z0-9+/]+={0,2})$/i.exec(sourceImageDataUrl)?.[1];
  if (!base64 || base64.length > 28 * 1024 * 1024) return null;
  const imageHash = createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex');
  const entry = (await loadPresetIndex()).get(imageHash);
  if (!entry) return null;
  const scene: SceneGraph = JSON.parse(await readFile(entry.sceneFile, 'utf8'));
  const officialSchema = entry.variant.residenceType !== 'two';
  validateImportedScene(scene, entry.variant.variantId, '内置', officialSchema);
  prepareDreamHouseScene(scene, entry.variant, '内置');
  validateImportedScene(scene, entry.variant.variantId, '内置', officialSchema);
  Object.assign(scene.nodes.building_house.metadata ||= {}, {
    floorplanSource: 'verified-preset',
    sourceImageHash: imageHash,
    sourceImageVerification: 'sha256-server-bytes',
    sourceDrawing: entry.variant.imageUrl,
    model: 'catalog-pascal-v2',
    generatedAt: new Date().toISOString(),
  });
  return { source: 'verified-preset', status: 'catalog-loaded', variantId: entry.variant.variantId, sessionId, sourceImageHash: imageHash, model: 'catalog-pascal-v2', scene, validation: { valid: true, issues: [], warnings: ['内置图像与服务器户型目录逐字节匹配，已载入对应的原有三维模型。'] } };
}
