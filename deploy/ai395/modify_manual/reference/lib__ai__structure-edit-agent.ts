import { randomUUID } from "node:crypto";
import type { SceneGraph } from "../types";
import { getAiConfig } from "./config";
import { qwenChatCompletion } from "./qwen-client";
import { applyStructureEditPlan, enumerateStructureEditCandidates, type StructureEditPlan } from "../floorplans/structure-edit";
import { validateImportedScene } from "../floorplans/pascal-v2/imported-two";

export async function runLocalStructureEdit(input: { scene: SceneGraph; instruction: string; signal?: AbortSignal },
  chat = (body: Record<string, any>) => qwenChatCompletion(body, { stage: "structure-edit", signal: input.signal, timeoutMs: 120000 })) {
  const requestId = randomUUID();
  const config = getAiConfig();
  if (config.mode !== "local") throw new Error("结构修改只允许现有本地模型；不接受 mock 或云端替代");
  input.signal?.throwIfAborted();
  const available = enumerateStructureEditCandidates(input.scene);
  const rollback = (issues: string[], plan: unknown = null) => ({ status: "rolled-back" as const, ok: false,
    aiSuccess: false, requestId, model: config.layoutModel, inputFingerprint: available.inputFingerprint,
    scene: input.scene, plan, operations: [], validation: null, issues });
  if (!available.candidates.length) return rollback([...available.issues,
    ...available.rejections.flatMap((entry) => entry.issues.map((issue) => `${entry.id}: ${issue}`))]);
  if (/(?:不得|禁止|不能|不许|不要|不).{0,5}(?:移动|平移)|家具.{0,3}原位(?:不动|保持)?/.test(input.instruction) &&
    available.candidates.every((candidate) => candidate.furnitureMoves.length > 0))
    return rollback(["保持全部家具原位时没有通过碰撞及通行校验的书房候选，原场景保留"]);
  const toolName = "select_structure_edit";
  const body = {
    temperature: 0, max_tokens: 768,
    // Current llama.cpp accepts the string contract. Named object form is not supported.
    tool_choice: "required",
    tools: [{ type: "function", function: { name: toolName,
      description: "理解用户需求，选择受限的真实户型结构操作；无法匹配必须 reject。",
      parameters: { type: "object", additionalProperties: false,
        properties: {
          action: { type: "string", enum: ["create_study", "reject"] },
          targetZoneId: { type: "string" },
          candidateId: { type: "string", enum: ["", ...available.candidates.map((c) => c.id)] },
          inputFingerprint: { type: "string" },
          furnitureMoves: { type: "array", items: { type: "object", additionalProperties: false,
            properties: { furnitureId: { type: "string" }, delta: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 } },
            required: ["furnitureId", "delta"] } },
          reason: { type: "string" },
        }, required: ["action", "targetZoneId", "candidateId", "inputFingerprint", "furnitureMoves", "reason"] },
    } }],
    messages: [{ role: "system", content: `你是本地户型结构编辑助手。只选择与用户自然语言明确匹配的操作，不生成图片。当前MVP仅支持在one-option-01客餐厅上侧、卫生间南侧新增一间独立书房，原入户通道不能侵占。坐标米，x向右，z向下。不可选卧室或卫生间，不可删除任何家具或既有墙门窗。候选由程序基于凹多边形、门洞和家具碰撞预检；不要编造坐标或候选。选择时逐字复制该候选furnitureMoves；[]表示所有家具原位保留，有平移时保留家具全部组成块及ID。优先无移动，再最少移动。若需求不是这一受限目标或无符合候选，action=reject且candidateId=""。只能调用select_structure_edit，reason简短说明目标及家具处理。` },
      { role: "user", content: JSON.stringify({ instruction: input.instruction,
        inputFingerprint: available.inputFingerprint,
        rooms: Object.values(input.scene.nodes).filter((n) => n.type === "zone").map((n) => ({ id: n.id, name: n.name, polygon: n.polygon })),
        candidates: available.candidates }) }],
  };
  const response = await chat(body);
  input.signal?.throwIfAborted();
  const choice = response?.choices?.[0];
  const calls = choice?.message?.tool_calls || [];
  if (choice?.finish_reason === "length" || calls.length !== 1 || calls[0]?.function?.name !== toolName)
    return rollback(["本地模型没有返回唯一完整的结构操作，原场景保留"]);
  let parsed: any;
  try { parsed = JSON.parse(calls[0].function.arguments); } catch { return rollback(["本地模型结构参数不是有效JSON"]); }
  if (parsed.action !== "create_study") return rollback([String(parsed.reason || "需求超出当前受限操作")], parsed);
  const candidate = available.candidates.find((c) => c.id === parsed.candidateId);
  if (!candidate || parsed.targetZoneId !== candidate.targetRoomId || parsed.inputFingerprint !== available.inputFingerprint)
    return rollback(["模型操作的目标房间、候选或来源指纹不匹配"], parsed);
  const plan: StructureEditPlan = { candidateId: parsed.candidateId, inputFingerprint: parsed.inputFingerprint, furnitureMoves: parsed.furnitureMoves };
  const applied = applyStructureEditPlan(input.scene, plan);
  input.signal?.throwIfAborted();
  if (!applied.ok) return rollback(applied.issues, parsed);
  // Existing wall helpers include optional undefined mesh diagnostics. Validate
  // the exact JSON representation that HTTP/persistence/Pascal will receive.
  const canonicalScene: SceneGraph = JSON.parse(JSON.stringify(applied.scene));
  try { validateImportedScene(canonicalScene, "one-option-01", "结构修改", true); }
  catch (error: any) { return rollback([`Pascal兼容性校验失败：${error.message}`], parsed); }
  Object.assign(canonicalScene.nodes.building_house.metadata ||= {}, {
    structureEdit: { ...canonicalScene.nodes.building_house.metadata?.structureEdit, requestId, model: config.layoutModel, instruction: input.instruction,
      inputFingerprint: available.inputFingerprint, plan: parsed, validated: true, validation: applied.validation },
  });
  return { status: "validated" as const, ...applied, scene: canonicalScene, aiSuccess: true, requestId, model: config.layoutModel,
    inputFingerprint: available.inputFingerprint, plan: parsed };
}
