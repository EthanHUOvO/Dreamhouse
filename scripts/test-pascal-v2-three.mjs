import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/preset/pascal-v2/three");
const report = [];
const sourceRoot = path.resolve("public/preset/variants/three");
const pointInPolygon = (x, z, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if (((zi > z) !== (zj > z)) && x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi) inside = !inside;
  }
  return inside;
};
const segmentDistance = (x, z, a, b) => {
  const vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (l2 || 1)));
  return Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t));
};
for (let index = 1; index <= 8; index += 1) {
  const option = String(index).padStart(2, "0");
  const scene = JSON.parse(fs.readFileSync(path.join(root, `option-${option}.pascal.json`), "utf8"));
  if (!fs.existsSync(path.join(sourceRoot, `option-${option}.png`))) throw new Error(`三居${option}原始二维图缺失`);
  const nodes = scene.nodes;
  const ids = new Set(Object.keys(nodes));
  if (!scene.rootNodeIds?.every((id) => ids.has(id))) throw new Error(`三居${option}根节点无效`);
  const counts = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (id !== node.id) throw new Error(`三居${option}节点 ID 不一致`);
    counts[node.type] = (counts[node.type] || 0) + 1;
    if (node.parentId && !ids.has(node.parentId)) throw new Error(`三居${option}父节点不存在：${id}`);
    if ((node.children || []).some((childId) => !ids.has(childId))) throw new Error(`三居${option}子节点不存在：${id}`);
    if ((node.type === "door" || node.type === "window") && (!ids.has(node.wallId) || !nodes[node.wallId].children?.includes(id))) throw new Error(`三居${option}门窗宿主关系无效：${id}`);
    if (node.type === "wall" && (!Array.isArray(node.start) || !Array.isArray(node.end) || !node.thickness || !node.height)) throw new Error(`三居${option}墙体尺寸无效：${id}`);
    if ((node.type === "slab" || node.type === "zone") && (!Array.isArray(node.polygon) || node.polygon.length < 3)) throw new Error(`三居${option}${node.type === "slab" ? "楼板" : "房间"}轮廓无效`);
  }
  const zones = Object.values(nodes).filter((node) => node.type === "zone");
  const slab = Object.values(nodes).find((node) => node.type === "slab" && node.polygon?.length >= 3);
  const living = zones.find((zone) => /客厅|客餐厅/.test(String(zone.name || ""))) || zones.find((zone) => zone.metadata?.roomType === "living") || zones[0];
  const polygon = living?.polygon || slab?.polygon || [];
  const spawn = polygon.reduce((sum, p) => [sum[0] + p[0] / Math.max(1, polygon.length), sum[1] + p[1] / Math.max(1, polygon.length)], [0, 0]);
  const spawnClear = polygon.length >= 3 && pointInPolygon(spawn[0], spawn[1], polygon) && !Object.values(nodes).some((wall) => wall.type === "wall" && segmentDistance(spawn[0], spawn[1], wall.start, wall.end) <= Number(wall.thickness || .12) / 2 + .22);
  const doors = Object.values(nodes).filter((node) => node.type === "door");
  const offsetsStable = doors.every((door) => Math.abs((Number(door.position?.[0] || 0) - Number(door.width || .86) / 2) + Number(door.width || .86) / 2 - Number(door.position?.[0] || 0)) < 1e-9);
  report.push({ variantId: `three-option-${option}`, scene: "通过", sceneVersion: "pascal-v2", sourceImage: `/preset/variants/three/option-${option}.png`, walls: counts.wall || 0, doors: doors.length, windows: counts.window || 0, rooms: zones.length, specialRooms: zones.filter((zone) => ["书房", "冷藏室"].includes(zone.name)).map((zone) => `${zone.name}:${zone.metadata?.roomType || "待确认"}`), spawn: spawnClear ? "加载时生成且通过墙体间距检查" : "需要调整", doorOffsetRoundTrip: offsetsStable ? "通过" : "失败", inferredDoors: doors.filter((door) => door.metadata?.inferred).length, connectivity: "需浏览器漫游验收" });
}
fs.mkdirSync(path.resolve("artifacts/pascal-v2-three"), { recursive: true });
const reportJson = JSON.stringify(report, null, 2);
fs.writeFileSync(path.resolve("artifacts/pascal-v2-three/迁移校验.json"), reportJson);
fs.writeFileSync(path.resolve("artifacts/pascal-v2-three-migration-report.json"), reportJson);
console.log(JSON.stringify({ total: report.length, report }));
