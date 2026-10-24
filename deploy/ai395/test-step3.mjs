import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.IDEAL_HOME_TEST_URL || "http://172.21.16.36:3002";
const image = await readFile(resolve("step2-generated.png"));
const dataUrl = `data:image/png;base64,${image.toString("base64")}`;
const sourceImageHash = createHash("sha256").update(image).digest("hex");
const sessionId = `migration-step3-retest-${Date.now()}`;
const startedAt = new Date().toISOString();
const start = performance.now();
const response = await fetch(`${baseUrl}/api/ai/model3d/stream`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "text/event-stream" },
  body: JSON.stringify({
    sessionId,
    sourceImageHash,
    sourceImage: "step2-generated.png",
    sourceImageDataUrl: dataUrl,
    reconstructionMode: "ai-live",
    fallbackScene: { nodes: { building_house: { type: "building", metadata: {} } } },
  }),
  signal: AbortSignal.timeout(900_000),
});

const events = [];
const reader = response.body.getReader();
const decoder = new TextDecoder();
let pending = "";
while (true) {
  const { value, done } = await reader.read();
  pending += decoder.decode(value || new Uint8Array(), { stream: !done });
  let separator;
  while ((separator = pending.indexOf("\n\n")) >= 0) {
    const block = pending.slice(0, separator).replaceAll("\r", "");
    pending = pending.slice(separator + 2);
    const eventName = block.match(/^event:\s*(.+)$/m)?.[1];
    const dataText = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!dataText) continue;
    let data;
    try { data = JSON.parse(dataText); } catch { data = { raw: dataText }; }
    const item = { event: eventName || data.type || "message", data };
    events.push(item);
    console.log(JSON.stringify({
      event: item.event,
      name: data.name,
      status: data.status,
      stage: data.stage,
      revision: data.revision,
      error: data.error || data.message,
      valid: data.validation?.valid ?? data.result?.validation?.valid,
    }));
  }
  if (done) break;
}

const result = {
  baseUrl,
  sessionId,
  sourceImageHash,
  startedAt,
  finishedAt: new Date().toISOString(),
  elapsedMs: Math.round(performance.now() - start),
  httpStatus: response.status,
  terminalEvent: events.at(-1)?.event,
  tools: events.filter((event) => event.event === "tool").map(({ data }) => ({ name: data.name, status: data.status, error: data.error })),
  sceneStages: events.filter((event) => event.event === "scene").map(({ data }) => ({ stage: data.stage, revision: data.revision, valid: data.validation?.valid })),
  validation: events.findLast((event) => event.event === "complete")?.data?.result?.validation
    || events.findLast((event) => event.event === "validation")?.data?.validation,
  events,
};
await writeFile(resolve("step3-retest-results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ resultFile: resolve("step3-retest-results.json"), elapsedMs: result.elapsedMs, terminalEvent: result.terminalEvent }));
