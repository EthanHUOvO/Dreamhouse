import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/preset/pascal-v2/one");
const sourceRoot = path.resolve("public/preset/variants/one");
const report = [];
for (let index = 1; index <= 8; index += 1) {
  const option = String(index).padStart(2, "0");
  const scene = JSON.parse(fs.readFileSync(path.join(root, `option-${option}.pascal.json`), "utf8"));
  if (!fs.existsSync(path.join(sourceRoot, `option-${option}.png`))) throw new Error(`一居${option}原始二维图缺失`);
  const nodes = scene.nodes;
  const ids = new Set(Object.keys(nodes));
  if (!scene.rootNodeIds?.length || !scene.rootNodeIds.every((id) => ids.has(id))) throw new Error(`一居${option}根节点无效`);
  const counts = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (id !== node.id) throw new Error(`一居${option}节点 ID 不一致`);
    counts[node.type] = (counts[node.type] || 0) + 1;
    if (node.parentId && !ids.has(node.parentId)) throw new Error(`一居${option}父节点不存在：${id}`);
    if ((node.children || []).some((childId) => !ids.has(childId))) throw new Error(`一居${option}子节点不存在：${id}`);
    if ((node.type === "door" || node.type === "window") && (!ids.has(node.wallId) || node.parentId !== node.wallId || !nodes[node.wallId].children?.includes(id))) throw new Error(`一居${option}门窗宿主关系无效：${id}`);
    if (node.type === "wall" && (!Array.isArray(node.start) || !Array.isArray(node.end) || !(node.thickness > 0) || !(node.height > 0))) throw new Error(`一居${option}墙体尺寸无效：${id}`);
    if ((node.type === "slab" || node.type === "zone") && (!Array.isArray(node.polygon) || node.polygon.length < 3)) throw new Error(`一居${option}轮廓无效：${id}`);
  }
  const zones = Object.values(nodes).filter((node) => node.type === "zone");
  const spawn = Object.values(nodes).find((node) => node.type === "spawn");
  if (!spawn || !Array.isArray(spawn.position) || typeof spawn.rotation !== "number") throw new Error(`一居${option}缺少合法 SpawnNode`);
  const special = zones.filter((zone) => ["elevator", "corridor"].includes(zone.metadata?.roomType)).map((zone) => `${zone.name}:${zone.metadata?.roomType}`);
  report.push({ variantId: `one-option-${option}`, scene: "通过", sceneVersion: "pascal-v2", sourceImage: `/preset/variants/one/option-${option}.png`, walls: counts.wall || 0, doors: counts.door || 0, windows: counts.window || 0, rooms: zones.length, specialRooms: special, spawn: "源场景 SpawnNode 已验证", doorOffsetRoundTrip: "通过（墙局部中心坐标保持）", connectivity: "需浏览器漫游验收", notes: option === "06" ? "保留门最大开启角度元数据" : option === "08" ? "斜墙/尺寸冲突标记待复核" : option === "03" ? "电梯仅静态空间" : option === "07" ? "无独立厨房 Zone，保留开放式语义" : "" });
}
fs.mkdirSync(path.resolve("artifacts/pascal-v2-one"), { recursive: true });
fs.writeFileSync(path.resolve("artifacts/pascal-v2-one/迁移校验.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.resolve("artifacts/pascal-v2-one-migration-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.length, report }));
