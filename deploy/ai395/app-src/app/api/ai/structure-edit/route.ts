import { runLocalStructureEdit } from "../../../../lib/ai/structure-edit-agent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 4 * 1024 * 1024)
      return Response.json({ ok: false, issues: ["场景请求过大"] }, { status: 413 });
    const body = await req.json();
    if (body?.variantId !== "one-option-01" || body?.scene?.nodes?.building_house?.metadata?.variantId !== body.variantId ||
      typeof body.instruction !== "string" || !body.instruction.trim() || body.instruction.length > 1000)
      return Response.json({ ok: false, issues: ["仅支持one-option-01当前场景及明确文字需求"] }, { status: 400 });
    const result = await runLocalStructureEdit({ scene: body.scene, instruction: body.instruction.trim(), signal: req.signal });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error: any) {
    if (req.signal.aborted) return Response.json({ ok: false, status: "rolled-back", issues: ["请求已取消，未提交场景"] }, { status: 499 });
    return Response.json({ ok: false, status: "rolled-back", issues: [error?.message || "结构修改失败，未提交场景"] }, { status: 502 });
  }
}
