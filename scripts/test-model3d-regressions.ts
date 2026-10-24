import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { runPascalSceneGeneration, type GenerateInput } from "../lib/ai/local-model3d-agent";
import { qwenChatCompletion } from "../lib/ai/qwen-client";
import { consumeModel3dSse } from "../lib/ai/model3d-stream";
import { callPascalTool, listPascalTools } from "../lib/ai/pascal-mcp-client";
import { canProceedAfterModelGeneration, canSelectOriginalFloorplan, originalFloorplanMatches, originalFloorplanSelection, shouldHydrateImportedPreset } from "../lib/ai/model3d-source";

const geometry = { outerPolygon: [[0, 0], [6, 0], [6, 6], [0, 6]], walls: [{ id: "w1", start: [0, 0], end: [6, 0] }], rooms: [{ id: "r1", name: "卧室", semantic: "bedroom", polygon: [[0, 0], [6, 0], [6, 6]], expectedArea: 18 }] };
const tools = ["set_floor_structure", "set_openings"].map((name) => ({ name, inputSchema: { type: "object" } }));
const input: GenerateInput = { sessionId: "regression", sourceImageHash: "12345678", sourceImage: "confirmed.png", sourceImageDataUrl: "data:image/png;base64,dGVzdA==" };
const scene = { nodes: { building_house: { id: "building_house", type: "building" } }, rootNodeIds: ["building_house"] };

function fakeDependencies() {
  let revision = 0;
  const calls: Array<{ name: string; args: any }> = [];
  const modelCalls: any[] = [];
  return {
    calls, modelCalls, model: "test-model", tools,
    chat: async (body: any) => {
      modelCalls.push(body);
      const name = body.tool_choice.function.name;
      assert.equal(body.tools.length, 1);
      assert.equal(body.tools[0].function.name, name);
      const args = name === "set_floor_structure" ? geometry : { doors: [{ id: "d1", wallId: "w1", width: .86, distance: 3 }], windows: [] };
      return { choices: [{ message: { tool_calls: [{ id: `tool-${modelCalls.length}`, function: { name, arguments: JSON.stringify(args) } }] } }] };
    },
    call: async (name: string, args: any) => {
      if (name !== "begin_floorplan_scene") assert.equal(args.revision, revision);
      assert.equal(args.sessionId, input.sessionId);
      assert.equal(args.sourceImageHash, input.sourceImageHash);
      calls.push({ name, args });
      revision += 1;
      return { revision, status: name, scene, validation: { valid: true, issues: [] } };
    },
  };
}

test("generation makes two forced geometry calls and six ordered MCP calls", async () => {
  const deps = fakeDependencies();
  const events: any[] = [];
  const result = await runPascalSceneGeneration({ ...input, onEvent: (event) => { events.push(event); } }, deps);
  assert.equal(deps.modelCalls.length, 2);
  assert.deepEqual(deps.calls.map((call) => call.name), ["begin_floorplan_scene", "set_floor_structure", "set_openings", "populate_basic_furniture", "validate_scene", "commit_scene"]);
  assert.equal(result.revision, 6);
  assert.equal(events.at(-1).type, "complete");
  assert.equal(deps.calls[1].args.rooms[0].name, "卧室");
});

test("wrong tools are corrected a bounded number of times and never committed", async () => {
  const deps = fakeDependencies();
  let attempts = 0;
  deps.chat = async () => { attempts += 1; return { choices: [{ message: { tool_calls: [] } }] }; };
  await assert.rejects(runPascalSceneGeneration(input, deps), /failed after two corrections/);
  assert.equal(attempts, 3);
  assert.deepEqual(deps.calls.map((call) => call.name), ["begin_floorplan_scene"]);
});

test("cancellation during model extraction prevents subsequent MCP calls", async () => {
  const deps = fakeDependencies();
  const controller = new AbortController();
  deps.chat = async () => { controller.abort(new Error("cancelled regression")); return {}; };
  await assert.rejects(runPascalSceneGeneration({ ...input, signal: controller.signal }, deps), /cancelled regression/);
  assert.equal(deps.calls.length, 1);
});

test("a multi-room reconstruction cannot pass with exterior walls only", async () => {
  const deps = fakeDependencies();
  deps.chat = async () => ({ choices: [{ message: { tool_calls: [{ id: 'missing-partitions', function: { name: 'set_floor_structure', arguments: JSON.stringify({ ...geometry, rooms: [...geometry.rooms, { ...geometry.rooms[0], id: 'r2' }] }) } }] } }] });
  await assert.rejects(runPascalSceneGeneration(input, deps), /only exterior walls/);
  assert.equal(deps.calls.length, 1);
});

test("unrelated interior walls do not satisfy bedroom boundary coverage", async () => {
  const deps = fakeDependencies();
  const structure = { ...geometry, rooms: [
    { ...geometry.rooms[0], polygon: [[0, 0], [3, 0], [3, 6], [0, 6]] },
    { ...geometry.rooms[0], id: 'r2', polygon: [[3, 0], [6, 0], [6, 6], [3, 6]] },
  ], walls: [...geometry.walls, { id: 'unrelated', start: [0, 2], end: [6, 2] }] };
  deps.chat = async () => ({ choices: [{ message: { tool_calls: [{ id: 'missing-boundaries', function: { name: 'set_floor_structure', arguments: JSON.stringify(structure) } }] } }] });
  await assert.rejects(runPascalSceneGeneration(input, deps), /do not cover the predicted room boundaries/);
  assert.equal(deps.calls.length, 1);
});

test("a corrected shared bedroom wall can complete without fabricating host geometry", async () => {
  const deps = fakeDependencies();
  let calls = 0;
  deps.chat = async (body: any) => {
    const name = body.tool_choice.function.name;
    const structure = { ...geometry, rooms: [
      { ...geometry.rooms[0], polygon: [[0, 0], [3, 0], [3, 6], [0, 6]] },
      { ...geometry.rooms[0], id: 'r2', polygon: [[3, 0], [6, 0], [6, 6], [3, 6]] },
    ], walls: [...geometry.walls, ...(calls ? [{ id: 'shared-wall', start: [3, 0], end: [3, 6] }] : [])] };
    calls += 1;
    const args = name === 'set_floor_structure' ? structure : { doors: [], windows: [] };
    return { choices: [{ message: { tool_calls: [{ id: `repair-${calls}`, function: { name, arguments: JSON.stringify(args) } }] } }] };
  };
  const progress: any[] = [];
  const result = await runPascalSceneGeneration({ ...input, onEvent: (event) => { if (event.type === 'progress') progress.push(event); } }, deps);
  assert.equal(calls, 3);
  assert.equal(result.revision, 6);
  assert.equal(deps.calls[1].args.walls.at(-1).id, 'shared-wall');
  assert.ok(progress.some((event) => event.message === '正在识别墙体和房间'));
  assert.ok(progress.some((event) => event.attempt === 2 && event.message.includes('补齐卧室和卫生间隔墙')));
  assert.ok(progress.some((event) => event.message === '正在识别门窗'));
  assert.ok(progress.every((event) => !/set_floor_structure|set_openings|revision/.test(event.message)));
});

test("hydrating one/three presets preserves generated and verified geometry", () => {
  assert.equal(shouldHydrateImportedPreset('mcp-qwen38-vulkan'), false);
  assert.equal(shouldHydrateImportedPreset('verified-preset'), false);
  assert.equal(shouldHydrateImportedPreset('fallback-prebuilt'), false);
  assert.equal(shouldHydrateImportedPreset('imported-pascal-json'), false);
  assert.equal(shouldHydrateImportedPreset(undefined), true);
});

test("footer navigation blocks partial and failed previews while preserving restored valid models", () => {
  assert.equal(canProceedAfterModelGeneration({ phase: 'generating', modelLoaded: true, experience: 'viewer' }), false, 'partial scenes cannot skip generation');
  assert.equal(canProceedAfterModelGeneration({ phase: 'error', modelLoaded: true, experience: 'viewer' }), false, 'fallback previews cannot enable STEP4');
  assert.equal(canProceedAfterModelGeneration({ phase: 'error', modelLoaded: true, experience: 'intro' }), false, 'closing the failure dialog still blocks footer navigation');
  assert.equal(canProceedAfterModelGeneration({ phase: 'idle', modelLoaded: false, experience: 'intro' }), false);
  assert.equal(canProceedAfterModelGeneration({ phase: 'idle', modelLoaded: true, experience: 'viewer' }), true, 'persisted valid models remain navigable');
  assert.equal(canProceedAfterModelGeneration({ phase: 'completed', modelLoaded: true, experience: 'viewer' }), true);
});

test("the original-preset shortcut preserves source identity and does not claim an AI edit", () => {
  const variant = { variantId: 'two-option-01', imageUrl: '/preset/variants/two/option-01.png', imageHash: 'actual-source-hash' };
  const selected = originalFloorplanSelection(variant, variant.imageHash, ' 增加独立书房 ');
  assert.equal(selected.provider, 'preset');
  assert.equal(selected.model, 'original-preset');
  assert.equal(selected.url, variant.imageUrl);
  assert.equal(selected.fallback, false);
  assert.ok(selected.warnings[0].includes('文字修改要求尚未执行'));
  assert.equal(originalFloorplanMatches(selected, variant, '增加独立书房'), true);
  assert.equal(originalFloorplanMatches(selected, { ...variant, imageHash: 'different-source-hash' }, '增加独立书房'), false);
  assert.equal(originalFloorplanMatches(selected, { ...variant, variantId: 'one-option-01' }, '增加独立书房'), false);
  assert.equal(originalFloorplanMatches({ ...selected, provider: 'qwen' }, variant, '增加独立书房'), false, 'AI outputs never select the original shortcut');
  assert.equal(originalFloorplanMatches(selected, variant, '改变后的草稿'), false);
});

test("the original-preset shortcut cannot replace any active image/model/layout/selection job", () => {
  const idle = { variantLoading: false, imageJobActive: false, layoutJobActive: false, modelJobActive: false, selectionActive: false, progressActive: false };
  assert.equal(canSelectOriginalFloorplan(idle), true);
  for (const field of Object.keys(idle)) assert.equal(canSelectOriginalFloorplan({ ...idle, [field]: true }), false, field);
});

test("MCP requests carry the cancellation signal and bounded timeout", async () => {
  const controller = new AbortController();
  const mock = { request: async (request: any, _schema: any, options: any) => {
    assert.equal(options.signal, controller.signal);
    assert.equal(options.timeout, 30_000);
    return request.method === "tools/list" ? { tools: [] } : { structuredContent: { revision: 1 }, content: [] };
  } } as any;
  await listPascalTools(mock, { signal: controller.signal });
  assert.equal((await callPascalTool(mock, "test", {}, { signal: controller.signal })).revision, 1);
});

test("text timeout covers a response whose headers arrive but body stalls", async () => {
  let headersSent = false;
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"choices":');
    headersSent = true;
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const previous = process.env.LOCAL_TEXT_BASE_URL;
  process.env.LOCAL_TEXT_BASE_URL = `http://127.0.0.1:${(server.address() as any).port}/v1`;
  try {
    const started = Date.now();
    await assert.rejects(qwenChatCompletion({ messages: [] }, { timeoutMs: 150, stage: "regression" }), /timed out after 150ms/);
    assert.equal(headersSent, true);
    assert.ok(Date.now() - started < 1_000);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_TEXT_BASE_URL;
    else process.env.LOCAL_TEXT_BASE_URL = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("SSE EOF without a terminal event is an error", async () => {
  await assert.rejects(consumeModel3dSse(new Response('event: started\ndata: {"type":"started"}\n\n'), () => {}), /没有返回完整结果/);
});

test("SSE handles CRLF and complete events even before EOF", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('event: heartbeat\r\ndata: {}\r\n\r\nevent: complete\r\ndata: {"result":{"scene":{}}}\r\n\r\n')); },
    cancel() { cancelled = true; },
  }));
  const events: string[] = [];
  await consumeModel3dSse(response, (event) => { events.push(event); });
  assert.deepEqual(events, ["heartbeat", "complete"]);
  assert.equal(cancelled, true);
});

test("idle SSE fails and cancels the underlying connection", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  await assert.rejects(consumeModel3dSse(response, () => {}, { idleTimeoutMs: 20 }), /长时间没有响应/);
  assert.equal(cancelled, true);
});
