import type { SelectedVariant } from "../../types";
import type { PascalV2Spec } from "./types";
import { compilePascalV2Floorplan } from "./compiler";
import { floorplan as one01 } from "./one/option-01";
import { floorplan as one02 } from "./one/option-02";
import { floorplan as one03 } from "./one/option-03";
import { floorplan as one04 } from "./one/option-04";
import { floorplan as one05 } from "./one/option-05";
import { floorplan as one06 } from "./one/option-06";
import { floorplan as one07 } from "./one/option-07";
import { floorplan as one08 } from "./one/option-08";
import { floorplan as two01 } from "./two/option-01";
import { floorplan as two02 } from "./two/option-02";
import { floorplan as two03 } from "./two/option-03";
import { floorplan as two04 } from "./two/option-04";
import { floorplan as two05 } from "./two/option-05";
import { floorplan as two06 } from "./two/option-06";
import { floorplan as two07 } from "./two/option-07";
import { floorplan as two08 } from "./two/option-08";
import { floorplan as three01 } from "./three/option-01";
import { floorplan as three02 } from "./three/option-02";
import { floorplan as three03 } from "./three/option-03";
import { floorplan as three04 } from "./three/option-04";
import { floorplan as three05 } from "./three/option-05";
import { floorplan as three06 } from "./three/option-06";
import { floorplan as three07 } from "./three/option-07";
import { floorplan as three08 } from "./three/option-08";
import overrides from "./overrides.json";

export const pascalV2Catalog: PascalV2Spec[] = [one01, one02, one03, one04, one05, one06, one07, one08, two01, two02, two03, two04, two05, two06, two07, two08, three01, three02, three03, three04, three05, three06, three07, three08].map((spec) => ({ ...spec, ...((overrides as Record<string, Partial<PascalV2Spec>>)[spec.id] || {}) }));

export function getPascalV2Spec(type: SelectedVariant["residenceType"], optionIndex = 1) {
  const id = `${type}-option-${String(Math.max(1, Math.min(8, optionIndex))).padStart(2, "0")}`;
  const spec = pascalV2Catalog.find((item) => item.id === id);
  if (!spec) throw new Error(`该户型的三维结构尚未配置完成：${id}`);
  return spec;
}

export function createPascalV2Scene(variant: SelectedVariant): ReturnType<typeof compilePascalV2Floorplan> {
  const spec = getPascalV2Spec(variant.residenceType, variant.optionIndex);
  const scene = compilePascalV2Floorplan({ ...spec, sourceImage: variant.imageUrl });
  const metadata = (scene.nodes.building_house.metadata ||= {});
  metadata.floorplanVersion = "v2";
  metadata.sourceDrawing = variant.imageUrl;
  metadata.sourceImageHash = variant.imageHash;
  metadata.variantId = variant.variantId;
  metadata.optionIndex = variant.optionIndex;
  metadata.floorplanSource = "source-driven-pascal-v2";
  return scene;
}

export type { PascalV2Spec } from "./types";
export { compilePascalV2Floorplan, validatePascalV2Spec } from "./compiler";
