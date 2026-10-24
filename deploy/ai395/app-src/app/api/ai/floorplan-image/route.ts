import { NextRequest, NextResponse } from "next/server";
import { generateDreamHouseImage } from "@/lib/ai/image-service";
import { getAiConfig } from "@/lib/ai/config";

export const runtime = "nodejs";

/**
 * Floorplan-edit has a deliberately small contract: exactly one source image
 * and the user's instruction. It is independent from Pascal scene data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const allowedBodyKeys = new Set(["sourceImage", "instruction", "fresh"]);
    const unexpectedBodyKey = Object.keys(body || {}).find((key) => !allowedBodyKeys.has(key));
    if (unexpectedBodyKey) {
      return NextResponse.json(
        {
          error: "户型图片编辑只接受当前图片和用户修改文字。",
          field: unexpectedBodyKey,
        },
        { status: 400 },
      );
    }
    if (!String(body?.sourceImage || "")) {
      return NextResponse.json(
        { error: "SOURCE_FLOOR_PLAN_REQUIRED" },
        { status: 400 },
      );
    }
    if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(String(body.sourceImage))) {
      return NextResponse.json(
        { error: "SOURCE_FLOOR_PLAN_INVALID" },
        { status: 400 },
      );
    }
    const instruction = String(body?.instruction || "").trim();
    if (!instruction) return NextResponse.json({ error: "USER_INSTRUCTION_REQUIRED" }, { status: 400 });
    const image = await generateDreamHouseImage({
      mode: "floorplan-edit",
      originalFloorplan: String(body.sourceImage),
      userPrompt: instruction,
    }, { signal: req.signal, fresh: body.fresh === true });
    if (image.fallback) {
      return NextResponse.json({ error: "户型编辑失败，保留了原图，请重试。", stage: "floorplan-image", fallbackReason: 'fallbackReason' in image ? image.fallbackReason : undefined }, { status: 502 });
    }
    const warnings = /^z-image-turbo/i.test(image.model)
      ? ["当前使用 Z-Image-Turbo 普通图生图模型，适合视觉预览，增减房间和门墙修改可能无法准确执行。请核对结果后再创建 3D 空间。"]
      : ["AI 生成户型尚未通过墙体、门窗和尺寸校验，请核对修改区域及未修改区域。"];
    console.info("[DreamHouse][floorplan-edit]", {
      taskType: "floor_plan_edit",
      promptLength: instruction.length,
      inputImageCount: 1,
      pascalInput: false,
    });
    return NextResponse.json({
      image: { ...image, warnings, geometryVerified: false },
      mode: "floorplan-edit",
      prompt: instruction,
    });
  } catch (error: any) {
    const c = getAiConfig();
    return NextResponse.json(
      {
        error: error?.message || "floorplan_image_failed",
        stage: "floorplan-image",
        provider: "qwen",
        model: c.imageModel,
        status: error?.status,
      },
      { status: error?.status || 502 },
    );
  }
}
