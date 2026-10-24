import {
  createFloorplanBlueprint,
  validateVariantBlueprint,
} from "./blueprint";
import {
  polygonArea,
  type BlueprintCalibration,
  type FloorplanBlueprint,
  type Point,
} from "./types";
import { getPascalV2Spec } from "./pascal-v2/index";

export const VARIANT_STORAGE_PREFIX = "dreamhouse:variant:";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SavedVariantDesign = {
  schema: "dreamhouse-saved-variant/v1";
  variantId: string;
  blueprint: FloorplanBlueprint;
  calibration: BlueprintCalibration;
  updatedAt: string;
};

export type VariantBlueprintSource = "saved" | "golden" | "base";

export type LoadedVariantBlueprint = {
  blueprint: FloorplanBlueprint;
  calibration: BlueprintCalibration;
  source: VariantBlueprintSource;
};

const GOLDEN_VARIANTS = new Set(["one-option-01", "three-option-05"]);

const GOLDEN_GEOMETRY: Record<string, { width: number; depth: number }> = {
  // Dimensions are read from the dimension chains printed on the source PNGs.
  "one-option-01": { width: 6.63, depth: 8.379 },
  "three-option-05": { width: 10.5, depth: 12.999 },
};

const VARIANT_IMAGE_CROPS: Record<string, NonNullable<BlueprintCalibration["imageCrop"]>> = {
  "one-option-01": { left: 0.2313, top: 0.1240, right: 0.7660, bottom: 0.9652 },
  "one-option-02": { left: 0.0603, top: 0.2917, right: 0.9433, bottom: 0.7285 },
  "one-option-03": { left: 0.2475, top: 0.0707, right: 0.7574, bottom: 0.9558 },
  "one-option-04": { left: 0.1786, top: 0.0669, right: 0.8276, bottom: 0.9015 },
  "one-option-05": { left: 0.2365, top: 0.0619, right: 0.7660, bottom: 0.9545 },
  "one-option-06": { left: 0.1158, top: 0.0606, right: 0.8879, bottom: 0.9558 },
  "one-option-07": { left: 0.0653, top: 0.0619, right: 0.9397, bottom: 0.9672 },
  "one-option-08": { left: 0.0739, top: 0.0707, right: 0.9236, bottom: 0.9596 },
  "two-option-01": { left: 0.1502, top: 0.0745, right: 0.8510, bottom: 0.9621 },
  "two-option-02": { left: 0.2217, top: 0.1250, right: 0.7820, bottom: 0.9545 },
  "two-option-03": { left: 0.3251, top: 0.0732, right: 0.6786, bottom: 0.9091 },
  "two-option-04": { left: 0.2586, top: 0.0631, right: 0.7451, bottom: 0.9621 },
  "two-option-05": { left: 0.3079, top: 0.0745, right: 0.6466, bottom: 0.9545 },
  "two-option-06": { left: 0.0616, top: 0.2816, right: 0.8978, bottom: 0.7412 },
  "two-option-07": { left: 0.1071, top: 0.2424, right: 0.9372, bottom: 0.7386 },
  "two-option-08": { left: 0.1133, top: 0.0960, right: 0.9433, bottom: 0.9255 },
  "three-option-01": { left: 0.1071, top: 0.1465, right: 0.9397, bottom: 0.8258 },
  "three-option-02": { left: 0.3140, top: 0.0694, right: 0.6909, bottom: 0.9571 },
  "three-option-03": { left: 0.0690, top: 0.0669, right: 0.9335, bottom: 0.9583 },
  "three-option-04": { left: 0.1047, top: 0.2311, right: 0.8978, bottom: 0.7929 },
  "three-option-05": { left: 0.1736, top: 0.1199, right: 0.8288, bottom: 0.9609 },
  "three-option-06": { left: 0.0862, top: 0.0619, right: 0.9150, bottom: 0.9609 },
  "three-option-07": { left: 0.0591, top: 0.1061, right: 0.9421, bottom: 0.9280 },
  "three-option-08": { left: 0.0591, top: 0.1995, right: 0.8941, bottom: 0.8321 },
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function storageOrNull(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

export function variantStorageKey(variantId: string, sessionId?: string) {
  return sessionId ? `dreamhouse:session:${sessionId}:variant:${variantId}` : `${VARIANT_STORAGE_PREFIX}${variantId}`;
}

function bounds(points: Point[]) {
  const xs = points.map((point) => Number(point[0]));
  const zs = points.map((point) => Number(point[1]));
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...zs) - Math.min(...zs),
  };
}

export function getBaseVariantBlueprint(variantId: string) {
  const [type, option] = variantId.split("-option-");
  const optionIndex = Number(option);
  if (!(type === "one" || type === "two" || type === "three") || !Number.isFinite(optionIndex)) {
    throw new Error(`找不到 Pascal V2 Blueprint：${variantId}`);
  }
  return createFloorplanBlueprint(clone(getPascalV2Spec(type, optionIndex)));
}

function transformGoldenBlueprint(
  input: FloorplanBlueprint,
  targetWidth: number,
  targetDepth: number,
) {
  const blueprint = clone(input);
  const originalBounds = bounds(blueprint.outerPolygon);
  const sx = targetWidth / originalBounds.width;
  const sz = targetDepth / originalBounds.depth;
  const point = (value: Point): Point => [
    (value[0] - originalBounds.minX) * sx,
    (value[1] - originalBounds.minZ) * sz,
  ];
  const oldWalls = new Map(blueprint.walls.map((wall) => [wall.id, clone(wall)]));
  blueprint.outerPolygon = blueprint.outerPolygon.map(point);
  blueprint.walls = blueprint.walls.map((wall) => ({
    ...wall,
    start: point(wall.start),
    end: point(wall.end),
  }));
  blueprint.rooms = blueprint.rooms.map((room) => ({
    ...room,
    polygon: room.polygon.map(point),
  }));
  const updateOpening = <T extends { hostWallId: string; offset: number; width: number }>(opening: T): T => {
    const oldWall = oldWalls.get(opening.hostWallId)!;
    const newWall = blueprint.walls.find((wall) => wall.id === opening.hostWallId)!;
    const oldLength = Math.hypot(oldWall.end[0] - oldWall.start[0], oldWall.end[1] - oldWall.start[1]) || 1;
    const centreDistance = opening.offset + opening.width / 2;
    const centre = point([
      oldWall.start[0] + (oldWall.end[0] - oldWall.start[0]) * centreDistance / oldLength,
      oldWall.start[1] + (oldWall.end[1] - oldWall.start[1]) * centreDistance / oldLength,
    ]);
    const newLength = Math.hypot(newWall.end[0] - newWall.start[0], newWall.end[1] - newWall.start[1]) || 1;
    const projected = ((centre[0] - newWall.start[0]) * (newWall.end[0] - newWall.start[0]) +
      (centre[1] - newWall.start[1]) * (newWall.end[1] - newWall.start[1])) / newLength;
    return { ...opening, offset: Math.max(0, Math.min(newLength - opening.width, projected - opening.width / 2)) };
  };
  blueprint.doors = blueprint.doors.map(updateOpening);
  blueprint.windows = blueprint.windows.map(updateOpening);
  blueprint.furniture = blueprint.furniture.map((item) => ({
    ...item,
    position: [
      (item.position[0] - originalBounds.minX) * sx,
      item.position[1],
      (item.position[2] - originalBounds.minZ) * sz,
    ],
  }));
  const calibratedBounds = bounds(blueprint.outerPolygon);
  blueprint.expected = {
    roomCount: blueprint.rooms.length,
    doorCount: blueprint.doors.length,
    windowCount: blueprint.windows.length,
    approximateArea: polygonArea(blueprint.outerPolygon),
    sceneBounds: { width: calibratedBounds.width, depth: calibratedBounds.depth },
  };
  blueprint.factory = `${blueprint.factory}:GoldenCalibration`;
  return blueprint;
}

export function getGoldenVariantBlueprint(variantId: string): FloorplanBlueprint | null {
  if (!GOLDEN_VARIANTS.has(variantId)) return null;
  const dimensions = GOLDEN_GEOMETRY[variantId];
  return transformGoldenBlueprint(
    getBaseVariantBlueprint(variantId),
    dimensions.width,
    dimensions.depth,
  );
}

export function createDefaultCalibration(
  variantId: string,
  blueprint: FloorplanBlueprint,
  confirmed = false,
): BlueprintCalibration {
  const measured = bounds(blueprint.outerPolygon);
  return {
    variantId,
    imageScale: 1,
    imageRotation: 0,
    imageOffsetX: 0,
    imageOffsetY: 0,
    expectedArea: polygonArea(blueprint.outerPolygon),
    expectedWidth: measured.width,
    expectedDepth: measured.depth,
    confirmed,
    imageCrop: VARIANT_IMAGE_CROPS[variantId],
    imageCropVersion: 1,
  };
}

export function loadSavedVariantDesign(
  variantId: string,
  storage?: StorageLike,
  sessionId?: string,
): SavedVariantDesign | null {
  const target = storageOrNull(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(variantStorageKey(variantId, sessionId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedVariantDesign;
    if (saved.schema !== "dreamhouse-saved-variant/v1" || saved.variantId !== variantId || saved.blueprint?.id !== variantId)
      throw new Error("Saved Blueprint 身份不匹配");
    const validation = validateVariantBlueprint(saved.blueprint);
    if (!validation.valid) throw new Error(validation.issues.join("；"));
    if (saved.calibration.imageCropVersion !== 1) {
      saved.calibration.imageCrop = VARIANT_IMAGE_CROPS[variantId];
      saved.calibration.imageCropVersion = 1;
    }
    return saved;
  } catch (error) {
    console.error(`[Variant Blueprint] failed to load ${variantId}`, error);
    return null;
  }
}

export function loadVariantBlueprintState(
  variantId: string,
  storage?: StorageLike,
  sessionId?: string,
): LoadedVariantBlueprint {
  const saved = loadSavedVariantDesign(variantId, storage, sessionId);
  if (saved) return { blueprint: clone(saved.blueprint), calibration: clone(saved.calibration), source: "saved" };
  const golden = getGoldenVariantBlueprint(variantId);
  if (golden) return {
    blueprint: golden,
    calibration: createDefaultCalibration(variantId, golden, true),
    source: "golden",
  };
  const base = getBaseVariantBlueprint(variantId);
  return {
    blueprint: base,
    calibration: createDefaultCalibration(variantId, base, false),
    source: "base",
  };
}

export function loadVariantBlueprint(variantId: string, storage?: StorageLike, sessionId?: string) {
  return loadVariantBlueprintState(variantId, storage, sessionId).blueprint;
}

export function saveVariantDesign(
  variantId: string,
  blueprint: FloorplanBlueprint,
  calibration: BlueprintCalibration,
  storage?: StorageLike,
  sessionId?: string,
) {
  if (blueprint.id !== variantId || calibration.variantId !== variantId)
    throw new Error("保存的 Blueprint 与 variantId 不一致");
  const validation = validateVariantBlueprint(blueprint);
  if (!validation.valid) throw new Error(`Blueprint 无法保存：${validation.issues.join("；")}`);
  const target = storageOrNull(storage);
  if (!target) throw new Error("当前环境不支持 variant 持久化");
  const record: SavedVariantDesign = {
    schema: "dreamhouse-saved-variant/v1",
    variantId,
    blueprint: clone(blueprint),
    calibration: clone(calibration),
    updatedAt: new Date().toISOString(),
  };
  target.setItem(variantStorageKey(variantId, sessionId), JSON.stringify(record));
  return record;
}

export function clearSavedVariantDesign(variantId: string, storage?: StorageLike, sessionId?: string) {
  storageOrNull(storage)?.removeItem(variantStorageKey(variantId, sessionId));
}

export type CalibrationValidation = {
  valid: boolean;
  status: "PASS" | "NEEDS REVIEW";
  issues: string[];
  metrics: {
    referenceArea: number;
    pascalArea: number;
    areaError: number;
    referenceBounds: { width: number; depth: number };
    pascalBounds: { width: number; depth: number };
    boundsError: { width: number; depth: number };
    rooms: { reference: number; actual: number };
    doors: { reference: number; actual: number };
    windows: { reference: number; actual: number };
  };
};

export function validateVariantCalibration(
  blueprint: FloorplanBlueprint,
  calibration: BlueprintCalibration,
  reference = getGoldenVariantBlueprint(blueprint.id) || getBaseVariantBlueprint(blueprint.id),
): CalibrationValidation {
  const actualBounds = bounds(blueprint.outerPolygon);
  const area = polygonArea(blueprint.outerPolygon);
  const areaError = area - calibration.expectedArea;
  const boundsError = {
    width: actualBounds.width - calibration.expectedWidth,
    depth: actualBounds.depth - calibration.expectedDepth,
  };
  const issues: string[] = [];
  if (Math.abs(areaError) > Math.max(0.5, calibration.expectedArea * 0.03)) issues.push("面积误差超过 3%");
  if (Math.abs(boundsError.width) > 0.03 || Math.abs(boundsError.depth) > 0.03) issues.push("边界尺寸误差超过 30mm");
  if (blueprint.rooms.length !== reference.expected.roomCount) issues.push("房间数量与校准参考不一致");
  if (blueprint.doors.length !== reference.expected.doorCount) issues.push("门数量与校准参考不一致");
  if (blueprint.windows.length !== reference.expected.windowCount) issues.push("窗数量与校准参考不一致");
  if (!calibration.confirmed) issues.push("尚未完成人工 Overlay 校准");
  return {
    valid: issues.length === 0,
    status: issues.length ? "NEEDS REVIEW" : "PASS",
    issues,
    metrics: {
      referenceArea: calibration.expectedArea,
      pascalArea: area,
      areaError,
      referenceBounds: { width: calibration.expectedWidth, depth: calibration.expectedDepth },
      pascalBounds: { width: actualBounds.width, depth: actualBounds.depth },
      boundsError,
      rooms: { reference: reference.expected.roomCount, actual: blueprint.rooms.length },
      doors: { reference: reference.expected.doorCount, actual: blueprint.doors.length },
      windows: { reference: reference.expected.windowCount, actual: blueprint.windows.length },
    },
  };
}

export function goldenVariantIds() {
  return [...GOLDEN_VARIANTS];
}
