import { NextRequest, NextResponse } from "next/server";
import { createMockProvider } from "@/lib/ai/mock-provider";
import { createQwenProvider } from "@/lib/ai/qwen-provider";
import { getAiConfig, getAiMode, qwenConfigured } from "@/lib/ai/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const c = getAiConfig(),
    mode = getAiMode();
  try {
    const body = await req.json();
    if (!body?.design?.scene || !String(body?.prompt || "").trim())
      return NextResponse.json(
        { error: "design.scene and prompt are required" },
        { status: 400 },
      );
    if (
      body.sessionId &&
      body.sourceImageHash &&
      body.design?.scene?.nodes?.building_house?.metadata?.sourceImageHash &&
      body.sourceImageHash !==
        body.design.scene.nodes.building_house.metadata.sourceImageHash
    )
      return NextResponse.json(
        {
          error: "sourceImageHash does not match the Pascal scene",
          sessionId: body.sessionId,
          sourceImageHash: body.sourceImageHash,
        },
        { status: 409 },
      );
    const input = { ...body, prompt: String(body.prompt).trim() };
    if (mode === "mock") {
      const run = await createMockProvider().generateLayout(input);
      return NextResponse.json({
        run,
        provider: "mock",
        fallback: false,
        mode,
        sessionId: body.sessionId,
        sourceImageHash: body.sourceImageHash,
        sceneRevision: body.sceneRevision,
      });
    }
    if (!qwenConfigured()) {
      if (mode === "hybrid") {
        const run = await createMockProvider().generateLayout(input);
        return NextResponse.json({
          run,
          provider: "mock",
          fallback: true,
          mode,
          fallbackReason: "QWEN_API_KEY is not configured",
          sessionId: body.sessionId,
          sourceImageHash: body.sourceImageHash,
          sceneRevision: body.sceneRevision,
        });
      }
      return NextResponse.json(
        {
          error: "QWEN_API_KEY is not configured",
          stage: "layout",
          provider: "qwen",
          model: c.layoutModel,
        },
        { status: 503 },
      );
    }
    try {
      const run = await createQwenProvider().generateLayout(input);
      return NextResponse.json({
        run,
        provider: "qwen",
        fallback: false,
        mode,
        sessionId: body.sessionId,
        sourceImageHash: body.sourceImageHash,
        sceneRevision: body.sceneRevision,
      });
    } catch (error: any) {
      console.error("[DreamHouse][layout][qwen]", {
        model: c.layoutModel,
        status: error?.status,
        message: error?.message,
      });
      if (mode === "hybrid") {
        const run = await createMockProvider().generateLayout(input);
        return NextResponse.json({
          run,
          provider: "mock",
          fallback: true,
          mode,
          fallbackReason: error?.message || "Qwen layout failed",
          sessionId: body.sessionId,
          sourceImageHash: body.sourceImageHash,
          sceneRevision: body.sceneRevision,
        });
      }
      return NextResponse.json(
        {
          error: error?.message || "Qwen layout generation failed",
          stage: "layout",
          provider: "qwen",
          model: c.layoutModel,
          status: error?.status,
        },
        { status: error?.status || 502 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "AI layout generation failed",
        stage: "layout",
        provider: "server",
      },
      { status: 500 },
    );
  }
}
