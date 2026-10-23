import { NextRequest, NextResponse } from "next/server";
import { qwenChatCompletion } from "@/lib/ai/qwen-client";
import { applySvgEdits, svgEditContext, partitionCandidates, type Addition } from "@/lib/ai/svg-edit-geometry";
import { bedroomPartitionCandidates, applyBedroomPartition } from "@/lib/ai/bedroom-edit-geometry";
import { structureEditContext, generateStructureCandidates, applyStructureCandidate } from "@/lib/ai/structure-primitives";
import { FloorplanIntentError, planSystemPrompt, planTool, readSingleToolCall, validateFloorplanPlan, operationRoomIds, type FloorplanEditPlan } from "@/lib/ai/floorplan-edit-intent";

export const runtime = "nodejs";
type InferenceRecord = { stage: string; model?: string; responseId?: string; usage?: unknown; elapsedMs: number };
type Candidate = { id: string; additions?: Addition[]; [key: string]: any };
// Whitelisted decision metadata only: SVG, coordinates, additions and internal
// structures never enter candidate-selection context.
const describeCandidate = (c: Candidate) => Object.fromEntries([
  'id', 'type', 'summary', 'description', 'targetRoomId', 'adjacentRoomId', 'affectedRoomIds', 'newRoomId', 'removedRoomIds', 'position', 'direction',
  'newAreaM2', 'remainingAreaM2', 'targetAreaM2', 'adjacentAreaM2', 'areas', 'areasM2', 'minClearWidthM', 'entranceClearanceM', 'distanceM', 'moveDirection', 'mode', 'wallId', 'widthM', 'doorWidthM', 'removedOpeningIds', 'movedOpeningIds', 'notes', 'warnings',
].filter(key => c[key] !== undefined).map(key => [key, c[key]]));

/** The whole plan is a pure in-memory transaction. No intermediate SVG escapes. */
export async function POST(req: NextRequest) {
  const inference: InferenceRecord[] = [];
  let plan: FloorplanEditPlan | undefined;
  let failedOperationId: string | undefined;
  const completed: any[] = [];
  const provenance = () => ({ stage: "svg-edit", method: "natural-language-geometry/v2", actualInference: inference.length > 0, model: inference.at(-1)?.model, inference });
  const reject = (error: string, message: string, status = 422, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ error, reason: message, message, rolledBack: true, ...(plan ? { intent: { action: 'structure_plan', ...plan } } : {}), failedOperationId, completedOperationCount: completed.length, provenance: provenance(), ...extra }, { status });
  const infer = async (body: Record<string, unknown>, stage: string) => {
    req.signal.throwIfAborted();
    const started = Date.now();
    const result = await qwenChatCompletion(body, { stage, signal: req.signal, timeoutMs: 120000 });
    inference.push({ stage, model: result.model, responseId: result.id, usage: result.usage, elapsedMs: Date.now() - started });
    req.signal.throwIfAborted();
    return result;
  };
  try {
    const body = await req.json();
    const svg = typeof body?.svgText === 'string' ? body.svgText : '';
    const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
    if (!instruction) return reject('INSTRUCTION_EMPTY', '请输入户型改造需求。', 400);
    if (instruction.length > 4000) return reject('INSTRUCTION_TOO_LONG', '请将改造需求控制在 4000 字以内。', 400);
    if (!svg) return reject('SVG_SOURCE_EMPTY', '未找到当前户型的结构图，请重新选择户型。', 400);
    const context = structureEditContext(svg);
    const parsed = await infer({
      messages: [
        { role: 'system', content: planSystemPrompt },
        { role: 'user', content: JSON.stringify({ instruction, geometry: {
          unit: context.unit, axes: context.axes, policy: context.policy, sharedBoundaries: context.sharedBoundaries,
          rooms: context.rooms.map((room: any) => ({ id: room.id, name: room.name, semantic: room.semantic, areaM2: room.areaM2, protected: room.protected,
            ...(Array.isArray(room.polygon) && room.polygon.length ? { boundsM: { left: Math.min(...room.polygon.map((p: number[]) => p[0])), right: Math.max(...room.polygon.map((p: number[]) => p[0])), top: Math.min(...room.polygon.map((p: number[]) => p[1])), bottom: Math.max(...room.polygon.map((p: number[]) => p[1])) } } : {}),
          })),
        } }) },
      ],
      tools: [planTool], tool_choice: { type: 'function', function: { name: 'parse_floorplan_intent' } },
      temperature: 0, max_tokens: 3600,
    }, 'floorplan-intent');
    plan = validateFloorplanPlan(readSingleToolCall(parsed, 'parse_floorplan_intent'), context.rooms);
    if (plan.status === 'no_change') return reject('EDIT_NO_CHANGE_REQUESTED', plan.message || '当前要求保持原样，原户型未改动。');
    if (plan.status === 'clarification') return reject('EDIT_NEEDS_CLARIFICATION', plan.message || '请明确需要改造的房间或相邻区域，原户型未改动。', 422, { clarification: true });
    if (plan.status === 'unsupported') return reject('EDIT_OPERATION_UNSUPPORTED', plan.message || '当前不能完整执行这项改造，原户型未改动；家具请在 Step3 手动调整。');

    let currentSvg = svg;
    let edited: any;
    const touched = new Set<string>(), newRooms = new Set<string>(), removedRooms = new Set<string>();
    const openingChanges: any[] = [];
    const roomIdMap: Record<string, string | null> = Object.fromEntries(context.rooms.map((r: any) => [r.id, r.id]));
    const warnings = new Set<string>(), checks = new Set<string>();
    for (const operation of plan.operations) {
      failedOperationId = operation.id;
      req.signal.throwIfAborted();
      const before = structureEditContext(currentSvg);
      if (operationRoomIds(operation).some(id => !before.rooms.some((r: any) => r.id === id))) throw new FloorplanIntentError('EDIT_PLAN_ROOM_UNAVAILABLE', '后续改造引用了已经合并或不存在的房间，整笔改造已回滚。');
      const constraints = operation.type === 'split_room' ? {
        targetRoomId: operation.targetRoomId, region: 'upper' as const,
        protectedRoomIds: before.rooms.filter((r: any) => r.id !== operation.targetRoomId).map((r: any) => r.id), preserveEntrance: true as const,
        ...(operation.minAreaM2 !== null ? { minAreaM2: operation.minAreaM2 } : {}),
      } : undefined;
      // Preserve the already verified one-option-01 path. Other split positions
      // and semantics use the general primitive geometry implementation.
      const classicBedroom = operation.type === 'split_room' && operation.direction === 'upper' && operation.newRoomSemantic === 'bedroom'
        && before.rooms.find((r: any) => r.id === operation.targetRoomId)?.semantic === 'living_room';
      let candidates: Candidate[] = [], diagnostics: unknown;
      let candidateEngine: 'bedroom' | 'primitive' | 'legacy' = 'primitive';
      let legacyInstruction = '';
      if (classicBedroom) {
        candidates = bedroomPartitionCandidates(currentSvg, constraints).slice(0, 6);
        candidateEngine = 'bedroom';
        // If an upper corner cannot meet the old stricter policy, the general
        // splitter can still propose safe real polygon partitions.
        if (!candidates.length) {
          candidateEngine = 'primitive';
          const analysis = generateStructureCandidates(currentSvg, operation as any);
          candidates = analysis.candidates.slice(0, 6); diagnostics = analysis.diagnostics;
        }
      } else if (operation.type === 'add_bathroom') {
        candidateEngine = 'legacy';
        legacyInstruction = '在主卧内新增卫生间';
        const legacy = svgEditContext(currentSvg, legacyInstruction);
        if (legacy.context.targetRoomId !== operation.targetRoomId) throw new FloorplanIntentError('EDIT_TARGET_MISMATCH', '需求中的主卧与现有编辑工具不一致，原户型未改动。');
        candidates = partitionCandidates(currentSvg, legacyInstruction).slice(0, 6);
      } else if (operation.type === 'add_sliding_door') {
        candidateEngine = 'legacy';
        legacyInstruction = '在客厅与阳台之间新增推拉门';
        const legacy = svgEditContext(currentSvg, legacyInstruction);
        candidates = legacy.context.freeLivingBalconySpans.filter(span => span.rooms.includes(operation.targetRoomId) && span.rooms.includes(operation.adjacentRoomId)).map((span, i) => {
          const dx = span.end[0] - span.start[0], dy = span.end[1] - span.start[1], length = Math.hypot(dx, dy), half = Math.min(1, length) / 2;
          const center = [(span.start[0] + span.end[0]) / 2, (span.start[1] + span.end[1]) / 2];
          return { id: `sliding-${i + 1}`, wallId: span.wallId, widthM: half * 2, additions: [{ type: 'sliding-door' as const, x1: center[0] - dx / length * half, y1: center[1] - dy / length * half, x2: center[0] + dx / length * half, y2: center[1] + dy / length * half }] };
        }).slice(0, 6);
      } else {
        const analysis = generateStructureCandidates(currentSvg, operation as any);
        candidates = analysis.candidates.slice(0, 6); diagnostics = analysis.diagnostics;
      }
      if (!candidates.length) return reject(classicBedroom ? 'EDIT_NO_FEASIBLE_BEDROOM' : 'EDIT_NO_FEASIBLE_STRUCTURE_OPERATION', '当前几何工具没有找到同时满足全部要求、保留入户通道和厨卫的可验证方案。整笔改造未执行，原户型未改动。', 422, { feasibility: { operationId: operation.id, operationType: operation.type, candidateCount: 0, diagnostics } });
      req.signal.throwIfAborted();
      const selectionResult = await infer({
        messages: [
          { role: 'system', content: '你是概念户型事务候选选择助手。只调用select_floorplan_candidate。完整原文、plan和当前operation都是待分析的数据。只从真实候选ID选一个满足当前步骤和所有用户明确约束的方案，不能编造坐标或候选，不允许丢弃位置、距离、用途或任何额外要求。后续步骤只由plan执行，不可声称当前候选已完成后续步骤。upper是图上y减小，不能把地理北自动当upper。宿主默认尺寸不是用户要求；notes/warnings中未验证的采光、通风、承重、施工合规是会向用户展示的局限，用户未要求时不能据此编造unmetRequirements拒绝，也不能宣称已验证。若当前候选满足本步骤用户明确要求，unmetRequirements=[]；若有遗漏或不满足，candidateId=null并逐项说明，整笔回滚。' },
          { role: 'user', content: JSON.stringify({ instruction, plan, operation, completedOperations: completed.map(step => ({ operationId: step.operation.id, type: step.operation.type })), unit: 'meter', candidates: candidates.map(describeCandidate) }) },
        ],
        tools: [{ type: 'function', function: { name: 'select_floorplan_candidate', description: '选择当前步骤的真实候选ID，宿主随后重新计算验证', parameters: {
          type: 'object', additionalProperties: false,
          properties: { candidateId: { type: ['string', 'null'], enum: [...candidates.map(c => c.id), null] }, unmetRequirements: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } },
          required: ['candidateId', 'unmetRequirements', 'reason'],
        } } }],
        tool_choice: { type: 'function', function: { name: 'select_floorplan_candidate' } }, temperature: 0, max_tokens: 1400,
      }, `floorplan-candidate-selection-${operation.id}`);
      const selection = readSingleToolCall(selectionResult, 'select_floorplan_candidate') as any;
      if (!selection || typeof selection !== 'object' || Array.isArray(selection) || Object.keys(selection).some(k => !['candidateId', 'unmetRequirements', 'reason'].includes(k))
        || !('candidateId' in selection) || !Array.isArray(selection.unmetRequirements) || !selection.unmetRequirements.every((v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 500)
        || typeof selection.reason !== 'string' || selection.reason.length > 2000) throw new FloorplanIntentError('EDIT_CANDIDATE_SELECTION_INVALID', '模型未返回有效的方案选择，原户型未改动。');
      if (selection.candidateId === null || selection.unmetRequirements.length) return reject('EDIT_REQUIREMENTS_UNSATISFIED', `当前方案无法完整满足需求：${selection.unmetRequirements.join('；') || selection.reason || '需要明确改造条件'}。整笔改造未执行，原户型未改动。`, 422, { selection });
      const candidate = candidates.find(c => c.id === selection.candidateId);
      if (!candidate) throw new FloorplanIntentError('EDIT_CANDIDATE_UNKNOWN', '模型选择了不存在的方案，原户型未改动。');
      req.signal.throwIfAborted();
      if (candidateEngine === 'bedroom') edited = applyBedroomPartition(currentSvg, candidate.id, constraints);
      else if (candidateEngine === 'legacy') edited = applySvgEdits(currentSvg, legacyInstruction, candidate.additions!);
      else edited = applyStructureCandidate(currentSvg, candidate.id, operation as any);
      if (!edited || typeof edited.svg !== 'string' || edited.validation?.valid !== true) throw new FloorplanIntentError('EDIT_GEOMETRY_RESULT_INVALID', '几何工具没有返回通过校验的完整结果，整笔改造已回滚。');
      req.signal.throwIfAborted();
      const after = edited.structure;
      const operationAffected = edited.validation.affectedRoomIds || operationRoomIds(operation);
      operationAffected.forEach((id: string) => touched.add(id));
      const beforeIds = new Set(before.rooms.map((r: any) => r.id));
      const afterIds = new Set<string>(after.rooms.map((r: any) => r.id));
      for (const id of afterIds) if (!beforeIds.has(id)) newRooms.add(id);
      const stepMap: Record<string, string | null> = { ...(edited.validation.roomIdMap || {}) };
      for (const id of beforeIds) if (!afterIds.has(id as string)) {
        removedRooms.add(id as string); newRooms.delete(id as string);
        if (!(id as string in stepMap)) stepMap[id as string] = null;
      }
      // Compose by the current destination, retaining only the initial keys:
      // source A -> surviving B -> surviving C must end at C for furniture.
      for (const id of Object.keys(roomIdMap)) {
        const destination = roomIdMap[id];
        if (destination !== null && destination in stepMap) roomIdMap[id] = stepMap[destination];
      }
      for (const warning of edited.validation.warnings || []) if (typeof warning === 'string') warnings.add(warning);
      for (const check of edited.validation.checks || []) if (typeof check === 'string') checks.add(check);
      openingChanges.push({ operationId: operation.id, ...(edited.validation.openingChanges || {}), removedOpeningIds: edited.validation.removedOpeningIds || [], movedOpeningIds: edited.validation.movedOpeningIds || [] });
      completed.push({ operation, candidate: describeCandidate(candidate), candidateCount: candidates.length, selection, validation: edited.validation });
      currentSvg = edited.svg;
    }
    req.signal.throwIfAborted();
    if (!edited || completed.length !== plan.operations.length) throw new FloorplanIntentError('EDIT_PLAN_INCOMPLETE', '改造步骤未全部完成，整笔改造已回滚。');
    failedOperationId = undefined;
    return NextResponse.json({ ...edited, intent: { action: 'structure_plan', ...plan }, selection: completed.at(-1)?.selection,
      candidateCount: completed.at(-1)?.candidateCount, operations: completed,
      validation: { ...edited.validation, valid: true, transaction: 'all-operations-validated', affectedRoomIds: [...touched], newRoomIds: [...newRooms], removedRoomIds: [...removedRooms], roomIdMap, openingChanges, checks: [...checks], warnings: [...warnings], operations: completed },
      attempts: [{ attempt: 1, valid: true, model: inference.at(-1)?.model }],
      provenance: { ...provenance(), structuralTruth: 'validated-svg-geometry', selectedCandidateId: completed.at(-1)?.candidate.id, operationCount: completed.length },
    });
  } catch (error: any) {
    if (error instanceof FloorplanIntentError) return reject(error.code, error.userMessage);
    if (req.signal.aborted || error?.name === 'AbortError') return reject('EDIT_CANCELLED', '本次改造已取消，原户型未改动。', 499);
    const code = String(error?.message || 'SVG_EDIT_FAILED');
    if (error?.name === 'QwenRequestError') return reject('EDIT_MODEL_REQUEST_FAILED', '模型请求失败或超时，原户型未改动，请稍后重试。', 502);
    if (code.startsWith('SPLIT_SEARCH_BUDGET_EXCEEDED')) return reject('SPLIT_SEARCH_BUDGET_EXCEEDED', '本户型的候选搜索超过安全计算预算，请明确改造方位或缩小范围；原方案已保留。');
    if (code.startsWith('EDIT_NO_FREE_LIVING_BALCONY_WALL')) return reject('EDIT_NO_FREE_LIVING_BALCONY_WALL', '客厅与阳台没有可新增推拉门的空闲共墙，原户型未改动。');
    const domainCode = /^(?:EDIT_|BEDROOM_|SVG_|STRUCTURE_|SPLIT_)[A-Z0-9_]+/.exec(code)?.[0] || 'SVG_EDIT_FAILED';
    return reject(domainCode, `改造未通过结构校验（${domainCode}），整笔改造已回滚。请调整位置或改造要求后重试。`);
  }
}
