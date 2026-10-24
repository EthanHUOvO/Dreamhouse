import type { SceneGraph, SceneNode } from "../types";
import { sceneToFloorplanBlueprint } from "./blueprint";
import {
  rebuildDoorTransform,
  rebuildWallFromOpenings,
  rebuildWalkthroughCollision,
  wallLength,
} from "./door-edit";
import { polygonArea, type Point } from "./types";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const EPS = 1e-6;
const MIN_WALL_LENGTH = 0.1;
const OPENING_CLEARANCE = 0.12;

export type WallEndpoint = "start" | "end";
export type WallOpeningPolicy = "reject" | "delete" | "migrate";

export type WallEditTransaction = {
  id: string;
  label: string;
  before: SceneGraph;
  after: SceneGraph;
  createdAt: string;
};

export type WallEditResult = {
  scene: SceneGraph;
  wallIds: string[];
  affectedZoneIds: string[];
  message: string;
};

type WallGeometry = Pick<SceneNode, "id" | "start" | "end">;

function geometryOf(wall: any): WallGeometry {
  return {
    id: String(wall.id),
    start: [Number(wall.start[0]), Number(wall.start[1])],
    end: [Number(wall.end[0]), Number(wall.end[1])],
  } as WallGeometry;
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function projectPoint(point: Point, start: Point, end: Point, clamp = true) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const rawT = lengthSquared
    ? ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared
    : 0;
  const t = clamp ? Math.max(0, Math.min(1, rawT)) : rawT;
  const projected: Point = [start[0] + dx * t, start[1] + dz * t];
  return { point: projected, t, distance: pointDistance(point, projected) };
}

function editableWall(scene: SceneGraph, wallId: string) {
  const wall = scene.nodes[wallId];
  if (!wall || wall.type !== "wall") throw new Error(`找不到墙体 ${wallId}`);
  if (
    wall.metadata?.structural_type === "load_bearing" ||
    wall.metadata?.locked ||
    wall.metadata?.editable === false
  ) {
    throw new Error(`墙体 ${wallId} 是外墙、承重墙或锁定墙，禁止修改`);
  }
  return wall;
}

function hostedOpenings(scene: SceneGraph, wallId: string) {
  return Object.values(scene.nodes).filter(
    (node) =>
      (node.type === "door" || node.type === "window") &&
      String(node.hostWallId || node.wallId || node.parentId) === wallId,
  );
}

function openingOffset(node: SceneNode) {
  const stored = Number(node.metadata?.blueprintOffset);
  return Number.isFinite(stored)
    ? stored
    : Number(node.position?.[0] || 0) - Number(node.width || 0) / 2;
}

function openingWorldCentre(node: SceneNode, wall: SceneNode): Point {
  const length = wallLength(wall) || 1;
  const centre = openingOffset(node) + Number(node.width || 0) / 2;
  const t = centre / length;
  return [
    Number(wall.start[0]) + (Number(wall.end[0]) - Number(wall.start[0])) * t,
    Number(wall.start[1]) + (Number(wall.end[1]) - Number(wall.start[1])) * t,
  ];
}

function setOpeningHost(node: SceneNode, wallId: string, offset: number) {
  node.hostWallId = wallId;
  node.wallId = wallId;
  node.parentId = wallId;
  node.offset = offset;
  node.position = [offset + Number(node.width || 0) / 2, Number(node.position?.[1] || 0), 0];
  node.metadata = { ...(node.metadata || {}), blueprintOffset: offset, wall_edit_updated: true };
}

function validateOpeningOffset(node: SceneNode, wall: SceneNode, offset: number) {
  const width = Number(node.width || 0);
  const length = wallLength(wall);
  if (
    !Number.isFinite(offset) ||
    offset < OPENING_CLEARANCE - EPS ||
    offset + width > length - OPENING_CLEARANCE + EPS
  ) {
    throw new Error(`${node.type === "door" ? "门" : "窗"} ${node.id} 将超出墙体或距离墙角过近，请先迁移门窗`);
  }
}

function remapOpenings(
  scene: SceneGraph,
  wallId: string,
  previousWall: SceneNode,
  preserveWorldPosition: boolean,
) {
  const wall = scene.nodes[wallId];
  if (!wall || wall.type !== "wall") return;
  const openings = hostedOpenings(scene, wallId);
  for (const opening of openings) {
    let offset = openingOffset(opening);
    if (preserveWorldPosition) {
      const centre = openingWorldCentre(opening, previousWall);
      const projection = projectPoint(centre, wall.start as Point, wall.end as Point, false);
      offset = projection.t * wallLength(wall) - Number(opening.width || 0) / 2;
    }
    validateOpeningOffset(opening, wall, offset);
    setOpeningHost(opening, wallId, offset);
    if (opening.type === "door") rebuildDoorTransform(scene, opening.id);
  }
  const ordered = hostedOpenings(scene, wallId).sort((a, b) => openingOffset(a) - openingOffset(b));
  for (let index = 1; index < ordered.length; index++) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (openingOffset(current) < openingOffset(previous) + Number(previous.width || 0) + 0.08)
      throw new Error(`${previous.id} 与 ${current.id} 在墙体 ${wallId} 上发生重叠`);
  }
  rebuildWallFromOpenings(scene, wallId);
}

function mapZonePoint(point: Point, oldWall: WallGeometry, newWall: WallGeometry) {
  const oldStart = oldWall.start as Point;
  const oldEnd = oldWall.end as Point;
  const projection = projectPoint(point, oldStart, oldEnd);
  if (projection.distance > 0.14) return point;
  const t = projection.t;
  return [
    Number(newWall.start[0]) + (Number(newWall.end[0]) - Number(newWall.start[0])) * t,
    Number(newWall.start[1]) + (Number(newWall.end[1]) - Number(newWall.start[1])) * t,
  ] as Point;
}

/** Keeps room polygons attached to edited wall lines instead of leaving stale zones. */
export function rebuildAffectedZones(
  scene: SceneGraph,
  changes: Array<{ before: WallGeometry; after: WallGeometry }>,
) {
  const affected: string[] = [];
  for (const node of Object.values(scene.nodes)) {
    if (node.type !== "zone" || !Array.isArray(node.polygon)) continue;
    let changed = false;
    let polygon = clone(node.polygon) as Point[];
    for (const change of changes) {
      polygon = polygon.map((point) => {
        const next = mapZonePoint(point, change.before, change.after);
        if (pointDistance(point, next) > EPS) changed = true;
        return next;
      });
    }
    const cleaned = polygon.filter((point, index) => pointDistance(point, polygon[(index - 1 + polygon.length) % polygon.length]) > EPS);
    if (changed && cleaned.length >= 3 && polygonArea(cleaned) >= 0.2) {
      node.polygon = cleaned;
      node.metadata = {
        ...(node.metadata || {}),
        expected_area_m2: polygonArea(cleaned),
        wall_edit_updated: true,
      };
      affected.push(node.id);
    }
  }
  return affected;
}

function syncBlueprintAndDerivedState(scene: SceneGraph, wallIds: string[]) {
  for (const wallId of wallIds) {
    if (scene.nodes[wallId]?.type === "wall") rebuildWallFromOpenings(scene, wallId);
  }
  rebuildWalkthroughCollision(scene);
  const building = scene.nodes.building_house;
  if (building) {
    building.metadata = {
      ...(building.metadata || {}),
      bomOutdated: true,
      wallEditRevision: Number(building.metadata?.wallEditRevision || 0) + 1,
    };
    building.metadata.floorplanBlueprint = sceneToFloorplanBlueprint(scene);
  }
}

export function snapWallPoint(
  scene: SceneGraph,
  target: Point,
  options: { excludeWallId?: string; distance?: number; grid?: number } = {},
) {
  const distance = options.distance ?? 0.15;
  const grid = options.grid ?? 0.1;
  let best: { point: Point; distance: number; kind: "endpoint" | "line" | "grid" } = {
    point: [Math.round(target[0] / grid) * grid, Math.round(target[1] / grid) * grid],
    distance: pointDistance(target, [Math.round(target[0] / grid) * grid, Math.round(target[1] / grid) * grid]),
    kind: "grid",
  };
  for (const wall of Object.values(scene.nodes)) {
    if (wall.type !== "wall" || wall.id === options.excludeWallId) continue;
    for (const endpoint of [wall.start, wall.end] as Point[]) {
      const d = pointDistance(target, endpoint);
      if (d <= distance && (best.kind !== "endpoint" || d < best.distance)) best = { point: clone(endpoint), distance: d, kind: "endpoint" };
    }
    const projected = projectPoint(target, wall.start as Point, wall.end as Point);
    if (projected.distance <= distance && best.kind !== "endpoint" && (best.kind !== "line" || projected.distance < best.distance))
      best = { point: projected.point, distance: projected.distance, kind: "line" };
  }
  return best;
}

export function updateWallEndpoint(
  inputScene: SceneGraph,
  wallId: string,
  endpoint: WallEndpoint,
  target: Point,
  options: { snap?: boolean; snapDistance?: number } = { snap: true },
): WallEditResult {
  const scene = clone(inputScene);
  const wall = editableWall(scene, wallId);
  const before = clone(wall);
  const snapped = options.snap === false
    ? { point: target }
    : snapWallPoint(scene, target, { excludeWallId: wallId, distance: options.snapDistance ?? 0.15 });
  wall[endpoint] = clone(snapped.point);
  if (wallLength(wall) < MIN_WALL_LENGTH) throw new Error("墙体长度不能小于 0.10m");
  remapOpenings(scene, wallId, before, true);
  wall.metadata = { ...(wall.metadata || {}), wall_edit_updated: true };
  const affectedZoneIds = rebuildAffectedZones(scene, [{ before: geometryOf(before), after: geometryOf(wall) }]);
  syncBlueprintAndDerivedState(scene, [wallId]);
  return { scene, wallIds: [wallId], affectedZoneIds, message: `已更新 ${wallId} ${endpoint} 端点` };
}

export const extendWallEndpoint = updateWallEndpoint;
export const trimWallEndpoint = updateWallEndpoint;

export function moveWallParallel(inputScene: SceneGraph, wallId: string, normalDistance: number): WallEditResult {
  const scene = clone(inputScene);
  const wall = editableWall(scene, wallId);
  const before = clone(wall);
  const dx = Number(wall.end[0]) - Number(wall.start[0]);
  const dz = Number(wall.end[1]) - Number(wall.start[1]);
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length;
  const nz = dx / length;
  const distance = Math.round(Number(normalDistance) * 100) / 100;
  wall.start = [Number(wall.start[0]) + nx * distance, Number(wall.start[1]) + nz * distance];
  wall.end = [Number(wall.end[0]) + nx * distance, Number(wall.end[1]) + nz * distance];
  wall.metadata = { ...(wall.metadata || {}), wall_edit_updated: true };
  remapOpenings(scene, wallId, before, false);
  const affectedZoneIds = rebuildAffectedZones(scene, [{ before: geometryOf(before), after: geometryOf(wall) }]);
  syncBlueprintAndDerivedState(scene, [wallId]);
  return { scene, wallIds: [wallId], affectedZoneIds, message: `已平行移动 ${wallId} ${distance.toFixed(2)}m` };
}

function removeNode(scene: SceneGraph, nodeId: string) {
  const node = scene.nodes[nodeId];
  if (!node) return;
  const parent = node.parentId ? scene.nodes[node.parentId] : null;
  if (parent?.children) parent.children = parent.children.filter((id) => id !== nodeId);
  for (const candidate of Object.values(scene.nodes)) {
    if (candidate.children) candidate.children = candidate.children.filter((id) => id !== nodeId);
  }
  delete scene.nodes[nodeId];
}

function nearestMigrationWall(scene: SceneGraph, removedWall: SceneNode, opening: SceneNode) {
  const centre = openingWorldCentre(opening, removedWall);
  let best: { wall: SceneNode; offset: number; distance: number } | null = null;
  for (const wall of Object.values(scene.nodes)) {
    if (wall.type !== "wall" || wall.id === removedWall.id) continue;
    if (wall.metadata?.locked || wall.metadata?.editable === false || wall.metadata?.structural_type === "load_bearing") continue;
    const projection = projectPoint(centre, wall.start as Point, wall.end as Point);
    const offset = projection.t * wallLength(wall) - Number(opening.width || 0) / 2;
    try {
      validateOpeningOffset(opening, wall, offset);
      const overlaps = hostedOpenings(scene, wall.id).some((candidate) =>
        candidate.id !== opening.id &&
        offset < openingOffset(candidate) + Number(candidate.width || 0) + 0.08 &&
        offset + Number(opening.width || 0) + 0.08 > openingOffset(candidate),
      );
      if (overlaps) continue;
      if (projection.distance <= 1.5 && (!best || projection.distance < best.distance)) best = { wall, offset, distance: projection.distance };
    } catch {}
  }
  return best;
}

export function removeWallSafe(
  inputScene: SceneGraph,
  wallId: string,
  openingPolicy: WallOpeningPolicy = "reject",
): WallEditResult {
  const scene = clone(inputScene);
  const wall = editableWall(scene, wallId);
  const openings = hostedOpenings(scene, wallId);
  if (openings.length && openingPolicy === "reject")
    throw new Error(`当前墙体包含 ${openings.length} 个门窗，请选择连同删除或迁移门窗`);
  const rebuiltWalls = new Set<string>();
  for (const opening of openings) {
    if (openingPolicy === "delete") {
      removeNode(scene, opening.id);
      continue;
    }
    const migration = nearestMigrationWall(scene, wall, opening);
    if (!migration) throw new Error(`${opening.id} 找不到合法迁移墙体`);
    setOpeningHost(opening, migration.wall.id, migration.offset);
    if (opening.type === "door") rebuildDoorTransform(scene, opening.id);
    rebuiltWalls.add(migration.wall.id);
  }
  removeNode(scene, wallId);
  for (const target of rebuiltWalls) rebuildWallFromOpenings(scene, target);
  syncBlueprintAndDerivedState(scene, [...rebuiltWalls]);
  if (openingPolicy === "delete") {
    const expected = scene.nodes.building_house?.metadata?.floorplanBlueprint?.expected;
    if (expected) {
      expected.doorCount -= openings.filter((opening) => opening.type === "door").length;
      expected.windowCount -= openings.filter((opening) => opening.type === "window").length;
    }
  }
  return {
    scene,
    wallIds: [wallId, ...rebuiltWalls],
    affectedZoneIds: [],
    message: `已删除 ${wallId}${openings.length ? `，处理 ${openings.length} 个门窗` : ""}`,
  };
}

function uniqueWallId(scene: SceneGraph) {
  let index = 1;
  let id = `wall_manual_${index}`;
  while (scene.nodes[id]) id = `wall_manual_${++index}`;
  return id;
}

export function addPartitionWall(
  inputScene: SceneGraph,
  start: Point,
  end: Point,
  options: { id?: string; thickness?: number; height?: number; snap?: boolean } = {},
): WallEditResult {
  const scene = clone(inputScene);
  const snappedStart = options.snap === false ? start : snapWallPoint(scene, start).point;
  const snappedEnd = options.snap === false ? end : snapWallPoint(scene, end).point;
  if (pointDistance(snappedStart, snappedEnd) < MIN_WALL_LENGTH) throw new Error("新增墙体长度不能小于 0.10m");
  const id = options.id || uniqueWallId(scene);
  if (scene.nodes[id]) throw new Error(`节点 ${id} 已存在`);
  const levels = Object.values(scene.nodes).filter((node) => node.type === "level");
  const level = scene.nodes.level_ground?.type === "level" ? scene.nodes.level_ground : levels.find((node) => node.level === 0) || levels[0];
  if (!level) throw new Error("当前户型缺少有效楼层，无法新增隔墙");
  const wall: SceneNode = {
    object: "node",
    id,
    type: "wall",
    parentId: level.id,
    visible: true,
    name: "人工修正隔墙",
    children: [],
    start: clone(snappedStart),
    end: clone(snappedEnd),
    thickness: options.thickness || 0.12,
    height: options.height || 2.8,
    frontSide: "unknown",
    backSide: "unknown",
    metadata: { structural_type: "partition", editable: true, wall_edit_created: true },
  };
  scene.nodes[id] = wall;
  level.children = [...(level.children || []), id];
  syncBlueprintAndDerivedState(scene, [id]);
  return { scene, wallIds: [id], affectedZoneIds: [], message: `已新增墙体 ${id}` };
}

export function bridgeWallGap(inputScene: SceneGraph, firstWallId: string, secondWallId: string) {
  const first = inputScene.nodes[firstWallId];
  const second = inputScene.nodes[secondWallId];
  if (!first || first.type !== "wall" || !second || second.type !== "wall") throw new Error("请选择两面有效墙体");
  const pairs = (["start", "end"] as WallEndpoint[]).flatMap((a) =>
    (["start", "end"] as WallEndpoint[]).map((b) => ({
      a: first[a] as Point,
      b: second[b] as Point,
      distance: pointDistance(first[a] as Point, second[b] as Point),
    })),
  );
  const closest = pairs.sort((a, b) => a.distance - b.distance)[0];
  if (!closest || closest.distance < 0.02) throw new Error("所选墙体端点已经连接");
  return addPartitionWall(inputScene, closest.a, closest.b, {
    thickness: Number(first.thickness || second.thickness || 0.12),
    height: Number(first.height || second.height || 2.8),
  });
}

function lineAngle(wall: SceneNode) {
  return Math.atan2(Number(wall.end[1]) - Number(wall.start[1]), Number(wall.end[0]) - Number(wall.start[0]));
}

function angleDifference(a: number, b: number) {
  const value = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  return Math.min(value, Math.abs(Math.PI - value));
}

function chainReference(walls: SceneNode[]) {
  const endpoints = walls.flatMap((wall) => [wall.start as Point, wall.end as Point]);
  let pair = { start: endpoints[0], end: endpoints[1], distance: 0 };
  for (const start of endpoints) for (const end of endpoints) {
    const distance = pointDistance(start, end);
    if (distance > pair.distance) pair = { start, end, distance };
  }
  return pair;
}

function wallChainConnected(walls: SceneNode[], tolerance = 0.2) {
  const visited = new Set<string>([walls[0].id]);
  const queue = [walls[0]];
  while (queue.length) {
    const current = queue.shift()!;
    for (const candidate of walls) {
      if (visited.has(candidate.id)) continue;
      const connected = ([current.start, current.end] as Point[]).some((a) =>
        ([candidate.start, candidate.end] as Point[]).some((b) => pointDistance(a, b) <= tolerance),
      );
      if (connected) {
        visited.add(candidate.id);
        queue.push(candidate);
      }
    }
  }
  return visited.size === walls.length;
}

export function straightenWallChain(inputScene: SceneGraph, wallIds: string[]): WallEditResult {
  if (wallIds.length < 2) throw new Error("至少选择两面连续墙体");
  const scene = clone(inputScene);
  const walls = wallIds.map((id) => editableWall(scene, id));
  if (!wallChainConnected(walls)) throw new Error("所选墙体不是连续墙链");
  const before = walls.map(clone);
  const reference = chainReference(walls);
  if (reference.distance < MIN_WALL_LENGTH) throw new Error("墙链长度无效");
  for (const wall of walls) {
    wall.start = projectPoint(wall.start as Point, reference.start, reference.end, false).point;
    wall.end = projectPoint(wall.end as Point, reference.start, reference.end, false).point;
    if (wallLength(wall) < MIN_WALL_LENGTH) throw new Error(`${wall.id} 拉直后长度无效`);
    wall.metadata = { ...(wall.metadata || {}), wall_edit_updated: true };
  }
  for (let index = 0; index < walls.length; index++) remapOpenings(scene, walls[index].id, before[index], true);
  const affectedZoneIds = rebuildAffectedZones(scene, walls.map((wall, index) => ({ before: geometryOf(before[index]), after: geometryOf(wall) })));
  syncBlueprintAndDerivedState(scene, wallIds);
  return { scene, wallIds, affectedZoneIds, message: `已拉直 ${wallIds.length} 段墙体` };
}

export function mergeCollinearWalls(
  inputScene: SceneGraph,
  wallIds: string[],
  angleToleranceDegrees = 2,
): WallEditResult {
  if (wallIds.length < 2) throw new Error("至少选择两面共线墙体");
  const scene = clone(inputScene);
  const walls = wallIds.map((id) => editableWall(scene, id));
  if (!wallChainConnected(walls)) throw new Error("所选共线墙体端点不连续");
  const referenceAngle = lineAngle(walls[0]);
  if (walls.some((wall) => angleDifference(referenceAngle, lineAngle(wall)) > angleToleranceDegrees * Math.PI / 180))
    throw new Error(`所选墙体夹角超过 ${angleToleranceDegrees}°，不能合并`);
  const reference = chainReference(walls);
  const keep = walls[0];
  const allOpenings = walls.flatMap((wall) => hostedOpenings(scene, wall.id).map((opening) => ({ opening, centre: openingWorldCentre(opening, wall) })));
  keep.start = clone(reference.start);
  keep.end = clone(reference.end);
  keep.children = [];
  keep.metadata = { ...(keep.metadata || {}), wall_edit_merged_from: wallIds };
  for (const wall of walls.slice(1)) removeNode(scene, wall.id);
  for (const { opening, centre } of allOpenings) {
    const projection = projectPoint(centre, keep.start as Point, keep.end as Point, false);
    const offset = projection.t * wallLength(keep) - Number(opening.width || 0) / 2;
    validateOpeningOffset(opening, keep, offset);
    setOpeningHost(opening, keep.id, offset);
    if (opening.type === "door") rebuildDoorTransform(scene, opening.id);
  }
  rebuildWallFromOpenings(scene, keep.id);
  syncBlueprintAndDerivedState(scene, [keep.id]);
  return { scene, wallIds: [keep.id], affectedZoneIds: [], message: `已合并 ${wallIds.length} 段共线墙体为 ${keep.id}` };
}

export function replaceWallChainWithSingleWall(inputScene: SceneGraph, wallIds: string[]) {
  const straightened = straightenWallChain(inputScene, wallIds);
  return mergeCollinearWalls(straightened.scene, wallIds);
}

export function describeWall(scene: SceneGraph, wallId: string) {
  const wall = scene.nodes[wallId];
  if (!wall || wall.type !== "wall") return null;
  return {
    wallId: wall.id,
    length: wallLength(wall),
    start: clone(wall.start as Point),
    end: clone(wall.end as Point),
    thickness: Number(wall.thickness || 0.12),
    height: Number(wall.height || 2.8),
    type: String(wall.metadata?.structural_type || "partition"),
    locked: Boolean(wall.metadata?.locked || wall.metadata?.editable === false || wall.metadata?.structural_type === "load_bearing"),
    openings: hostedOpenings(scene, wallId).map((node) => ({ id: node.id, type: node.type })),
  };
}

export function createWallEditTransaction(label: string, before: SceneGraph, after: SceneGraph): WallEditTransaction {
  return {
    id: `wall-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    before: clone(before),
    after: clone(after),
    createdAt: new Date().toISOString(),
  };
}
