import fs from "node:fs/promises";

const source = await fs.readFile("artifacts/customer-1920x1080.png");
const sourceImage = `data:image/png;base64,${source.toString("base64")}`;
await fs.mkdir("artifacts/step4-room-types", { recursive: true });
const cases = [
  ["bathroom", "卫生间", "new_chinese"],
  ["kitchen", "厨房", "nordic"],
  ["living_room", "客餐厅", "modern"],
];

const results = await Promise.all(cases.map(async ([roomType, roomName, styleId]) => {
  const startedAt = Date.now();
  const response = await fetch("http://localhost:3001/api/ai/render-view", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "room-type-check",
      captureId: `capture-${roomType}`,
      roomType,
      roomName,
      styleId,
      sourceImage,
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const data = await response.json();
  let outputPath;
  if (data?.image?.url) {
    const imageResponse = await fetch(data.image.url);
    if (imageResponse.ok) {
      outputPath = `artifacts/step4-room-types/${roomType}.png`;
      await fs.writeFile(outputPath, Buffer.from(await imageResponse.arrayBuffer()));
    }
  }
  return {
    roomType,
    roomName,
    styleId,
    status: response.status,
    elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    provider: data?.image?.provider,
    model: data?.image?.model,
    hasResult: Boolean(data?.image?.url),
    sourceImageCount: data?.image?.inputImageCount,
    outputPath,
  };
}));

for (const result of results) console.log(JSON.stringify(result));
