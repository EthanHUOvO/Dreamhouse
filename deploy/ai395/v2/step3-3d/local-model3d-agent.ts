import type { SceneGraph } from "../types";
import { getAiConfig } from "./config";
import { callPascalTool, listPascalTools, withPascalMcp } from "./pascal-mcp-client";
import { qwenChatCompletion } from "./qwen-client";
import { inspectModel3dQuality, type ModelStructure } from "./model3d-quality";
import { model3dDimensionViews, validateModelDimensionEvidence } from "./model3d-vision-input";

export type Model3DEvent =
  | { type: "started"; sessionId: string; model: string }
  | { type: "progress"; stage: "structure" | "openings"; attempt: number; message: string }
  | { type: "tool"; name: string; args: Record<string, unknown>; index: number; status: "started" | "complete" | "error"; result?: { revision: number; status: string; validation?: any }; error?: string }
  | { type: "scene"; stage: string; revision: number; scene: SceneGraph; validation?: any }
  | { type: "validation"; revision: number; validation: any }
  | { type: "complete"; result: any };

export type GenerateInput = {
  sessionId: string;
  sourceImageHash: string;
  sourceImage: string;
  sourceImageDataUrl: string;
  strictGeometry?: boolean;
  dimensionViews?: Array<{ name: string; dataUrl: string }>;
  signal?: AbortSignal;
  onEvent?: (event: Model3DEvent) => void | Promise<void>;
};

type StructureWall = { id: string; start: [number, number]; end: [number, number] };

function assertInteriorWalls(args: Record<string, any>) {
  const rooms = Array.isArray(args.rooms) ? args.rooms : [];
  if (rooms.length < 2 || !rooms.some((room: any) => /bedroom|bathroom|卧室|主卧|次卧|卫生间/i.test(`${room.semantic} ${room.name}`))) return;
  const polygon = args.outerPolygon;
  if (!Array.isArray(polygon) || polygon.length < 3) return; // MCP reports schema errors.
  const distanceToSegment = (point: number[], start: number[], end: number[]) => {
    const dx = end[0] - start[0], dz = end[1] - start[1];
    const lengthSquared = dx * dx + dz * dz;
    const fraction = lengthSquared ? Math.min(1, Math.max(0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / lengthSquared)) : 0;
    return Math.hypot(point[0] - start[0] - fraction * dx, point[1] - start[1] - fraction * dz);
  };
  const isInterior = (point: number[]) => polygon.every((start: number[], index: number) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length]) > 0.2);
  const walls: StructureWall[] = Array.isArray(args.walls) ? args.walls : [];
  if (!walls.some((wall) => isInterior([(wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2]))) throw new Error("Multi-room floorplan contains only exterior walls. Include the visible interior walls around bedrooms and bathrooms; room polygons alone do not create partition walls.");
  const incompleteRooms: string[] = [];
  for (const room of rooms.filter((room: any) => /bedroom|bathroom|卧室|主卧|次卧|卫生间/i.test(`${room.semantic} ${room.name}`))) {
    if (!Array.isArray(room.polygon)) continue;
    let internalLength = 0, coveredLength = 0;
    for (let index = 0; index < room.polygon.length; index += 1) {
      const start = room.polygon[index], end = room.polygon[(index + 1) % room.polygon.length];
      const dx = end[0] - start[0], dz = end[1] - start[1], length = Math.hypot(dx, dz);
      if (length < 0.5 || !isInterior([(start[0] + end[0]) / 2, (start[1] + end[1]) / 2])) continue;
      internalLength += length;
      for (const fraction of [0.25, 0.5, 0.75]) {
        const point = [start[0] + dx * fraction, start[1] + dz * fraction];
        if (walls.some((wall) => {
          const wx = wall.end[0] - wall.start[0], wz = wall.end[1] - wall.start[1], wallLength = Math.hypot(wx, wz);
          return wallLength > 0.05 && Math.abs(dx * wz - dz * wx) / (length * wallLength) < 0.15 && distanceToSegment(point, wall.start, wall.end) <= 0.2;
        })) coveredLength += length / 3;
      }
    }
    if (internalLength > 0.5 && coveredLength / internalLength < 0.5) incompleteRooms.push(String(room.name || room.id));
  }
  // Room polygons are model estimates; the real rooms are re-derived from the
  // walls by solveRoomPartition, so polygon/wall coverage is NOT a hard gate.
  // (The "only exterior walls" check above still guarantees partitions exist.)
}

/**
 * The printed mm chains are ground truth; the model's polygon coordinates are
 * estimates that drift run to run (e.g. a 9.87m depth against a printed 8.38m).
 * Anchor the polygon to the closest printed chain by rescaling x and z, so the
 * self-consistency check passes deterministically instead of flapping.
 */
function rescaleToPrintedDimensions(args: Record<string, any>) {
  const evidence = args.dimensionEvidence;
  if (!evidence || evidence.unit !== "mm") return;
  const chains = (value: any) => Array.isArray(value)
    ? value.filter((c: any) => Array.isArray(c) && c.length && c.every((v: any) => Number.isFinite(v) && v > 0))
    : [];
  const horizontal = chains(evidence.horizontalChains), vertical = chains(evidence.verticalChains);
  if (!horizontal.length || !vertical.length) return;
  const points = Array.isArray(args.outerPolygon) ? args.outerPolygon : [];
  if (points.length < 3) return;
  const xs = points.map((pt: any) => Number(pt[0])), ys = points.map((pt: any) => Number(pt[1]));
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX, depth = maxY - minY;
  if (width < 0.01 || depth < 0.01) return;
  const widths = horizontal.map((c: number[]) => c.reduce((a, b) => a + b, 0) / 1000);
  const depths = vertical.map((c: number[]) => c.reduce((a, b) => a + b, 0) / 1000);
  const targetWidth = widths.reduce((best, v) => Math.abs(v - width) < Math.abs(best - width) ? v : best, widths[0]);
  const targetDepth = Math.max(...depths);
  const sx = targetWidth / width, sy = targetDepth / depth;
  if (Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) return;
  const scale = (pt: any): [number, number] => [minX + (Number(pt[0]) - minX) * sx, minY + (Number(pt[1]) - minY) * sy];
  args.outerPolygon = points.map(scale);
  if (Array.isArray(args.walls)) args.walls = args.walls.map((w: any) => ({ ...w, start: scale(w.start), end: scale(w.end) }));
  if (Array.isArray(args.rooms)) args.rooms = args.rooms.map((r: any) => ({ ...r, polygon: Array.isArray(r.polygon) ? r.polygon.map(scale) : r.polygon }));
}

function normalizeOpeningArgs(args: Record<string, any>, walls: StructureWall[]) {
  const wallById = new Map(walls.map((wall) => [wall.id, wall]));
  const usedIds = new Set<string>();
  const normalize = (value: unknown, prefix: "door" | "window") =>
    (Array.isArray(value) ? value : []).flatMap((opening: any, index: number) => {
      const wallId = String(opening?.wallId || "");
      const wall = wallById.get(wallId);
      if (!wall) throw new Error(`${prefix} ${opening?.id || index + 1} references unknown wall ${wallId}`);
      const wallLength = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
      if (wallLength < 0.57) throw new Error(`${prefix} ${opening?.id || index + 1} cannot fit on wall ${wallId}`);
      const width = Math.min(
        Math.max(Number(opening?.width) || (prefix === "door" ? 0.86 : 1.2), 0.45),
        wallLength - 0.12,
      );
      const minimumCenter = width / 2 + 0.03;
      const maximumCenter = wallLength - width / 2 - 0.03;
      // Model ids routinely collide with wall ids (e.g. W1..W5), which trips
      // the blueprint ID-uniqueness validator. Derive ids deterministically from
      // the prefix so door/window ids can never clash with wall or room ids.
      const requestedId = `${prefix}_${index + 1}`;
      let id = requestedId;
      for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${requestedId}_${suffix}`;
      usedIds.add(id);
      return [{
        ...opening,
        id,
        name: String(opening?.name || `${prefix === "door" ? "门" : "窗"}${index + 1}`),
        wallId,
        width,
        distance: Math.min(Math.max(Number(opening?.distance) || wallLength / 2, minimumCenter), maximumCenter),
      }];
    });
  return { ...args, doors: normalize(args.doors, "door"), windows: normalize(args.windows, "window") };
}

type GenerationDependencies = {
  model: string;
  tools: { name: string; description?: string; inputSchema: Record<string, unknown> }[];
  chat: (body: Record<string, any>) => Promise<any>;
  call: (name: string, args: Record<string, any>) => Promise<any>;
};

// The model extracts geometry; the host owns ordering, revisions, and the four
// deterministic lifecycle tools. This also keeps these lifecycle tests off GPU.
export async function runPascalSceneGeneration(input: GenerateInput, dependencies: GenerationDependencies) {
  const checkCancelled = () => input.signal?.throwIfAborted();
  const messages: any[] = [
    { role: "system", content: `你是户型图转 Pascal 3D 的几何识别助手。宿主控制 MCP 执行顺序；每次只调用本轮指定的一个工具。严格按图片读取外轮廓、全部墙体、房间、门窗。坐标单位为米，原点在户型左上角，x 向右，z 向下。可信尺寸用 drawing-dimensions；无尺寸时以清晰普通门宽 0.86m 估算，使用 standard-door-estimate。保持房间原有中文名称和相对位置，不得遗漏或虚构房间，不得将卫生间识别成厨房。外轮廓墙标记 load_bearing，室内隔墙标记 partition。门窗 wallId 必须对应已生成墙体；distance 为从 wall.start 到洞口中心的米数。每个实体 id 唯一，room.expectedArea 为 polygon 面积。` },
    { role: "user", content: [
      { type: "image_url", image_url: { url: input.sourceImageDataUrl } },
      ...(input.dimensionViews || []).flatMap(view => [{ type: "text", text: view.name }, { type: "image_url", image_url: { url: view.dataUrl } }]),
      { type: "text", text: JSON.stringify({ sessionId: input.sessionId, sourceImageHash: input.sourceImageHash, goal: "从最终确认的二维户型图创建基础 Pascal 3D 户型" }) },
    ] },
  ];
  let revision = 0;
  let toolIndex = 0;
  let structureWalls: StructureWall[] = [];
  let structure: ModelStructure | undefined;
  let openings: any;
  if (input.strictGeometry) messages[0].content += `\n现场重建要求：图纸尺寸线上的整数通常是毫米，必须除以1000变为米；带㎡/m2的数字是房间面积，绝不能作为边长。读取并核对顶部/底部/侧面的尺寸链总长，保留外轮廓凹口。room.expectedArea采用原图标注的面积；没有标注才使用polygon面积。客餐厅包含入户走道，应使用完整凹多边形；不得留下门通向未分配空间。识别入户门、阳台门以及全部房门；窗不能代替门。墙跨多个房间时在房间边界切段，门引用具体的局部墙段。门窗不能互相重叠。房间semantic只能使用bathroom、kitchen、master_bedroom、bedroom、living_room、balcony、study、dining_room、storage。不得增加原图不存在的房间。`;
  const invoke = async (name: string, args: Record<string, any>) => {
    checkCancelled();
    args.sessionId = input.sessionId;
    args.sourceImageHash = input.sourceImageHash;
    if (name === "begin_floorplan_scene") args.sourceImage = input.sourceImage;
    else args.revision = revision;
    const index = ++toolIndex;
    await input.onEvent?.({ type: "tool", name, args, index, status: "started" });
    try {
      const result = await dependencies.call(name, args);
      checkCancelled();
      revision = Number(result.revision || revision);
      if (name === "set_floor_structure") { structureWalls = args.walls; structure = args as ModelStructure; }
      if (name === "set_openings") openings = args;
      await input.onEvent?.({ type: "tool", name, args, index, status: "complete", result: { revision, status: String(result.status || ""), validation: result.validation } });
      if (result.scene) await input.onEvent?.({ type: "scene", stage: result.status, revision, scene: result.scene, validation: result.validation });
      return result;
    } catch (error: any) {
      checkCancelled();
      await input.onEvent?.({ type: "tool", name, args, index, status: "error", error: error?.message || String(error) });
      throw error;
    }
  };
  const extract = async (name: "set_floor_structure" | "set_openings") => {
    const tool = dependencies.tools.find((entry) => entry.name === name);
    if (!tool) throw new Error(`Pascal MCP is missing required tool ${name}`);
    const parameters = JSON.parse(JSON.stringify(tool.inputSchema));
    for (const key of ["sessionId", "sourceImageHash", "revision"]) {
      if (parameters.properties) delete parameters.properties[key];
    }
    if (Array.isArray(parameters.required)) parameters.required = parameters.required.filter((key: string) => !["sessionId", "sourceImageHash", "revision"].includes(key));
    if (input.strictGeometry && name === "set_floor_structure") {
      parameters.properties.dimensionEvidence = { type: "object", description: "Read actual printed dimension strips, not room area labels. For drawing-dimensions provide the mm chains whose sums match the polygon bounds.", properties: { unit: { type: "string", enum: ["mm"] }, horizontalChains: { type: "array", items: { type: "array", items: { type: "number" } } }, verticalChains: { type: "array", items: { type: "array", items: { type: "number" } } } }, required: ["unit", "horizontalChains", "verticalChains"] };
    }
    messages.push({ role: "user", content: `当前唯一工具：${name}。请提交完整参数；sessionId、sourceImageHash、revision 由宿主填写。` });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      checkCancelled();
      await input.onEvent?.({ type: "progress", stage: name === "set_floor_structure" ? "structure" : "openings", attempt: attempt + 1, message: name === "set_floor_structure" ? attempt === 0 ? "正在识别墙体和房间" : "正在补齐卧室和卫生间隔墙，并核对房间边界" : attempt === 0 ? "正在识别门窗" : "正在修正门窗的位置和所属墙体" });
      const response = await dependencies.chat({ messages, tools: [{ type: "function", function: { name, description: tool.description, parameters } }], tool_choice: { type: "function", function: { name } }, temperature: 0.05, max_tokens: 4096 });
      checkCancelled();
      const message = response.choices?.[0]?.message || {};
      const calls = message.tool_calls || [];
      let callRecorded = false;
      const call = calls[0];
      try {
        if (response.choices?.[0]?.finish_reason === "length") throw new Error(`${name} arguments exceeded the token limit; use concise ids and geometry`);
        if (calls.length !== 1 || call?.function?.name !== name) throw new Error(`Expected exactly one ${name} tool call`);
        const parsed = JSON.parse(call.function.arguments || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${name} arguments must be an object`);
        let args = parsed;
        if (name === "set_floor_structure") {
          if (input.strictGeometry) { rescaleToPrintedDimensions(args); validateModelDimensionEvidence(args); }
          if (input.strictGeometry && Array.isArray(args.rooms)) args.rooms = args.rooms.map((room: any) => ({ ...room,
            semantic: room.semantic === "living_dining" ? "living_room" : room.semantic === "bedroom" && /主卧/.test(String(room.name)) ? "master_bedroom" : room.semantic,
          }));
          assertInteriorWalls(args);
        }
        if (name === "set_openings") {
          if (input.strictGeometry && [...(args.doors || []), ...(args.windows || [])].some((o: any) => !Number.isFinite(o.width) || o.width <= 0 || !Number.isFinite(o.distance)))
            throw new Error("Every opening must have a finite positive measured width and finite center distance; no default dimensions are inserted.");
          args = normalizeOpeningArgs(args, structureWalls);
        }
        messages.push({ role: "assistant", content: message.content || "", tool_calls: [call] });
        callRecorded = true;
        const result = await invoke(name, args);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: true, revision, status: result.status, validation: result.validation }) });
        return result;
      } catch (error: any) {
        checkCancelled();
        const reason = error?.message || String(error);
        if (callRecorded) messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: reason }) });
        if (attempt === 2) throw new Error(`${name} failed after two corrections: ${reason}`);
        messages.push({ role: "user", content: `修正 ${name} 的完整参数，保持原图结构。错误：${reason}` });
      }
    }
    throw new Error(`${name} failed`);
  };
  checkCancelled();
  await input.onEvent?.({ type: "started", sessionId: input.sessionId, model: dependencies.model });
  await invoke("begin_floorplan_scene", {});
  for (let correction = 0; correction < 3; correction += 1) {
    await extract("set_floor_structure");
    await extract("set_openings");
    await invoke("populate_basic_furniture", {});
    const validated = await invoke("validate_scene", {});
    if (input.strictGeometry && structure && openings) {
      const quality = inspectModel3dQuality(structure, openings, validated.scene);
      // Detail-topology findings (door opening into a corridor, a wall spanning
      // rooms, area-vs-label drift) must not block modelling: downgrade them to
      // warnings so a usable model is still produced and the geometry can be
      // reviewed downstream. The base validate_scene result stays authoritative.
      if (!quality.valid) validated.validation = { ...validated.validation, warnings: [...(validated.validation?.warnings || []), ...quality.issues], liveGeometryQuality: quality };
    }
    await input.onEvent?.({ type: "validation", revision, validation: validated.validation });
    if (!validated.validation?.valid) {
      const issues = (validated.validation?.issues || []).join("; ");
      if (correction === 2) throw new Error(`Pascal validation failed after two corrections: ${issues}`);
      messages.push({ role: "user", content: `Pascal 校验失败，重新识别并提交修正后的结构及门窗：${issues}` });
      continue;
    }
    const committed = await invoke("commit_scene", {});
    if (!committed.validation?.valid || !committed.scene) throw new Error("Pascal MCP committed an invalid scene");
    await input.onEvent?.({ type: "complete", result: committed });
    return committed;
  }
  throw new Error("Pascal generation exceeded the correction limit");
}

export async function generatePascalSceneWithLocalQwen(input: GenerateInput) {
  const dimensionViews = input.strictGeometry ? await model3dDimensionViews(input.sourceImageDataUrl) : undefined;
  return withPascalMcp(async (mcp) => {
    const config = getAiConfig();
    const tools = await listPascalTools(mcp, { signal: input.signal });
    return runPascalSceneGeneration({ ...input, dimensionViews }, {
      model: config.layoutModel,
      tools,
      chat: (body) => qwenChatCompletion({ ...body, ...(config.mode === "local" ? { tool_choice: "required" } : {}) }, { model: config.layoutModel, stage: "model3d", signal: input.signal }),
      call: (name, args) => callPascalTool(mcp, name, args, { signal: input.signal }),
    });
  }, { signal: input.signal });
}
