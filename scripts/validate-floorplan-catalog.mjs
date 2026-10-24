import { readFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.join(
  process.cwd(),
  "lib",
  "floorplans",
  "rebuilt-variant-specs.json",
);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const issues = [];
const expectedIds = ["one", "two", "three"].flatMap((type) =>
  Array.from(
    { length: 8 },
    (_, index) => `${type}-option-${String(index + 1).padStart(2, "0")}`,
  ),
);
const entries = Array.isArray(catalog.entries) ? catalog.entries : [];
const entryById = new Map();

for (const entry of entries) {
  if (entryById.has(entry.variantId))
    issues.push(`${entry.variantId}: duplicate catalog entry`);
  entryById.set(entry.variantId, entry);
}
for (const id of expectedIds)
  if (!entryById.has(id)) issues.push(`${id}: missing catalog entry`);
for (const id of entryById.keys())
  if (!expectedIds.includes(id)) issues.push(`${id}: unexpected catalog entry`);

function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2,
  );
}

for (const entry of entries) {
  const label = entry.variantId || "unknown";
  const spec = entry.floorplanSpec || {};
  const walls = Array.isArray(spec.walls) ? spec.walls : [];
  const rooms = Array.isArray(spec.rooms) ? spec.rooms : [];
  const doors = Array.isArray(spec.doors) ? spec.doors : [];
  const windows = Array.isArray(spec.windows) ? spec.windows : [];
  const polygon = Array.isArray(spec.outerPolygon) ? spec.outerPolygon : [];
  const nodeIds = [
    ...walls.map((node) => node.id),
    ...rooms.map((node) => node.id),
    ...doors.map((node) => node.id),
    ...windows.map((node) => node.id),
  ];
  const wallIds = new Set(walls.map((wall) => wall.id));

  if (!entry.imageHash || entry.imageHash.length !== 64)
    issues.push(`${label}: invalid image hash`);
  if (spec.id !== label) issues.push(`${label}: spec id does not match variant id`);
  if (spec.sourceImage !== entry.imageUrl)
    issues.push(`${label}: source image does not match catalog entry`);
  if (new Set(nodeIds).size !== nodeIds.length)
    issues.push(`${label}: duplicate Pascal node id`);
  if (polygon.length < 3 || polygonArea(polygon) < 4)
    issues.push(`${label}: invalid or implausibly small outer polygon`);
  if (rooms.length < 2) issues.push(`${label}: fewer than two rooms`);
  if (walls.length < polygon.length)
    issues.push(`${label}: wall count is smaller than outer edge count`);
  for (const opening of [...doors, ...windows])
    if (!wallIds.has(opening.wallId))
      issues.push(`${label}: ${opening.id} references missing wall ${opening.wallId}`);
  for (const room of rooms)
    if (!Array.isArray(room.polygon) || room.polygon.length < 3 || polygonArea(room.polygon) < 0.2)
      issues.push(`${label}: invalid room polygon ${room.id}`);
}

if (entries.length !== 24)
  issues.push(`catalog contains ${entries.length} entries instead of 24`);

if (issues.length) {
  console.error(`Floorplan catalog validation failed (${issues.length} issues):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Floorplan catalog validation passed: ${entries.length}/24 image-bound specs.`);
for (const entry of entries) {
  const spec = entry.floorplanSpec;
  const xs = spec.outerPolygon.map((point) => point[0]);
  const zs = spec.outerPolygon.map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...zs) - Math.min(...zs);
  console.log(
    `${entry.variantId}: ${width.toFixed(3)} x ${depth.toFixed(3)} m, ` +
      `${spec.rooms.length} zones, ${spec.walls.length} walls, ` +
      `${spec.doors.length} doors, ${spec.windows.length} windows`,
  );
}
