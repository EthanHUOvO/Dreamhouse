import type { SceneGraph, SceneNode } from "../types";
import { door as pascalDoor, windowNode as pascalWindow } from "../house-scene";
import { interiorPoint } from "./blueprint";
export type Point = [number, number];
export type FloorplanRoom = {
  id: string;
  name: string;
  semantic: string;
  polygon: Point[];
  expectedArea: number;
  color: string;
};
export type FloorplanWall = {
  id: string;
  start: Point;
  end: Point;
  structural: "load_bearing" | "partition";
};
export type FloorplanOpening = {
  id: string;
  name: string;
  wallId: string;
  /** Legacy Pascal-local opening centre, in metres. */
  distance: number;
  width: number;
  height?: number;
  sillHeight?: number;
};
export type BlueprintDoor = {
  id: string;
  name: string;
  hostWallId: string;
  /** Distance from wall start to the opening's leading edge, in metres. */
  offset: number;
  width: number;
  height: number;
  doorType: "hinged" | "sliding" | "folding";
  hingeSide: "left" | "right";
  swingDirection: "inward" | "outward";
  swingAngle: number;
  connects: [string | null, string | null];
  locked?: boolean;
};
export type BlueprintWindow = {
  id: string;
  name: string;
  hostWallId: string;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
};
export type BlueprintFurniture = {
  id: string;
  roomId: string;
  kind: string;
  position: [number, number, number];
  rotation: number;
  /** Actual footprint/height in metres. Scale remains the Pascal asset transform. */
  size: [number, number, number];
  scale: [number, number, number];
};
export type BlueprintCalibration = {
  variantId: string;
  imageScale: number;
  imageRotation: number;
  imageOffsetX: number;
  imageOffsetY: number;
  expectedArea: number;
  expectedWidth: number;
  expectedDepth: number;
  /** Only Golden variants are considered visually reviewed against their PNG. */
  confirmed?: boolean;
  /** Normalized PNG crop used to map the actual drawing, excluding page margins. */
  imageCrop?: { left: number; top: number; right: number; bottom: number };
  imageCropVersion?: number;
};
export type FloorplanBlueprintExpected = {
  roomCount: number;
  doorCount: number;
  windowCount: number;
  approximateArea: number;
  sceneBounds: { width: number; depth: number };
};
export type FloorplanSpec = {
  id: string;
  name: string;
  factory: string;
  outerPolygon: Point[];
  walls: FloorplanWall[];
  rooms: FloorplanRoom[];
  doors: FloorplanOpening[];
  windows: FloorplanOpening[];
  sourceImage: string;
};
export type FloorplanBlueprint = Omit<FloorplanSpec, "doors" | "windows"> & {
  schema: "dreamhouse-floorplan-blueprint/v1";
  unit: "meter";
  doors: BlueprintDoor[];
  windows: BlueprintWindow[];
  furniture: BlueprintFurniture[];
  expected: FloorplanBlueprintExpected;
};
const LEVEL = "level_ground";
export const FLOORPLAN_3D_CONFIG = {
  wallHeightM: 2.8,
  exteriorWallThicknessM: 0.22,
  interiorWallThicknessM: 0.12,
  floorSlabThicknessM: 0.08,
  floorElevationM: 0.05,
} as const;
function wall(w: FloorplanWall, children: string[]): SceneNode {
  return {
    object: "node",
    id: w.id,
    type: "wall",
    parentId: LEVEL,
    visible: true,
    name: w.structural === "load_bearing" ? "外墙 / 承重墙" : "室内隔墙",
    children,
    thickness: w.structural === "load_bearing" ? FLOORPLAN_3D_CONFIG.exteriorWallThicknessM : FLOORPLAN_3D_CONFIG.interiorWallThicknessM,
    height: FLOORPLAN_3D_CONFIG.wallHeightM,
    start: w.start,
    end: w.end,
    frontSide: "unknown",
    backSide: "unknown",
    metadata: {
      structural_type: w.structural,
      editable: w.structural === "partition",
    },
  };
}
function door(o: FloorplanOpening): SceneNode {
  return pascalDoor(o.id, o.wallId, o.distance, o.width, {
    name: o.name,
    doorCategory: o.id === "door_entry" ? "entrance" : "interior",
  });
}
function windowNode(o: FloorplanOpening): SceneNode {
  return pascalWindow(o.id, o.wallId, o.distance, o.width, 1.4, 1.0, {
    name: o.name,
    windowType: o.name.includes("推拉") ? "sliding" : "fixed",
  });
}
function zone(r: FloorplanRoom): SceneNode {
  return {
    object: "node",
    id: r.id,
    type: "zone",
    parentId: LEVEL,
    visible: true,
    name: r.name,
    polygon: r.polygon,
    autoFromWalls: false,
    boundaryWallIds: [],
    spaceRole: "room",
    enclosureStatus: "auto",
    floorFinish:
      r.semantic === "bathroom" || r.semantic === "kitchen" ? "tile" : "wood",
    wallFinish: "paint",
    ceilingFinish: "paint",
    ceilingHeight: 2.7,
    occupancy: "residential",
    color: r.color,
    metadata: { semantic_type: r.semantic, expected_area_m2: r.expectedArea },
  };
}
export function polygonArea(p: Point[]) {
  return Math.abs(
    p.reduce(
      (s, a, i) =>
        s + a[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * a[1],
      0,
    ) / 2,
  );
}
export function buildFloorplanScene(
  spec: FloorplanSpec,
  items: SceneNode[] = [],
): SceneGraph {
  const nodes: Record<string, SceneNode> = {};
  nodes.site_house = {
    object: "node",
    id: "site_house",
    type: "site",
    parentId: null,
    visible: true,
    name: `${spec.name} Site`,
    polygon: { type: "polygon", points: spec.outerPolygon },
    children: ["building_house"],
    metadata: { floorplan_id: spec.id },
  };
  nodes.building_house = {
    object: "node",
    id: "building_house",
    type: "building",
    parentId: "site_house",
    visible: true,
    name: spec.name,
    children: [LEVEL],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    metadata: {
      floorplanId: spec.id,
      factory: spec.factory,
      sourceDrawing: spec.sourceImage,
      scene_schema_version: 11,
    },
  };
  for (const o of spec.doors) nodes[o.id] = door(o);
  for (const o of spec.windows) nodes[o.id] = windowNode(o);
  for (const w of spec.walls)
    nodes[w.id] = wall(
      w,
      [...spec.doors, ...spec.windows]
        .filter((o) => o.wallId === w.id)
        .map((o) => o.id),
    );
  for (const r of spec.rooms) nodes[r.id] = zone(r);
  for (const i of items) nodes[i.id] = i;
  nodes.slab_floor = {
    object: "node",
    id: "slab_floor",
    type: "slab",
    parentId: LEVEL,
    visible: false,
    name: "真实户型楼板",
    polygon: spec.outerPolygon,
    holes: [],
    elevation: FLOORPLAN_3D_CONFIG.floorElevationM,
    thickness: FLOORPLAN_3D_CONFIG.floorSlabThicknessM,
    recessed: false,
    autoFromWalls: false,
    metadata: { floorplan_id: spec.id, role: "walkthrough-support" },
  };
  const roomSlabIds = spec.rooms.map((room) => {
    const slabId = `slab_room_${room.id}`;
    nodes[slabId] = {
      object: "node",
      id: slabId,
      type: "slab",
      parentId: LEVEL,
      visible: true,
      name: `${room.name} 地面`,
      polygon: room.polygon,
      holes: [],
      elevation: FLOORPLAN_3D_CONFIG.floorElevationM,
      thickness: FLOORPLAN_3D_CONFIG.floorSlabThicknessM,
      recessed: room.semantic === "balcony",
      autoFromWalls: false,
      metadata: { floorplan_id: spec.id, roomId: room.id, semantic: room.semantic, floorFinish: room.semantic === "bathroom" || room.semantic === "kitchen" ? "tile" : "wood" },
    };
    return slabId;
  });
  // Keep the walkthrough start inside the first actual room instead of the
  // legacy (0, 0) fallback, which can land on an exterior wall.
  const spawnRoom = spec.rooms.find((r) => !["balcony", "storage"].includes(r.semantic)) || spec.rooms[0];
  // Vertex average leaves the polygon for concave rooms (e.g. an L-shaped
  // living/dining room), which spawns the walkthrough inside a wall.
  const spawnPoint = spawnRoom ? interiorPoint(spawnRoom.polygon as [number, number][]) : [0, 0];
  nodes.spawn_walkthrough = {
    object: "node",
    id: "spawn_walkthrough",
    type: "spawn",
    parentId: LEVEL,
    visible: false,
    name: "漫游出生点",
    position: [Number(spawnPoint[0]), 0, Number(spawnPoint[1])],
    rotation: 0,
    supportSlabId: "slab_floor",
    metadata: { role: "walkthrough_spawn", roomId: spawnRoom?.id },
  };
  nodes[LEVEL] = {
    object: "node",
    id: LEVEL,
    type: "level",
    parentId: "building_house",
    visible: true,
    name: "住宅一层",
    level: 0,
    baseElevation: 0,
    height: FLOORPLAN_3D_CONFIG.wallHeightM,
    children: [
      "slab_floor",
      ...roomSlabIds,
      "spawn_walkthrough",
      ...spec.walls.map((x) => x.id),
      ...spec.rooms.map((x) => x.id),
      ...items.map((x) => x.id),
    ],
    metadata: {
      floorplanId: spec.id,
      factory: spec.factory,
      sourceImage: spec.sourceImage,
    },
  };
  return { nodes, rootNodeIds: ["site_house"] };
}
