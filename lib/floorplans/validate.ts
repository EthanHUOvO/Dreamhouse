import type { SceneGraph } from "../types";
import { polygonArea } from "./types";
export type BaselineReport = {
  valid: boolean;
  issues: string[];
  sourceImage: string;
  factory: string;
  bounds: { width: number; height: number };
  zones: number;
  walls: number;
  doors: number;
  windows: number;
  areas: Record<string, number>;
};
const ONE: Record<string, number> = {
  卧室: 19.1,
  客餐厅: 27.1,
  厨房: 14.8,
  卫生间: 6.9,
  储物间: 3.2,
  阳台: 5.6,
};
export function validateBaselineFloorplan(
  scene: SceneGraph,
  type: "one" | "two" | "three",
): BaselineReport {
  const values = Object.values(scene.nodes),
    slab: any = values.find((n) => n.type === "slab"),
    points = (slab?.polygon || []) as [number, number][],
    xs = points.map((p) => p[0]),
    zs = points.map((p) => p[1]),
    zones = values.filter((n) => n.type === "zone") as any[],
    areas = Object.fromEntries(
      zones.map((z) => [
        String(z.name),
        +polygonArea(z.polygon || []).toFixed(2),
      ]),
    ),
    issues: string[] = [];
  const building: any = scene.nodes.building_house;
  const optionIndex = Number(building?.metadata?.optionIndex || 1);
  if (type === "one" && optionIndex === 1)
    for (const [name, expected] of Object.entries(ONE)) {
      if (!(name in areas)) issues.push(`缺少空间：${name}`);
      else if (
        Math.abs(areas[name] - expected) > Math.max(0.65, expected * 0.08)
      )
        issues.push(
          `${name} 面积 ${areas[name]}㎡ 与参考 ${expected}㎡ 差异过大`,
        );
    }
  const sourceImage = String(building?.metadata?.sourceDrawing || ""),
    factory = String(building?.metadata?.factory || "");
  if (factory.startsWith("createScenarioScene"))
    issues.push("仍在使用旧 Scenario Scene");
  return {
    valid: issues.length === 0,
    issues,
    sourceImage,
    factory,
    bounds: {
      width: +(Math.max(...xs) - Math.min(...xs)).toFixed(3),
      height: +(Math.max(...zs) - Math.min(...zs)).toFixed(3),
    },
    zones: zones.length,
    walls: values.filter((n) => n.type === "wall").length,
    doors: values.filter((n) => n.type === "door").length,
    windows: values.filter((n) => n.type === "window").length,
    areas,
  };
}
