import { door as createPascalDoor } from "../house-scene";
import type { SceneGraph, SceneNode } from "../types";
import type { BlueprintDoor } from "./types";

const CORNER_CLEARANCE = 0.12;
const OPENING_CLEARANCE = 0.08;

const cloneScene = (scene: SceneGraph): SceneGraph =>
  JSON.parse(JSON.stringify(scene));

export function wallLength(wall: SceneNode) {
  return Math.hypot(
    Number(wall.end?.[0] || 0) - Number(wall.start?.[0] || 0),
    Number(wall.end?.[1] || 0) - Number(wall.start?.[1] || 0),
  );
}

function openingOffset(node: SceneNode) {
  const stored = Number(node.metadata?.blueprintOffset);
  return Number.isFinite(stored)
    ? stored
    : Number(node.position?.[0] || 0) - Number(node.width || 0) / 2;
}

export function wallOpenings(scene: SceneGraph, wallId: string) {
  return Object.values(scene.nodes)
    .filter((node) =>
      (node.type === "door" || node.type === "window") &&
      (node.hostWallId || node.wallId || node.parentId) === wallId,
    )
    .map((node) => ({
      id: node.id,
      kind: node.type as "door" | "window",
      offset: openingOffset(node),
      width: Number(node.width || 0),
      height: Number(node.height || (node.type === "door" ? 2.1 : 1.4)),
      bottom: node.type === "door" ? 0 : Number(node.sillHeight ?? 1),
    }))
    .sort((a, b) => a.offset - b.offset);
}

/**
 * Rebuilds the canonical wall opening list and explicit mesh segments. Pascal
 * uses wall.children for its actual CSG opening; meshSegments are retained for
 * validation, BOM and walkthrough collision diagnostics.
 */
export function rebuildWallFromOpenings(scene: SceneGraph, wallId: string) {
  const wall = scene.nodes[wallId];
  if (!wall || wall.type !== "wall") throw new Error(`找不到墙体 ${wallId}`);
  const length = wallLength(wall);
  const wallHeight = Number(wall.height || 2.8);
  const openings = wallOpenings(scene, wallId);
  const meshSegments: Array<{
    start: number;
    end: number;
    bottom: number;
    height: number;
    role: "wall" | "opening-top" | "opening-bottom";
    openingId?: string;
  }> = [];
  let cursor = 0;
  for (const opening of openings) {
    const start = Math.max(0, opening.offset);
    const end = Math.min(length, opening.offset + opening.width);
    if (start > cursor)
      meshSegments.push({ start: cursor, end: start, bottom: 0, height: wallHeight, role: "wall" });
    if (opening.bottom > 0)
      meshSegments.push({
        start,
        end,
        bottom: 0,
        height: opening.bottom,
        role: "opening-bottom",
        openingId: opening.id,
      });
    const top = opening.bottom + opening.height;
    if (top < wallHeight)
      meshSegments.push({
        start,
        end,
        bottom: top,
        height: wallHeight - top,
        role: "opening-top",
        openingId: opening.id,
      });
    cursor = Math.max(cursor, end);
  }
  if (cursor < length)
    meshSegments.push({ start: cursor, end: length, bottom: 0, height: wallHeight, role: "wall" });
  wall.children = openings.map((opening) => opening.id);
  wall.metadata = {
    ...(wall.metadata || {}),
    openings,
    meshSegments,
    collisionSegments: meshSegments
      .filter((segment) => segment.bottom < 1.8 && segment.height > 0.1)
      .map(({ start, end, openingId }) => ({ start, end, openingId })),
  };
  return wall;
}

export function rebuildDoorTransform(scene: SceneGraph, doorId: string) {
  const door = scene.nodes[doorId];
  if (!door || door.type !== "door") throw new Error(`找不到门 ${doorId}`);
  const hostWallId = String(door.hostWallId || door.wallId || door.parentId || "");
  const wall = scene.nodes[hostWallId];
  if (!wall || wall.type !== "wall") throw new Error(`门 ${doorId} 未绑定有效墙体`);
  const length = wallLength(wall);
  if (length <= 0) throw new Error(`墙体 ${hostWallId} 长度无效`);
  const offset = openingOffset(door);
  const centre = offset + Number(door.width || 0.86) / 2;
  const dx = Number(wall.end[0]) - Number(wall.start[0]);
  const dz = Number(wall.end[1]) - Number(wall.start[1]);
  const ux = dx / length;
  const uz = dz / length;
  const worldPosition: [number, number, number] = [
    Number(wall.start[0]) + ux * centre,
    Number(door.height || 2.1) / 2,
    Number(wall.start[1]) + uz * centre,
  ];
  door.hostWallId = hostWallId;
  door.offset = offset;
  door.wallId = hostWallId;
  door.parentId = hostWallId;
  // Pascal doors are wall-local children. The host wall supplies world yaw.
  door.position = [centre, Number(door.height || 2.1) / 2, 0];
  door.rotation = [0, 0, 0];
  door.metadata = {
    ...(door.metadata || {}),
    blueprintOffset: offset,
    worldPosition,
    wallRotationY: -Math.atan2(dz, dx),
    wallNormal: [-uz, 0, ux],
    hingePivot: door.hingesSide === "right" ? Number(door.width || 0.86) / 2 : -Number(door.width || 0.86) / 2,
  };
  return door;
}

export function validateDoorPlacement(
  scene: SceneGraph,
  doorId: string,
  targetWallId: string,
  targetOffset: number,
) {
  const door = scene.nodes[doorId];
  const wall = scene.nodes[targetWallId];
  if (!door || door.type !== "door") return { valid: false, reason: `找不到门 ${doorId}` };
  if (!wall || wall.type !== "wall") return { valid: false, reason: `找不到目标墙 ${targetWallId}` };
  if (door.id === "door_entry" || door.locked || door.metadata?.locked)
    return { valid: false, reason: "入户门或锁定门禁止移动" };
  if (wall.metadata?.editable === false || wall.metadata?.locked || wall.metadata?.structural_type === "load_bearing")
    return { valid: false, reason: "门不能移动到承重墙或锁定墙" };
  const width = Number(door.width || 0.86);
  const length = wallLength(wall);
  if (!Number.isFinite(targetOffset) || targetOffset < CORNER_CLEARANCE || targetOffset + width > length - CORNER_CLEARANCE)
    return { valid: false, reason: "门洞距离墙角过近或超出墙体" };
  const overlap = wallOpenings(scene, targetWallId).find((opening) =>
    opening.id !== doorId &&
    targetOffset < opening.offset + opening.width + OPENING_CLEARANCE &&
    targetOffset + width + OPENING_CLEARANCE > opening.offset,
  );
  if (overlap)
    return { valid: false, reason: `门洞与 ${overlap.kind === "door" ? "门" : "窗"} ${overlap.id} 重叠` };
  return { valid: true, reason: "PASS" };
}

export function rebuildWalkthroughCollision(scene: SceneGraph) {
  const building = scene.nodes.building_house;
  if (building) {
    building.metadata = {
      ...(building.metadata || {}),
      collisionRevision: Number(building.metadata?.collisionRevision || 0) + 1,
    };
  }
  return Number(building?.metadata?.collisionRevision || 0);
}

export function moveDoor(
  inputScene: SceneGraph,
  doorId: string,
  targetWallId: string,
  targetOffset: number,
) {
  const scene = cloneScene(inputScene);
  const door = scene.nodes[doorId];
  if (!door || door.type !== "door") throw new Error(`找不到门 ${doorId}`);
  const oldWallId = String(door.hostWallId || door.wallId || door.parentId || "");
  const validation = validateDoorPlacement(scene, doorId, targetWallId, targetOffset);
  if (!validation.valid) throw new Error(validation.reason);
  const oldWall = scene.nodes[oldWallId];
  if (oldWall?.children) oldWall.children = oldWall.children.filter((id) => id !== doorId);
  door.hostWallId = targetWallId;
  door.offset = targetOffset;
  door.wallId = targetWallId;
  door.parentId = targetWallId;
  door.metadata = { ...(door.metadata || {}), blueprintOffset: targetOffset, ai_modified: true };
  const targetWall = scene.nodes[targetWallId];
  targetWall.children = [...(targetWall.children || []).filter((id) => id !== doorId), doorId];
  rebuildDoorTransform(scene, doorId);
  if (oldWallId && oldWallId !== targetWallId) rebuildWallFromOpenings(scene, oldWallId);
  rebuildWallFromOpenings(scene, targetWallId);
  rebuildWalkthroughCollision(scene);
  syncStoredBlueprintDoor(scene, doorId);
  return { scene, oldWallId, targetWallId, targetOffset, validation };
}

export function addDoor(
  inputScene: SceneGraph,
  door: BlueprintDoor,
) {
  const scene = cloneScene(inputScene);
  if (scene.nodes[door.id]) throw new Error(`节点 ${door.id} 已存在`);
  const centre = door.offset + door.width / 2;
  scene.nodes[door.id] = createPascalDoor(door.id, door.hostWallId, centre, door.width, {
    name: door.name,
    height: door.height,
    hostWallId: door.hostWallId,
    hingesSide: door.hingeSide,
    hingeSide: door.hingeSide,
    swingDirection: door.swingDirection,
    swingAngle: door.swingAngle,
    doorType: door.doorType,
    connects: door.connects,
    locked: door.locked,
    metadata: { opening_role: "door", blueprintOffset: door.offset, locked: door.locked },
  });
  const validation = validateDoorPlacement(scene, door.id, door.hostWallId, door.offset);
  if (!validation.valid) throw new Error(validation.reason);
  rebuildDoorTransform(scene, door.id);
  rebuildWallFromOpenings(scene, door.hostWallId);
  rebuildWalkthroughCollision(scene);
  syncStoredBlueprintDoor(scene, door.id);
  return { scene, doorId: door.id, validation };
}

export function removeDoor(inputScene: SceneGraph, doorId: string) {
  const scene = cloneScene(inputScene);
  const door = scene.nodes[doorId];
  if (!door || door.type !== "door") throw new Error(`找不到门 ${doorId}`);
  if (door.id === "door_entry" || door.locked || door.metadata?.locked)
    throw new Error("入户门或锁定门禁止删除");
  const oldWallId = String(door.hostWallId || door.wallId || door.parentId || "");
  delete scene.nodes[doorId];
  if (scene.nodes[oldWallId]?.children)
    scene.nodes[oldWallId].children = scene.nodes[oldWallId].children!.filter((id) => id !== doorId);
  rebuildWallFromOpenings(scene, oldWallId);
  rebuildWalkthroughCollision(scene);
  const blueprint = scene.nodes.building_house?.metadata?.floorplanBlueprint;
  if (blueprint?.doors) {
    const beforeCount = blueprint.doors.length;
    blueprint.doors = blueprint.doors.filter((candidate: BlueprintDoor) => candidate.id !== doorId);
    blueprint.expected.doorCount -= beforeCount - blueprint.doors.length;
  }
  return { scene, doorId, oldWallId };
}

function syncStoredBlueprintDoor(scene: SceneGraph, doorId: string) {
  const node = scene.nodes[doorId];
  const blueprint = scene.nodes.building_house?.metadata?.floorplanBlueprint;
  if (!node || !blueprint?.doors) return;
  const value: BlueprintDoor = {
    id: node.id,
    name: String(node.name || "门"),
    hostWallId: String(node.hostWallId || node.wallId || node.parentId),
    offset: openingOffset(node),
    width: Number(node.width || 0.86),
    height: Number(node.height || 2.1),
    doorType: node.doorType || "hinged",
    hingeSide: node.hingeSide || node.hingesSide || "left",
    swingDirection: node.swingDirection || "inward",
    swingAngle: Number(node.swingAngle || 0),
    connects: node.connects || [null, null],
    locked: Boolean(node.locked || node.metadata?.locked),
  };
  const index = blueprint.doors.findIndex((candidate: BlueprintDoor) => candidate.id === doorId);
  if (index >= 0) blueprint.doors[index] = value;
  else {
    blueprint.doors.push(value);
    blueprint.expected.doorCount += 1;
  }
}

export type DoorPlacementPreview = {
  wallId: string;
  offset: number;
  centre: [number, number];
  rotationY: number;
  valid: boolean;
  reason: string;
};

export function findNearestDoorPlacement(
  scene: SceneGraph,
  doorId: string,
  x: number,
  z: number,
  maxDistance = 0.9,
): DoorPlacementPreview | null {
  let best: (DoorPlacementPreview & { distance: number }) | null = null;
  const door = scene.nodes[doorId];
  if (!door || door.type !== "door") return null;
  const width = Number(door.width || 0.86);
  for (const wall of Object.values(scene.nodes)) {
    if (wall.type !== "wall" || wall.metadata?.editable === false || wall.metadata?.locked || wall.metadata?.structural_type === "load_bearing") continue;
    const dx = Number(wall.end[0]) - Number(wall.start[0]);
    const dz = Number(wall.end[1]) - Number(wall.start[1]);
    const len2 = dx * dx + dz * dz;
    if (len2 <= 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((x - Number(wall.start[0])) * dx + (z - Number(wall.start[1])) * dz) / len2));
    const px = Number(wall.start[0]) + dx * t;
    const pz = Number(wall.start[1]) + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (distance > maxDistance || (best && distance >= best.distance)) continue;
    const centreDistance = Math.sqrt(len2) * t;
    const offset = centreDistance - width / 2;
    const validation = validateDoorPlacement(scene, doorId, wall.id, offset);
    best = {
      wallId: wall.id,
      offset,
      centre: [px, pz],
      rotationY: -Math.atan2(dz, dx),
      valid: validation.valid,
      reason: validation.reason,
      distance,
    };
  }
  if (!best) return null;
  const { distance: _distance, ...preview } = best;
  return preview;
}
