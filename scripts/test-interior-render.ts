import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { SourceTextModule, SyntheticModule } from "node:vm";
import { test } from "node:test";
import * as transport from "../lib/ai/interior-request";
import { generateInterior } from "../services/qwenImageService";
import { INTERIOR_STYLE_PRESETS } from "../config/interiorStyles";

const sourceImage = `data:image/png;base64,${"A".repeat(1200)}`;
const request: transport.InteriorRenderRequest = {
  sourceImage, sessionId: "session-a", captureId: "capture-a", sceneRevision: 7,
  styleId: "modern", roomName: "客餐厅", roomType: "living_room", camera: { position: [1, 1.6, 2] },
};
const image = {
  url: "/api/generated-images/12345678-1234-4321-aaaa-012345678901.png",
  provider: "qwen", model: "Qwen-Image-2.1-Fun-Acc-4Step", requestId: "generation-1", fallback: false,
};
const result = () => ({
  sessionId: request.sessionId, captureId: request.captureId, styleId: request.styleId,
  sourceSceneRevision: request.sceneRevision, image: { ...image },
});
const fetcher = (callback: (...args: any[]) => any) => callback as typeof fetch;
const errorStatus = (status: number) => (error: unknown) => error instanceof transport.InteriorRequestError && error.status === status;

test("valid request posts the same capture and style once; fresh is explicit and no size is sent", async () => {
  let calls = 0;
  const response = await transport.requestInteriorRender({ ...request, fresh: true }, {
    fetcher: fetcher(async (url, options) => {
      calls++;
      assert.equal(url, "/api/ai/render-view");
      const body = JSON.parse(options.body);
      assert.equal(body.captureId, request.captureId);
      assert.equal(body.sceneRevision, 7);
      assert.equal(body.styleId, "modern");
      assert.equal(body.sourceImage, sourceImage);
      assert.equal(body.fresh, true);
      assert.equal("size" in body, false);
      assert.equal(options.cache, "no-store");
      return Response.json(result());
    }),
  });
  assert.equal(calls, 1);
  assert.equal(response.image.requestId, "generation-1");
});

test("invalid capture payload or revision never starts a request", async () => {
  let calls = 0;
  for (const patch of [
    { sourceImage: "" }, { sourceImage: "data:image/png;base64,not valid" },
    { captureId: "" }, { sessionId: "" }, { styleId: "" },
    { sceneRevision: 0 }, { sceneRevision: 1.5 }, { fresh: "true" },
  ]) {
    await assert.rejects(transport.requestInteriorRender({ ...request, ...patch } as any, {
      fetcher: fetcher(() => { calls++; throw new Error("must not call"); }),
    }), errorStatus(400));
  }
  assert.equal(calls, 0);
});

test("a mismatched session, capture, style or revision is not accepted", async () => {
  for (const patch of [
    { sessionId: "session-b" }, { captureId: "capture-b" },
    { styleId: "nordic" }, { sourceSceneRevision: 8 },
  ]) {
    await assert.rejects(transport.requestInteriorRender(request, {
      fetcher: fetcher(async () => Response.json({ ...result(), ...patch })),
    }), errorStatus(502));
  }
});

test("fallback, mock, original bytes, invalid URL and untraceable results are rejected", async () => {
  for (const [patch, status] of [
    [{ fallback: true }, 502], [{ provider: "mock" }, 502], [{ provider: "preset" }, 502],
    [{ url: sourceImage }, 422],
    [{ url: sourceImage.replace("image/png", "image/jpeg") }, 422],
    [{ url: "javascript:alert(1)" }, 502], [{ requestId: "" }, 502], [{ model: "" }, 502],
  ] as Array<[Record<string, unknown>, number]>) {
    await assert.rejects(transport.requestInteriorRender(request, {
      fetcher: fetcher(async () => Response.json({ ...result(), image: { ...image, ...patch } })),
    }), errorStatus(status));
  }
});

test("HTTP errors and network errors never trigger another generation", async () => {
  for (const status of [408, 425, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(transport.requestInteriorRender(request, {
      fetcher: fetcher(async () => { calls++; return Response.json({ error: "busy" }, { status }); }),
    }), errorStatus(status));
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(transport.requestInteriorRender(request, {
    fetcher: fetcher(async () => { calls++; throw new TypeError("connection closed"); }),
  }), /connection closed/);
  assert.equal(calls, 1);
});

test("non-JSON error and success responses fail once", async () => {
  for (const status of [200, 503]) {
    let calls = 0;
    await assert.rejects(transport.requestInteriorRender(request, {
      fetcher: fetcher(async () => { calls++; return new Response("<html>upstream error</html>", { status }); }),
    }), errorStatus(status === 200 ? 502 : status));
    assert.equal(calls, 1);
  }
});

test("pre-cancelled input does not POST", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(transport.requestInteriorRender(request, {
    signal: controller.signal, fetcher: fetcher(() => { calls++; throw new Error("must not call"); }),
  }), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("cancellation reaches the active request and cannot cause a retry", async () => {
  const controller = new AbortController();
  let received: AbortSignal | undefined, calls = 0;
  const pending = transport.requestInteriorRender(request, {
    signal: controller.signal,
    fetcher: fetcher(async (_url, options) => {
      calls++;
      received = options.signal;
      return new Promise((_resolve, reject) => received!.addEventListener("abort", () => reject(received!.reason), { once: true }));
    }),
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(received?.aborted, true);
  assert.equal(calls, 1);
});

test("deadline closes a stalled header request", async () => {
  let received: AbortSignal | undefined, calls = 0;
  await assert.rejects(transport.requestInteriorRender(request, {
    timeoutMs: 15,
    fetcher: fetcher(async (_url, options) => { calls++; received = options.signal; return new Promise(() => {}); }),
  }), { name: "TimeoutError" });
  assert.equal(received?.aborted, true);
  assert.equal(calls, 1);
});

test("deadline includes a stalled response body after successful headers", async () => {
  let received: AbortSignal | undefined, calls = 0;
  await assert.rejects(transport.requestInteriorRender(request, {
    timeoutMs: 15,
    fetcher: fetcher(async (_url, options) => {
      calls++; received = options.signal;
      return { ok: true, status: 200, json: () => new Promise(() => {}) };
    }),
  }), { name: "TimeoutError" });
  assert.equal(received?.aborted, true);
  assert.equal(calls, 1);
});

test("successful client service returns generation context and clears its timer", async (context) => {
  let received: AbortSignal | undefined;
  context.mock.method(globalThis, "fetch", fetcher(async (_url, options) => {
    received = options.signal;
    return Response.json(result());
  }));
  const response = await generateInterior({
    image: sourceImage, prompt: "renovate materials", styleId: request.styleId,
    captureId: request.captureId, sessionId: request.sessionId, sceneRevision: 7, timeoutMs: 15,
  });
  assert.equal(response.image.model, image.model);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(received?.aborted, false);
});

// Evaluate the real Route Handler with a stubbed image generator. No Next
// server, external requests, image files or model processes are started.
async function routeWithGenerator(generate: (...args: any[]) => any) {
  const file = new URL("../app/api/ai/render-view/route.ts", import.meta.url);
  const source = stripTypeScriptTypes(await readFile(file, "utf8"), { mode: "transform" });
  const route = new SourceTextModule(source, { identifier: file.href });
  const stubs: Record<string, Record<string, unknown>> = {
    "next/server": { NextRequest: Request, NextResponse: { json: Response.json } },
    "@/lib/ai/image-service": { generateDreamHouseImage: generate },
    "@/lib/ai/config": { getAiConfig: () => ({ imageModel: "Z-Image-Turbo", apiKey: "" }) },
    "@/config/interiorStyles": { INTERIOR_STYLE_PRESETS },
    "@/config/roomTypes": { inferRoomType: () => "living_room", ROOM_TYPE_PROMPTS: { living_room: "living room" } },
    "@/lib/ai/interior-request": transport,
  };
  await route.link(async specifier => {
    const exports = stubs[specifier];
    assert.ok(exports, `unexpected route dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    });
  });
  await route.evaluate();
  return (route.namespace as Record<string, unknown>).POST as (request: Request) => Promise<Response>;
}

const routeRequest = (body: unknown, signal?: AbortSignal) => new Request("http://test/api/ai/render-view", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal,
});

test("real route forwards signal/fresh and does not pass a global square size or default model override", async () => {
  const previous = process.env.QWEN_IMAGE_SIZE;
  const previousModel = process.env.QWEN_INTERIOR_IMAGE_MODEL;
  process.env.QWEN_IMAGE_SIZE = "512*512";
  delete process.env.QWEN_INTERIOR_IMAGE_MODEL;
  try {
    let calls = 0;
    const req = routeRequest({ ...request, fresh: true });
    const post = await routeWithGenerator(async (input, options) => {
      calls++;
      assert.equal(input.mode, "walkthrough-render");
      assert.equal(input.pascalScreenshot, sourceImage);
      assert.equal(input.size, undefined);
      assert.equal(input.imageModel, undefined);
      assert.equal(options.signal, req.signal);
      assert.equal(options.fresh, true);
      return image;
    });
    const response = await post(req);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.captureId, request.captureId);
    assert.equal(body.styleId, request.styleId);
    assert.equal(body.sourceSceneRevision, 7);
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.QWEN_IMAGE_SIZE; else process.env.QWEN_IMAGE_SIZE = previous;
    if (previousModel === undefined) delete process.env.QWEN_INTERIOR_IMAGE_MODEL; else process.env.QWEN_INTERIOR_IMAGE_MODEL = previousModel;
  }
});

test("real route rejects a fallback or original return as success", async () => {
  for (const [output, status] of [[{ ...image, fallback: true }, 502], [{ ...image, url: sourceImage }, 422]] as const) {
    const post = await routeWithGenerator(async () => output);
    assert.equal((await post(routeRequest(request))).status, status);
  }
});

test("real route does not invoke image generation for invalid capture/style identity", async () => {
  let calls = 0;
  const post = await routeWithGenerator(async () => { calls++; return image; });
  for (const patch of [{ captureId: "" }, { sceneRevision: 0 }, { styleId: "constructor" }, { fresh: "true" }]) {
    assert.equal((await post(routeRequest({ ...request, ...patch }))).status, 400);
  }
  assert.equal(calls, 0);
});

test("real route rejects completion after client cancellation", async () => {
  const controller = new AbortController();
  const post = await routeWithGenerator(async (_input, options) => {
    assert.equal(options.signal.aborted, false);
    controller.abort();
    assert.equal(options.signal.aborted, true);
    return image;
  });
  assert.equal((await post(routeRequest(request, controller.signal))).status, 499);
});
