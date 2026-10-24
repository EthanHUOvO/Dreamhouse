import type { SceneGraph, SelectedVariant } from "../../types";
import { loadImportedScene } from "./imported-two";

/** Stable three-bedroom catalog. The JSON files remain the interactive source; GLB is preview-only. */
export const importedThreeSceneUrls: Record<string, string> = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const option = String(index + 1).padStart(2, "0");
    return [`three-option-${option}`, `/preset/pascal-v2/three/option-${option}.pascal.json`];
  }),
);

/** Stable catalog used by diagnostics and future server-side scene resolvers. */
export const importedThreeCatalog = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const option = String(index + 1).padStart(2, "0");
    const variantId = `three-option-${option}`;
    return [variantId, {
      variantId,
      sourceImage: `/preset/variants/three/option-${option}.png`,
      pascalScene: importedThreeSceneUrls[variantId],
      previewGlb: `/preset/pascal-v2/three/option-${option}.glb`,
      sceneVersion: "pascal-v2",
      validationStatus: "runtime-schema-validated",
    }];
  }),
);

export function loadImportedThreeScene(variant: SelectedVariant): Promise<SceneGraph> {
  return loadImportedScene(variant, importedThreeSceneUrls, "三居", true);
}
