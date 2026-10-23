import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { compileBlueprintToPascal, createFloorplanBlueprint, validateVariantBlueprint } from "../../lib/floorplans/blueprint";
import type { FloorplanOpening, FloorplanRoom, FloorplanSpec, FloorplanWall } from "../../lib/floorplans/types";
import { assertPascalSceneIntegrity } from "../../lib/pascal/scene-integrity";
import { repairOpenings, solveRoomPartition } from "../../lib/floorplans/partition-solver";
import type { SceneGraph } from "../../lib/types";
import { svgToStructure } from "../../lib/ai/svg-geometry";

export type PascalGenerationSource = "mcp-qwen38-vulkan" | "fallback-prebuilt" | "svg-deterministic/v1";

export type PascalSession = {
  sessionId: string;
  sourceImageHash: string;
  sourceImage: string;
  revision: number;
  status: "started" | "structure" | "openings" | "furnished" | "validated" | "committed";
  spec: FloorplanSpec | null;
  scene: SceneGraph | null;
  validation: { valid: boolean; issues: string[]; warnings: string[] };
  scaleMethod: "drawing-dimensions" | "standard-door-estimate";
  scaleEstimated: boolean;
  partitionNotes?: string[];
  geometrySource?: "svg-deterministic/v1";
  svgOpenings?: Pick<ReturnType<typeof svgToStructure>, "doors" | "windows">;
  rawStructure?: unknown;
  rawOpenings?: unknown;
  createdAt: string;
  updatedAt: string;
};

type SessionIdentity = { sessionId: string; sourceImageHash: string; revision: number };

const sessions = new Map<string, PascalSession>();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function sceneDirectory() {
  return process.env.PASCAL_SCENE_DIR || join(process.cwd(), "data", "scenes");
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function requireSession(input: SessionIdentity) {
  const session = sessions.get(input.sessionId);
  if (!session) throw new Error(`Pascal session not found: ${input.sessionId}`);
  if (session.sourceImageHash !== input.sourceImageHash) throw new Error("sourceImageHash does not match the Pascal session");
  if (session.revision !== input.revision) throw new Error(`revision conflict: expected ${session.revision}, received ${input.revision}`);
  if (session.status === "committed") throw new Error("Pascal session is already committed");
  return session;
}

function requireStatus(session: PascalSession, allowed: PascalSession["status"][], tool: string) {
  if (!allowed.includes(session.status)) throw new Error(`${tool} cannot run while session status is ${session.status}`);
}

function finitePoint(point: unknown): point is [number, number] {
  return Array.isArray(point) && point.length === 2 && point.every((value) => Number.isFinite(Number(value)));
}

function validateStructure(outerPolygon: unknown[], walls: FloorplanWall[], rooms: FloorplanRoom[]) {
  const issues: string[] = [];
  if (outerPolygon.length < 3 || !outerPolygon.every(finitePoint)) issues.push("outerPolygon must contain at least three finite points");
  if (walls.length < 4) issues.push("at least four walls are required");
  if (!rooms.length) issues.push("at least one room is required");
  const ids = new Set<string>();
  for (const entity of [...walls, ...rooms]) {
    if (!entity.id || ids.has(entity.id)) issues.push(`duplicate or missing id: ${entity.id || "<empty>"}`);
    ids.add(entity.id);
  }
  for (const wall of walls) {
    if (!finitePoint(wall.start) || !finitePoint(wall.end) || Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) < 0.05)
      issues.push(`invalid wall geometry: ${wall.id}`);
  }
  for (const room of rooms) {
    if (room.polygon.length < 3 || !room.polygon.every(finitePoint) || Math.abs(room.polygon.reduce((area, current, index) => {
      const next = room.polygon[(index + 1) % room.polygon.length];
      return area + current[0] * next[1] - next[0] * current[1];
    }, 0) / 2) < 0.2) issues.push(`invalid room polygon: ${room.id}`);
  }
  if (issues.length) throw new Error(issues.join("; "));
}

function withProvenance(scene: SceneGraph, session: PascalSession) {
  const generatedAt = new Date().toISOString();
  const metadata = (scene.nodes.building_house.metadata ||= {});
  Object.assign(metadata, {
    floorplanSource: (session.geometrySource || "mcp-qwen38-vulkan") satisfies PascalGenerationSource,
    sourceImageHash: session.sourceImageHash,
    sourceDrawing: session.sourceImage,
    mcpSessionId: session.sessionId,
    model: session.geometrySource ? null : process.env.LOCAL_TEXT_MODEL || "Qwen3.8-27B-UD-Q4_K_XL",
    scaleMethod: session.scaleMethod,
    ...(session.scaleEstimated ? { assumedDoorWidthM: 0.86 } : {}),
    scaleEstimated: session.scaleEstimated,
    partitionNotes: session.partitionNotes,
    rawModelStructure: session.rawStructure,
    rawModelOpenings: session.rawOpenings,
    geometrySolved: Boolean(session.partitionNotes),
    generatedAt,
  });
  const level = scene.nodes.level_ground;
  if (level) level.metadata = { ...(level.metadata || {}), sourceImageHash: session.sourceImageHash, mcpSessionId: session.sessionId };
  return scene;
}

function compile(session: PascalSession, furniture: "none" | "default") {
  if (!session.spec) throw new Error("floor structure has not been set");
  const blueprint = furniture === "default" ? createFloorplanBlueprint(session.spec) : createFloorplanBlueprint(session.spec, []);
  const validation = validateVariantBlueprint(blueprint);
  if (!validation.valid) throw new Error(`FloorplanBlueprint validation failed: ${validation.issues.join("; ")}`);
  return withProvenance(compileBlueprintToPascal(blueprint), session);
}

function result(session: PascalSession) {
  return clone({
    ok: true,
    sessionId: session.sessionId,
    sourceImageHash: session.sourceImageHash,
    revision: session.revision,
    status: session.status,
    scene: session.scene,
    validation: session.validation,
    provenance: session.scene?.nodes.building_house?.metadata,
  });
}

export function beginFloorplanScene(input: { sessionId: string; sourceImageHash: string; sourceImage: string }) {
  if (!input.sessionId || input.sourceImageHash.length < 8) throw new Error("sessionId and sourceImageHash are required");
  if (sessions.has(input.sessionId)) throw new Error(`Pascal session already exists: ${input.sessionId}`);
  const now = new Date().toISOString();
  const session: PascalSession = {
    sessionId: input.sessionId,
    sourceImageHash: input.sourceImageHash,
    sourceImage: input.sourceImage || "confirmed-floorplan",
    revision: 1,
    status: "started",
    spec: null,
    scene: null,
    validation: { valid: false, issues: ["floor structure has not been set"], warnings: ["dimensions will be estimated from a standard 0.86m door"] },
    scaleMethod: "standard-door-estimate",
    scaleEstimated: true,
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(input.sessionId, session);
  return result(session);
}

export function setFloorStructure(input: SessionIdentity & {
  name?: string;
  outerPolygon: [number, number][];
  walls: FloorplanWall[];
  rooms: FloorplanRoom[];
  scaleMethod?: "drawing-dimensions" | "standard-door-estimate";
  geometrySource?: "svg-deterministic/v1";
  sourceSvg?: string;
}) {
  const session = requireSession(input);
  requireStatus(session, ["started", "validated"], "set_floor_structure");
  // The model's room polygons are only used as labels: solveRoomPartition
  // derives the real rooms from the outline and the walls. Rejecting a
  // degenerate model polygon here would abort the whole generation even though
  // that polygon is never compiled, so keep only usable labels and make sure at
  // least one seed exists.
  const labelRooms = (Array.isArray(input.rooms) ? input.rooms : []).filter(
    (room) => Array.isArray(room.polygon) && room.polygon.length >= 3 && room.polygon.every((point) => finitePoint(point)),
  );
  // Degenerate walls (start≈end, e.g. a duplicated vertex) carry no partition
  // value and only trip the geometry validator — drop them instead of failing.
  // Coordinates are normalized to finite numbers here: the model sometimes
  // emits strings that pass the lenient local check but fail the blueprint
  // validator's strict Number.isFinite.
  const toPoint = (pt: unknown): [number, number] | null => {
    if (!Array.isArray(pt) || pt.length !== 2) return null;
    const x = Number(pt[0]), z = Number(pt[1]);
    return Number.isFinite(x) && Number.isFinite(z) ? [x, z] : null;
  };
  const usableOuter = (Array.isArray(input.outerPolygon) ? input.outerPolygon : [])
    .map(toPoint).filter((pt): pt is [number, number] => !!pt);
  const usableWalls = (input.walls || []).flatMap((wall) => {
    const start = toPoint(wall.start), end = toPoint(wall.end);
    if (!start || !end) return [];
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 0.05) return [];
    return [{ ...wall, start, end }];
  });
  validateStructure(usableOuter, usableWalls, labelRooms.length
    ? labelRooms
    : [{ id: "label_seed", name: "房间", semantic: "living_room", polygon: clone(input.outerPolygon), expectedArea: 0, color: "#c9d4d6" } as FloorplanRoom]);
  // The model recognises rooms and rough wall runs; the host solves the actual
  // partition so rooms tile the outline by construction. Without this the model
  // would leave 20-24% of the outline uncovered and still pass validation.
  // SVG polygons are already measured, partitioned geometry. Re-solving them
  // as model label guesses changes their boundaries and semantics.
  const strictSvg = input.geometrySource === "svg-deterministic/v1";
  const parsedSvg = strictSvg ? svgToStructure(input.sourceSvg || "") : null;
  if (strictSvg) {
    validateStructure(input.outerPolygon, input.walls, input.rooms);
    const roomGeometry = (rooms:FloorplanRoom[]) => rooms.map(({id,name,semantic,polygon,expectedArea,sourceArea})=>({id,name,semantic,polygon,expectedArea,sourceArea}));
    if (JSON.stringify(input.outerPolygon)!==JSON.stringify(parsedSvg!.outerPolygon) || JSON.stringify(input.walls)!==JSON.stringify(parsedSvg!.walls) || JSON.stringify(roomGeometry(input.rooms))!==JSON.stringify(roomGeometry(parsedSvg!.rooms))) throw new Error("SVG_STRUCTURE_DIFFERS_FROM_SOURCE");
  }
  const solved = strictSvg ? {outerPolygon: clone(input.outerPolygon), walls: clone(input.walls), rooms: clone(input.rooms), notes: ["SVG geometry preserved without model partition/repair"]} : solveRoomPartition({
    outerPolygon: clone(usableOuter),
    walls: clone(usableWalls),
    rooms: clone(input.rooms),
  });
  // healWalls projects wall endpoints onto the outline; a short wall can fold
  // both endpoints onto the same outline point, producing a zero-length wall
  // that only the blueprint validator catches. Drop those after solving.
  solved.walls = solved.walls.filter((wall) =>
    Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) > 0.01,
  );
  const spec: FloorplanSpec = {
    id: `mcp-${safeId(session.sessionId)}`,
    name: input.name || "AI 识别户型",
    factory: strictSvg ? "PascalMCP/SVG-deterministic/v1" : "PascalMCP/Qwen3.8-27B/Vulkan",
    sourceImage: session.sourceImage,
    outerPolygon: clone(solved.outerPolygon),
    walls: clone(solved.walls),
    rooms: clone(solved.rooms),
    doors: [],
    windows: [],
  };
  session.partitionNotes = [...new Set(solved.notes)];
  session.rawStructure = { outerPolygon: input.outerPolygon, walls: input.walls, rooms: input.rooms };
  const scaleMethod = input.scaleMethod || "standard-door-estimate";
  const draft = { ...session, spec, geometrySource: input.geometrySource, scaleMethod, scaleEstimated: scaleMethod === "standard-door-estimate" };
  const scene = compile(draft, "none");
  session.geometrySource = input.geometrySource;
  session.svgOpenings = parsedSvg ? {doors:parsedSvg.doors,windows:parsedSvg.windows} : undefined;
  session.spec = spec;
  session.scene = scene;
  session.scaleMethod = scaleMethod;
  session.scaleEstimated = scaleMethod === "standard-door-estimate";
  session.revision += 1;
  session.status = "structure";
  session.validation = { valid: false, issues: ["openings and final validation are pending"], warnings: session.scaleEstimated ? ["dimensions estimated from a standard 0.86m door"] : [] };
  session.updatedAt = new Date().toISOString();
  return result(session);
}

export function setOpenings(input: SessionIdentity & { doors: FloorplanOpening[]; windows: FloorplanOpening[] }) {
  const session = requireSession(input);
  requireStatus(session, ["structure"], "set_openings");
  if (!session.spec) throw new Error("floor structure has not been set");
  if(session.svgOpenings){
    const geometry=(openings:FloorplanOpening[])=>openings.map(({id,name,wallId,width,distance,doorType})=>({id,name,wallId,width,distance,doorType}));
    if(JSON.stringify(geometry(input.doors))!==JSON.stringify(geometry(session.svgOpenings.doors)) || JSON.stringify(geometry(input.windows))!==JSON.stringify(geometry(session.svgOpenings.windows)))throw new Error("SVG_OPENINGS_DIFFER_FROM_SOURCE");
  }
  const repaired = session.geometrySource ? {doors:clone(input.doors),windows:clone(input.windows),notes:[]} : repairOpenings({
    walls: session.spec.walls,
    rooms: session.spec.rooms,
    doors: clone(input.doors || []),
    windows: clone(input.windows || []),
  });
  session.rawOpenings = { doors: input.doors, windows: input.windows };
  // set_openings is retried by the agent, so notes must not accumulate duplicates.
  session.partitionNotes = [...new Set([...(session.partitionNotes || []), ...repaired.notes])];
  const spec = { ...clone(session.spec), doors: repaired.doors, windows: repaired.windows };
  const scene = compile({ ...session, spec }, "none");
  session.spec = spec;
  session.scene = scene;
  session.revision += 1;
  session.status = "openings";
  session.validation = { valid: false, issues: ["furniture and final validation are pending"], warnings: session.scaleEstimated ? ["dimensions estimated from a standard 0.86m door"] : [] };
  session.updatedAt = new Date().toISOString();
  return result(session);
}

export function populateBasicFurniture(input: SessionIdentity) {
  const session = requireSession(input);
  requireStatus(session, ["openings"], "populate_basic_furniture");
  session.scene = compile(session, "default");
  session.revision += 1;
  session.status = "furnished";
  session.updatedAt = new Date().toISOString();
  return result(session);
}

export function validateScene(input: SessionIdentity) {
  const session = requireSession(input);
  requireStatus(session, ["furnished"], "validate_scene");
  if (!session.spec || !session.scene) throw new Error("scene is incomplete");
  const blueprintValidation = validateVariantBlueprint(createFloorplanBlueprint(session.spec));
  const integrity = assertPascalSceneIntegrity(session.scene);
  const issues = [...blueprintValidation.issues, ...integrity.issues];
  session.validation = {
    valid: issues.length === 0,
    issues,
    warnings: session.scaleEstimated ? ["dimensions estimated from a standard 0.86m door; verify before construction use"] : [],
  };
  session.revision += 1;
  session.status = "validated";
  session.updatedAt = new Date().toISOString();
  return result(session);
}

export function commitScene(input: SessionIdentity) {
  const session = requireSession(input);
  requireStatus(session, ["validated"], "commit_scene");
  if (!session.validation.valid || !session.scene) throw new Error(`scene cannot be committed: ${session.validation.issues.join("; ")}`);
  const committed = {...session, revision:session.revision+1, status:"committed" as const, updatedAt:new Date().toISOString()};
  const directory = sceneDirectory();
  mkdirSync(directory, { recursive: true });
  const file = join(directory, `${safeId(session.sessionId)}.json`);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(result(committed), null, 2), "utf8");
  renameSync(temporary, file);
  Object.assign(session, committed);
  return result(session);
}

export function getPascalSession(sessionId: string) {
  const session = sessions.get(sessionId);
  return session ? result(session) : null;
}

export function clearPascalSessions() {
  sessions.clear();
}
