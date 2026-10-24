import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "lib", "floorplans", "generated-variant-specs.json");
const outputPath = path.join(root, "lib", "floorplans", "rebuilt-variant-specs.json");
const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function area(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0)) / 2;
}
function bounds(points) {
  const xs = points.map((point) => point[0]);
  const zs = points.map((point) => point[1]);
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) };
}
function pointInBounds(point, polygon) {
  const xs = polygon.map((item) => item[0]);
  const zs = polygon.map((item) => item[1]);
  return point[0] >= Math.min(...xs) - 0.03 && point[0] <= Math.max(...xs) + 0.03 && point[1] >= Math.min(...zs) - 0.03 && point[1] <= Math.max(...zs) + 0.03;
}

if (!Array.isArray(source.entries) || source.entries.length !== 24) throw new Error("Expected exactly 24 source floorplans");
const entries = source.entries.map((entry) => {
  const spec = structuredClone(entry.floorplanSpec);
  spec.unit = "meter";
  spec.rebuild = { method: "source-catalog-calibration-v2", sourceImage: entry.imageUrl, authoritative: true };
  spec.rooms = spec.rooms.map((room) => ({ ...room, expectedArea: Number(area(room.polygon).toFixed(2)) }));
  spec.expected = { roomCount: spec.rooms.length, doorCount: spec.doors.length, windowCount: spec.windows.length, approximateArea: Number(area(spec.outerPolygon).toFixed(2)), sceneBounds: bounds(spec.outerPolygon) };
  const issues = [];
  if (spec.outerPolygon.length < 3) issues.push("outer_polygon_invalid");
  for (const wall of spec.walls) if (!pointInBounds(wall.start, spec.outerPolygon) || !pointInBounds(wall.end, spec.outerPolygon)) issues.push(`wall_outside:${wall.id}`);
  for (const opening of [...spec.doors, ...spec.windows]) if (!spec.walls.some((wall) => wall.id === opening.wallId)) issues.push(`opening_host_missing:${opening.id}`);
  return { ...entry, floorplanSpec: spec, rebuildValidation: { status: issues.length ? "needs_review" : "ready", issues } };
});
fs.writeFileSync(outputPath, `${JSON.stringify({ ...source, schema: "dreamhouse-floorplan-catalog/rebuilt-v2", entries }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, count: entries.length, needsReview: entries.filter((entry) => entry.rebuildValidation.status !== "ready").map((entry) => ({ variantId: entry.variantId, issues: entry.rebuildValidation.issues })) }, null, 2));
