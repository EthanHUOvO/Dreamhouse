import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.IDEAL_HOME_TEST_URL || "http://172.21.16.36:3002";
const planPath = resolve("../../.runtime-qwen21/qwen21-step2.png");
const renderPath = resolve("../../.runtime-qwen21/source-render-01.webp");
const timeoutMs = 900_000;
const results = { baseUrl, startedAt: new Date().toISOString(), steps: [] };

function dataUrl(path, bytes) {
  const mime = extname(path).toLowerCase() === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function postJson(path, body, timeout = timeoutMs) {
  const start = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 1200) }; }
  return {
    httpStatus: response.status,
    elapsedMs: Math.round(performance.now() - start),
    body: parsed,
  };
}

async function runStep(name, run) {
  const result = { name, startedAt: new Date().toISOString() };
  const start = performance.now();
  try {
    Object.assign(result, await run());
  } catch (error) {
    result.error = error?.stack || String(error);
  }
  result.elapsedMs = Math.round(performance.now() - start);
  result.finishedAt = new Date().toISOString();
  results.steps.push(result);
  console.log(JSON.stringify({ step: name, elapsedMs: result.elapsedMs, httpStatus: result.httpStatus, error: result.error }));
  return result;
}

async function readSse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
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
      events.push({ event: eventName || data.type || "message", data });
      const item = events.at(-1);
      console.log(JSON.stringify({
        event: item.event,
        name: item.data.name,
        status: item.data.status,
        stage: item.data.stage,
        revision: item.data.revision,
        valid: item.data.validation?.valid ?? item.data.result?.validation?.valid,
      }));
    }
    if (done) break;
  }
  return events;
}

try {
  const planBytes = await readFile(planPath);
  let confirmedPlanBytes = planBytes;
  let confirmedPlanUrl = dataUrl(planPath, planBytes);
  let sourceImageHash = createHash("sha256").update(confirmedPlanBytes).digest("hex");

  const step2 = await runStep("step2-floorplan-edit", () => postJson("/api/ai/floorplan-image", {
    sourceImage: confirmedPlanUrl,
    instruction: "在不改变原有房间数量、墙体、门窗位置和整体比例的前提下，把客餐厅地面改为浅灰色大理石，其余保持不变。",
    fresh: true,
  }));

  const editedImagePath = step2.body?.image?.url;
  if (step2.httpStatus === 200 && editedImagePath) {
    const imageResponse = await fetch(new URL(editedImagePath, baseUrl), { signal: AbortSignal.timeout(30_000) });
    if (!imageResponse.ok) throw new Error(`Step 2 image fetch failed: ${imageResponse.status}`);
    confirmedPlanBytes = Buffer.from(await imageResponse.arrayBuffer());
    const mime = imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
    confirmedPlanUrl = `data:${mime};base64,${confirmedPlanBytes.toString("base64")}`;
    sourceImageHash = createHash("sha256").update(confirmedPlanBytes).digest("hex");
    await writeFile(resolve("step2-generated.png"), confirmedPlanBytes);
  }

  const step3 = await runStep("step3-pascal-mcp-3d", async () => {
    const sessionId = `migration-step3-${Date.now()}`;
    const start = performance.now();
    const response = await fetch(`${baseUrl}/api/ai/model3d/stream`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({
        sessionId,
        sourceImageHash,
        sourceImage: "qwen21-step2.png",
        sourceImageDataUrl: confirmedPlanUrl,
        reconstructionMode: "ai-live",
        fallbackScene: { nodes: { building_house: { type: "building", metadata: {} } } },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const events = response.ok ? await readSse(response) : [];
    const last = events.at(-1);
    return {
      httpStatus: response.status,
      elapsedMs: Math.round(performance.now() - start),
      sessionId,
      sourceImageHash,
      events,
      terminalEvent: last?.event,
      validation: events.findLast((event) => event.event === "complete")?.data?.result?.validation
        || events.findLast((event) => event.event === "validation")?.data?.validation,
    };
  });

  const renderBytes = await readFile(renderPath);
  const renderUrl = dataUrl(renderPath, renderBytes);
  const step4 = await runStep("step4-walkthrough-render", () => postJson("/api/ai/image", {
    mode: "walkthrough-render",
    sessionId: step3.sessionId || `migration-step4-${Date.now()}`,
    sourceImageHash,
    sceneRevision: 1,
    roomId: "living-room",
    roomName: "客餐厅",
    pascalScreenshot: renderUrl,
    stylePrompt: "保持原图构图与家具位置，生成自然明亮的现代浅色客餐厅效果图。",
    size: "512x512",
  }));
  const renderImagePath = step4.body?.image?.url;
  if (step4.httpStatus === 200 && renderImagePath) {
    const imageResponse = await fetch(new URL(renderImagePath, baseUrl), { signal: AbortSignal.timeout(30_000) });
    if (!imageResponse.ok) throw new Error(`Step 4 image fetch failed: ${imageResponse.status}`);
    await writeFile(resolve("step4-generated.png"), Buffer.from(await imageResponse.arrayBuffer()));
  }
} catch (error) {
  results.fatalError = error?.stack || String(error);
}

results.finishedAt = new Date().toISOString();
await writeFile(resolve("step2-4-results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ resultFile: resolve("step2-4-results.json"), finishedAt: results.finishedAt }));
