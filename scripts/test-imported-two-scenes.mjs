import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/preset/pascal-v2/two");
const report = [];
for (let index = 1; index <= 8; index += 1) {
  const option = String(index).padStart(2, "0");
  const jsonPath = path.join(root, `two-${option}.pascal.json`);
  const glbPath = path.join(root, `two-${option}.glb`);
  if (!fs.existsSync(jsonPath) || !fs.existsSync(glbPath)) throw new Error(`两居${option}导入文件不完整`);
  const scene = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!scene.nodes || !Array.isArray(scene.rootNodeIds)) throw new Error(`两居${option}不是有效 Pascal 场景`);
  const ids = new Set(Object.keys(scene.nodes));
  const counts = {};
  for (const [id, node] of Object.entries(scene.nodes)) {
    if (id !== node.id) throw new Error(`两居${option}节点标识不一致：${id}`);
    counts[node.type] = (counts[node.type] || 0) + 1;
    if (node.parentId && !ids.has(node.parentId)) throw new Error(`两居${option}父节点不存在：${id}`);
    for (const childId of node.children || []) if (!ids.has(childId)) throw new Error(`两居${option}子节点不存在：${childId}`);
    if ((node.type === "door" || node.type === "window") && (!ids.has(node.wallId) || !scene.nodes[node.wallId].children?.includes(id))) throw new Error(`两居${option}门窗宿主关系无效：${id}`);
  }
  report.push({ variantId: `two-option-${option}`, json: "通过", glb: "已归档", nodes: ids.size, walls: counts.wall || 0, doors: counts.door || 0, windows: counts.window || 0, rooms: counts.zone || 0 });
}
fs.mkdirSync(path.resolve("artifacts/pascal-two-migration"), { recursive: true });
fs.writeFileSync(path.resolve("artifacts/pascal-two-migration/场景校验.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.length, report }));
