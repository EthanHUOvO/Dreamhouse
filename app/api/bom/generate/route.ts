import { NextRequest, NextResponse } from "next/server";
import { generateDetailedBom } from "@/lib/bom/service";
import { getAiConfig } from "@/lib/ai/config";
import { buildResidentialBudget, defaultResidentialBudgetSettings } from "@/lib/bom/residential";
import { RESIDENTIAL_RENOVATION_PROMPT } from "@/lib/bom/residential-prompt";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.design?.scene)
      return NextResponse.json(
        { error: "design.scene is required" },
        { status: 400 },
      );
    if (body.sessionId && !body.sourceImageHash)
      return NextResponse.json(
        { error: "sourceImageHash is required when sessionId is provided" },
        { status: 400 },
      );
    const budget = buildResidentialBudget(body.design, { ...defaultResidentialBudgetSettings(), ...(body.budgetSettings || {}) });
    // Quantities and prices stay deterministic; local Qwen enriches the engineering BOM.
    const bom = await generateDetailedBom(body);
    const c = getAiConfig();
    return NextResponse.json({
      bom,
      budget,
      provider: bom.aiProvider,
      model: bom.aiProvider === "qwen" ? c.bomModel : "local-rules/mock",
      promptVersion: body.taskType === "residential" ? RESIDENTIAL_RENOVATION_PROMPT.length : undefined,
      mode: c.mode,
      sessionId: body.sessionId,
      sourceImageHash: body.sourceImageHash,
      sceneRevision: body.sceneRevision,
    });
  } catch (error: any) {
    const c = getAiConfig();
    return NextResponse.json(
      {
        error: error?.message || "BOM generation failed",
        stage: "bom",
        provider: "qwen",
        model: c.bomModel,
        status: error?.status,
      },
      { status: error?.status || 502 },
    );
  }
}
