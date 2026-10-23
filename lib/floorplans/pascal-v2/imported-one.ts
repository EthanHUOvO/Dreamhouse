import type { SceneGraph, SelectedVariant } from "../../types";
import { loadImportedScene } from "./imported-two";

/** Stable one-bedroom Pascal V2 scene mapping. JSON is the interaction source; GLB is preview-only. */
export const importedOneSceneUrls: Record<string, string> = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const option = String(index + 1).padStart(2, "0");
    return [`one-option-${option}`, `/preset/pascal-v2/one/option-${option}.pascal.json`];
  }),
);

export const importedOneCatalog = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const option = String(index + 1).padStart(2, "0");
    const variantId = `one-option-${option}`;
    return [variantId, {
      variantId,
      category: "one",
      displayName: `一居室方案${option}`,
      sourceImage: `/preset/variants/one/option-${option}.png`,
      pascalScene: importedOneSceneUrls[variantId],
      previewGlb: `/preset/pascal-v2/one/option-${option}.glb`,
      sceneVersion: "pascal-v2",
      validationStatus: "runtime-schema-validated",
    }];
  }),
);

export function loadImportedOneScene(variant: SelectedVariant): Promise<SceneGraph> {
  return loadImportedScene(variant, importedOneSceneUrls, "一居", true);
}
