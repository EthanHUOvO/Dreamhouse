import { NextRequest, NextResponse } from "next/server";
import { generateDreamHouseImage } from "@/lib/ai/image-service";
import { getAiConfig } from "@/lib/ai/config";
import { INTERIOR_STYLE_PRESETS } from "@/config/interiorStyles";
import { inferRoomType, ROOM_TYPE_PROMPTS, type RoomType } from "@/config/roomTypes";
import { generateInteriorResponse, validateInteriorRenderRequest } from "@/lib/ai/interior-request";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const input = validateInteriorRenderRequest(await req.json());
    const { sourceImage, styleId } = input;
    if (!Object.prototype.hasOwnProperty.call(INTERIOR_STYLE_PRESETS, styleId))
      return NextResponse.json(
        { error: "INVALID_STYLE", message: "请选择有效的装修风格" },
        { status: 400 },
      );
    const roomName = String(input.roomName || "").trim();
    const requestedRoomType = String(input.roomType || "");
    const roomType = (Object.prototype.hasOwnProperty.call(ROOM_TYPE_PROMPTS, requestedRoomType)
      ? requestedRoomType
      : inferRoomType(roomName)) as RoomType;
    const stylePrompt = INTERIOR_STYLE_PRESETS[styleId as keyof typeof INTERIOR_STYLE_PRESETS].prompt;
    // The image client selects the actual model and upstream for this mode.
    // A default floorplan-model label must not override that selection.
    const imageModel = process.env.QWEN_INTERIOR_IMAGE_MODEL || undefined;
    console.info("[INTERIOR I2I REQUEST]", {
      roomType,
      roomName,
      styleId,
      hasSourceImage: true,
      imageCount: 1,
      textCount: 1,
      mode: "I2I",
    });
    const result = await generateInteriorResponse(input, req.signal, (_request, signal) => generateDreamHouseImage({
      mode: "walkthrough-render",
      pascalScreenshot: sourceImage,
      roomName,
      roomType,
      stylePrompt,
      imageModel,
      // Derive output dimensions from the capture in image-service. A global
      // square QWEN_IMAGE_SIZE must not stretch this camera's geometry.
    }, { signal, fresh: input.fresh }));
    return NextResponse.json({
      ...result,
      roomType,
    }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    const c = getAiConfig();
    console.error("[Qwen Image API Error]", {
      status: e?.status,
      message: e?.message,
      stage: e?.stage || "render-view",
      model: process.env.QWEN_INTERIOR_IMAGE_MODEL || c.editImageModel || c.imageModel,
      apiKeyConfigured: Boolean(c.apiKey),
    });
    const status = req.signal.aborted ? 499 : e instanceof SyntaxError ? 400 : e?.status || 502;
    return NextResponse.json(
      {
        error: req.signal.aborted ? "装修请求已取消" : e?.message || "render-view failed",
        stage: "render-view",
        model: process.env.QWEN_INTERIOR_IMAGE_MODEL || c.editImageModel || c.imageModel,
        status,
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
