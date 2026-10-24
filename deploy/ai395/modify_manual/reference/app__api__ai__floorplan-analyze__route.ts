import { NextRequest, NextResponse } from "next/server";
import { qwenChatJson } from "@/lib/ai/qwen-client";
import { getAiConfig } from "@/lib/ai/config";

export const runtime = "nodejs";

const FLOOR_PLAN_ANALYSIS_PROMPT = `你正在分析用户提供的二维住宅户型图。本次只分析和提出修改建议，不生成装修效果图。
优先依据可信结构化户型信息，再结合图片识别：可确认的房间名称、类型和大致位置，可见门窗与连通关系，清晰可读的面积或尺寸，以及无法确认的信息。
不得编造不存在的房间，不得仅凭线条粗细认定承重墙，不得假定排水、管道、结构或精确尺寸。根据这张具体户型和用户目标提出少量有依据的建议（一般2到4条），每条说明修改哪里、为什么、需要改变什么、保留什么、可能牺牲什么和待确认条件。建议是概念方案，不得声称已通过施工或结构审核。只返回约定JSON。`;

const schema = { observations: [{ roomId: "", name: "", type: "unknown", basis: "", confidence: "unknown" }], suggestions: [{ id: "s1", title: "", targetRoomIds: [], observedBasis: "", proposedChange: "", affectedAreas: [], preservedAreas: [], tradeoffs: [], needsConfirmation: [], editableInstruction: "" }], clarificationQuestion: "" };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sourceImage = String(body?.sourceImage || "");
    if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(sourceImage)) return NextResponse.json({ error: "SOURCE_FLOOR_PLAN_INVALID" }, { status: 400 });
    const result = await qwenChatJson([
      { role: "system", content: FLOOR_PLAN_ANALYSIS_PROMPT },
      { role: "user", content: [{ type: "image_url", image_url: { url: sourceImage } }, { type: "text", text: JSON.stringify({ residenceType: body.residenceType, sourceVariantId: body.sourceVariantId, trustedScene: body.scene, userGoal: body.userGoal || "", outputSchema: schema }) }] },
    ], { stage: "floorplan-analysis", model: process.env.FLOOR_PLAN_ANALYSIS_MODEL || getAiConfig().layoutModel });
    const analysis = { sourceImageHash: String(body.sourceImageHash || ""), sourceVariantId: String(body.sourceVariantId || ""), observations: Array.isArray(result?.observations) ? result.observations : [], suggestions: Array.isArray(result?.suggestions) ? result.suggestions.slice(0, 4) : [], clarificationQuestion: result?.clarificationQuestion ? String(result.clarificationQuestion) : undefined };
    if (!analysis.observations.length && !analysis.suggestions.length) return NextResponse.json({ error: "FLOOR_PLAN_ANALYSIS_EMPTY" }, { status: 422 });
    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "floorplan-analysis failed", stage: "floorplan-analysis", status: error?.status }, { status: error?.status || 502 });
  }
}
