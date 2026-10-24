import type { SceneGraph, SceneNode } from "../types";
import { sceneToFloorplanBlueprint, validateVariantBlueprint } from "./blueprint";
import { addPartitionWall } from "./wall-edit";
import { addDoor, wallLength } from "./door-edit";
import { polygonArea, type Point } from "./types";

// Deliberately bounded MVP: the imported one-option-01 living room, not a
// general polygon editor. The model selects a checked plan; it cannot author
// arbitrary coordinates, delete furniture, or relax validation.
const EPS = 1e-6;
const TARGET = "zone_one01_living";
const STUDY = "zone_one01_study_ai";
const EAST = "wall_one01_study_ai_east";
const SOUTH = "wall_one01_study_ai_south";
const DOOR = "door_one01_study_ai";
const WALL_THICKNESS = 0.12;
// 60 cm engineering acceptance for this MVP, not a statutory building rule.
const WALK_RADIUS = 0.30;
const EXPECTED_LIVING: Point[] = [[1.970155, 0.965035], [3.289302, 0.965035], [3.289302, 6.939061], [0, 6.939061], [0, 2.205794], [1.970155, 2.205794]];
export const ONE01_ENTRY_PROTECTED: Point[] = [[1.970155, 0.965035], [3.289302, 0.965035], [3.289302, 2.205794], [1.970155, 2.205794]];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export type FurnitureMove = { furnitureId: string; delta: Point };
export type StructureEditCandidate = {
  id: string;
  targetRoomId: string;
  studyRoomId: string;
  studyPolygon: Point[];
  remainingLivingPolygon: Point[];
  areaM2: number;
  clearWidthM: number;
  door: { wallId: string; offset: number; width: number; center: Point };
  furnitureMoves: FurnitureMove[];
};
export type StructureEditPlan = { candidateId: string; inputFingerprint: string; furnitureMoves?: FurnitureMove[] };
export type StructureEditValidation = {
  valid: boolean;
  checks: Record<string, boolean>;
  originalLivingAreaM2: number;
  remainingLivingAreaM2: number;
  studyAreaM2: number;
  doorReachable: boolean;
  retainedFurnitureBlocks: number;
  preservedNodeCount: number;
  clearanceRadiusM: number;
  pathSamples: Point[];
  originalReachableRoomIds: string[];
  editedReachableRoomIds: string[];
  originalAccessibleDoorIds: string[];
  editedAccessibleDoorIds: string[];
};
export type StructureEditResult = { ok: boolean; scene: SceneGraph; operations: Array<Record<string, unknown>>; validation: StructureEditValidation | null; issues: string[] };
type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
type FurnitureFootprint = Box & { id: string; nodeIds: string[] };

function stable(value: any): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** Includes the complete source scene, including furniture and pending edits. */
export function structureEditFingerprint(scene: SceneGraph) {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  const source = stable(scene);
  for (let index = 0; index < source.length; index++) {
    a = Math.imul(a ^ source.charCodeAt(index), 0x01000193);
    b = Math.imul(b ^ source.charCodeAt(index), 0x85ebca6b);
  }
  return `scene-${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}-${source.length}`;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0], dz = end[1] - start[1];
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point[0] - start[0] - t * dx, point[1] - start[1] - t * dz);
}

function inside(point: Point, polygon: Point[], boundary = true) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if (distanceToSegment(point, a, b) <= EPS) return boundary;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}

function orientation(a: Point, b: Point, c: Point) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function simple(polygon: Point[]) {
  if (polygon.length < 3 || polygon.some((p) => p.length !== 2 || p.some((n) => !Number.isFinite(n)))) return false;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS) return false;
    for (let j = i + 1; j < polygon.length; j++) {
      if (j === i + 1 || (i === 0 && j === polygon.length - 1)) continue;
      const c = polygon[j], d = polygon[(j + 1) % polygon.length];
      if ((orientation(a, b, c) * orientation(a, b, d) < -EPS && orientation(c, d, a) * orientation(c, d, b) < -EPS) ||
        distanceToSegment(c, a, b) < EPS || distanceToSegment(d, a, b) < EPS || distanceToSegment(a, c, d) < EPS || distanceToSegment(b, c, d) < EPS) return false;
    }
  }
  return polygonArea(polygon) >= 0.2;
}

function bbox(points: Point[]): Box {
  return { minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])), minZ: Math.min(...points.map((p) => p[1])), maxZ: Math.max(...points.map((p) => p[1])) };
}

/** Exact cell coverage for these orthogonal polygons, including concave gaps. */
function exactOrthogonalPartition(original: Point[], first: Point[], second: Point[]) {
  const polygons = [original, first, second];
  if (polygons.some((polygon) => polygon.some((p, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return Math.abs(p[0] - next[0]) > EPS && Math.abs(p[1] - next[1]) > EPS;
  }))) return false;
  const xs = [...new Set(polygons.flat().map((p) => p[0]))].sort((a, b) => a - b);
  const zs = [...new Set(polygons.flat().map((p) => p[1]))].sort((a, b) => a - b);
  for (let x = 1; x < xs.length; x++) for (let z = 1; z < zs.length; z++) {
    const p: Point = [(xs[x - 1] + xs[x]) / 2, (zs[z - 1] + zs[z]) / 2];
    const occupied = Number(inside(p, first, false)) + Number(inside(p, second, false));
    if (occupied !== Number(inside(p, original, false))) return false;
  }
  return true;
}

function overlaps(a: Box, b: Box, margin = 0) {
  return a.minX < b.maxX + margin - EPS && a.maxX > b.minX - margin + EPS && a.minZ < b.maxZ + margin - EPS && a.maxZ > b.minZ - margin + EPS;
}

/** Imported furniture is many rotated BlockNodes; never replace it with items. */
export function structureFurnitureFootprints(scene: SceneGraph): FurnitureFootprint[] {
  const groups = new Map<string, { points: Point[]; nodeIds: string[] }>();
  for (const node of Object.values(scene.nodes)) {
    if (node.type !== "block" || !node.metadata?.furnitureId) continue;
    const vertices = node.topology?.vertices;
    if (!Array.isArray(vertices) || !vertices.length || !Array.isArray(node.position)) throw new Error(`家具 ${node.id} footprint UNKNOWN，拒绝修改`);
    const id = String(node.metadata.furnitureId), yaw = Number(Array.isArray(node.rotation) ? node.rotation[1] : node.rotation || 0);
    const cos = Math.cos(yaw), sin = Math.sin(yaw), scale = node.scale || [1, 1, 1];
    const group = groups.get(id) || { points: [], nodeIds: [] };
    for (const vertex of vertices) {
      const x = Number(vertex.position?.[0]) * Number(scale[0]), z = Number(vertex.position?.[2]) * Number(scale[2]);
      const point: Point = [Number(node.position[0]) + cos * x + sin * z, Number(node.position[2]) - sin * x + cos * z];
      if (point.some((v) => !Number.isFinite(v))) throw new Error(`家具 ${node.id} transform 无效`);
      group.points.push(point);
    }
    group.nodeIds.push(node.id);
    groups.set(id, group);
  }
  return [...groups].map(([id, group]) => ({ id, ...bbox(group.points), nodeIds: group.nodeIds.sort() })).sort((a, b) => a.id.localeCompare(b.id));
}

function compatibilityIssues(scene: SceneGraph) {
  const issues: string[] = [];
  if (scene.nodes.building_house?.metadata?.variantId !== "one-option-01") issues.push("仅支持已导入的 one-option-01，其他户型 UNKNOWN");
  const living = scene.nodes[TARGET];
  if (!living || stable(living.polygon) !== stable(EXPECTED_LIVING)) issues.push("客餐厅已修改或凹形边界不匹配，需重新规划");
  if (!living?.parentId || scene.nodes[living.parentId]?.type !== "level") issues.push("客餐厅缺少实际楼层");
  // Existing walkthrough helpers use floor-local coordinates directly. Avoid
  // inventing world-offset support in this patch or leaving a displaced spawn.
  const level = scene.nodes[String(living?.parentId)], building = scene.nodes.building_house;
  if ([level, building].some((node) => (node?.position || [0, 0, 0]).some((v: number) => !Number.isFinite(Number(v)) || Math.abs(Number(v)) > EPS) || (Array.isArray(node?.rotation) ? node.rotation : [0, Number(node?.rotation || 0), 0]).some((v: number) => !Number.isFinite(Number(v)) || Math.abs(Number(v)) > EPS) || (node?.scale || [1, 1, 1]).some((v: number) => !Number.isFinite(Number(v)) || Math.abs(Number(v) - 1) > EPS)) || Math.abs(Number(level?.baseElevation || 0)) > EPS) issues.push("MVP 不支持非零建筑或楼层变换：现有漫游坐标未转换，拒绝修改");
  for (const id of ["slab_one01_living", "ceiling_one01_living"]) if (stable(scene.nodes[id]?.polygon) !== stable(living?.polygon)) issues.push(`${id} 与房间边界不一致`);
  const existingWalls = Object.values(scene.nodes).filter((node) => node.type === "wall");
  if (existingWalls.length !== 16 || existingWalls.some((wall) => wall.metadata?.wall_edit_created || wall.metadata?.wall_edit_updated || wall.metadata?.wall_edit_merged_from)) issues.push("MVP 不支持已人工修改的墙体，请基于原始 one-option-01 重新规划");
  for (const id of [STUDY, EAST, SOUTH, DOOR, "slab_one01_study_ai", "ceiling_one01_study_ai"]) if (scene.nodes[id]) issues.push(`${id} 已存在，禁止重复执行`);
  try {
    const validation = validateVariantBlueprint(sceneToFloorplanBlueprint(scene));
    issues.push(...validation.issues.map((issue) => `基线 Blueprint：${issue}`));
    for (const node of Object.values(scene.nodes)) if (node.type === "door" || node.type === "window") {
      const wall = scene.nodes[String(node.hostWallId || node.wallId || node.parentId)];
      const width = Number(node.width), offset = Number(node.metadata?.blueprintOffset ?? Number(node.position?.[0]) - width / 2);
      if (!wall || wall.type !== "wall" || !Number.isFinite(width) || width <= 0 || !Number.isFinite(offset) || offset < -0.001 || offset + width > wallLength(wall) + 0.001) issues.push(`基线门窗几何无效：${node.id}`);
    }
    structureFurnitureFootprints(scene);
  } catch (error) { issues.push(error instanceof Error ? error.message : String(error)); }
  return issues;
}

function candidate(width: number, depth: number, moves: FurnitureMove[] = []): StructureEditCandidate {
  const top = 2.205794, bottom = top + depth, doorCenter: Point = [width, Math.min(top + (moves.length && width > 1.9 ? 0.6 : 1.5), bottom - 0.6)];
  const remainder: Point[] = [[1.970155, 0.965035], [3.289302, 0.965035], [3.289302, 6.939061], [0, 6.939061], [0, bottom], [width, bottom], [width, top], [1.970155, top]];
  return {
    id: `one01-study-${Math.round(width * 100)}x${Math.round(depth * 100)}${moves.length ? "-move-tv" : "-keep"}`,
    targetRoomId: TARGET, studyRoomId: STUDY,
    studyPolygon: [[0, top], [width, top], [width, bottom], [0, bottom]],
    remainingLivingPolygon: remainder.filter((point, index) => index === 0 || Math.hypot(point[0] - remainder[index - 1][0], point[1] - remainder[index - 1][1]) > EPS),
    areaM2: width * depth, clearWidthM: width - WALL_THICKNESS,
    door: { wallId: EAST, offset: doorCenter[1] - top - 0.43, width: 0.86, center: doorCenter }, furnitureMoves: clone(moves),
  };
}

function rawCandidates(scene: SceneGraph) {
  // Try preserving all original transforms first. A single prevalidated TV
  // translation is exposed only if selected and explicitly echoed by the AI.
  const choices = [candidate(1.18, 2.8), candidate(1.18, 3.0), candidate(1.20, 2.8), candidate(1.20, 3.0), candidate(1.50, 2.4), candidate(1.80, 2.2), candidate(1.970155, 2.2),
    candidate(1.970155, 2.2, [{ furnitureId: "f010", delta: [-0.6, 2.6] }]),
    candidate(1.50, 2.4, [{ furnitureId: "f010", delta: [-1.17, 3.4] }])];
  const westThickness = Number(scene.nodes.wall_one01_o09?.thickness);
  return choices.map((choice) => ({ ...choice, clearWidthM: choice.studyPolygon[1][0] - westThickness / 2 - WALL_THICKNESS / 2 }));
}

function wallCollision(scene: SceneGraph, point: Point, radius: number) {
  for (const wall of Object.values(scene.nodes)) {
    if (wall.type !== "wall") continue;
    const length = wallLength(wall), dx = wall.end[0] - wall.start[0], dz = wall.end[1] - wall.start[1];
    const along = ((point[0] - wall.start[0]) * dx + (point[1] - wall.start[1]) * dz) / length;
    const distance = Math.abs((point[0] - wall.start[0]) * dz - (point[1] - wall.start[1]) * dx) / length;
    if (distance > radius + Number(wall.thickness || 0.12) / 2 || along < -radius || along > length + radius) continue;
    const doors = Object.values(scene.nodes).filter((node) => node.type === "door" && (node.hostWallId || node.wallId || node.parentId) === wall.id);
    if (!doors.some((door) => {
      const width = Number(door.width), offset = Number(door.metadata?.blueprintOffset ?? Number(door.position?.[0]) - width / 2);
      return along >= offset + radius && along <= offset + width - radius;
    })) return true;
  }
  return false;
}

function reachablePath(scene: SceneGraph, study: Point[], living: Point[], doorCenter: Point, footprints: FurnitureFootprint[]) {
  const entry = scene.nodes.door_one01_entry, entryWall = scene.nodes[String(entry?.wallId)];
  if (!entry || !entryWall) return { path: [] as Point[], accessibleDoorIds: [] as string[] };
  const length = wallLength(entryWall), t = Number(entry.position[0]) / length;
  const start: Point = [entryWall.start[0] + (entryWall.end[0] - entryWall.start[0]) * t, entryWall.start[1] + (entryWall.end[1] - entryWall.start[1]) * t + 0.35];
  const end: Point = [doorCenter[0] - 0.35, doorCenter[1]];
  const extent = bbox(EXPECTED_LIVING), step = 0.08;
  const nx = Math.ceil((extent.maxX - extent.minX) / step) + 1, nz = Math.ceil((extent.maxZ - extent.minZ) / step) + 1;
  const point = (index: number): Point => [extent.minX + (index % nx) * step, extent.minZ + Math.floor(index / nx) * step];
  const free = (p: Point) => {
    if (!inside(p, living) && !inside(p, study)) return false;
    if (footprints.some((f) => p[0] > f.minX - WALK_RADIUS && p[0] < f.maxX + WALK_RADIUS && p[1] > f.minZ - WALK_RADIUS && p[1] < f.maxZ + WALK_RADIUS)) return false;
    return !wallCollision(scene, p, WALK_RADIUS);
  };
  const near = (p: Point) => {
    let best = -1, distance = 0.20;
    for (let index = 0; index < nx * nz; index++) {
      const q = point(index), d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < distance && free(q)) { best = index; distance = d; }
    }
    return best;
  };
  const first = near(start), last = near(end);
  if (first < 0) return { path: [] as Point[], accessibleDoorIds: [] as string[] };
  const previous = new Int32Array(nx * nz).fill(-2), queue = [first];
  previous[first] = -1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor], x = current % nx, z = Math.floor(current / nx);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, zz = z + dz, next = zz * nx + xx;
      if (xx < 0 || xx >= nx || zz < 0 || zz >= nz || previous[next] !== -2 || !free(point(next))) continue;
      previous[next] = current; queue.push(next);
    }
  }
  const accessibleDoorIds: string[] = [];
  for (const door of Object.values(scene.nodes).filter((node) => node.type === "door" && node.id !== "door_one01_entry")) {
    const sides = doorSides(scene, door);
    const signIndex = sides.findIndex((side) => side?.includes(TARGET));
    if (signIndex < 0) continue;
    const wall = scene.nodes[String(door.hostWallId || door.wallId || door.parentId)], length = wallLength(wall);
    const dx = (wall.end[0] - wall.start[0]) / length, dz = (wall.end[1] - wall.start[1]) / length;
    const offset = Number(door.metadata?.blueprintOffset ?? Number(door.position?.[0]) - Number(door.width) / 2), sign = signIndex === 0 ? -1 : 1;
    let reached = false;
    for (let along = offset + WALK_RADIUS; along <= offset + Number(door.width) - WALK_RADIUS + EPS; along += 0.04) {
      const approach: Point = [wall.start[0] + dx * along - dz * 0.35 * sign, wall.start[1] + dz * along + dx * 0.35 * sign];
      const index = near(approach);
      if (index >= 0 && previous[index] !== -2) { reached = true; break; }
    }
    if (reached) accessibleDoorIds.push(door.id);
  }
  const path: Point[] = [];
  if (last >= 0 && previous[last] !== -2) for (let index = last; index >= 0; index = previous[index]) path.push(point(index));
  return { path: path.reverse(), accessibleDoorIds: accessibleDoorIds.sort() };
}

function doorSides(scene: SceneGraph, door: SceneNode) {
  const wall = scene.nodes[String(door.hostWallId || door.wallId || door.parentId)];
  if (!wall) return [null, null] as const;
  const length = wallLength(wall), along = Number(door.metadata?.blueprintOffset ?? Number(door.position?.[0]) - Number(door.width) / 2) + Number(door.width) / 2;
  const dx = (wall.end[0] - wall.start[0]) / length, dz = (wall.end[1] - wall.start[1]) / length;
  const center: Point = [wall.start[0] + dx * along, wall.start[1] + dz * along];
  return [-1, 1].map((sign) => {
    const p: Point = [center[0] - dz * 0.18 * sign, center[1] + dx * 0.18 * sign];
    return Object.values(scene.nodes).filter((n) => n.type === "zone" && inside(p, n.polygon, false)).map((n) => n.id);
  });
}

function graphReachableRooms(scene: SceneGraph) {
  const entrySides = doorSides(scene, scene.nodes.door_one01_entry);
  const reached = new Set<string>(entrySides.flat().filter((id): id is string => typeof id === "string"));
  const edges: string[][] = [];
  for (const door of Object.values(scene.nodes).filter((node) => node.type === "door")) {
    const sides = doorSides(scene, door);
    if (sides[0]?.length === 1 && sides[1]?.length === 1) edges.push([sides[0][0], sides[1][0]]);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [a, b] of edges) if (reached.has(a) || reached.has(b)) {
      if (!reached.has(a) || !reached.has(b)) changed = true;
      reached.add(a); reached.add(b);
    }
  }
  return reached;
}

function applyCandidate(input: SceneGraph, choice: StructureEditCandidate): StructureEditResult {
  try {
    const sourceFurniture = structureFurnitureFootprints(input);
    let scene = clone(input);
    for (const move of choice.furnitureMoves) for (const id of sourceFurniture.find((f) => f.id === move.furnitureId)?.nodeIds || []) {
      scene.nodes[id].position[0] += move.delta[0]; scene.nodes[id].position[2] += move.delta[1];
    }
    const levelId = String(scene.nodes[TARGET].parentId), original = clone(scene.nodes[TARGET]);
    scene.nodes[TARGET].polygon = clone(choice.remainingLivingPolygon);
    scene.nodes[TARGET].metadata = { ...scene.nodes[TARGET].metadata, expected_area_m2: polygonArea(choice.remainingLivingPolygon), modeledNetArea: polygonArea(choice.remainingLivingPolygon), structureEdited: true };
    scene.nodes[STUDY] = { ...clone(original), id: STUDY, name: "独立书房", polygon: clone(choice.studyPolygon), color: "#c5b58d", enclosureStatus: "enclosed", metadata: { roomId: "study_ai", roomType: "study", semantic_type: "study", expected_area_m2: choice.areaM2, modeledNetArea: choice.areaM2, source: "validated-structure-edit" } };
    const newChildren = [STUDY];
    for (const [id, created] of [["slab_one01_living", "slab_one01_study_ai"], ["ceiling_one01_living", "ceiling_one01_study_ai"]]) {
      const node = scene.nodes[id]; node.polygon = clone(choice.remainingLivingPolygon);
      scene.nodes[created] = { ...clone(node), id: created, name: `独立书房${node.type === "slab" ? "地面" : "顶面"}`, polygon: clone(choice.studyPolygon), metadata: { ...node.metadata, roomId: STUDY } };
      newChildren.push(created);
    }
    scene.nodes[levelId].children = [...(scene.nodes[levelId].children || []), ...newChildren];
    const [nw, ne, se, sw] = choice.studyPolygon;
    const ceilingHeight = Number(scene.nodes.ceiling_one01_living.height);
    if (!Number.isFinite(ceilingHeight) || ceilingHeight < 2.4 || ceilingHeight > 3.5) throw new Error("实际顶面高度 UNKNOWN，拒绝新增隔墙");
    scene = addPartitionWall(scene, ne, se, { id: EAST, thickness: WALL_THICKNESS, height: ceilingHeight, snap: false }).scene;
    scene = addPartitionWall(scene, se, sw, { id: SOUTH, thickness: WALL_THICKNESS, height: ceilingHeight, snap: false }).scene;
    for (const id of [EAST, SOUTH]) if (scene.nodes[id].parentId !== levelId) throw new Error("隔墙楼层错绑");
    scene = addDoor(scene, { id: DOOR, name: "独立书房门", hostWallId: EAST, offset: choice.door.offset, width: choice.door.width, height: 2.12, doorType: "hinged", hingeSide: "left", swingDirection: "inward", swingAngle: 0, connects: [STUDY, TARGET], locked: false }).scene;
    const issues: string[] = [], checks: Record<string, boolean> = {};
    const check = (key: string, valid: boolean, message: string) => { checks[key] = valid; if (!valid) issues.push(message); };
    const originalArea = polygonArea(original.polygon), studyArea = polygonArea(choice.studyPolygon), remainingArea = polygonArea(choice.remainingLivingPolygon);
    check("simplePolygons", simple(choice.studyPolygon) && simple(choice.remainingLivingPolygon), "切割后 polygon 自交或无效");
    check("concaveContainment", exactOrthogonalPartition(original.polygon, choice.studyPolygon, choice.remainingLivingPolygon), "切割侵犯凹形房间缺口、产生重叠或缺失区域");
    check("areaConserved", Math.abs(originalArea - studyArea - remainingArea) < EPS, "房间面积不守恒");
    check("upperLivingTarget", Math.abs(nw[1] - 2.205794) < EPS && Math.abs(nw[0]) < EPS && se[1] <= 5.3 && studyArea >= 3 && choice.clearWidthM >= 1.05, "书房位置或最小尺寸不符合上侧目标");
    check("entryCorridorPreserved", !overlaps(bbox(choice.studyPolygon), bbox(ONE01_ENTRY_PROTECTED)) && ONE01_ENTRY_PROTECTED.every((p) => inside(p, choice.remainingLivingPolygon)), "书房侵犯入户通道");
    check("fullHeightPartitions", [EAST, SOUTH].every((id) => scene.nodes[id].height === ceilingHeight) && Number(scene.nodes[DOOR].height) < ceilingHeight, "隔墙未到顶或门高无效");
    const afterFurniture = structureFurnitureFootprints(scene);
    let wallFurnitureValid = true;
    for (const id of [EAST, SOUTH]) {
      const wall = scene.nodes[id], box = bbox([wall.start, wall.end]);
      for (const f of afterFurniture) if (overlaps(box, f, WALL_THICKNESS / 2 + 0.02)) { wallFurnitureValid = false; issues.push(`新增隔墙 ${id} 碰撞家具 ${f.id}`); }
    }
    checks.partitionFurnitureCollision = wallFurnitureValid;
    let moveValid = true;
    for (const move of choice.furnitureMoves) {
      const changed = afterFurniture.find((f) => f.id === move.furnitureId)!;
      const corners: Point[] = [[changed.minX, changed.minZ], [changed.maxX, changed.minZ], [changed.maxX, changed.maxZ], [changed.minX, changed.maxZ]];
      if (!corners.every((p) => inside(p, choice.remainingLivingPolygon) || inside(p, choice.studyPolygon)) || afterFurniture.some((f) => f.id !== changed.id && overlaps(f, changed, 0.03))) moveValid = false;
      for (const wall of Object.values(scene.nodes).filter((n) => n.type === "wall")) if (overlaps(bbox([wall.start, wall.end]), changed, Number(wall.thickness || 0.12) / 2)) moveValid = false;
    }
    check("furnitureMovesSafe", moveValid, "批准的家具平移超出房间、碰墙或碰撞其他家具");
    // Conservative full swing envelope plus both door approaches; false
    // negatives are acceptable, a collision must never be hidden.
    const dc = choice.door.center, swing: Box = { minX: dc[0] - choice.door.width, maxX: dc[0] + WALK_RADIUS + WALL_THICKNESS / 2, minZ: dc[1] - choice.door.width / 2, maxZ: dc[1] + choice.door.width / 2 };
    check("doorApproachAndSwing", !afterFurniture.some((f) => overlaps(swing, f, 0.03)), "书房门开启或两侧通行碰撞家具");
    const sides = doorSides(scene, scene.nodes[DOOR]);
    check("doorBothSides", sides[0]?.length === 1 && sides[1]?.length === 1 && new Set(sides.flat()).has(STUDY) && new Set(sides.flat()).has(TARGET), "书房门未连接两个正确房间");
    const beforePaths = reachablePath(input, [], original.polygon, choice.door.center, sourceFurniture);
    const afterPaths = reachablePath(scene, choice.studyPolygon, choice.remainingLivingPolygon, choice.door.center, afterFurniture);
    const path = afterPaths.path;
    check("entryToStudyReachable", path.length > 0, "含家具与墙厚的入户至书房路径不可达");
    check("existingDoorApproachesPreserved", beforePaths.accessibleDoorIds.every((id) => afterPaths.accessibleDoorIds.includes(id)), `原有门的家具通行路径被阻断：${beforePaths.accessibleDoorIds.filter((id) => !afterPaths.accessibleDoorIds.includes(id)).join("、")}`);
    const beforeReached = graphReachableRooms(input), afterReached = graphReachableRooms(scene);
    check("existingRoomReachability", [...beforeReached].every((id) => afterReached.has(id)), "原有房间失去入户门连通性");
    const spawn = scene.nodes.spawn_one01, spawnPoint: Point = [Number(spawn?.position?.[0]), Number(spawn?.position?.[2])];
    check("spawnPreservedAndSafe", !!spawn && spawn.parentId === levelId && inside(spawnPoint, choice.remainingLivingPolygon) && !wallCollision(scene, spawnPoint, WALK_RADIUS) && !afterFurniture.some((f) => overlaps({ minX: spawnPoint[0] - WALK_RADIUS, maxX: spawnPoint[0] + WALK_RADIUS, minZ: spawnPoint[1] - WALK_RADIUS, maxZ: spawnPoint[1] + WALK_RADIUS }, f)), "原漫游出生点或坐标转换不安全");
    const mutable = new Set([TARGET, "slab_one01_living", "ceiling_one01_living", "building_house", levelId, ...choice.furnitureMoves.flatMap((move) => sourceFurniture.find((f) => f.id === move.furnitureId)?.nodeIds || [])]);
    let preserved = 0;
    for (const [id, node] of Object.entries(input.nodes)) {
      if (!scene.nodes[id]) issues.push(`原节点 ${id} 被删除`);
      else if (!mutable.has(id)) { if (stable(node) !== stable(scene.nodes[id])) issues.push(`非目标节点 ${id} 被修改`); else preserved++; }
    }
    check("protectedNodesPreserved", issues.every((issue) => !/被删除|非目标节点/.test(issue)), "未修改区域未保持");
    let furniturePreserved = true;
    for (const footprint of sourceFurniture) for (const id of footprint.nodeIds) {
      const before = clone(input.nodes[id]), after = clone(scene.nodes[id]);
      const move = choice.furnitureMoves.find((m) => m.furnitureId === footprint.id);
      if (move) { before.position[0] += move.delta[0]; before.position[2] += move.delta[1]; }
      if (stable(before) !== stable(after)) furniturePreserved = false;
    }
    check("allFurnitureBlocksPreserved", furniturePreserved && afterFurniture.reduce((sum, f) => sum + f.nodeIds.length, 0) === sourceFurniture.reduce((sum, f) => sum + f.nodeIds.length, 0), "原家具 ID、拓扑、材质或 transform 未按计划保留");
    check("sceneAssetsPreserved", ["rootNodeIds", "materials", "collections", "metadata"].every((key) => stable((input as any)[key]) === stable((scene as any)[key])), "原场景材质、集合、来源 metadata 或根节点被修改");
    check("floorAndCeilingSynced", stable(scene.nodes[TARGET].polygon) === stable(scene.nodes.slab_one01_living.polygon) && stable(scene.nodes[TARGET].polygon) === stable(scene.nodes.ceiling_one01_living.polygon) && stable(scene.nodes[STUDY].polygon) === stable(scene.nodes.slab_one01_study_ai.polygon) && stable(scene.nodes[STUDY].polygon) === stable(scene.nodes.ceiling_one01_study_ai.polygon), "房间、楼板与顶面不同步");
    const blueprint = sceneToFloorplanBlueprint(scene);
    blueprint.expected = { ...blueprint.expected, roomCount: blueprint.rooms.length, doorCount: blueprint.doors.length, windowCount: blueprint.windows.length };
    const bpValidation = validateVariantBlueprint(blueprint);
    check("blueprintValid", bpValidation.valid, `修改后的 Blueprint 无效：${bpValidation.issues.join("；")}`);
    check("twoDThreeDCoordinatesEqual", blueprint.rooms.every((room) => stable(room.polygon) === stable(scene.nodes[room.id]?.polygon)) && blueprint.walls.every((wall) => stable(wall.start) === stable(scene.nodes[wall.id]?.start) && stable(wall.end) === stable(scene.nodes[wall.id]?.end)), "2D Blueprint 与 Pascal 几何不一致");
    const validation: StructureEditValidation = { valid: issues.length === 0, checks, originalLivingAreaM2: originalArea, remainingLivingAreaM2: remainingArea, studyAreaM2: studyArea, doorReachable: path.length > 0, retainedFurnitureBlocks: afterFurniture.reduce((sum, f) => sum + f.nodeIds.length, 0), preservedNodeCount: preserved, clearanceRadiusM: WALK_RADIUS, pathSamples: path, originalReachableRoomIds: [...beforeReached].sort(), editedReachableRoomIds: [...afterReached].sort(), originalAccessibleDoorIds: beforePaths.accessibleDoorIds, editedAccessibleDoorIds: afterPaths.accessibleDoorIds };
    if (issues.length) return { ok: false, scene: input, operations: [], validation, issues };
    scene.nodes.building_house.metadata = { ...scene.nodes.building_house.metadata, floorplanBlueprint: blueprint, bomOutdated: true, structureEdit: { schema: "dreamhouse-structure-edit/v1", candidateId: choice.id, inputFingerprint: structureEditFingerprint(input), target: "客餐厅上侧新增独立书房", validation } };
    return { ok: true, scene, operations: [{ op: "splitRoom", roomId: TARGET, createdRoomId: STUDY, polygon: choice.studyPolygon, remainingPolygon: choice.remainingLivingPolygon, syncSlabsAndCeilings: true }, { op: "addPartitionWall", id: EAST, start: ne, end: se, height: ceilingHeight, thickness: WALL_THICKNESS }, { op: "addPartitionWall", id: SOUTH, start: se, end: sw, height: ceilingHeight, thickness: WALL_THICKNESS }, { op: "addDoor", id: DOOR, hostWallId: EAST, offset: choice.door.offset, width: choice.door.width, height: 2.12, doorType: "hinged", swingDirection: "inward", connects: [STUDY, TARGET] }, ...choice.furnitureMoves.map((move) => ({ op: "translateFurnitureGroup", ...move }))], validation, issues: [] };
  } catch (error) { return { ok: false, scene: input, operations: [], validation: null, issues: [error instanceof Error ? error.message : String(error)] }; }
}

export function enumerateStructureEditCandidates(scene: SceneGraph) {
  const inputFingerprint = structureEditFingerprint(scene), issues = compatibilityIssues(scene);
  const candidates: StructureEditCandidate[] = [], rejections: Array<{ id: string; issues: string[] }> = [];
  if (!issues.length) for (const choice of rawCandidates(scene)) {
    const trial = applyCandidate(scene, choice);
    if (trial.ok) candidates.push(choice); else rejections.push({ id: choice.id, issues: trial.issues });
  }
  return { inputFingerprint, candidates, rejections, issues, protectedEntryPolygon: clone(ONE01_ENTRY_PROTECTED), scope: "one-option-01/living-upper-study" as const };
}

/** Atomic transaction: every failure returns the original object unchanged. */
export function applyStructureEditPlan(scene: SceneGraph, plan: StructureEditPlan): StructureEditResult {
  const fail = (issues: string[]): StructureEditResult => ({ ok: false, scene, operations: [], validation: null, issues });
  if (!plan || plan.inputFingerprint !== structureEditFingerprint(scene)) return fail(["来源 SceneGraph 已变化，拒绝旧 AI 响应"]);
  const issues = compatibilityIssues(scene);
  if (issues.length) return fail(issues);
  const choice = rawCandidates(scene).find((candidate) => candidate.id === plan.candidateId);
  if (!choice) return fail(["AI candidateId 不在允许的计划中"]);
  if (stable(plan.furnitureMoves || []) !== stable(choice.furnitureMoves)) return fail(["AI 未明确批准对应家具平移，或试图修改允许范围之外的家具"]);
  return applyCandidate(scene, choice);
}
