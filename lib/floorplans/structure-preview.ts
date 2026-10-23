import type { SceneGraph } from "../types";
import { sceneToFloorplanBlueprint } from "./blueprint";
import { polygonArea } from "./types";
import { structureFurnitureFootprints } from "./structure-edit";

const xml = (value: unknown) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));

/** A presentation image derived from the authoritative graph, never I2I geometry. */
export function structureSceneSvg(scene: SceneGraph) {
  const blueprint = sceneToFloorplanBlueprint(scene);
  const xs = blueprint.outerPolygon.map((p) => p[0]), zs = blueprint.outerPolygon.map((p) => p[1]);
  const x = Math.min(...xs) - 0.35, z = Math.min(...zs) - 0.35;
  const width = Math.max(...xs) - x + 0.35, depth = Math.max(...zs) - z + 0.35;
  const elements: string[] = [];
  for (const room of blueprint.rooms) elements.push(`<polygon points="${room.polygon.map((p) => p.join(",")).join(" ")}" fill="${room.semantic === "study" ? "#e5ecd5" : "#f4f1e8"}" stroke="#c4c3b7" stroke-width=".015"/>`);
  for (const f of structureFurnitureFootprints(scene)) elements.push(`<rect x="${f.minX}" y="${f.minZ}" width="${f.maxX - f.minX}" height="${f.maxZ - f.minZ}" fill="#d1cbc0" stroke="#9f978c" stroke-width=".015"/>`);
  for (const wall of blueprint.walls) elements.push(`<line x1="${wall.start[0]}" y1="${wall.start[1]}" x2="${wall.end[0]}" y2="${wall.end[1]}" stroke="${wall.id.includes("study_ai") ? "#396963" : "#515552"}" stroke-width="${scene.nodes[wall.id].thickness || .12}"/>`);
  for (const opening of [...blueprint.doors, ...blueprint.windows]) {
    const wall = scene.nodes[opening.hostWallId], dx = wall.end[0] - wall.start[0], dz = wall.end[1] - wall.start[1], length = Math.hypot(dx, dz);
    const a = [wall.start[0] + dx * opening.offset / length, wall.start[1] + dz * opening.offset / length];
    const b = [wall.start[0] + dx * (opening.offset + opening.width) / length, wall.start[1] + dz * (opening.offset + opening.width) / length];
    const window = scene.nodes[opening.id].type === "window";
    elements.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="white" stroke-width="${Number(wall.thickness || .12) + .025}"/>`);
    elements.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${window ? "#55829a" : "#ae8058"}" stroke-width=".04"/>`);
  }
  for (const room of blueprint.rooms) {
    // The living room is concave; put its label in its lower central area.
    const cx = room.id === "zone_one01_living" ? 1.75 : room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
    const cz = room.id === "zone_one01_living" ? 5.8 : room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
    elements.push(`<text x="${cx}" y="${cz}" text-anchor="middle" font-size=".16" fill="#303b35">${xml(room.name)}<tspan x="${cx}" dy=".22">${polygonArea(room.polygon).toFixed(2)}㎡</tspan></text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="748" height="940" viewBox="${x} ${z} ${width} ${depth}" style="background:#fff;font-family:sans-serif">${elements.join("")}</svg>`;
}

export async function structureScenePng(scene: SceneGraph): Promise<string> {
  const svg = structureSceneSvg(scene), image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("结构预览绘制失败，未提交")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = 748; canvas.height = 940;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("浏览器Canvas不可用，未提交");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}
