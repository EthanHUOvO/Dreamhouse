import type { SceneGraph } from "../types";
import { createOneBedroomFloorplanScene } from "./one-bedroom";
import { createTwoBedroomFloorplanScene } from "./two-bedroom";
import { createThreeBedroomFloorplanScene } from "./three-bedroom";
import { compileFloorplanToPascal, createVariantFloorplanScene, getFloorplanSpec, PascalFloorplanVersion } from "./variants";
import { compilePascalV2Floorplan, createPascalV2Scene, getPascalV2Spec, pascalV2Catalog, validatePascalV2Spec } from "./pascal-v2/index";
import { importedTwoSceneUrls, loadImportedTwoScene } from "./pascal-v2/imported-two";
import { importedThreeCatalog, importedThreeSceneUrls, loadImportedThreeScene } from "./pascal-v2/imported-three";
import { importedOneCatalog, importedOneSceneUrls, loadImportedOneScene } from "./pascal-v2/imported-one";
import {
  blueprintWallCoordinateError,
  blueprintToFloorplanSpec,
  compileBlueprintToPascal,
  createFloorplanBlueprint,
  sceneToFloorplanBlueprint,
  recompileSceneFromBlueprint,
  validateVariantBlueprint,
} from "./blueprint";
export {
  createOneBedroomFloorplanScene,
  createTwoBedroomFloorplanScene,
  createThreeBedroomFloorplanScene,
  createVariantFloorplanScene,
  compileFloorplanToPascal,
  getFloorplanSpec,
  PascalFloorplanVersion,
  compilePascalV2Floorplan,
  createPascalV2Scene,
  getPascalV2Spec,
  pascalV2Catalog,
  validatePascalV2Spec,
  importedTwoSceneUrls,
  loadImportedTwoScene,
  importedThreeSceneUrls,
  importedThreeCatalog,
  importedOneSceneUrls,
  importedOneCatalog,
  loadImportedOneScene,
  loadImportedThreeScene,
  blueprintWallCoordinateError,
  blueprintToFloorplanSpec,
  compileBlueprintToPascal,
  createFloorplanBlueprint,
  sceneToFloorplanBlueprint,
  recompileSceneFromBlueprint,
  validateVariantBlueprint,
};
export type { BlueprintCalibration, FloorplanBlueprint } from "./types";
export {
  addPartitionWall,
  bridgeWallGap,
  createWallEditTransaction,
  describeWall,
  extendWallEndpoint,
  mergeCollinearWalls,
  moveWallParallel,
  rebuildAffectedZones,
  removeWallSafe,
  replaceWallChainWithSingleWall,
  snapWallPoint,
  straightenWallChain,
  trimWallEndpoint,
  updateWallEndpoint,
} from "./wall-edit";
export type {
  WallEditResult,
  WallEditTransaction,
  WallEndpoint,
  WallOpeningPolicy,
} from "./wall-edit";
export {
  clearSavedVariantDesign,
  createDefaultCalibration,
  getBaseVariantBlueprint,
  getGoldenVariantBlueprint,
  goldenVariantIds,
  loadSavedVariantDesign,
  loadVariantBlueprint,
  loadVariantBlueprintState,
  saveVariantDesign,
  validateVariantCalibration,
  variantStorageKey,
} from "./variant-persistence";
export type FloorplanType = "one" | "two" | "three";
export function createFloorplanScene(type: FloorplanType, variant?: { variantId: string; optionIndex: number; imageUrl: string; imageHash?: string | null; residenceType?: FloorplanType }): SceneGraph {
  if (variant) return createVariantFloorplanScene({ ...variant, residenceType: variant.residenceType || type, imageDataUrl: null } as any);
  if (type === "two") return createTwoBedroomFloorplanScene();
  if (type === "three") return createThreeBedroomFloorplanScene();
  return createOneBedroomFloorplanScene();
}
