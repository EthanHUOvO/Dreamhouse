import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const groups = ["one", "two", "three"];
const jobs = groups.flatMap((residenceType) =>
  Array.from({ length: 8 }, (_, index) => ({
    residenceType,
    optionIndex: index + 1,
    variantId: `${residenceType}-option-${String(index + 1).padStart(2, "0")}`,
    imageUrl: `/preset/variants/${residenceType}/option-${String(index + 1).padStart(2, "0")}.png`,
  })),
);

async function importJob(job) {
  const bytes = await readFile(path.join(root, "public", job.imageUrl));
  const imageDataUrl = `data:image/png;base64,${bytes.toString("base64")}`;
  const imageHash = createHash("sha256").update(imageDataUrl).digest("hex");
  const body = {
    ...job,
    imageHash,
    imageDataUrl,
    requestId: `catalog-${job.variantId}`,
    sessionId: `catalog-${job.variantId}-${imageHash.slice(0, 12)}`,
    forceReimport: true,
  };
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("http://localhost:3000/api/ai/import-floorplan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
      });
      const result = await response.json();
      if (!response.ok || result.provider !== "qwen")
        throw new Error(result.error || `HTTP ${response.status}`);
      console.log(
        `${job.variantId}: ${result.floorplanSpec.rooms.length} rooms, ${result.floorplanSpec.walls.length} walls`,
      );
      return {
        variantId: job.variantId,
        residenceType: job.residenceType,
        optionIndex: job.optionIndex,
        imageUrl: job.imageUrl,
        imageHash,
        floorplanSpec: result.floorplanSpec,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw new Error(`${job.variantId}: ${lastError?.message || lastError}`);
}

const entries = [];
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) entries.push(await importJob(queue.shift()));
  }),
);
entries.sort((a, b) => a.variantId.localeCompare(b.variantId));
await writeFile(
  path.join(root, "lib", "floorplans", "generated-variant-specs.json"),
  `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
);
console.log(`Saved ${entries.length} image-bound floorplan specs.`);
