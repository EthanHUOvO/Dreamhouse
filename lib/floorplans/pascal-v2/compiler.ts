import type { SceneGraph } from "../../types";
import { compileBlueprintToPascal, createFloorplanBlueprint } from "../blueprint";
import type { PascalV2Spec } from "./types";

/** Compile a source-driven V2 spec through the existing Pascal engine. */
export function compilePascalV2Floorplan(spec: PascalV2Spec): SceneGraph {
  if (spec.schema !== "dreamhouse-pascal-floorplan/v2") {
    throw new Error(`无效的 Pascal V2 户型定义：${spec.id}`);
  }
  if (!spec.sourceImage || spec.walls.length === 0 || spec.rooms.length === 0) {
    throw new Error(`户型 ${spec.id} 的 Pascal V2 结构尚未配置完成`);
  }
  // Geometry validation is performed by the shared Blueprint compiler. V2's
  // first pass deliberately omits furniture so room and wall errors remain visible.
  return compileBlueprintToPascal(createFloorplanBlueprint(spec, []));
}

export function validatePascalV2Spec(spec: PascalV2Spec) {
  const issues: string[] = [];
  if (spec.schema !== "dreamhouse-pascal-floorplan/v2") issues.push("schema 无效");
  if (spec.outerPolygon.length < 3) issues.push("外轮廓无效");
  if (spec.walls.length < 4) issues.push("墙体数量不足");
  for (const opening of [...spec.doors, ...spec.windows]) {
    const wall = spec.walls.find((candidate) => candidate.id === opening.wallId);
    if (!wall) issues.push(`${opening.id} 未绑定墙体`);
    else {
      const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
      const offset = opening.distance - opening.width / 2;
      if (offset < -0.01 || offset + opening.width > length + 0.01) issues.push(`${opening.id} 超出墙体范围`);
    }
  }
  return { valid: issues.length === 0, issues };
}
