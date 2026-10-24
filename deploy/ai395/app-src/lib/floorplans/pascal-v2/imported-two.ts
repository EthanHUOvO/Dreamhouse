import type { SceneGraph, SelectedVariant } from "../../types";
import type { FloorplanBlueprint } from "../types";
import { validateBuildJson } from "@pascal-app/core";
import { validateVariantBlueprint } from "../blueprint";

/** Imported Pascal scene files supplied with the two-bedroom model package. */
export const importedTwoSceneUrls: Record<string, string> = Object.fromEntries(
  Array.from({ length: 8 }, (_, index) => {
    const option = String(index + 1).padStart(2, "0");
    return [`two-option-${option}`, `/preset/pascal-v2/two/two-${option}.pascal.json`];
  }),
);

export function validateImportedScene(scene: unknown, variantId: string, label: string, officialSchema = false): asserts scene is SceneGraph {
  if (!scene || typeof scene !== "object" || !("nodes" in scene) || !("rootNodeIds" in scene)) {
    throw new Error(`${label}${variantId.slice(-2)}的三维户型数据加载失败`);
  }
  const nodes = (scene as SceneGraph).nodes;
  if (!nodes || typeof nodes !== "object" || !Object.keys(nodes).length) throw new Error(`${label}${variantId.slice(-2)}的三维户型数据加载失败`);
  const ids = new Set(Object.keys(nodes));
  for (const [id, node] of Object.entries(nodes)) {
    if (node.id !== id) throw new Error(`${label}${variantId.slice(-2)}的户型结构标识无效`);
    if (node.parentId && !ids.has(node.parentId)) throw new Error(`${label}${variantId.slice(-2)}的户型层级引用无效`);
    for (const childId of node.children || []) if (!ids.has(childId)) throw new Error(`${label}${variantId.slice(-2)}的户型连接引用无效`);
    if ((node.type === "door" || node.type === "window") && (!node.wallId || !ids.has(node.wallId))) throw new Error(`${label}${variantId.slice(-2)}的门窗宿主无效`);
    if ((node.type === "door" || node.type === "window") && !nodes[node.wallId!].children?.includes(id)) throw new Error(`${label}${variantId.slice(-2)}的门窗宿主关系无效`);
    if (node.type === "door" || node.type === "window") {
      const wall = nodes[node.wallId!];
      const length = Math.hypot(wall.end?.[0] - wall.start?.[0], wall.end?.[1] - wall.start?.[1]);
      const centre = node.position?.[0];
      if (wall.type !== "wall" || !Number.isFinite(length) || length <= 0 || !Number.isFinite(node.width) || node.width <= 0 || !Number.isFinite(node.height) || node.height <= 0 || !Number.isFinite(centre))
        throw new Error(`${label}${variantId.slice(-2)}的门窗几何无效：${id}`);
      if (node.parentId !== node.wallId || centre - node.width / 2 < -0.001 || centre + node.width / 2 > length + 0.001)
        throw new Error(`${label}${variantId.slice(-2)}的门窗超出宿主墙：${id}`);
    }
  }
  if (!(scene as SceneGraph).rootNodeIds.every((id) => ids.has(id))) throw new Error(`${label}${variantId.slice(-2)}的根节点无效`);
  if (officialSchema) {
    const validation = validateBuildJson(scene);
    if (!validation.ok) {
      const detail = validation.schemaIssues[0]?.message || validation.errors[0]?.message || "结构校验失败";
      throw new Error(`${label}${variantId.slice(-2)}的Pascal结构校验失败：${detail}`);
    }
  }
}

const sceneCache = new Map<string, SceneGraph>();
const polygonArea = (polygon: Array<[number, number]>) => Math.abs(polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2);

export function prepareDreamHouseScene(scene: SceneGraph, variant: SelectedVariant, label: string) {
  // The supplied scenes use a stable per-option building id. DreamHouse's
  // editing/BOM helpers use the canonical building_house metadata slot, so
  // normalize only that container and preserve every child node id.
  const building = Object.values(scene.nodes).find((node) => node.type === "building");
  if (!building) throw new Error(`${label}${String(variant.optionIndex).padStart(2, "0")}缺少建筑节点`);
  const originalId = building.id;
  if (originalId !== "building_house") {
    const renamed = { ...building, id: "building_house", children: [...(building.children || [])] };
    delete scene.nodes[originalId];
    scene.nodes.building_house = renamed;
    for (const node of Object.values(scene.nodes)) {
      if (node.parentId === originalId) node.parentId = "building_house";
      if (node.children) node.children = node.children.map((childId) => childId === originalId ? "building_house" : childId);
    }
    scene.rootNodeIds = scene.rootNodeIds.map((id) => id === originalId ? "building_house" : id);
  }
  const values = Object.values(scene.nodes);
  const slab = values.find((node) => node.type === "slab" && Array.isArray(node.polygon));
  const walls = values.filter((node) => node.type === "wall");
  const rooms = values.filter((node) => node.type === "zone");
  const outerPolygon = (slab?.polygon || []) as [number, number][];
  const xs = outerPolygon.map((point) => point[0]);
  const zs = outerPolygon.map((point) => point[1]);
  const isImportedV2 = variant.residenceType === "one" || variant.residenceType === "three";
  if (isImportedV2) {
    const semanticMap: Record<string, string> = {
      living: "living_room", living_room: "living_room", bedroom: "bedroom", kitchen: "kitchen",
      bathroom: "bathroom", balcony: "balcony", study: "study", dining: "dining_room", dining_room: "dining_room",
      hall: "unknown", corridor: "unknown", storage: "unknown", washroom: "bathroom", elevator: "unknown",
    };
    for (const room of rooms) {
      const sourceType = String(room.metadata?.roomType || "");
      room.metadata = { ...(room.metadata || {}), semantic_type: semanticMap[sourceType] || "unknown" };
    }
  }
  const openings = values.filter((node) => node.type === "door" || node.type === "window");
  // Pascal stores opening position as the wall-local center. DreamHouse's
  // Blueprint stores the left edge offset, so persist that conversion once at
  // import and keep it stable through scene -> blueprint -> scene round trips.
  for (const node of openings) {
    const width = Number(node.width ?? (node.type === "door" ? 0.86 : 1.2));
    node.metadata = { ...(node.metadata || {}), blueprintOffset: Number(node.position?.[0] ?? 0) - width / 2 };
  }
  const blueprint: FloorplanBlueprint = {
    schema: "dreamhouse-floorplan-blueprint/v1", id: variant.variantId, name: String(scene.nodes.building_house.name || variant.variantId), factory: "imported-pascal-json", sourceImage: variant.imageUrl,
    outerPolygon,
    walls: walls.map((node) => ({ id: node.id, start: node.start, end: node.end, structural: node.metadata?.structural_type === "load_bearing" ? "load_bearing" : "partition" })),
    rooms: rooms.map((node) => ({ id: node.id, name: String(node.name || node.id), semantic: String(node.metadata?.roomType || "bedroom"), polygon: node.polygon || [], expectedArea: Number(node.metadata?.sourceArea || 0), color: String(node.color || "#73999a") })),
    doors: values.filter((node) => node.type === "door").map((node) => ({ id: node.id, name: String(node.name || "门"), hostWallId: String(node.wallId), offset: Number(node.metadata?.blueprintOffset), width: Number(node.width ?? 0.86), height: Number(node.height ?? 2.1), doorType: node.doorType || "hinged", hingeSide: node.hingesSide || "left", swingDirection: node.swingDirection || "inward", swingAngle: Number(node.swingAngle || 0), connects: node.connects || [null, null], locked: false })),
    windows: values.filter((node) => node.type === "window").map((node) => ({ id: node.id, name: String(node.name || "窗"), hostWallId: String(node.wallId), offset: Number(node.metadata?.blueprintOffset), width: Number(node.width ?? 1.2), height: Number(node.height ?? 1.4), sillHeight: Number(node.sillHeight ?? (node.position?.[1] == null ? 1 : Number(node.position[1]) - Number(node.height ?? 1.4) / 2)) })),
    furniture: [], expected: { roomCount: rooms.length, doorCount: values.filter((node) => node.type === "door").length, windowCount: values.filter((node) => node.type === "window").length, approximateArea: polygonArea(outerPolygon), sceneBounds: { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) } }, unit: "meter",
  };
  const validation = validateVariantBlueprint(blueprint);
  if (!validation.valid) throw new Error(`${label}${String(variant.optionIndex).padStart(2, "0")}的 Blueprint 无效：${validation.issues.join("；")}`);
  const metadata = (scene.nodes.building_house.metadata ||= {});
  metadata.floorplanBlueprint = blueprint;
  metadata.floorplanVersion = "v2";
  metadata.variantId = variant.variantId;
  metadata.sourceDrawing = variant.imageUrl;
  metadata.sourceImageHash = variant.imageHash;
  metadata.floorplanSource = "imported-pascal-json";
  if (isImportedV2) {
    for (const node of values) {
      if ((node.type === "door" || node.type === "window") && node.metadata?.inferred) {
        node.metadata = { ...node.metadata, assumedOpening: true };
      }
    }
  }
  if (variant.residenceType === "three" && !values.some((node) => node.type === "spawn")) {
    const living = rooms.find((room) => /客厅|客餐厅/.test(String(room.name || ""))) || rooms.find((room) => room.metadata?.roomType === "living") || rooms[0];
    const polygon = (living?.polygon || outerPolygon) as [number, number][];
    const center = polygon.reduce(([x, z], [px, pz]) => [x + px / Math.max(1, polygon.length), z + pz / Math.max(1, polygon.length)], [0, 0] as [number, number]);
    const level = values.find((node) => node.type === "level");
    const spawnId = `spawn_${variant.variantId}`;
    scene.nodes[spawnId] = { object: "node", id: spawnId, type: "spawn", name: "入户安全出生点", parentId: level?.id || "building_house", visible: true, position: [center[0], 0, center[1]], rotation: 0, supportSlabId: slab?.id, metadata: { sceneVersion: "pascal-v2", source: "客餐厅安全区域" } };
    if (level) level.children = [...(level.children || []), spawnId];
    metadata.spawnNodeId = spawnId;
  }
}

export async function loadImportedScene(variant: SelectedVariant, urls: Record<string, string>, label: string, officialSchema = false): Promise<SceneGraph> {
  const url = urls[variant.variantId];
  if (!url) throw new Error(`${label}${String(variant.optionIndex).padStart(2, "0")}的三维户型数据加载失败`);
  const cached = sceneCache.get(variant.variantId);
  const source = cached ? JSON.parse(JSON.stringify(cached)) as SceneGraph : await fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`${label}${String(variant.optionIndex).padStart(2, "0")}的三维户型数据加载失败`);
    return response.json();
  });
  validateImportedScene(source, variant.variantId, label, officialSchema);
  sceneCache.set(variant.variantId, source);
  const scene = JSON.parse(JSON.stringify(source)) as SceneGraph;
  prepareDreamHouseScene(scene, variant, label);
  // Three-bedroom imports add a normalized SpawnNode and metadata; validate
  // the final scene as well as the source so generated runtime data is covered.
  if (officialSchema) validateImportedScene(scene, variant.variantId, label, true);
  return scene;
}

export async function loadImportedTwoScene(variant: SelectedVariant): Promise<SceneGraph> {
  return loadImportedScene(variant, importedTwoSceneUrls, "两居");
}
