import type { SceneGraph, SceneNode } from "./types";
export type SceneDiff = {
  geometryChanged: boolean;
  topologyChanged: boolean;
  semanticChanged: boolean;
  furnitureChanged: boolean;
  wallCountBefore: number;
  wallCountAfter: number;
  zoneCountBefore: number;
  zoneCountAfter: number;
  doorCountBefore: number;
  doorCountAfter: number;
  furnitureCountBefore: number;
  furnitureCountAfter: number;
  changedWalls: string[];
  changedZones: string[];
  changedDoors: string[];
};
function nodesOf(scene: SceneGraph, type: string) {
  return Object.values(scene.nodes).filter((n) => n.type === type);
}
function signature(node: SceneNode | undefined) {
  if (!node) return null;
  const n: any = node;
  return JSON.stringify({
    name: n.name,
    start: n.start,
    end: n.end,
    position: n.position,
    polygon: n.polygon,
    width: n.width,
    parentId: n.parentId,
    wallId: n.wallId,
    metadata: n.metadata,
  });
}
function changed(before: SceneGraph, after: SceneGraph, type: string) {
  const ids = new Set(
    [...nodesOf(before, type), ...nodesOf(after, type)].map((n) => n.id),
  );
  return [...ids].filter(
    (id) => signature(before.nodes[id]) !== signature(after.nodes[id]),
  );
}
export function compareScenes(
  before: SceneGraph,
  after: SceneGraph,
): SceneDiff {
  const changedWalls = changed(before, after, "wall"),
    changedZones = changed(before, after, "zone"),
    changedDoors = changed(before, after, "door"),
    changedFurniture = changed(before, after, "item");
  const zoneTopology = changedZones.filter((id) => {
    const a: any = before.nodes[id],
      b: any = after.nodes[id];
    return JSON.stringify(a?.polygon) !== JSON.stringify(b?.polygon);
  });
  const semanticChanged = changedZones.some((id) => {
    const a: any = before.nodes[id],
      b: any = after.nodes[id];
    return (
      a?.name !== b?.name ||
      a?.metadata?.semantic_type !== b?.metadata?.semantic_type
    );
  });
  const topologyChanged = Boolean(
    changedWalls.length || changedDoors.length || zoneTopology.length,
  );
  return {
    geometryChanged: topologyChanged,
    topologyChanged,
    semanticChanged,
    furnitureChanged: Boolean(changedFurniture.length),
    wallCountBefore: nodesOf(before, "wall").length,
    wallCountAfter: nodesOf(after, "wall").length,
    zoneCountBefore: nodesOf(before, "zone").length,
    zoneCountAfter: nodesOf(after, "zone").length,
    doorCountBefore: nodesOf(before, "door").length,
    doorCountAfter: nodesOf(after, "door").length,
    furnitureCountBefore: nodesOf(before, "item").length,
    furnitureCountAfter: nodesOf(after, "item").length,
    changedWalls,
    changedZones,
    changedDoors,
  };
}
