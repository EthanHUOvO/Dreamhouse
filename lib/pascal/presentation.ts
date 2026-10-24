/** Display-only camera helpers. Never rewrite scene geometry or materials. */
type Point3 = [number, number, number];
type PresentationNode = {
  id?: string;
  type?: string;
  parentId?: string | null;
  position?: number[];
  rotation?: number[];
  scale?: number[];
  start?: number[];
  end?: number[];
  polygon?: number[][];
  height?: number;
  elevation?: number;
  metadata?: Record<string, any>;
};
type PresentationScene = { nodes: Record<string, PresentationNode> };

export type OverviewBounds = { min: Point3; max: Point3 };
export type OverviewWallMode = "translucent" | "up";

export function presentationWallMode(walkthrough: boolean, overview: OverviewWallMode): OverviewWallMode {
  return walkthrough ? "up" : overview;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const axis = (value: number[] | undefined, index: number, fallback: number) => finite(value?.[index]) ? value![index] : fallback;

function parentWorldPoint(scene: PresentationScene, node: PresentationNode, point: Point3): Point3 {
  let [x, y, z] = point;
  let parentId = node.parentId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = scene.nodes[parentId];
    if (!parent) break;
    x *= axis(parent.scale, 0, 1);
    y *= axis(parent.scale, 1, 1);
    z *= axis(parent.scale, 2, 1);
    // Three's default Euler XYZ rotation applies Z, then Y, then X to points.
    const rz = axis(parent.rotation, 2, 0), ry = axis(parent.rotation, 1, 0), rx = axis(parent.rotation, 0, 0);
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    x += axis(parent.position, 0, 0);
    y += axis(parent.position, 1, 0);
    z += axis(parent.position, 2, 0);
    parentId = parent.parentId;
  }
  return [x, y, z];
}

/** Frame the single-level footprint, excluding site planes and furniture outliers. */
export function overviewBounds(scene: PresentationScene): OverviewBounds {
  const points: Point3[] = [];
  for (const node of Object.values(scene.nodes)) {
    if (node.type === "wall" && node.start && node.end) {
      const height = finite(node.height) && node.height > 0 ? node.height : 2.8;
      for (const point of [node.start, node.end]) {
        if (!finite(point[0]) || !finite(point[1])) continue;
        points.push(parentWorldPoint(scene, node, [point[0], 0, point[1]]));
        points.push(parentWorldPoint(scene, node, [point[0], height, point[1]]));
      }
    } else if (node.type === "slab" && Array.isArray(node.polygon)) {
      for (const point of node.polygon) {
        if (finite(point[0]) && finite(point[1])) points.push(parentWorldPoint(scene, node, [point[0], finite(node.elevation) ? node.elevation : 0, point[1]]));
      }
    }
  }
  const usable = points.filter((point) => point.every(Number.isFinite));
  if (!usable.length) return { min: [-3, 0, -3], max: [3, 2.8, 3] };
  const min: Point3 = [Infinity, Infinity, Infinity], max: Point3 = [-Infinity, -Infinity, -Infinity];
  for (const point of usable) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], point[i]);
    max[i] = Math.max(max[i], point[i]);
  }
  // A small display margin also includes wall thickness at outline endpoints.
  min[0] -= 0.18; min[2] -= 0.18;
  max[0] += 0.18; max[2] += 0.18;
  if (max[1] - min[1] < 0.1) max[1] = min[1] + 2.8;
  return { min, max };
}

export function overviewSceneKey(scene: PresentationScene): string {
  const building = scene.nodes.building_house || Object.values(scene.nodes).find((node) => node.type === "building");
  const metadata = building?.metadata || {};
  return JSON.stringify([metadata.variantId || metadata.floorplanBlueprint?.id || building?.id || "scene", metadata.mcpSessionId || metadata.sourceImageHash || metadata.sourceDrawing || ""]);
}

/** Fit all eight box corners in the perspective viewport with an 18% margin. */
export function overviewCamera(bounds: OverviewBounds, aspect: number, fovDegrees = 50) {
  const target = bounds.min.map((value, i) => (value + bounds.max[i]) / 2) as Point3;
  const norm = Math.hypot(1, 1.45, 1);
  const direction: Point3 = [1 / norm, 1.45 / norm, 1 / norm];
  const right: Point3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
  const up: Point3 = [-direction[1] * Math.SQRT1_2, (direction[0] + direction[2]) * Math.SQRT1_2, -direction[1] * Math.SQRT1_2];
  const vertical = Math.tan(Math.max(20, Math.min(85, finite(fovDegrees) ? fovDegrees : 50)) * Math.PI / 360);
  const horizontal = vertical * (finite(aspect) && aspect > 0 ? aspect : 1);
  const dot = (a: Point3, b: Point3) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  let distance = 1;
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
    const offset: Point3 = [x - target[0], y - target[1], z - target[2]];
    const depth = dot(offset, direction);
    distance = Math.max(distance, depth + Math.abs(dot(offset, right)) / (horizontal * 0.82), depth + Math.abs(dot(offset, up)) / (vertical * 0.82));
  }
  const position = target.map((value, i) => value + direction[i] * distance) as Point3;
  return { position, target, distance, minDistance: Math.max(0.6, distance * 0.2), maxDistance: Math.max(12, distance * 3) };
}
