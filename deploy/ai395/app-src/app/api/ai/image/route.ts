import { NextRequest, NextResponse } from "next/server";
import { generateDreamHouseImage } from "@/lib/ai/image-service";
import { getAiConfig } from "@/lib/ai/config";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.mode !== "walkthrough-render")
      return NextResponse.json(
        { error: "mode must be walkthrough-render; use /api/ai/floorplan-image for floorplan-edit" },
        { status: 400 },
      );
    const allowedKeys = new Set([
      "mode",
      "sessionId",
      "sourceImageHash",
      "sceneRevision",
      "roomId",
      "roomName",
      "pascalScreenshot",
      "stylePrompt",
      "size",
    ]);
    const unexpectedKey = Object.keys(body || {}).find((key) => !allowedKeys.has(key));
    if (unexpectedKey)
      return NextResponse.json(
        { error: "Walkthrough render must use the Pascal screenshot only.", field: unexpectedKey },
        { status: 400 },
      );
    if (!String(body?.pascalScreenshot || ""))
      return NextResponse.json(
        { error: "pascalScreenshot is required" },
        { status: 400 },
      );
    if (!String(body?.stylePrompt || "").trim())
      return NextResponse.json(
        { error: "stylePrompt is required" },
        { status: 400 },
      );
    if (body.sessionId && !body.sourceImageHash)
      return NextResponse.json(
        { error: "sourceImageHash is required when sessionId is provided" },
        { status: 400 },
      );
    const image = await generateDreamHouseImage({
      mode: "walkthrough-render",
      pascalScreenshot: body.pascalScreenshot,
      roomName: body.roomName,
      stylePrompt: String(body.stylePrompt).trim(),
      size: body.size ? String(body.size) : undefined,
    });
    return NextResponse.json({
      image,
      mode: body.mode,
      sessionId: body.sessionId,
      sourceImageHash: body.sourceImageHash,
      sceneRevision: body.sceneRevision,
    });
  } catch (error: any) {
    const c = getAiConfig();
    return NextResponse.json(
      {
        error: error?.message || "image_generation_failed",
        stage: "image",
        provider: "qwen",
        model: c.imageModel,
        status: error?.status,
      },
      { status: error?.status || 502 },
    );
  }
}
