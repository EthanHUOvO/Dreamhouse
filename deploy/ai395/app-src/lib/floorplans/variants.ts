import type { SceneGraph, SelectedVariant } from "../types";
import { type FloorplanSpec } from "./types";
import { compileBlueprintToPascal, createFloorplanBlueprint } from "./blueprint";
import { compilePascalV2Floorplan, createPascalV2Scene, getPascalV2Spec } from "./pascal-v2/index";
import type { PascalV2Spec } from "./pascal-v2/types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Geometry source switch. Legacy remains available only for rollback work. */
export const PascalFloorplanVersion = "v2" as const;

/**
 * The imported drawing is the source of truth. Until the image parser returns
 * wall coordinates, each option receives a deterministic, real SceneGraph
 * variant (including geometry, not metadata only) from the matching base plan.
 */
export function getFloorplanSpec(
  type: SelectedVariant["residenceType"],
  optionIndex = 1,
  sourceImage?: string,
): FloorplanSpec {
  if (PascalFloorplanVersion === "v2") {
    const spec = clone(getPascalV2Spec(type, optionIndex)) as PascalV2Spec;
    spec.sourceImage = sourceImage || spec.sourceImage;
    return spec;
  }
  throw new Error(`Pascal V2 已启用，禁止读取旧版户型几何：${type}-option-${optionIndex}`);
}

export function createVariantFloorplanScene(variant: SelectedVariant): SceneGraph {
  if (PascalFloorplanVersion === "v2") return createPascalV2Scene(variant);
  const spec = getFloorplanSpec(variant.residenceType, variant.optionIndex, variant.imageUrl);
  console.info("[3D FLOORPLAN REBUILD]", {
    floorplanId: variant.variantId,
    sourceImage: variant.imageUrl,
    hasStructuredSpec: true,
    roomCount: spec.rooms.length,
    outerWallCount: spec.walls.filter((wall) => wall.structural === "load_bearing").length,
    innerWallCount: spec.walls.filter((wall) => wall.structural !== "load_bearing").length,
    doorCount: spec.doors.length,
    windowCount: spec.windows.length,
    scaleMethod: "meter / rebuilt source catalog",
    validationStatus: "catalog-ready",
  });
  const scene = compileBlueprintToPascal(createFloorplanBlueprint(spec));
  const metadata = (scene.nodes.building_house.metadata ||= {});
  metadata.sourceDrawing = variant.imageUrl;
  metadata.sourceImageHash = variant.imageHash;
  metadata.variantId = variant.variantId;
  metadata.optionIndex = variant.optionIndex;
  metadata.floorplanSource = "selected-variant-image";
  scene.nodes.level_ground.metadata = {
    ...(scene.nodes.level_ground.metadata || {}),
    sourceImage: variant.imageUrl,
    variantId: variant.variantId,
    sourceImageHash: variant.imageHash,
  };
  return scene;
}

export function compileFloorplanToPascal(
  spec: FloorplanSpec,
  variant: SelectedVariant,
): SceneGraph {
  const scene = (spec as PascalV2Spec).schema === "dreamhouse-pascal-floorplan/v2"
    ? compilePascalV2Floorplan({ ...(spec as PascalV2Spec), sourceImage: variant.imageUrl })
    : compileBlueprintToPascal(createFloorplanBlueprint(spec));
  const metadata = (scene.nodes.building_house.metadata ||= {});
  metadata.sourceDrawing = variant.imageUrl;
  metadata.sourceImageHash = variant.imageHash;
  metadata.variantId = variant.variantId;
  metadata.optionIndex = variant.optionIndex;
  metadata.floorplanSource = "qwen-image-import";
  if ((spec as PascalV2Spec).schema === "dreamhouse-pascal-floorplan/v2") {
    metadata.floorplanVersion = "v2";
    metadata.floorplanSource = "source-driven-pascal-v2";
  }
  return scene;
}
