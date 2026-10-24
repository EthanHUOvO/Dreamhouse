import { NextRequest } from "next/server";
import { generatePascalSceneWithLocalQwen } from "@/lib/ai/local-model3d-agent";
import { generateSceneFromSvg } from "@/lib/ai/svg-scene";
import { resolveVerifiedPresetScene } from "@/lib/ai/verified-preset-scene";
import type { SceneGraph } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackScene(source: SceneGraph, input: { sourceImageHash: string; sourceImage: string; reason: string }) {
  const scene = JSON.parse(JSON.stringify(source)) as SceneGraph;
  const building = scene.nodes.building_house || Object.values(scene.nodes).find((node) => node.type === "building");
  if (!building) throw new Error("Fallback Pascal scene has no building node");
  const metadata = (building.metadata ||= {});
  Object.assign(metadata, {
    floorplanSource: "fallback-prebuilt",
    sourceImageHash: input.sourceImageHash,
    sourceDrawing: input.sourceImage,
    fallbackReason: input.reason,
    model: "prebuilt-pascal-v2",
    scaleEstimated: false,
    generatedAt: new Date().toISOString(),
  });
  return scene;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON request" }, { status: 400 }); }
  const reconstructionMode = body?.reconstructionMode ?? "auto";
  if (!["auto", "ai-live"].includes(reconstructionMode))
    return Response.json({ error: "Invalid reconstructionMode" }, { status: 400 });
  if (!String(body?.sessionId || "") || !String(body?.sourceImageHash || "") || !/^data:image\//i.test(String(body?.sourceImageDataUrl || "")) || !body?.fallbackScene?.nodes)
    return Response.json({ error: "sessionId, sourceImageHash, sourceImageDataUrl, and fallbackScene are required" }, { status: 400 });

  const encoder = new TextEncoder();
  const generationController = new AbortController();
  const configuredDeadline = Number(process.env.MODEL3D_TIMEOUT_MS || 600_000);
  const deadlineMs = Number.isFinite(configuredDeadline) && configuredDeadline > 0 ? configuredDeadline : 600_000;
  let cancelStream = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let clientCancelled = false;
      let heartbeat: ReturnType<typeof setInterval>;
      let deadline: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        clearInterval(heartbeat);
        clearTimeout(deadline);
        req.signal.removeEventListener("abort", cancelStream);
      };
      cancelStream = () => {
        clientCancelled = true;
        closed = true;
        cleanup();
        generationController.abort(new DOMException("3D generation cancelled by client", "AbortError"));
      };
      const emit = (type: string, data: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { cancelStream(); }
      };
      const close = () => { cleanup(); if (!closed) { closed = true; controller.close(); } };
      req.signal.addEventListener("abort", cancelStream, { once: true });
      const startedAt = Date.now();
      heartbeat = setInterval(() => emit("heartbeat", { type: "heartbeat", elapsedMs: Date.now() - startedAt, deadlineMs }), 10_000);
      deadline = setTimeout(() => generationController.abort(new Error(`3D generation timed out after ${deadlineMs}ms`)), deadlineMs);
      if (req.signal.aborted) cancelStream();
      void (async () => {
        try {
          generationController.signal.throwIfAborted();
          // Explicit live reconstruction uses the original bytes. The backup
          // scene is never passed to Qwen and cannot supply its geometry.
          const preset = reconstructionMode === "auto" && !String(body.sourceImageDataUrl).startsWith("data:image/svg")
            ? await resolveVerifiedPresetScene(String(body.sourceImageDataUrl), String(body.sessionId))
            : null;
          generationController.signal.throwIfAborted();
          if (preset) {
            emit("complete", { type: "complete", result: preset });
            return;
          }
          const sourceDataUrl = String(body.sourceImageDataUrl);
          if (sourceDataUrl.startsWith("data:image/svg")) {
            // SVG 输入：确定性解析，跳过 LLM 视觉识别
            const payload = sourceDataUrl.slice(sourceDataUrl.indexOf(",") + 1);
            const svgText = /;base64,/i.test(sourceDataUrl) ? Buffer.from(payload, "base64").toString("utf8") : decodeURIComponent(payload);
            await generateSceneFromSvg({
              sessionId: String(body.sessionId),
              sourceImageHash: String(body.sourceImageHash),
              sourceImage: String(body.sourceImage || "svg-floorplan"),
              sourceSvg: svgText,
              signal: generationController.signal,
              onEvent: (event) => emit(event.type, event),
            });
          } else {
            await generatePascalSceneWithLocalQwen({
              sessionId: String(body.sessionId),
              sourceImageHash: String(body.sourceImageHash),
              sourceImage: String(body.sourceImage || "confirmed-floorplan"),
              sourceImageDataUrl: sourceDataUrl,
              strictGeometry: reconstructionMode === "ai-live",
              signal: generationController.signal,
              onEvent: (event) => emit(event.type, event),
            });
          }
        } catch (error: any) {
          if (clientCancelled) return;
          const reason = error?.message || String(error);
          console.error("[DreamHouse][model3d][local]", { sessionId: body.sessionId, reason });
          if (reconstructionMode === "ai-live" || String(body.sourceImageDataUrl).startsWith("data:image/svg")) {
            emit("error", { type: "error", message: reason, reconstructionMode });
            return;
          }
          try {
            const scene = fallbackScene(body.fallbackScene, { sourceImageHash: String(body.sourceImageHash), sourceImage: String(body.sourceImage || "confirmed-floorplan"), reason });
            emit("fallback", { type: "fallback", reason, source: "fallback-prebuilt", scene });
          } catch {
            emit("error", { type: "error", message: reason });
          }
        } finally {
          close();
        }
      })();
    },
    cancel() { cancelStream(); },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
