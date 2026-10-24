import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, "lib", "floorplans", "rebuilt-variant-specs.json"), "utf8"));
const report = catalog.entries.map((entry) => {
  const spec = entry.floorplanSpec;
  const xs = spec.outerPolygon.map((point) => point[0]);
  const zs = spec.outerPolygon.map((point) => point[1]);
  return {
    floorplanId: entry.variantId,
    sourceImage: entry.imageUrl,
    hasStructuredSpec: true,
    roomCount: spec.rooms.length,
    outerWallCount: spec.walls.filter((wall) => wall.structural === "load_bearing").length,
    innerWallCount: spec.walls.filter((wall) => wall.structural !== "load_bearing").length,
    doorCount: spec.doors.length,
    windowCount: spec.windows.length,
    scaleMethod: "meter / source catalog dimensions",
    projectedBounds: { width: Number((Math.max(...xs) - Math.min(...xs)).toFixed(3)), depth: Number((Math.max(...zs) - Math.min(...zs)).toFixed(3)) },
    validationStatus: entry.rebuildValidation?.status || "needs_review",
    issues: entry.rebuildValidation?.issues || [],
  };
});
const outputPath = path.join(root, "artifacts", "floorplan-projection-report.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: report.length, report }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, count: report.length, ready: report.filter((item) => item.validationStatus === "ready").length, needsReview: report.filter((item) => item.validationStatus !== "ready").length }, null, 2));
