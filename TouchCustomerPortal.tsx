"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { applySceneSnapshot, useScene } from "@pascal-app/core";
import DebugPanel from "@/components/customer/DebugPanel";
import GenerationProgressModal, { type GenerationStage } from "@/components/customer/GenerationProgressModal";
import {
  addPartitionWall,
  bridgeWallGap,
  blueprintWallCoordinateError,
  blueprintToFloorplanSpec,
  compileFloorplanToPascal,
  createFloorplanScene,
  compileBlueprintToPascal,
  createDefaultCalibration,
  createWallEditTransaction,
  describeWall,
  loadVariantBlueprintState,
  getGoldenVariantBlueprint,
  getBaseVariantBlueprint,
  clearSavedVariantDesign,
  saveVariantDesign,
  mergeCollinearWalls,
  moveWallParallel,
  removeWallSafe,
  straightenWallChain,
  updateWallEndpoint,
  validateVariantCalibration,
  sceneToFloorplanBlueprint,
  validateVariantBlueprint,
  loadImportedTwoScene,
  loadImportedThreeScene,
  loadImportedOneScene,
} from "@/lib/floorplans";
import { addDoor as addBlueprintDoor, moveDoor as moveBlueprintDoor, removeDoor as removeBlueprintDoor } from "@/lib/floorplans/door-edit";
import { sceneToBoundVariantBlueprint } from "@/lib/floorplans/blueprint";
import { validateBaselineFloorplan } from "@/lib/floorplans/validate";
import { compareScenes, type SceneDiff } from "@/lib/scene-diff";
import { executeLayoutTool, validateLayout } from "@/lib/layout-tools";
import { createDemoOrders } from "@/lib/demo-orders";
import { loadOrders, saveOrders } from "@/lib/order-store";
import { syncOrderDownstream } from "@/lib/downstream";
import { parseRequirementTarget } from "@/lib/ai/requirement-target";
import { selectedSvgSource, svgDataUrl, svgFromDataUrl, acceptsSvgScene } from "@/lib/ai/svg-version";
import { svgToStructure } from "@/lib/ai/svg-geometry";
import { assertBedroomSceneUsable } from "@/lib/ai/bedroom-scene-validation";
import { preserveBedroomSourceFurniture } from "@/lib/ai/bedroom-source-furniture";
import { consumeModel3dSse } from "@/lib/ai/model3d-stream";
import { canonicalFloorplanSource, canSelectOriginalFloorplan, originalFloorplanMatches, originalFloorplanSelection, shouldHydrateImportedPreset, type OriginalFloorplanSelection } from "@/lib/ai/model3d-source";
import { advanceSelectionEpoch, canUseBoundModel, floorplanModelBinding, restoreBoundModelSession, sameModelBinding, selectionJobCurrent, type FloorplanModelBinding, type SelectionEpoch } from "@/lib/ai/model3d-binding";
import { assertPascalSceneIntegrity } from "@/lib/pascal/scene-integrity";
import { structureEditFingerprint } from "@/lib/floorplans/structure-edit";
import { structureScenePng } from "@/lib/floorplans/structure-preview";
import { commitStructureScene } from "@/lib/ai/structure-commit";
import { ensurePascalPlugin } from "@/lib/pascal/bootstrap";
import {
  moveFurniture,
  placeFurniture,
  rotateFurniture,
} from "@/lib/furniture-edit";
import type {
  AiLayoutRun,
  DesignVersion,
  DetailedBomDocument,
  Order,
  SceneGraph,
  VisualConcept,
  CapturedView,
  InteriorDesignResult,
  DesignSession,
  AiFloorplanResult,
  RoomIdentity,
  SelectedVariant,
} from "@/lib/types";
import type { BlueprintCalibration, WallEditResult, WallEditTransaction, WallEndpoint } from "@/lib/floorplans";
import { INTERIOR_STYLE_PRESETS, buildInteriorPrompt } from "@/config/interiorStyles";
import { inferRoomType } from "@/config/roomTypes";
import { generateInterior } from "@/services/qwenImageService";
import { compactInteriorMetadata, inflateInteriorMetadata } from "@/lib/ai/interior-persistence";
import { packModelSession, unpackModelSession } from "@/lib/ai/inline-image-persistence";
import { BeforeAfterComparison } from "@/components/customer/BeforeAfterComparison";
import { clearFloorplanAssets, loadFloorplanAsset, saveFloorplanAsset } from "@/lib/floorplan-assets";
import { buildResidentialBudget, defaultResidentialBudgetSettings, recalculateResidentialBudget, type ResidentialBudget, type ResidentialBudgetSettings } from "@/lib/bom/residential";
import BeijingConstructionLogo from "@/components/branding/BeijingConstructionLogo";
import FloorplanEditExamples from "@/components/customer/FloorplanEditExamples";
import { clearSessionStorage, getActiveSessionId, sessionStorageKey, startSession } from "@/lib/session";

const PascalViewer = dynamic(() => import("@/components/shared/PascalViewer"), {
  ssr: false,
  loading: () => <div className="viewer-loading">正在加载住宅模型…</div>,
});

type Residence = "one" | "two" | "three";
type Slide = 0 | 1 | 2 | 3 | 4;
type ModelExperience = "intro" | "generating" | "viewer";
type ModelGenerationPhase = "idle" | "generating" | "preparing" | "completed" | "error";
type ProgressKind = "model" | "layout" | "image-preview" | "render" | "bom";
type ProgressTask = {
  id: string;
  kind: ProgressKind;
  startedAt: number;
  ready: boolean;
  totalDurationMs?: number;
  error?: string;
};
type ApiStatus = {
  mode: "mock" | "local" | "qwen" | "hybrid";
  localOnly?: boolean;
  ready?: boolean;
  services?: Record<string, { healthy: boolean; status?: number; message?: string }>;
  models: { layout: string; image: string; bom: string };
  persistence?: { imageUrlsMayExpire: boolean; generatedImageDirectory?: string };
};
type GeneratedImage = {
  provider: "qwen" | "mock";
  model: string;
  url: string;
  ephemeral: boolean;
  fallback: boolean;
  fallbackReason?: string;
  prompt?: string;
  inputImageCount?: number;
  sourceVariantId?: string;
  sourceImageHash?: string;
  userPrompt?: string;
  warnings?: string[];
  geometryVerified?: boolean;
  requestId?: string;
  generation?: { elapsedMs?: number; cacheHit?: boolean; changedRatio?: number };
};
type FloorplanSelection = GeneratedImage | OriginalFloorplanSelection;

type RoomImage = {
  roomId: string;
  roomName: string;
  image: GeneratedImage;
  status: "ready" | "failed";
  error?: string;
};
type FloorplanAnalysis = {
  sourceImageHash: string;
  sourceVariantId: string;
  observations: Array<{ roomId?: string; name: string; type: string; basis: string; confidence: "high" | "medium" | "low" | "unknown" }>;
  suggestions: Array<{ id: string; title: string; targetRoomIds: string[]; observedBasis: string; proposedChange: string; affectedAreas: string[]; preservedAreas: string[]; tradeoffs: string[]; needsConfirmation: string[]; editableInstruction: string }>;
  clarificationQuestion?: string;
};
const CLARIFICATION_OPTIONS = [
  "接受开放式厨房的调整思路",
  "保留原厨房，重新给出建议",
  "其他安排，由我补充说明",
];
type SvgEditContext = { originalSvg: string; intent: any; validation: any; provenance: any; furnitureSource?: SceneGraph };
type FloorplanVersion = { id: string; parentVersionId?: string; sourceVariantId: string; sourceImageHash: string; submittedRequirement: string; result: GeneratedImage; requestId: string; createdAt: string; validationStatus: "pending" | "ready" | "failed"; sceneSnapshot?: SceneGraph; svgSource?: string; editContext?: SvgEditContext };
type SelectedRegion = { x: number; y: number; width: number; height: number; coordinateSpace: "source-image"; sourceImageHash: string; baseVersionId: string };

const RESIDENCES: {
  key: Residence;
  label: string;
  sub: string;
  image: string;
  options: string[];
}[] = [
  {
    key: "one",
    label: "一居室",
    sub: "单人 / 紧凑型改造",
    image: "/preset/svg-v2/one/option-01.svg",
    options: [
      "/preset/svg-v2/one/option-01.svg",
      "/preset/svg-v2/one/option-02.svg",
      "/preset/svg-v2/one/option-07.svg",
    ],
  },
  {
    key: "two",
    label: "二居室",
    sub: "家庭 / 二居升三居",
    image: "/preset/svg-v2/two/option-01.svg",
    options: [
      "/preset/svg-v2/two/option-01.svg",
      "/preset/svg-v2/two/option-02.svg",
      "/preset/svg-v2/two/option-07.svg",
    ],
  },
  {
    key: "three",
    label: "三居室",
    sub: "改善型家庭 / 功能重构",
    image: "/preset/svg-v2/three/option-01.svg",
    options: [
      "/preset/svg-v2/three/option-01.svg",
      "/preset/svg-v2/three/option-03.svg",
      "/preset/svg-v2/three/option-07.svg",
    ],
  },
];

const SLIDES = [
  "选择您的户型",
  "调整您的户型",
  "创建您的3D空间",
  "拍摄视角与装修效果",
  "确认方案与工程清单",
];

function displayOptionIndex(residence: Residence, sourceOptionIndex: number) {
  const options = RESIDENCES.find((item) => item.key === residence)?.options || [];
  const index = options.findIndex((image) => Number(image.match(/option-(\d+)/)?.[1]) === sourceOptionIndex);
  return index >= 0 ? index + 1 : sourceOptionIndex;
}
const MODIFICATION_PREFIX = "请在当前户型基础上进行以下调整：";
const PROGRESS_STAGES: Record<ProgressKind, GenerationStage[]> = {
  model: [
    { label: "户型结构解析", detail: "正在解析户型结构…" },
    { label: "空间关系建立", detail: "正在识别墙体、门窗与空间关系…" },
    { label: "三维墙体构建", detail: "正在构建三维墙体与空间轮廓…" },
    { label: "房间与地面生成", detail: "正在生成房间与地面结构…" },
    { label: "门窗关系完善", detail: "正在完善门窗与空间连接…" },
    { label: "室内空间构建", detail: "正在建立室内空间层次…" },
    { label: "基础材质配置", detail: "正在配置基础材质与空间细节…" },
    { label: "空间完整性检查", detail: "正在进行空间完整性检查…" },
    { label: "3D空间完成", detail: "正在完成您的3D空间…" },
  ],
  layout: [
    { label: "正在理解您的需求…" },
    { label: "正在分析当前空间…" },
    { label: "正在规划调整方案…" },
    { label: "正在调整房间关系…" },
    { label: "正在检查门窗与通行关系…" },
    { label: "正在优化空间，使方案更符合‘好房子’的舒适居住要求…" },
    { label: "正在完成您的新方案…" },
  ],
  "image-preview": [
    { label: "正在准备图片与修改描述…" },
    { label: "正在调用云端 API 生成预览…" },
    { label: "正在检查图片结果是否可显示…" },
  ],
  render: [
    { label: "正在识别当前空间…" },
    { label: "正在匹配装修风格…" },
    { label: "正在优化家具与材质…" },
    { label: "正在调整空间灯光…" },
    { label: "正在生成最终效果…" },
  ],
  bom: [
    { label: "正在读取最终户型…" },
    { label: "正在统计墙体与门窗…" },
    { label: "正在整理家具与设备…" },
    { label: "正在汇总主要材料…" },
    { label: "正在完成工程清单…" },
  ],
};
const PROGRESS_META: Record<ProgressKind, { title: string; estimatedSeconds: number; completeTitle: string; completeDescription: string; actionLabel: string }> = {
  model: {
    title: "正在创建您的3D空间",
    estimatedSeconds: 25,
    completeTitle: "您的3D空间已经准备好了",
    completeDescription: "现在您可以调整家具、移动门的位置，或者进入房间中自由漫游。",
    actionLabel: "查看我的3D空间",
  },
  layout: {
    title: "正在为您调整空间方案",
    estimatedSeconds: 24,
    completeTitle: "您的新方案已经准备好了",
    completeDescription: "我们已经按照您的需求完成空间调整，并检查了门窗和通行关系。",
    actionLabel: "查看调整方案",
  },
  "image-preview": {
    title: "正在生成AI图片预览",
    estimatedSeconds: 150,
    completeTitle: "图片预览已生成",
    completeDescription: "已生成供查看的图片预览；这不表示房间、墙体或门窗已完成结构修改。",
    actionLabel: "查看图片预览",
  },
  render: {
    title: "正在为您的空间进行装修设计",
    estimatedSeconds: 150,
    completeTitle: "装修效果已经生成",
    completeDescription: "您可以查看已保存视角对应的装修效果。",
    actionLabel: "查看装修效果",
  },
  bom: {
    title: "正在整理您的工程清单",
    estimatedSeconds: 10,
    completeTitle: "您的工程清单已经准备好了",
    completeDescription: "主要材料、构件和工程量已经整理完成。",
    actionLabel: "查看详细清单",
  },
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function simulatedProgress(kind: ProgressKind, elapsedSeconds: number, estimatedSeconds: number) {
  // 按预计时长匀速推进（不封顶 92%、不跳变），完成时再补到 100%
  const ratio = Math.min(1, elapsedSeconds / Math.max(1, estimatedSeconds));
  return Math.min(99, ratio * 100);
}

function customerErrorMessage(message: string) {
  if (!message) return "";
  message = message.replace(/^BEDROOM_(?:SCENE|SOURCE)_[A-Z_]+[：:]\s*/, "");
  if (/最多|请先|请返回|请明确|请说明|暂不支持|未支持|无法满足|不可行|原户型未改动|已保留|重新拍摄|等待超时|不能|已保存|找不到|超出|重叠|锁定|承重墙|无法保存|版本不一致/.test(message) && !/Pascal|Qwen|Blueprint|Node|Scene|Validation/i.test(message)) return message;
  return "这次操作暂时没有完成，请稍后重试。您的当前方案不会丢失。";
}
async function imageUrlToDataUrl(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
async function assertImageDecodes(url: string) {
  if (!url) throw new Error("生成结果没有图片地址");
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve() : reject(new Error("生成结果图片尺寸无效"));
    image.onerror = () => reject(new Error("生成结果图片无法解码"));
    image.src = url;
  });
}
async function hashDataUrl(value: string) {
  // Web Crypto is unavailable on plain HTTP LAN origins. Keep the SHA-256
  // path where available, but use a deterministic 256-bit-compatible
  // fallback so STEP 2 can still build a stable request identity.
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + i), 0x85ebca6b);
  }
  const words = Array.from({ length: 4 }, (_, index) => {
    h1 = Math.imul(h1 ^ (h2 >>> (index % 16)), 0x01000193);
    h2 = Math.imul(h2 ^ (h1 >>> ((index + 7) % 16)), 0xc2b2ae35);
    return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
  });
  return words.join("");
}

const cloneScene = (s: SceneGraph) =>
  JSON.parse(JSON.stringify(s)) as SceneGraph;

function syncWallEditToPascalStore(before: SceneGraph, after: SceneGraph) {
  const integrity = assertPascalSceneIntegrity(after);
  if (!integrity.valid) {
    throw new Error(`墙体修正后的 Pascal Scene 非法：${integrity.issues.join("；")}`);
  }
  const api = useScene.getState();
  const beforeIds = new Set(Object.keys(before.nodes));
  const afterIds = new Set(Object.keys(after.nodes));
  try {
    for (const id of afterIds) {
      if (beforeIds.has(id)) continue;
      const node = after.nodes[id];
      api.createNode(cloneScene({ nodes: { [id]: node }, rootNodeIds: [] }).nodes[id] as any, node.parentId as any);
    }
    for (const id of afterIds) {
      if (!beforeIds.has(id)) continue;
      const previous = before.nodes[id];
      const next = after.nodes[id];
      if (JSON.stringify(previous) === JSON.stringify(next)) continue;
      if (next.type === "wall") {
        api.updateNode(id as any, {
          start: cloneScene({ nodes: { [id]: next }, rootNodeIds: [] }).nodes[id].start,
          end: cloneScene({ nodes: { [id]: next }, rootNodeIds: [] }).nodes[id].end,
          children: [...(next.children || [])],
          thickness: next.thickness,
          height: next.height,
          metadata: { ...(next.metadata || {}) },
        } as any);
      } else if (next.type === "zone") {
        api.updateNode(id as any, {
          polygon: cloneScene({ nodes: { [id]: next }, rootNodeIds: [] }).nodes[id].polygon,
          metadata: { ...(next.metadata || {}) },
        } as any);
      } else if (next.type === "door" || next.type === "window") {
        api.updateNode(id as any, {
          parentId: next.parentId,
          wallId: next.wallId,
          hostWallId: next.hostWallId,
          position: next.position,
          rotation: next.rotation,
          offset: next.offset,
          metadata: { ...(next.metadata || {}) },
        } as any);
      }
    }
    const deleted = [...beforeIds].filter((id) => !afterIds.has(id));
    deleted.sort((a, b) => Number(before.nodes[a].type === "wall") - Number(before.nodes[b].type === "wall"));
    for (const id of deleted) api.deleteNode(id as any);
  } catch (incrementalError) {
    console.error("[WallEdit] Pascal incremental sync failed; applying a validated host snapshot", {
      error: incrementalError,
      createdNodes: [...afterIds].filter((id) => !beforeIds.has(id)).map((id) => after.nodes[id]),
    });
    applySceneSnapshot(cloneScene(after) as any, { origin: "host" });
  }
}

function polygonArea(polygon: any[] = []) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    area += Number(a?.[0] || 0) * Number(b?.[1] || 0) - Number(b?.[0] || 0) * Number(a?.[1] || 0);
  }
  return Math.abs(area) / 2;
}
function roomIdentities(scene: SceneGraph): RoomIdentity[] {
  return Object.values(scene.nodes)
    .filter((n) => n.type === "zone" && !/走廊|corridor/i.test(String(n.name || "")))
    .map((n) => ({
      roomId: n.id,
      roomName: String(n.name || n.id),
      area: polygonArea((n as any).polygon || []),
    }));
}
function roomLabel(room: RoomIdentity, rooms: RoomIdentity[]) {
  const sameName = rooms.filter((x) => x.roomName === room.roomName);
  if (sameName.length <= 1) return room.roomName;
  const index = sameName.findIndex((x) => x.roomId === room.roomId) + 1;
  return `${room.roomName} ${index}${room.area ? ` · ${room.area.toFixed(1)}㎡` : ""}`;
}
function captureRoomLabel(capture: CapturedView, rooms: RoomIdentity[]) {
  const room = capture.roomId ? rooms.find((x) => x.roomId === capture.roomId) : undefined;
  return room ? roomLabel(room, rooms) : capture.roomName || "视角";
}

function isValidCapturedImage(image: unknown): image is string {
  return typeof image === "string" && /^data:image\/(?:png|jpeg|jpg);base64,/i.test(image) && image.length >= 1000;
}
function makeDesign(scene: SceneGraph, label = "Touch Design"): DesignVersion {
  return {
    id: `touch-design-${Date.now()}`,
    version: 1,
    label,
    status: "draft",
    scenario: "replan",
    scene,
    furnitureOverrides: {},
    createdAt: new Date().toISOString(),
  };
}

export default function TouchCustomerPortal() {
  const [slide, setSlide] = useState<Slide>(0),
    [residence, setResidence] = useState<Residence>("one"),
    [scene, setScene] = useState<SceneGraph>(() =>
      createFloorplanScene("one", {
        residenceType: "one",
        variantId: "one-option-01",
        optionIndex: 1,
        imageUrl: RESIDENCES[0].image,
        imageHash: null,
      }),
    ),
    [sceneRevision, setSceneRevision] = useState(1);
const [modelExperience, setModelExperience] = useState<ModelExperience>("intro");
  const [modelGenerationPhase, setModelGenerationPhase] = useState<ModelGenerationPhase>("idle");
  const [modelMcpProgress, setModelMcpProgress] = useState(0);
  const [modelSourceNotice, setModelSourceNotice] = useState<{ source: "mcp" | "structure" | "fallback" | "verified-preset"; reason?: string } | null>(null);
  const [liveModelBusy, setLiveModelBusy] = useState(false);
  const [floorPlanConfirmed, setFloorPlanConfirmed] = useState(false);
  const [model3DLoaded, setModel3DLoaded] = useState(false);
  const [confirmedBinding, setConfirmedBinding] = useState<FloorplanModelBinding | null>(null);
  const [modelBinding, setModelBinding] = useState<FloorplanModelBinding | null>(null);
  const confirmedBindingRef = useRef<FloorplanModelBinding | null>(null);
  const modelBindingRef = useRef<FloorplanModelBinding | null>(null);
  const selectionEpoch = useRef<SelectionEpoch>({ sequence: 0, binding: null });
  const [structureBusy, setStructureBusy] = useState(false);
  const [structureVisualPreview, setStructureVisualPreview] = useState<string | null>(null);
  const [progressTask, setProgressTask] = useState<ProgressTask | null>(null);
  const [progressElapsed, setProgressElapsed] = useState(0);
  const [debugUi, setDebugUi] = useState(process.env.NEXT_PUBLIC_DEBUG_UI === "true");
  const [bomDetailsVisible, setBomDetailsVisible] = useState(false);
  const [basePascalScene, setBasePascalScene] = useState<SceneGraph>(() =>
    createFloorplanScene("one", {
      residenceType: "one",
      variantId: "one-option-01",
      optionIndex: 1,
      imageUrl: RESIDENCES[0].image,
      imageHash: null,
    }),
  );
  const [prompt, setPrompt] = useState(""),
    [selectedVariant, setSelectedVariant] = useState<SelectedVariant>({
      residenceType: "one",
      variantId: "one-option-01",
      optionIndex: 1,
      imageUrl: RESIDENCES[0].image,
      imageDataUrl: null,
      imageHash: null,
    }),
    [pickerResidence, setPickerResidence] = useState<Residence | null>(null),
    [layoutRun, setLayoutRun] = useState<AiLayoutRun | null>(null),
    [layoutBusy, setLayoutBusy] = useState(false),
    [variantImporting, setVariantImporting] = useState(false),
    [layoutProgress, setLayoutProgress] = useState("等待输入改造需求"),
    [error, setError] = useState("");
  const [sceneDiff, setSceneDiff] = useState<SceneDiff | null>(null);
  const [drawingPreviewDataUrl, setDrawingPreviewDataUrl] = useState("");
  const [svgSource, setSvgSource] = useState<string>("");
  const [floorplanSpec, setFloorplanSpec] = useState<any>(null);
  const [capturedViews, setCapturedViews] = useState<CapturedView[]>([]);
  // 首张渲染后锁定风格：从第二张起只允许同一种风格
  const lockedStyleId = capturedViews.find((v) => v.renderedImage?.styleId)?.renderedImage?.styleId || "";
  const [captureToast, setCaptureToast] = useState("");
  const captureToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState("modern");
  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [activeCaptureId, setActiveCaptureId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [doorEditMode, setDoorEditMode] = useState(false);
  const [selectedDoorId, setSelectedDoorId] = useState("");
  const [wallEditMode, setWallEditMode] = useState(false);
  const [selectedWallIds, setSelectedWallIds] = useState<string[]>([]);
  const [wallAddMode, setWallAddMode] = useState(false);
  const [wallUndoStack, setWallUndoStack] = useState<WallEditTransaction[]>([]);
  const [wallRedoStack, setWallRedoStack] = useState<WallEditTransaction[]>([]);
  const [wallDeletePrompt, setWallDeletePrompt] = useState<{ wallId: string; openingCount: number } | null>(null);
  const [pascalViewMode, setPascalViewMode] = useState<"3d" | "top" | "overlay">("3d");
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [blueprintCalibration, setBlueprintCalibration] = useState<BlueprintCalibration | null>(null);
  const [blueprintSource, setBlueprintSource] = useState<"saved" | "golden" | "base">("base");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [furniturePresetStatus, setFurniturePresetStatus] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [doorPlacementMode, setDoorPlacementMode] = useState(false);
  const variantRequestId = useRef(0);
  const floorplanRequestId = useRef(0);
  const floorplanError = useRef<string | null>(null);
  const layoutRequestId = useRef(0);
  const adjustmentInFlight = useRef(false);
  const floorplanAbortController = useRef<AbortController | null>(null);
  const renderAbortController = useRef<AbortController | null>(null);
  const requestControllers = useRef(new Set<AbortController>());
  const objectUrls = useRef(new Set<string>());
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const blueprintDirty = useRef(false);
  const blueprintSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelGenerationAbortController = useRef<AbortController | null>(null);
  const sceneForPersistence = useRef(scene);
  sceneForPersistence.current = scene;
  const committedSceneRef = useRef<SceneGraph>(cloneScene(scene));
  const calibrationForPersistence = useRef(blueprintCalibration);
  calibrationForPersistence.current = blueprintCalibration;
  useEffect(() => {
    if (!blueprintDirty.current && modelGenerationPhase === "completed") committedSceneRef.current = cloneScene(scene);
  }, [scene, selectedVariant.variantId, modelGenerationPhase]);
  const [status, setStatus] = useState<ApiStatus | null>(null),
    [floorplan, setFloorplan] = useState<FloorplanSelection | null>(null),
    [aiFloorplan, setAiFloorplan] = useState<AiFloorplanResult | null>(null),
    [floorplanBusy, setFloorplanBusy] = useState(false);
  const [originalSelectionBusy, setOriginalSelectionBusy] = useState(false);
  const originalSelectionInFlight = useRef(false);
  const [floorplanAnalysis, setFloorplanAnalysis] = useState<FloorplanAnalysis | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [clarificationDraft, setClarificationDraft] = useState("");
  const [clarificationNote, setClarificationNote] = useState("");
  const [clarificationResolution, setClarificationResolution] = useState("");
  const [expandedSuggestionIds, setExpandedSuggestionIds] = useState<string[]>([]);
  const clarificationRef = useRef<HTMLDivElement | null>(null);
  const promptEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [floorplanVersions, setFloorplanVersions] = useState<FloorplanVersion[]>([]);
  const [editSourceVersionId, setEditSourceVersionId] = useState<string | null>(null);
  const [selectedFloorplanVersionId, setSelectedFloorplanVersionId] = useState<string | null>(null);
  const selectedFloorplanVersionIdRef = useRef(selectedFloorplanVersionId);
  selectedFloorplanVersionIdRef.current = selectedFloorplanVersionId;
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion | null>(null);
  const [assetSaveError, setAssetSaveError] = useState("");
  const regionStart = useRef<{ x: number; y: number } | null>(null);
  const [overall, setOverall] = useState<GeneratedImage | null>(null),
    [roomImages, setRoomImages] = useState<RoomImage[]>([]),
    [renderBusy, setRenderBusy] = useState(false),
    [activeRenderRoomId, setActiveRenderRoomId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<"slider" | "side-by-side">("slider");
  const [renderLightbox, setRenderLightbox] = useState<{ url: string; title: string; beforeUrl?: string } | null>(null);
  const [renderScale, setRenderScale] = useState(1);
  const [bom, setBom] = useState<DetailedBomDocument | null>(null),
    [bomBusy, setBomBusy] = useState(false),
    [submitMsg, setSubmitMsg] = useState("");
  const [budget, setBudget] = useState<ResidentialBudget | null>(null);
  const [budgetSettings, setBudgetSettings] = useState<ResidentialBudgetSettings>(() => defaultResidentialBudgetSettings());
  const [budgetView, setBudgetView] = useState<"工种" | "房间" | "家具家电" | "汇总">("汇总");
  const [sessionId, setSessionId] = useState("");
  const sessionIdRef = useRef("");
  const sessionDisposed = useRef(false);
  const idleTimer = useRef<number | null>(null);
  const idleCountdownTimer = useRef<number | null>(null);
  const idleWarningActive = useRef(false);
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  sessionIdRef.current = sessionId;
  useEffect(() => {
    if (!sessionId || !isSessionCurrent(sessionId)) return;
    try {
      const raw = localStorage.getItem(sessionStorageKey(sessionId, `budget:${selectedVariant.variantId}:${sceneRevision}`));
      if (raw) {
        const record = JSON.parse(raw);
        if (!sameModelBinding(record.modelBinding, modelBinding) || !sameModelBinding(modelBinding, confirmedBinding)) return;
        const restored = record.budget as ResidentialBudget;
        setBudget(restored);
        setBudgetSettings(restored.settings);
      }
    } catch (error) {
      console.warn("[住宅预算] 本地保存读取失败", { type: error instanceof Error ? error.name : "unknown" });
    }
  }, [sessionId, selectedVariant.variantId, sceneRevision, modelBinding, confirmedBinding]);

  useEffect(() => {
    const bootId = `boot-${Date.now().toString(36)}`;
    console.info("[DreamHouse][STEP2] mounted", { bootId, projectId: sessionId, floorPlanId: selectedVariant.variantId, sourceRevision: sceneRevision });
    return () => console.info("[DreamHouse][STEP2] unmounted", { bootId, projectId: sessionId, floorPlanId: selectedVariant.variantId, sourceRevision: sceneRevision });
    // This is a lifecycle diagnostic; identity changes are logged by request-specific code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelModelGenerationTimers() {
    modelGenerationAbortController.current?.abort();
    modelGenerationAbortController.current = null;
  }

  function invalidateConfirmedSelection(nextBinding: FloorplanModelBinding | null = null) {
    setStructureVisualPreview(null);
    selectionEpoch.current = advanceSelectionEpoch(selectionEpoch.current, nextBinding);
    confirmedBindingRef.current = null;
    setConfirmedBinding(null);
    cancelModelGenerationTimers();
    floorplanRequestId.current += 1;
    floorplanAbortController.current?.abort();
    floorplanAbortController.current = null;
    for (const controller of requestControllers.current) controller.abort();
    requestControllers.current.clear();
    adjustmentInFlight.current = false;
    setFloorplanBusy(false);
    setRenderBusy(false);
    setBomBusy(false);
    setFloorPlanConfirmed(false);
    setModelGenerationPhase("idle");
    setModel3DLoaded(false);
    setModelExperience("intro");
    setModelSourceNotice(null);
    setProgressTask(null);
    setCapturedViews([]);
    setActiveCaptureId(null);
    setOverall(null);
    setRoomImages([]);
    setBom(null);
    setBudget(null);
  }

  function changeModificationDraft(text: string) {
    // A draft is not a committed geometry version. Keep the current scene,
    // captures and binding until a complete replacement has passed validation.
    if (text !== prompt) {
      floorplanRequestId.current += 1;
      floorplanAbortController.current?.abort();
      floorplanAbortController.current = null;
      adjustmentInFlight.current = false;
      setFloorplanBusy(false);
      setProgressTask((current) => current?.kind === "image-preview" ? null : current);
      setError("");
    }
    setPrompt(text);
  }

  function createSessionRequest() {
    const controller = new AbortController();
    requestControllers.current.add(controller);
    return controller;
  }

  function releaseSessionRequest(controller: AbortController) {
    requestControllers.current.delete(controller);
  }

  function openRenderLightbox(url: string, title = "装修效果", beforeUrl?: string) {
    if (!url) return;
    setRenderScale(1);
    setRenderLightbox({ url, title, beforeUrl });
  }

  function closeRenderLightbox() {
    setRenderLightbox(null);
    setRenderScale(1);
  }

  useEffect(() => {
    if (!renderLightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRenderLightbox();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [renderLightbox]);

  function isSessionCurrent(expectedSessionId: string) {
    return !sessionDisposed.current && Boolean(expectedSessionId) && getActiveSessionId() === expectedSessionId;
  }

  function stopSessionResources() {
    sessionDisposed.current = true;
    selectionEpoch.current = advanceSelectionEpoch(selectionEpoch.current, null);
    floorplanAbortController.current?.abort();
    floorplanAbortController.current = null;
    for (const controller of requestControllers.current) controller.abort();
    requestControllers.current.clear();
    variantRequestId.current += 1;
    floorplanRequestId.current += 1;
    layoutRequestId.current += 1;
    adjustmentInFlight.current = false;
    cancelModelGenerationTimers();
    if (captureToastTimer.current) clearTimeout(captureToastTimer.current);
    if (blueprintSaveTimer.current) clearTimeout(blueprintSaveTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
    captureToastTimer.current = null;
    blueprintSaveTimer.current = null;
    idleTimer.current = null;
    idleCountdownTimer.current = null;
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
  }

  async function resetSession() {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      window.location.replace("/");
      return;
    }
    stopSessionResources();
    clearSessionStorage(currentSessionId);
    try { await clearFloorplanAssets(`${currentSessionId}:`); } catch { /* navigation must not be blocked by IndexedDB */ }
    window.location.replace("/");
  }

  function confirmResetSession() {
    if (!window.confirm("重新开始后，本次户型修改、3D调整、装修效果和预算结果将被清空。")) return;
    void resetSession();
  }
  // The textarea remains the only source of truth sent to image editing.
  const modificationRequest = useMemo(() => prompt.trim(), [prompt]);
  const currentFloorplanContext = useRef({
    variantId: selectedVariant.variantId,
    imageHash: selectedVariant.imageHash,
    prompt: modificationRequest,
  });
  currentFloorplanContext.current = {
    variantId: selectedVariant.variantId,
    imageHash: selectedVariant.imageHash,
    prompt: modificationRequest,
  };
  const selectedImageVersion = floorplanVersions.find((version) => version.id === selectedFloorplanVersionId);
  const floorplanMatchesSelection = originalFloorplanMatches(floorplan, selectedVariant, floorplan?.userPrompt || "") || Boolean(
    aiFloorplan &&
    floorplan &&
    aiFloorplan.sourceVariantId === selectedVariant.variantId &&
    aiFloorplan.sourceImageHash === selectedVariant.imageHash &&
    aiFloorplan.prompt === floorplan.userPrompt && aiFloorplan.url === canonicalFloorplanSource(floorplan, aiFloorplan, selectedVariant.variantId, selectedImageVersion),
  );
  const currentFloorplan = floorplanMatchesSelection ? floorplan : null;
  const modifiedFloorPlan = currentFloorplan;
  const currentBinding = floorplanModelBinding(selectedVariant.variantId, currentFloorplan, selectedFloorplanVersionId, aiFloorplan, selectedImageVersion);
  // Live identity refs also reject responses between a selection event and
  // React committing the corresponding state update.
  if ((selectionEpoch.current.binding || currentBinding) && !sameModelBinding(selectionEpoch.current.binding, currentBinding)) {
    selectionEpoch.current = advanceSelectionEpoch(selectionEpoch.current, currentBinding);
  }
  const modelMatchesSelection = canUseBoundModel({ confirmed: floorPlanConfirmed, phase: modelGenerationPhase, loaded: model3DLoaded, experience: modelExperience, selection: currentBinding, confirmedBinding, modelBinding });
  useEffect(() => {
    if (sessionHydrated && floorPlanConfirmed && !sameModelBinding(currentBinding, confirmedBinding)) invalidateConfirmedSelection(currentBinding);
  }, [sessionHydrated, currentBinding?.variantId, currentBinding?.versionId, currentBinding?.canonicalImageUrl, floorPlanConfirmed, confirmedBinding]);
  // Analysis is optional advisory UI and never blocks direct image editing.
  const hasPendingClarification = false;
  const designSession: DesignSession = useMemo(
    () => ({
      id: sessionId,
      selectedVariant,
      requirement: modificationRequest,
      aiFloorplan,
      basePascalScene,
      currentPascalScene: scene,
      pascalOperations: layoutRun?.operations || [],
      renders: capturedViews.flatMap((view) => view.renderedImage ? [{
        id: view.id,
        sourceSceneRevision: view.sceneRevision,
        roomId: view.roomId,
        roomName: view.roomName,
        url: view.renderedImage.url,
        provider: view.renderedImage.provider,
        model: view.renderedImage.model,
      }] : []),
      generatedInteriorImages: capturedViews.flatMap((view) => view.renderedImage ? [{
        id: `${view.id}-${view.renderedImage.styleId || selectedStyleId}`,
        sourceCaptureId: view.renderedImage.sourceCaptureId || view.id,
        sourceImage: view.renderedImage.sourceImage || view.image || view.screenshotDataUrl,
        camera: view.renderedImage.camera || view.camera,
        styleId: view.renderedImage.styleId || view.styleId || selectedStyleId,
        styleName: view.renderedImage.styleName || view.styleName || "现代简约",
        prompt: view.stylePrompt || buildInteriorPrompt(view.renderedImage.styleId || view.styleId || selectedStyleId),
        renderedImage: view.renderedImage.url,
        createdAt: view.renderedImage.createdAt || new Date().toISOString(),
      } as InteriorDesignResult] : []),
      pascalScene: scene,
      sceneRevision,
      floorplanSpec,
      aiLayoutResult: layoutRun,
      generatedFloorplan: currentFloorplan,
      generatedFloorplanImage: currentFloorplan?.url || null,
      capturedViews,
      bom,
      bomResult: bom,
      sceneVersion: scene.nodes.building_house?.metadata?.floorplanVersion,
      status: bom ? "bom-ready" : layoutRun ? "editing" : "pascal-ready",
      layoutOperations: layoutRun?.operations || [],
      styleBible: {
        styleName: "现代原木",
        wallMaterial: "暖白",
        floorMaterial: "浅橡木",
        primaryWood: "浅橡木",
        palette: ["暖白", "浅橡木", "浅灰"],
        furnitureStyle: "现代简约",
        lighting: "自然暖光",
      },
    }),
    [
      sessionId,
      selectedVariant,
      modificationRequest,
      aiFloorplan,
      basePascalScene,
      scene,
      sceneRevision,
      floorplanSpec,
      layoutRun,
      currentFloorplan,
      capturedViews,
      selectedStyleId,
      bom,
    ],
  );

  const config = useMemo(
    () => ({
      ...RESIDENCES.find((x) => x.key === residence)!,
      image:
        selectedVariant.residenceType === residence
          ? selectedVariant.imageUrl
          : RESIDENCES.find((x) => x.key === residence)!.image,
    }),
    [residence, selectedVariant],
  );
  const rooms = useMemo(() => roomIdentities(scene), [scene]);
  const baseline = useMemo(
    () => validateBaselineFloorplan(scene, residence),
    [scene, residence],
  );
  const blueprintValidation = useMemo(() => {
    try {
      const blueprint = sceneToFloorplanBlueprint(scene);
      const result = validateVariantBlueprint(blueprint);
      return {
        ...result,
        compileCoordinateErrorM: blueprintWallCoordinateError(scene, blueprint),
      };
    } catch (error: any) {
      return {
        valid: false,
        issues: [error?.message || "当前 Scene 缺少 FloorplanBlueprint"],
        metrics: null,
        compileCoordinateErrorM: Number.POSITIVE_INFINITY,
      };
    }
  }, [scene]);
  const calibrationValidation = useMemo(() => {
    if (!blueprintCalibration) return null;
    try {
      return validateVariantCalibration(sceneToFloorplanBlueprint(scene), blueprintCalibration);
    } catch {
      return null;
    }
  }, [scene, blueprintCalibration]);
  const selectedWall = useMemo(
    () => selectedWallIds.length === 1 ? describeWall(scene, selectedWallIds[0]) : null,
    [scene, selectedWallIds],
  );
  // Keep the last successful image visible while a new draft is being edited.
  // Confirmation still uses the strict currentFloorplan match above.
  const visibleFloorplan = floorplan;
  const editSourceVersionIdRef = useRef(editSourceVersionId);
  editSourceVersionIdRef.current = editSourceVersionId;
  const editSourceVersion = editSourceVersionId ? floorplanVersions.find((version) => version.id === editSourceVersionId) : undefined;
  const selectedModifiedFloorplan = floorplanVersions.find((version) => version.id === selectedFloorplanVersionId)?.result || currentFloorplan;
  useEffect(() => {
    if (pascalViewMode === "overlay" && !selectedModifiedFloorplan?.url) setPascalViewMode("3d");
  }, [pascalViewMode, selectedModifiedFloorplan?.url]);
  const renderView: any = activeCaptureId
    ? (() => {
        const v = capturedViews.find((x) => x.id === activeCaptureId);
        return (
          v?.renderedImage ||
          (v
            ? {
                url: v.image || v.screenshotDataUrl,
                provider: "pascal",
                model: "Pascal Canvas",
                ephemeral: false,
                fallback: false,
              }
            : null)
        );
      })()
    : activeRenderRoomId === null
      ? overall
      : roomImages.find((x) => x.roomId === activeRenderRoomId)?.image || overall;
  const selectedCaptureForRender = activeCaptureId
    ? capturedViews.find((view) => view.id === activeCaptureId) || null
    : null;
  const selectedCaptureImage = selectedCaptureForRender?.image || selectedCaptureForRender?.screenshotDataUrl || "";
  const hasValidSelectedCaptureImage = isValidCapturedImage(selectedCaptureImage);
  const selectedCaptureIsCurrent = Boolean(selectedCaptureForRender &&
    selectedCaptureForRender.sceneRevision === sceneRevision &&
    sameModelBinding((selectedCaptureForRender as any).modelBinding, modelBinding));

  const svgEditProgress = Boolean(svgSource && progressTask?.kind === "image-preview");
  const progressMeta = progressTask ? svgEditProgress ? { title:"正在改造户型", estimatedSeconds:10, completeTitle:"方案已校验", completeDescription:"二维结构、门连接及平面通行检查已通过。确认后，Step3 将单独调用 AI 生成三维并检查家具碰撞。", actionLabel:"查看方案" } : PROGRESS_META[progressTask.kind] : null;
  const progressPresentationReady = Boolean(progressTask?.ready && progressMeta && (
    ["image-preview", "model"].includes(progressTask.kind) || progressElapsed >= Math.ceil((progressTask.totalDurationMs || progressMeta.estimatedSeconds * 1000) / 1000)
  ));
  const progressValue = progressTask && progressMeta
    ? progressPresentationReady
      ? 100
      : simulatedProgress(progressTask.kind, progressElapsed, progressTask.totalDurationMs ? progressTask.totalDurationMs / 1000 : progressMeta.estimatedSeconds)
    : 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryDebug = new URLSearchParams(window.location.search).get("debug") === "1";
    if (queryDebug) setDebugUi(true);
  }, []);

  useEffect(() => {
    if (!progressTask) {
      setProgressElapsed(0);
      return;
    }
    const update = () => setProgressElapsed(Math.max(0, Math.floor((Date.now() - progressTask.startedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [progressTask?.id]);

  function beginProgressTask(kind: ProgressKind, totalDurationMs?: number) {
    // 最短等待时长：step2 4-7s 随机、step3 9-13s 随机、step4 15s、step5 20s
    const minimumWait: Partial<Record<ProgressKind, number>> = {
      "image-preview": 4000 + Math.round(Math.random() * 3000),
      model: 8000,
      render: 15000,
      bom: 18000,
    };
    const effectiveDuration = totalDurationMs ?? minimumWait[kind];
    const id = `${kind}-${Date.now()}`;
    setProgressElapsed(0);
    setProgressTask({ id, kind, startedAt: Date.now(), ready: false, totalDurationMs: effectiveDuration });
    return id;
  }

  function completeProgressTask(id: string, taskError?: string) {
    setProgressTask((current) => current?.id === id
      ? { ...current, ready: !taskError, error: taskError }
      : current);
  }

  function closeProgressTask() {
    if (progressTask?.kind === "model") {
      // A failed live attempt may have restored a previously committed scene.
      // Closing its error dialog must preserve that scene's validated state.
      const usable = canUseBoundModel({ confirmed: floorPlanConfirmed, phase: modelGenerationPhase,
        loaded: model3DLoaded, experience: modelExperience, selection: selectionEpoch.current.binding,
        confirmedBinding: confirmedBindingRef.current, modelBinding: modelBindingRef.current });
      if (!usable) {
        setModelGenerationPhase("error");
        setModelExperience("intro");
      } else {
        setModelGenerationPhase("completed");
        setModelExperience("viewer");
      }
    }
    if (progressTask?.kind === "bom" && !progressTask.error) setBomDetailsVisible(true);
    setProgressTask(null);
  }

  function applyGeneratedScene(nextScene: SceneGraph, asBase = false, alreadyApplied = false) {
    const snapshot = cloneScene(nextScene);
    if (!alreadyApplied) applySceneSnapshot(snapshot as any, { origin: "host" });
    setScene(snapshot);
    setSceneRevision((value) => value + 1);
    setModel3DLoaded(asBase);
    if (asBase) setModelExperience("viewer");
    if (asBase) {
      setBasePascalScene(cloneScene(snapshot));
      committedSceneRef.current = cloneScene(snapshot);
      blueprintDirty.current = false;
      setHasUnsavedChanges(false);
      try {
        const generatedBlueprint = sceneToFloorplanBlueprint(snapshot);
        setFloorplanSpec(blueprintToFloorplanSpec(generatedBlueprint));
        setBlueprintCalibration(createDefaultCalibration(selectedVariant.variantId, generatedBlueprint, true));
        setBlueprintSource("base");
      } catch (conversionError) {
        console.warn("[DreamHouse][model3d] generated scene could not be converted to an editable blueprint", conversionError);
      }
    }
  }

  async function startModelGeneration(reconstructionMode: "auto" | "ai-live" = "auto") {
    if (!modifiedFloorPlan?.url || !floorPlanConfirmed || !sameModelBinding(currentBinding, confirmedBindingRef.current) || modelGenerationPhase === "generating" || modelGenerationAbortController.current) return;
    const requestSessionId = sessionId;
    const job = { ...selectionEpoch.current };
    const jobBinding = job.binding!;
    const isCurrent = () => isSessionCurrent(requestSessionId) && selectionJobCurrent(job, selectionEpoch.current) && sameModelBinding(jobBinding, confirmedBindingRef.current);
    const previous = reconstructionMode === "ai-live" || Boolean(selectedSvgSource(floorplanVersions, selectedFloorplanVersionId, selectedVariant.variantId, svgSource)) ? {
      scene: cloneScene(scene), base: cloneScene(basePascalScene), revision: sceneRevision,
      loaded: model3DLoaded && modelMatchesSelection, binding: modelBindingRef.current, notice: modelSourceNotice,
      calibration: blueprintCalibration, spec: floorplanSpec,
    } : null;
    setError("");
    cancelModelGenerationTimers();
    setModelExperience("generating");
    setLiveModelBusy(reconstructionMode === "ai-live");
    setModelGenerationPhase("generating");
    setModel3DLoaded(false);
    setModelMcpProgress(2);
    setLayoutProgress(svgSource ? "正在调用 AI 规划当前 SVG 的三维建模" : reconstructionMode === "ai-live" ? "正在现场调用 Qwen 识别原图，跳过目录模型" : "正在核对您确认的户型图");
    setModelSourceNotice(null);
    const taskId = beginProgressTask("model", undefined);
    const controller = new AbortController();
    modelGenerationAbortController.current = controller;
    const deadline = window.setTimeout(() => controller.abort(new Error("3D生成超过等待时间，请重试")), 900_000);
    let terminalResult = false;
    let confirmedImageHash = "unavailable";
    const sourceDrawing = canonicalFloorplanSource(modifiedFloorPlan, aiFloorplan, selectedVariant.variantId, floorplanVersions.find((version) => version.id === selectedFloorplanVersionId));
    try {
      const selectedVersion = floorplanVersions.find(version => version.id === jobBinding.versionId);
      const selectedSvg = selectedSvgSource(floorplanVersions, selectedFloorplanVersionId, selectedVariant.variantId, svgSource);
      const sourceImageDataUrl = selectedSvg
        ? svgDataUrl(selectedSvg)
        : modifiedFloorPlan.url.startsWith("data:image/")
          ? modifiedFloorPlan.url
          : await imageUrlToDataUrl(modifiedFloorPlan.url, controller.signal);
      // Step2's sourceImageHash identifies its input, not the confirmed output.
      const sourceImageHash = await hashDataUrl(sourceImageDataUrl);
      if (!isCurrent()) return;
      confirmedImageHash = sourceImageHash;
      const mcpSessionId = `${sessionId || "local"}-model3d-${Date.now().toString(36)}`;
      const response = await fetch("/api/ai/model3d/stream", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: mcpSessionId,
          sourceImageHash,
          sourceImage: sourceDrawing,
          sourceImageDataUrl,
          fallbackScene: scene,
          reconstructionMode,
        }),
      });
      const toolProgress: Record<string, number> = {
        begin_floorplan_scene: 8,
        set_floor_structure: 35,
        set_openings: 55,
        populate_basic_furniture: 72,
        validate_scene: 88,
        commit_scene: 100,
      };
      const toolMessages: Record<string, string> = { begin_floorplan_scene: "正在准备三维场景", set_floor_structure: "正在构建墙体和房间", set_openings: "正在安装门窗", populate_basic_furniture: "正在配置基础家具", validate_scene: "正在检查三维空间完整性", commit_scene: "正在保存您的三维空间" };
      await consumeModel3dSse(response, (eventType, event) => {
        if (!isCurrent()) return;
        if (eventType === "progress") {
          setLayoutProgress(String(event.message || "正在识别户型结构"));
        } else if (eventType === "tool") {
          setModelMcpProgress(toolProgress[String(event.name)] || 5);
          setLayoutProgress(toolMessages[String(event.name)] || "正在处理三维空间");
        } else if (eventType === "scene" && event.scene) {
          if (!selectedSvg) applyGeneratedScene(event.scene as SceneGraph);
        } else if (eventType === "validation") {
          setModelMcpProgress(88);
          setLayoutProgress(event.validation?.valid ? "Pascal 场景校验通过" : "正在修正 Pascal 场景校验问题");
        } else if (eventType === "complete" && event.result?.scene) {
          const svgResult = Boolean(selectedSvg && acceptsSvgScene(event.result, sourceImageHash));
          if (selectedSvg && !svgResult) throw new Error("三维场景与当前确认版本不一致，结果未接受");
          if (reconstructionMode === "ai-live" && !svgResult && event.result.scene.nodes?.building_house?.metadata?.floorplanSource !== "mcp-qwen38-vulkan")
            throw new Error("现场建模没有返回真实 Qwen/Pascal 场景，结果未接受");
          if (selectedSvg && (event.result.scene.nodes?.building_house?.metadata?.svgModelPlan?.provenance?.actualInference !== true || event.result.scene.nodes.building_house.metadata.svgModelPlan.provenance.sourceImageHash !== sourceImageHash))
            throw new Error("三维结果缺少当前 SVG 的真实 AI 建模记录，结果未接受");
          const completedScene = validateEditedScene(event.result.scene as SceneGraph, selectedVersion?.editContext);
          terminalResult = true;
          Object.assign(completedScene.nodes.building_house.metadata ||= {}, { modelBinding: jobBinding, variantId: jobBinding.variantId, sourceDrawing: jobBinding.canonicalImageUrl });
          modelBindingRef.current = jobBinding;
          setModelBinding(jobBinding);
          applyGeneratedScene(completedScene, true);
          if (selectedVersion) setFloorplanVersions(current => current.map(version => version.id === selectedVersion.id ? {...version, sceneSnapshot:cloneScene(completedScene),validationStatus:"ready"} : version));
          setModelMcpProgress(100);
          const verifiedPreset = event.result.source === "verified-preset";
          if (reconstructionMode === "ai-live" && verifiedPreset) throw new Error("现场建模返回了目录模型，结果未接受");
          setModelSourceNotice({ source: verifiedPreset ? "verified-preset" : "mcp" });
          setModelGenerationPhase("completed");
          setLayoutProgress(svgResult ? "已从当前方案创建可编辑的3D户型" : verifiedPreset ? "已核对内置户型图，载入对应的可编辑3D模型" : "Qwen3.8 已通过 Pascal MCP 创建可编辑的3D户型");
          setCapturedViews([]); setActiveCaptureId(null); setOverall(null);
          setRoomImages([]); setBom(null); setBudget(null);
          completeProgressTask(taskId);
        } else if (eventType === "fallback" && event.scene) {
          if (selectedSvg) throw new Error("当前 SVG 的三维建模失败，未接受替代场景");
          terminalResult = true;
          applyGeneratedScene(event.scene as SceneGraph);
          setModelSourceNotice({ source: "fallback", reason: String(event.reason || "本地3D生成未通过校验") });
          setModelGenerationPhase("error");
          setModelExperience("intro");
          setLayoutProgress("生成失败，当前显示预制模型预览，可重新创建");
          completeProgressTask(taskId, String(event.reason || "本地3D生成未通过校验"));
        } else if (eventType === "error") {
          throw new Error(String(event.message || "3D生成服务返回错误"));
        }
      }, { signal: controller.signal });
      if (isCurrent() && !terminalResult) throw new Error("3D生成服务没有返回完整场景，请重试");
    } catch (generationError: any) {
      if (!isCurrent()) return;
      const reason = generationError?.message || String(generationError);
      setFloorplanVersions(current => current.map(version => version.id === jobBinding.versionId ? {...version, validationStatus:"failed"} : version));
      console.error("[DreamHouse][model3d] streaming generation failed", generationError);
      if (previous) {
        applyGeneratedScene(previous.scene, true);
        setBasePascalScene(previous.base);
        setSceneRevision(previous.revision);
        setBlueprintCalibration(previous.calibration);
        setFloorplanSpec(previous.spec);
        modelBindingRef.current = previous.binding;
        setModelBinding(previous.binding);
        setModelSourceNotice(previous.notice);
        setModel3DLoaded(previous.loaded);
        setModelGenerationPhase(previous.loaded ? "completed" : "error");
        setModelExperience(previous.loaded ? "viewer" : "intro");
        setError(`Qwen现场重建失败，已恢复之前的场景：${reason}`);
        setLayoutProgress("现场重建失败，已恢复之前的场景");
        completeProgressTask(taskId, debugUi ? reason : "现场建模未通过检查，已恢复之前的场景。请对照原图调整需求后重试。");
        return;
      }
      const fallback = cloneScene(scene);
      Object.assign((fallback.nodes.building_house.metadata ||= {}), {
        floorplanSource: "fallback-prebuilt",
        sourceImageHash: confirmedImageHash,
        sourceDrawing,
        fallbackReason: reason,
        model: "prebuilt-pascal-v2",
        scaleEstimated: false,
        generatedAt: new Date().toISOString(),
      });
      applyGeneratedScene(fallback);
      setModelSourceNotice({ source: "fallback", reason });
      setModelGenerationPhase("error");
      setModelExperience("intro");
      setLayoutProgress("生成失败，当前显示预制模型预览，可重新创建");
      completeProgressTask(taskId, reason);
    } finally {
      window.clearTimeout(deadline);
      if (modelGenerationAbortController.current === controller) { modelGenerationAbortController.current = null; setLiveModelBusy(false); }
    }
  }

  useEffect(() => {
    if (slide !== 2 || !floorPlanConfirmed || modelExperience !== "intro" || modelGenerationPhase !== "idle" || progressTask) return;
    void startModelGeneration();
  }, [slide, floorPlanConfirmed, modelExperience, progressTask]);

  useEffect(() => () => {
    cancelModelGenerationTimers();
  }, []);

  async function captureView(capture: import("@/lib/types").PascalViewCapture) {
    if (!modelMatchesSelection) { setError("请先完成当前户型的3D空间创建"); return; }
    if (capture.sceneRevision !== sceneRevision || capture.sessionId !== sessionId) {
      setError("场景已更新，请重新拍摄当前3D视角"); return;
    }
    if (blueprintDirty.current && !saveCurrentVariantDesign(scene, "当前户型调整及拍摄视角已保存")) return;
    if (capturedViews.length >= 5) {
      setError("最多可以保存 5 个空间视角");
      return;
    }
    const image = capture.image || capture.screenshotDataUrl;
    if (!/^data:image\/(?:png|jpeg|jpg);base64,/i.test(image || "") || image.length < 1000) {
      setError("拍摄失败，请重新拍摄当前3D视角");
      console.warn("[3D CAPTURE] capture rejected before persistence", { length: image?.length || 0 });
      return;
    }
    const roomId = capture.roomId || activeRenderRoomId || rooms[0]?.roomId;
    const room = roomId ? rooms.find((x) => x.roomId === roomId) : undefined;
    const roomName = room?.roomName || capture.roomName || "视角";
    const view: CapturedView = {
      ...capture,
      image,
      screenshotDataUrl: image,
      roomId,
      roomName,
      roomType: capture.roomType || inferRoomType(roomName),
      sceneVersion: scene.nodes.building_house?.metadata?.floorplanVersion,
      stylePrompt: buildInteriorPrompt(selectedStyleId),
      status: "captured",
    };
    Object.assign(view, { modelBinding: confirmedBinding });
    setCapturedViews((current) => [...current, view]);
    setActiveCaptureId(view.id);
    setError("");
    if (captureToastTimer.current) clearTimeout(captureToastTimer.current);
    setCaptureToast(`✓ 已保存当前视角 ${capturedViews.length + 1} / 5`);
    captureToastTimer.current = setTimeout(() => setCaptureToast(""), 1400);
    setLayoutProgress(`已保存视角 ${capturedViews.length + 1} / 5`);
  }
  function saveCurrentVariantDesign(nextScene = scene, message = "已保存当前方案") {
    try {
      if (!modelMatchesSelection || !currentBinding) throw new Error("请先完成当前户型的3D空间创建");
      const integrity = assertPascalSceneIntegrity(nextScene);
      if (!integrity.valid) throw new Error(`当前调整无法保存：${integrity.issues.join("；")}`);
      const blueprint = sceneToBoundVariantBlueprint(nextScene, currentBinding);
      const calibration = calibrationForPersistence.current || createDefaultCalibration(selectedVariant.variantId, blueprint);
      saveVariantDesign(selectedVariant.variantId, blueprint, calibration, undefined, sessionId);
      setBlueprintCalibration(calibration);
      setBlueprintSource("saved");
      setFloorplanSpec(blueprintToFloorplanSpec(blueprint));
      blueprintDirty.current = false;
      committedSceneRef.current = cloneScene(nextScene);
      setFloorplanVersions((current) => current.map((version) =>
        sameModelBinding(floorplanModelBinding(version.sourceVariantId, version.result, version.id), currentBinding)
          ? { ...version, sceneSnapshot: cloneScene(nextScene) } : version));
      setHasUnsavedChanges(false);
      setFurniturePresetStatus(message);
      setError("");
      return true;
    } catch (e: any) {
      setError(e?.message || "当前方案保存失败");
      return false;
    }
  }
  function markBlueprintDirty() {
    blueprintDirty.current = true;
    setHasUnsavedChanges(true);
  }
  function updateBlueprintCalibration(patch: Partial<BlueprintCalibration>) {
    setBlueprintCalibration((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      calibrationForPersistence.current = next;
      return next;
    });
    markBlueprintDirty();
  }
  function restoreVariantBlueprint(kind: "golden" | "base") {
    const label = kind === "golden" ? "Golden 预制方案" : "最初 Base 户型";
    if (typeof window !== "undefined" && !window.confirm(`恢复${label}？当前 Saved User Blueprint 将被删除。`)) return;
    invalidateConfirmedSelection();
    try {
      if (blueprintSaveTimer.current) clearTimeout(blueprintSaveTimer.current);
      blueprintSaveTimer.current = null;
      clearSavedVariantDesign(selectedVariant.variantId, undefined, sessionId);
      const loaded = loadVariantBlueprintState(selectedVariant.variantId, undefined, sessionId);
      const golden = getGoldenVariantBlueprint(selectedVariant.variantId);
      const nextBlueprint = kind === "golden" ? (golden || loaded.blueprint) : getBaseVariantBlueprint(selectedVariant.variantId);
      const nextScene = compileBlueprintToPascal(nextBlueprint);
      setBlueprintCalibration(kind === "golden" && golden
        ? createDefaultCalibration(selectedVariant.variantId, nextBlueprint, true)
        : createDefaultCalibration(selectedVariant.variantId, nextBlueprint, false));
      setBlueprintSource(kind === "golden" && golden ? "golden" : "base");
      setFloorplanSpec(blueprintToFloorplanSpec(nextBlueprint));
      setScene(nextScene);
      setBasePascalScene(cloneScene(nextScene));
      setSceneRevision((value) => value + 1);
      setLayoutRun(null);
      setSceneDiff(null);
      setFloorplan(null);
      setAiFloorplan(null);
      setCapturedViews([]);
      setOverall(null);
      setRoomImages([]);
      setBom(null);
      setBudget(null);
      blueprintDirty.current = false;
      setFurniturePresetStatus(kind === "golden" && golden ? "已恢复 Golden 预制方案" : "已恢复最初 Base 户型");
      setError("");
    } catch (e: any) {
      setError(e?.message || "恢复 Blueprint 失败");
    }
  }
  function updateFurniture(id: string, dx = 0, dz = 0, rotationDelta = 0) {
    setScene((current) => {
      let next = current;
      if (dx || dz) next = moveFurniture(next, id, dx, dz);
      if (rotationDelta) next = rotateFurniture(next, id, rotationDelta);
      return next;
    });
    setSceneRevision((v) => v + 1);
    markBlueprintDirty();
  }

  function finishFurnitureEditing() {
    setEditMode(false);
    setSelectedItemId("");
  }

  function cancelDraftEdits() {
    if (blueprintSaveTimer.current) clearTimeout(blueprintSaveTimer.current);
    blueprintSaveTimer.current = null;
    const restored = cloneScene(committedSceneRef.current);
    setScene(restored);
    setSceneRevision((value) => value + 1);
    blueprintDirty.current = false;
    setHasUnsavedChanges(false);
    setDoorPlacementMode(false);
    setSelectedDoorId("");
    setSelectedWallIds([]);
    setFurniturePresetStatus("已取消本次调整");
    setError("");
  }

  function addDraftDoor() {
    const wallId = selectedWallIds.length === 1 ? selectedWallIds[0] : "";
    const wall: any = wallId ? scene.nodes[wallId] : null;
    if (!wall || wall.type !== "wall") {
      setError("请先在顶视图选择一面可编辑墙体");
      return;
    }
    if (wall.metadata?.editable === false || wall.metadata?.locked || wall.metadata?.structural_type === "load_bearing") {
      setError("当前墙体被锁定，不能直接添加门");
      return;
    }
    const length = Math.hypot(Number(wall.end[0]) - Number(wall.start[0]), Number(wall.end[1]) - Number(wall.start[1]));
    const width = 0.9;
    const offset = Math.max(0.12, Math.min(Math.max(0.12, length - width - 0.12), (length - width) / 2));
    const id = `door_draft_${Date.now().toString(36)}`;
    try {
      const result = addBlueprintDoor(scene, {
        id,
        name: "新增室内门",
        hostWallId: wallId,
        offset,
        width,
        height: 2.1,
        doorType: "hinged",
        hingeSide: "left",
        swingDirection: "inward",
        swingAngle: 0,
        connects: [null, null],
        locked: false,
      } as any);
      setScene(result.scene);
      setSceneRevision((value) => value + 1);
      setSelectedDoorId(id);
      markBlueprintDirty();
      setDoorPlacementMode(false);
      setLayoutProgress("已添加临时门，确认位置后点击“保存调整”");
      setError("");
    } catch (e: any) {
      setError(e?.message || "门位置无效，无法添加");
    }
  }

  function deleteDraftDoor(doorId: string) {
    try {
      const result = removeBlueprintDoor(scene, doorId);
      setScene(result.scene);
      setSceneRevision((value) => value + 1);
      setSelectedDoorId("");
      markBlueprintDirty();
      setLayoutProgress("门已从当前草稿移除，点击“保存调整”后生效");
    } catch (e: any) {
      setError(e?.message || "该门不能删除");
    }
  }
  function toggleDraftDoorProperty(doorId: string, property: "hinge" | "swing") {
    const current: any = scene.nodes[doorId];
    if (!current || current.type !== "door") return;
    const next = cloneScene(scene);
    const door: any = next.nodes[doorId];
    if (property === "hinge") {
      const value = door.hingesSide === "right" ? "left" : "right";
      door.hingesSide = value;
      door.hingeSide = value;
    } else {
      door.swingDirection = door.swingDirection === "outward" ? "inward" : "outward";
    }
    setScene(next);
    setSceneRevision((value) => value + 1);
    markBlueprintDirty();
  }

  function toggleFurnitureEditing() {
    if (editMode) finishFurnitureEditing();
    else {
      setFurniturePresetStatus("");
      setDoorPlacementMode(false);
      setDoorEditMode(false);
      setWallEditMode(false);
      setSelectedWallIds([]);
      setSelectedDoorId("");
      setPascalViewMode("3d");
      setEditMode(true);
    }
  }
  function toggleDoorEditing() {
    setDoorPlacementMode(false);
    setEditMode(false);
    setWallEditMode(false);
    setSelectedWallIds([]);
    setSelectedItemId("");
    setWalkthroughMode(false);
    setPascalViewMode("3d");
    setDoorEditMode((value) => !value);
    setSelectedDoorId("");
  }
  function commitWallEdit(label: string, result: WallEditResult) {
    const transaction = createWallEditTransaction(label, scene, result.scene);
    try {
      syncWallEditToPascalStore(scene, result.scene);
      setScene(result.scene);
      setSceneRevision((value) => value + 1);
      setWallUndoStack((current) => [...current.slice(-49), transaction]);
      setWallRedoStack([]);
      setSelectedWallIds(result.wallIds.filter((id) => result.scene.nodes[id]?.type === "wall"));
      setBom(null);
      setBudget(null);
      setSceneDiff(null);
      setLayoutProgress(`${result.message} · Zone ${result.affectedZoneIds.length} 个已重建 · BOM 已过期`);
      setError("");
      markBlueprintDirty();
    } catch (wallError: any) {
      setError(wallError?.message || "墙体修改无法同步到 Pascal Scene");
    }
  }
  function runWallEdit(label: string, operation: () => WallEditResult) {
    try {
      const result = operation();
      const beforeValidation = validateLayout(scene);
      const validation = validateLayout(result.scene);
      const existingIssues = new Set(beforeValidation.issues);
      const introducedIssues = validation.issues.filter((issue) => !existingIssues.has(issue));
      if (introducedIssues.length) throw new Error(`墙体修改未通过 Layout Validation：${introducedIssues.join("；")}`);
      commitWallEdit(label, result);
    } catch (wallError: any) {
      setError(wallError?.message || "墙体修改失败");
    }
  }
  function toggleWallEditing() {
    if (wallEditMode) {
      setWallEditMode(false);
      setWallAddMode(false);
      setSelectedWallIds([]);
      if (doorPlacementMode) setDoorPlacementMode(false);
      setLayoutProgress(hasUnsavedChanges ? "墙体修正已保留在草稿，请点击“保存调整”" : "已退出墙体修正模式");
      return;
    }
    setEditMode(false);
    setDoorEditMode(false);
    setWalkthroughMode(false);
    setSelectedItemId("");
    setSelectedDoorId("");
    setWallEditMode(true);
    setPascalViewMode("overlay");
    setLayoutProgress("墙体修正模式：点击墙体选择，拖动端点或墙身完成修正");
  }
  function selectWall(wallId: string, additive: boolean) {
    setSelectedWallIds((current) => additive
      ? current.includes(wallId) ? current.filter((id) => id !== wallId) : [...current, wallId]
      : [wallId]);
  }
  function undoWallEdit() {
    const transaction = wallUndoStack[wallUndoStack.length - 1];
    if (!transaction) return;
    try {
      syncWallEditToPascalStore(scene, transaction.before);
      setScene(cloneScene(transaction.before));
      setSceneRevision((value) => value + 1);
      setWallUndoStack((current) => current.slice(0, -1));
      setWallRedoStack((current) => [...current, transaction]);
      setSelectedWallIds([]);
      setBom(null);
      setBudget(null);
      markBlueprintDirty();
      setError("");
      setLayoutProgress(`已撤销：${transaction.label} · BOM 已过期`);
    } catch (wallError: any) {
      console.error("[WallEdit] undo failed", wallError);
      setError(wallError?.message || "墙体撤销失败，当前 Scene 未改变");
    }
  }
  function redoWallEdit() {
    const transaction = wallRedoStack[wallRedoStack.length - 1];
    if (!transaction) return;
    try {
      syncWallEditToPascalStore(scene, transaction.after);
      setScene(cloneScene(transaction.after));
      setSceneRevision((value) => value + 1);
      setWallRedoStack((current) => current.slice(0, -1));
      setWallUndoStack((current) => [...current, transaction]);
      setSelectedWallIds([]);
      setBom(null);
      setBudget(null);
      markBlueprintDirty();
      setError("");
      setLayoutProgress(`已重做：${transaction.label} · BOM 已过期`);
    } catch (wallError: any) {
      console.error("[WallEdit] redo failed", wallError);
      setError(wallError?.message || "墙体重做失败，当前 Scene 未改变");
    }
  }
  function requestWallDelete() {
    if (selectedWallIds.length !== 1) {
      setError("请先选择一面墙体");
      return;
    }
    const details = describeWall(scene, selectedWallIds[0]);
    if (!details) return;
    if (details.locked) {
      setError("外墙、承重墙或锁定墙禁止删除");
      return;
    }
    if (details.openings.length) {
      setWallDeletePrompt({ wallId: details.wallId, openingCount: details.openings.length });
      return;
    }
    runWallEdit("删除墙体", () => removeWallSafe(scene, details.wallId));
  }
  function deleteWallWithPolicy(policy: "delete" | "migrate") {
    if (!wallDeletePrompt) return;
    const wallId = wallDeletePrompt.wallId;
    setWallDeletePrompt(null);
    runWallEdit(policy === "delete" ? "删除墙体和门窗" : "迁移门窗并删除墙体", () => removeWallSafe(scene, wallId, policy));
  }
  function commitDoorMove(doorId: string, wallId: string, offset: number) {
    try {
      const result = moveBlueprintDoor(scene, doorId, wallId, offset);
      setScene(result.scene);
      setSceneRevision((value) => value + 1);
      markBlueprintDirty();
      setSelectedDoorId(doorId);
      setLayoutProgress(`门 ${doorId} 已移动到 ${wallId} · ${offset.toFixed(2)}m，墙洞和漫游碰撞已重建`);
      setError("");
    } catch (error: any) {
      setError(error?.message || "门位置无效，已恢复原位置");
    }
  }

  useEffect(() => {
    if (!sessionHydrated || !sessionId || !isSessionCurrent(sessionId)) return;
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    fetch("/api/ai/status", { signal: controller.signal })
      .then((r) => r.json())
      .then((nextStatus) => { if (isSessionCurrent(requestSessionId)) setStatus(nextStatus); })
      .catch(() => { if (isSessionCurrent(requestSessionId)) setStatus(null); });
    void imageUrlToDataUrl(config.image, controller.signal)
      .then(async (data) => {
        if (!isSessionCurrent(requestSessionId) || controller.signal.aborted) return;
        setSvgSource(svgFromDataUrl(data));
        setDrawingPreviewDataUrl(data);
        const hash = await hashDataUrl(data);
        if (!isSessionCurrent(requestSessionId)) return;
        setSelectedVariant((current) =>
          current.imageUrl === config.image
            ? { ...current, imageDataUrl: data, imageHash: hash }
            : current,
        );
      })
      .catch(() => setDrawingPreviewDataUrl(""));
    return () => {
      controller.abort();
      releaseSessionRequest(controller);
    };
  }, [sessionHydrated, sessionId, config.image]);
  useEffect(() => {
    let geometryLoaded = false;
    let svgInput = selectedVariant.imageUrl.endsWith(".svg");
    const requestedNewSession = new URLSearchParams(window.location.search).get("new") === "1";
    const previousSessionId = getActiveSessionId();
    if (!requestedNewSession && !previousSessionId) {
      window.location.replace("/");
      return;
    }
    const activeSessionId = startSession(requestedNewSession);
    sessionDisposed.current = false;
    setSessionId(activeSessionId);
    if (requestedNewSession) window.history.replaceState(null, "", "/customer");
    try {
      const raw = localStorage.getItem(sessionStorageKey(activeSessionId, "design"));
      if (raw) {
        const saved = inflateInteriorMetadata(unpackModelSession(JSON.parse(raw)));
        let savedBlueprintExists = false;
        let savedManualBlueprint: { source: string; scene: SceneGraph } | undefined;
        if (typeof saved.svgSource === "string") setSvgSource(saved.svgSource);
        if (saved.selectedVariant) {
          setSelectedVariant(saved.selectedVariant);
          setResidence(saved.selectedVariant.residenceType);
          svgInput = String(saved.selectedVariant.imageUrl || "").endsWith(".svg");
          if (!svgInput) {
          const loaded = loadVariantBlueprintState(saved.selectedVariant.variantId, undefined, activeSessionId);
          savedBlueprintExists = loaded.source === "saved";
          const loadedScene = compileBlueprintToPascal(loaded.blueprint);
          if (savedBlueprintExists) savedManualBlueprint = { source: loaded.source, scene: loadedScene };
          setBlueprintCalibration(loaded.calibration);
          setBlueprintSource(loaded.source);
          setFloorplanSpec(blueprintToFloorplanSpec(loaded.blueprint));
          setScene(loadedScene);
          setBasePascalScene(cloneScene(loadedScene));
          geometryLoaded = true;
          }
        }
        const restoredModel = restoreBoundModelSession(saved, savedManualBlueprint);
        if (restoredModel.scene && restoredModel.blueprint) {
          setScene(restoredModel.scene);
          setBasePascalScene(cloneScene(restoredModel.scene));
          committedSceneRef.current = cloneScene(restoredModel.scene);
          setFloorplanSpec(blueprintToFloorplanSpec(restoredModel.blueprint));
          if (!savedBlueprintExists) setBlueprintCalibration(createDefaultCalibration(saved.selectedVariant?.variantId || selectedVariant.variantId, restoredModel.blueprint, true));
          geometryLoaded = true;
        }
        setModel3DLoaded(restoredModel.modelLoaded);
        setModelGenerationPhase(restoredModel.phase);
        setModelExperience(restoredModel.experience);
        setSlide(restoredModel.step as Slide);
        setFloorPlanConfirmed(restoredModel.confirmed);
        confirmedBindingRef.current = restoredModel.binding;
        modelBindingRef.current = restoredModel.binding;
        setConfirmedBinding(restoredModel.binding);
        setModelBinding(restoredModel.binding);
        selectionEpoch.current = advanceSelectionEpoch(selectionEpoch.current, restoredModel.binding);
        if (restoredModel.failed) setModelSourceNotice({ source: "fallback", reason: restoredModel.reason });
        if (typeof saved.editDraft === "string") setPrompt(saved.editDraft);
        else if (typeof saved.customRequirement === "string") setPrompt(saved.customRequirement);
        else if (typeof saved.requirement === "string") {
          let restoredRequirement = saved.requirement.trim();
          while (restoredRequirement.startsWith(MODIFICATION_PREFIX)) {
            restoredRequirement = restoredRequirement.slice(MODIFICATION_PREFIX.length).trim().replace(/^\d+\.\s*/, "");
          }
          setPrompt(restoredRequirement);
        }
        // Validated generated snapshots retain their exact geometry. The
        // per-variant Blueprint remains the fallback for obsolete sessions.
        if (Number.isFinite(saved.sceneRevision))
          setSceneRevision(saved.sceneRevision);
        if (saved.aiLayoutResult) setLayoutRun(saved.aiLayoutResult);
        if (saved.aiFloorplan) {
          setAiFloorplan(saved.aiFloorplan);
          setFloorplan({
            provider: saved.aiFloorplan.provider,
            model: saved.aiFloorplan.model,
            url: saved.aiFloorplan.url,
            ephemeral: saved.aiFloorplan.ephemeral,
            fallback: saved.aiFloorplan.fallback,
            fallbackReason: saved.aiFloorplan.fallbackReason,
            sourceVariantId: saved.aiFloorplan.sourceVariantId,
            sourceImageHash: saved.aiFloorplan.sourceImageHash,
            userPrompt: saved.aiFloorplan.prompt,
          });
        }
        if (saved.floorplanAnalysis?.sourceVariantId === saved.selectedVariant?.variantId) setFloorplanAnalysis(saved.floorplanAnalysis);
        if (Array.isArray(saved.floorplanVersions)) {
          const restoredVersions = saved.floorplanVersions.filter((version: any) => version?.id && version?.result?.url && version?.sourceVariantId === saved.selectedVariant?.variantId);
          setFloorplanVersions(restoredVersions);
          if (restoredVersions.length) {
            const selectedId = String(saved.selectedFloorplanVersionId || restoredVersions[restoredVersions.length - 1].id);
            const selectedVersion = restoredVersions.find((version: FloorplanVersion) => version.id === selectedId) || restoredVersions[restoredVersions.length - 1];
            setSelectedFloorplanVersionId(selectedVersion.id);
            selectedFloorplanVersionIdRef.current = selectedVersion.id;
            if (typeof saved.editSourceVersionId === "string" && restoredVersions.some((version) => version.id === saved.editSourceVersionId)) setEditSourceVersionId(saved.editSourceVersionId);
            {
              setFloorplan(selectedVersion.result);
              setAiFloorplan({ sourceVariantId: selectedVersion.sourceVariantId, sourceImageHash: selectedVersion.sourceImageHash, prompt: selectedVersion.submittedRequirement, url: selectedVersion.result.url, model: selectedVersion.result.model, provider: selectedVersion.result.provider, ephemeral: selectedVersion.result.ephemeral, fallback: selectedVersion.result.fallback, fallbackReason: selectedVersion.result.fallbackReason });
            }
            const assetJob = { ...selectionEpoch.current };
            if (saved.generatedFloorplan?.provider !== "preset") void loadFloorplanAsset(`${activeSessionId}:${saved.selectedVariant.variantId}:${selectedVersion.id}`).then((url) => {
              if (!url || !isSessionCurrent(activeSessionId) || !selectionJobCurrent(assetJob, selectionEpoch.current) || selectedFloorplanVersionIdRef.current !== selectedVersion.id) {
                if (url) URL.revokeObjectURL(url);
                return;
              }
              objectUrls.current.add(url);
              setFloorplan((current) => current && current.provider !== "preset" ? { ...current, url } : current);
            }).catch(() => undefined);
          }
        }
        if (saved.generatedFloorplan?.provider === "preset" && saved.generatedFloorplan.sourceVariantId === saved.selectedVariant?.variantId && saved.generatedFloorplan.url === saved.selectedVariant?.imageUrl) {
          setFloorplan(saved.generatedFloorplan);
          setAiFloorplan(null);
          setSelectedFloorplanVersionId(null);
          setEditSourceVersionId(null);
        }
        if (saved.selectedRegion?.coordinateSpace === "source-image" && saved.selectedRegion.sourceImageHash === (saved.selectedVariant?.imageHash || saved.selectedRegion.sourceImageHash)) setSelectedRegion(saved.selectedRegion);
        if (restoredModel.modelLoaded && Array.isArray(saved.capturedViews)) {
          const restoredCaptures = saved.capturedViews
            .map((capture: CapturedView) => {
              if (!sameModelBinding((capture as any)?.modelBinding, restoredModel.binding)) return null;
              if (capture?.sceneVersion && !["v2", "pascal-v2"].includes(capture.sceneVersion)) return null;
              const image = capture?.image || capture?.screenshotDataUrl || "";
              return isValidCapturedImage(image)
                ? { ...capture, image, screenshotDataUrl: image }
                : null;
            })
            .filter((capture: CapturedView | null): capture is CapturedView => Boolean(capture))
            .slice(0, 5);
          setCapturedViews(restoredCaptures);
          if (typeof saved.selectedCaptureId === "string" && restoredCaptures.some((capture) => capture.id === saved.selectedCaptureId))
            setActiveCaptureId(saved.selectedCaptureId);
          else if (restoredCaptures[0]) setActiveCaptureId(restoredCaptures[0].id);
          else setActiveCaptureId(null);
        }
        if (typeof saved.clarificationResolution === "string") setClarificationResolution(saved.clarificationResolution);
        if (typeof saved.clarificationDraft === "string") setClarificationDraft(saved.clarificationDraft);
        if (typeof saved.clarificationNote === "string") setClarificationNote(saved.clarificationNote);
        if (typeof saved.selectedStyleId === "string") setSelectedStyleId(saved.selectedStyleId);
        if (restoredModel.modelLoaded && saved.bomResult) setBom(saved.bomResult);
        if (restoredModel.modelLoaded && saved.overallRenderImage)
          setOverall({
            provider: "qwen",
            model: "persisted",
            url: saved.overallRenderImage,
            ephemeral: true,
            fallback: false,
          });
        if (restoredModel.modelLoaded && Array.isArray(saved.roomImages))
          setRoomImages(
            saved.roomImages
              .filter((item: any) => typeof item?.roomId === "string" && Boolean(item?.image?.url || item?.url))
              .map((item: any) => ({
              roomId: item.roomId,
              roomName: String(item.roomName || item.roomId),
              image: {
                provider: "qwen",
                model: "persisted",
                url: item.image?.url || item.url,
                ephemeral: true,
                fallback: false,
              },
              status: "ready" as const,
            })),
          );
      }
    } catch {}
    if (!geometryLoaded && !svgInput) {
      try {
        const loaded = loadVariantBlueprintState(selectedVariant.variantId, undefined, activeSessionId);
        const loadedScene = compileBlueprintToPascal(loaded.blueprint);
        setBlueprintCalibration(loaded.calibration);
        setBlueprintSource(loaded.source);
        setFloorplanSpec(blueprintToFloorplanSpec(loaded.blueprint));
        setScene(loadedScene);
        setBasePascalScene(cloneScene(loadedScene));
      } catch {}
    }
    setSessionHydrated(true);
  }, []);
  useEffect(() => {
    if (!sessionHydrated || !sessionId) return;
    // Waiting for AI is active work. A long image job must not erase its own
    // scene/capture through the kiosk's idle-session reset.
    if (floorplanBusy || renderBusy || structureBusy || layoutBusy || bomBusy || modelGenerationPhase === "generating" || modelGenerationPhase === "preparing") {
      setIdleWarningSeconds(null);
      return;
    }
    // Scene edits are drafts. Persist the session metadata only after the
    // explicit Save action clears the dirty flag.
    if (blueprintDirty.current) return;
    try {
      localStorage.setItem(sessionStorageKey(sessionId, "selected-variant"), JSON.stringify({
        residenceType: selectedVariant.residenceType,
        variantId: selectedVariant.variantId,
        optionIndex: selectedVariant.optionIndex,
        imageUrl: selectedVariant.imageUrl,
        imageDataUrl: null,
        imageHash: selectedVariant.imageHash,
      }));
    } catch (error) {
      console.error("[Variant Blueprint] failed to persist selected variant", error);
    }
  }, [sessionHydrated, sessionId, selectedVariant]);
  // A persisted session may contain the legacy compiled Blueprint while the
  // selected preset is now a three-bedroom Pascal V2 scene. Re-resolve that
  // preset on hydration so returning from STEP4 never mixes old geometry with
  // the current variant. Modified scenes remain authoritative when present.
  useEffect(() => {
    if (!sessionHydrated || !sessionId || !isSessionCurrent(sessionId) || !["one", "three"].includes(selectedVariant.residenceType) || selectedVariant.imageUrl.endsWith(".svg")) return;
    const source = scene.nodes.building_house?.metadata?.floorplanSource;
    if (modelGenerationPhase === "generating" || !shouldHydrateImportedPreset(source, blueprintSource)) return;
    let cancelled = false;
    const loadPreset = selectedVariant.residenceType === "one" ? loadImportedOneScene : loadImportedThreeScene;
    const requestSessionId = sessionId;
    void loadPreset(selectedVariant).then((importedScene) => {
      if (cancelled || !isSessionCurrent(requestSessionId)) return;
      setBasePascalScene(cloneScene(importedScene));
      setScene(importedScene);
      const importedBlueprint = sceneToFloorplanBlueprint(importedScene);
      setFloorplanSpec(blueprintToFloorplanSpec(importedBlueprint));
      setBlueprintCalibration(createDefaultCalibration(selectedVariant.variantId, importedBlueprint, false));
      setBlueprintSource("base");
      setSceneRevision((value) => value + 1);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [sessionHydrated, sessionId, selectedVariant, scene, modelGenerationPhase, blueprintSource]);
  useEffect(() => {
    if (!sessionHydrated || !sessionId || !isSessionCurrent(sessionId)) return;
    if (blueprintDirty.current) return;
    try {
      localStorage.setItem(
         sessionStorageKey(sessionId, "design"),
        JSON.stringify(packModelSession(compactInteriorMetadata({
          ...designSession,
          generatedFloorplanImage: currentFloorplan?.url || null,
          overallRenderImage: overall?.url || null,
          roomImages,
      roomRenderImages: roomImages.map((x) => x.image.url),
          floorPlanConfirmed,
          model3DLoaded,
          modelGenerationPhase,
          confirmedBinding,
          modelBinding,
          selectedStyleId,
          selectedCaptureId: activeCaptureId,
          customRequirement: currentFloorplan?.userPrompt ?? prompt,
          editDraft: prompt,
          clarificationResolution,
          clarificationDraft,
          clarificationNote,
          floorplanAnalysis,
          svgSource,
          floorplanVersions: floorplanVersions.map((version) => ({ ...version, result: { ...version.result } })),
          selectedFloorplanVersionId,
          editSourceVersionId,
           selectedRegion,
           currentStep: slide,
           sceneVersion: scene.nodes.building_house?.metadata?.floorplanVersion || "legacy",
        }))),
      );
    } catch (error) {
      console.warn("[DreamHouse][persist] session metadata save failed", JSON.stringify({
        errorType: error instanceof DOMException ? error.name : "unknown",
        projectId: sessionId,
        sourceRevision: sceneRevision,
      }));
    }
  }, [sessionHydrated, sessionId, designSession, currentFloorplan, overall, roomImages, floorPlanConfirmed, model3DLoaded, modelGenerationPhase, confirmedBinding, modelBinding, selectedStyleId, activeCaptureId, prompt, clarificationResolution, clarificationDraft, clarificationNote, floorplanAnalysis, floorplanVersions, selectedFloorplanVersionId, editSourceVersionId, selectedRegion, slide, svgSource, hasUnsavedChanges]);
  useEffect(() => {
    sessionDisposed.current = false;
    return () => stopSessionResources();
  }, []);

  useEffect(() => {
    if (!sessionHydrated || !sessionId) return;
    let lastActivityAt = 0;
    const clearCountdown = () => {
      if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
      idleCountdownTimer.current = null;
      idleWarningActive.current = false;
      setIdleWarningSeconds(null);
    };
    const beginCountdown = () => {
      let remaining = 30;
      idleWarningActive.current = true;
      setIdleWarningSeconds(remaining);
      idleCountdownTimer.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearCountdown();
          void resetSession();
          return;
        }
        setIdleWarningSeconds(remaining);
      }, 1000);
    };
    const armIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(beginCountdown, 10 * 60 * 1000);
    };
    const registerActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt < 1000 && !idleWarningActive.current) return;
      lastActivityAt = now;
      clearCountdown();
      armIdleTimer();
    };
    const events: Array<keyof WindowEventMap> = ["mousemove", "pointerdown", "touchstart", "keydown"];
    events.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }));
    armIdleTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, registerActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (idleCountdownTimer.current) clearInterval(idleCountdownTimer.current);
    };
  }, [sessionHydrated, sessionId, floorplanBusy, renderBusy, structureBusy, layoutBusy, bomBusy, modelGenerationPhase]);
  useEffect(() => {
    if (!wallEditMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undoWallEdit();
      } else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redoWallEdit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [wallEditMode, wallUndoStack, wallRedoStack, scene]);
  function selectResidence(key: Residence) {
    const next = RESIDENCES.find((x) => x.key === key)!;
    setResidence(key);
    setPickerResidence(key);
  }
  async function choosePresetImage(key: Residence, image: string) {
    const next = RESIDENCES.find((x) => x.key === key)!;
    const optionIndex = Number(image.match(/option-(\d+)/)?.[1] || 0);
    const variant: SelectedVariant = {
      residenceType: key,
      variantId: `${key}-option-${String(optionIndex).padStart(2, "0")}`,
      optionIndex,
      imageUrl: image,
      imageDataUrl: null,
      imageHash: null,
    };
    invalidateConfirmedSelection();
    const requestId = ++variantRequestId.current;
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    if (blueprintSaveTimer.current) clearTimeout(blueprintSaveTimer.current);
    blueprintSaveTimer.current = null;
    blueprintDirty.current = false;
    floorplanRequestId.current += 1;
    floorplanAbortController.current?.abort();
    cancelModelGenerationTimers();
    go(1);
    setSvgSource("");
    setSelectedVariant(variant);
    setResidence(key);
    setPickerResidence(null);
    setFloorplanSpec(null);
    setLayoutRun(null);
    setSceneDiff(null);
    setFloorplan(null);
    setAiFloorplan(null);
    setFloorplanVersions([]);
    setEditSourceVersionId(null);
    setSelectedFloorplanVersionId(null);
    setOverall(null);
    setRoomImages([]);
    setBom(null);
    setBudget(null);
    setCapturedViews([]);
    setWalkthroughMode(false);
    setDoorEditMode(false);
    setWallEditMode(false);
    setSelectedWallIds([]);
    setWallUndoStack([]);
    setWallRedoStack([]);
    setWallAddMode(false);
    setSelectedDoorId("");
    setPascalViewMode("3d");
    setModelExperience("intro");
    setModel3DLoaded(false);
    setFloorPlanConfirmed(false);
    setProgressTask(null);
    setBomDetailsVisible(false);
    setFurniturePresetStatus("");
    setVariantImporting(true);
    setError("正在导入所选户型…");
    try {
      // SVG 预设：加载 XML，渲染 PNG 显示，后续走 XML 代码流程
      if (image.endsWith(".svg")) {
        const svgText = await (await fetch(image, { signal: controller.signal })).text();
        if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
        const pngRes = await fetch("/api/ai/svg-render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ svgText }), signal: controller.signal });
        if (!pngRes.ok) throw new Error("SVG_RENDER_FAILED");
        const pngBlob = await pngRes.blob();
        const pngDataUrl: string = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(pngBlob); });
        if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
        setSvgSource(svgText);
        setDrawingPreviewDataUrl(pngDataUrl);
        setSelectedVariant({ ...variant, imageDataUrl: svgDataUrl(svgText), imageHash: await hashDataUrl(svgDataUrl(svgText)) });
        setVariantImporting(false);
        setError("");
        setLayoutProgress("已加载 SVG 户型，图片已渲染，后续将使用 SVG 代码编辑");
        return;
      }
      // Only raster modes depend on a legacy catalogue placeholder. SVG
      // modes return above and construct their scene from their own geometry.
      const loadedBlueprint = loadVariantBlueprintState(variant.variantId, undefined, sessionId);
      const immediateScene = compileBlueprintToPascal(loadedBlueprint.blueprint);
      setBlueprintCalibration(loadedBlueprint.calibration);
      setBlueprintSource(loadedBlueprint.source);
      setFloorplanSpec(blueprintToFloorplanSpec(loadedBlueprint.blueprint));
      setBasePascalScene(cloneScene(immediateScene));
      setScene(immediateScene);
      setSceneRevision((x) => x + 1);
      const imageDataUrl = await imageUrlToDataUrl(image, controller.signal);
      const imageHash = await hashDataUrl(imageDataUrl);
      if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
      const resolved = { ...variant, imageDataUrl, imageHash };
      setSelectedVariant(resolved);
      setDrawingPreviewDataUrl(imageDataUrl);
      if (key === "one") {
        const importedScene = await loadImportedOneScene(resolved);
        if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
        setBasePascalScene(cloneScene(importedScene));
        setScene(importedScene);
        const importedBlueprint = sceneToFloorplanBlueprint(importedScene);
        setFloorplanSpec(blueprintToFloorplanSpec(importedBlueprint));
        setBlueprintCalibration(createDefaultCalibration(resolved.variantId, importedBlueprint, false));
        setBlueprintSource("base");
        setSceneRevision((x) => x + 1);
        setError("");
        setLayoutProgress("已加载所选一居户型，Pascal 场景已就绪");
        setPrompt("");
        return;
      }
      if (key === "two") {
        const importedScene = await loadImportedTwoScene(resolved);
        if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
        setBasePascalScene(cloneScene(importedScene));
        setScene(importedScene);
        const importedBlueprint = sceneToFloorplanBlueprint(importedScene);
        setFloorplanSpec(blueprintToFloorplanSpec(importedBlueprint));
        setBlueprintCalibration(createDefaultCalibration(resolved.variantId, importedBlueprint, false));
        setBlueprintSource("base");
        setSceneRevision((x) => x + 1);
        setError("");
        setLayoutProgress("已加载所选两居户型，Pascal 场景已就绪");
        setPrompt("");
        return;
      }
      if (key === "three") {
        const importedScene = await loadImportedThreeScene(resolved);
        if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
        setBasePascalScene(cloneScene(importedScene));
        setScene(importedScene);
        const importedBlueprint = sceneToFloorplanBlueprint(importedScene);
        setFloorplanSpec(blueprintToFloorplanSpec(importedBlueprint));
        setBlueprintCalibration(createDefaultCalibration(resolved.variantId, importedBlueprint, false));
        setBlueprintSource("base");
        setSceneRevision((x) => x + 1);
        setError("");
        setLayoutProgress("已加载所选三居户型，Pascal 场景已就绪");
        setPrompt("");
        return;
      }
      if (loadedBlueprint.source !== "base") {
        setError("");
        setLayoutProgress(`已加载 ${loadedBlueprint.source === "golden" ? "Golden" : "Saved User"} Blueprint，Pascal Scene 已恢复`);
        return;
      }
      const response = await fetch("/api/ai/import-floorplan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: requestSessionId,
          requestId,
          residenceType: key,
          variantId: resolved.variantId,
          imageUrl: image,
          imageHash,
          optionIndex: resolved.optionIndex,
          imageDataUrl: resolved.imageDataUrl,
        }),
        signal: controller.signal,
      });
      const imported = await response.json();
      if (requestId !== variantRequestId.current || !isSessionCurrent(requestSessionId)) return;
      if (!response.ok || imported.source?.imageHash !== imageHash)
        throw new Error("户型导入结果与当前选择不一致");
      setFloorplanSpec(imported.floorplanSpec);
      const compiledScene = compileFloorplanToPascal(imported.floorplanSpec, resolved);
      const nextScene = compiledScene;
      setBasePascalScene(cloneScene(nextScene));
      setScene(nextScene);
      const importedBlueprint = sceneToFloorplanBlueprint(nextScene);
      setBlueprintCalibration(createDefaultCalibration(resolved.variantId, importedBlueprint, false));
      setBlueprintSource("base");
      setSceneRevision((x) => x + 1);
      setError("");
      setLayoutProgress(
        `户型已由 ${imported.provider === "qwen" ? "Qwen 图片识别" : "本地回退"}导入，Pascal Scene 已就绪`,
      );
    } catch (e: any) {
      if (requestId === variantRequestId.current)
        setError(e?.message || "户型导入失败");
    } finally {
      releaseSessionRequest(controller);
      if (requestId === variantRequestId.current && isSessionCurrent(requestSessionId)) setVariantImporting(false);
    }
    setPrompt("");
  }
  function go(next: number) {
    if (slide === 2 && next !== 2 && hasUnsavedChanges && typeof window !== "undefined") {
      const save = window.confirm("当前有尚未保存的调整，是否保存并继续？\n点击“取消”后可选择不保存继续或继续编辑。");
      if (save) {
        if (!saveCurrentVariantDesign(scene, "当前户型调整已保存")) return;
      } else if (window.confirm("是否不保存并继续？点击“取消”继续编辑。")) {
        cancelDraftEdits();
      } else return;
    }
    if (next >= 2 && (!floorPlanConfirmed || !sameModelBinding(currentBinding, confirmedBinding))) {
      setError("请先生成并确认户型方案");
      return;
    }
    if (next >= 3 && !modelMatchesSelection) {
      setError("请先完成3D空间创建");
      return;
    }
    setSlide(Math.max(0, Math.min(4, next)) as Slide);
  }
  function resetModel() {
    if (svgSource && (!selectedFloorplanVersionId || selectedImageVersion?.svgSource)) { void startModelGeneration("ai-live"); return; }
    restoreVariantBlueprint("golden");
  }

  async function runLayout(): Promise<boolean> {
    setError("");
    if (!blueprintValidation.valid) {
      setError(`当前 FloorplanBlueprint 未通过校验：${blueprintValidation.issues.join("；")}`);
      setLayoutProgress("Blueprint validation failed");
      return false;
    }
    // Baseline validation is diagnostic only. The catalog contains newer
    // variants whose room labels (for example 主卧/阳台) do not match the
    // legacy reference-name table, and that should not block generation.
    if (!layoutRun && !baseline.valid) {
      setLayoutProgress("已完成户型结构检查，正在继续生成方案…");
    }
    const requestId = ++layoutRequestId.current;
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    setLayoutBusy(true);
    setLayoutProgress(
      `正在调用 ${status?.models.layout || "qwen3.8-flash"} 分析当前二维户型图与对应 Pascal Scene…`,
    );
    const base = cloneScene(scene),
      design = makeDesign(base, "AI Layout Preview");
    setBasePascalScene(cloneScene(base));
    try {
      const drawingDataUrl =
        selectedVariant.imageDataUrl ||
        (await imageUrlToDataUrl(selectedVariant.imageUrl));
      const sourceImageHash =
        selectedVariant.imageHash || (await hashDataUrl(drawingDataUrl));
      if (!drawingPreviewDataUrl) setDrawingPreviewDataUrl(drawingDataUrl);
      const res = await fetch("/api/ai/layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          design,
          sessionId: requestSessionId,
          residenceType: selectedVariant.residenceType,
          variantId: selectedVariant.variantId,
          sourceImageHash,
          sceneRevision,
          prompt: modificationRequest,
          drawing: {
            id: `${selectedVariant.residenceType}-bedroom`,
            source: "preset",
            fileName: config.image.split("/").pop(),
            fileType: "image/png",
            previewDataUrl: drawingDataUrl,
          },
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          `${data?.model || "Qwen"}：${data?.error || "布局生成失败"}`,
        );
      if (requestId !== layoutRequestId.current || !isSessionCurrent(requestSessionId)) return false;
      if (
        (data.sessionId && data.sessionId !== requestSessionId) ||
        (data.sourceImageHash && data.sourceImageHash !== sourceImageHash)
      )
        throw new Error("Qwen 返回结果与当前 DesignSession 不一致");
      const run: AiLayoutRun = data.run;
      setLayoutRun(run);
      if (data.fallback)
        setLayoutProgress(
          `在线规划失败，已使用本地 Tool Agent：${data.fallbackReason || ""}`,
        );
      else
        setLayoutProgress(
          `规划完成，正在将 ${run.operations.length} 个工具操作逐步执行到 Pascal Editor…`,
        );
      let working = cloneScene(base);
      for (let i = 0; i < run.operations.length; i++) {
        if (!isSessionCurrent(requestSessionId)) return false;
        const op = run.operations[i];
        setLayoutProgress(
          `Pascal ${i + 1}/${run.operations.length}：${op.description}`,
        );
        const result = executeLayoutTool(working, op.tool, op.args);
        if (result.ok) {
          working = result.scene;
          setScene(cloneScene(working));
          setSceneRevision((x) => x + 1);
        }
        await wait(420);
      }
      if (!isSessionCurrent(requestSessionId)) return false;
      const diff = compareScenes(base, run.scene);
      setSceneDiff(diff);
      setScene(cloneScene(run.scene));
      setSceneRevision((x) => x + 1);
      if (run.validation.valid) markBlueprintDirty();
      setLayoutProgress(
        !run.validation.valid
          ? `建模完成但校验未通过：${run.validation.issues.join("；")}`
          : diff.topologyChanged ||
              diff.semanticChanged ||
              diff.furnitureChanged
            ? `Pascal建模完成 · ${run.provider}`
            : "Qwen规划有效，但没有产生可见的几何修改。",
      );
      return true;
    } catch (e: any) {
      if (e?.name !== "AbortError" && isSessionCurrent(requestSessionId)) {
        setError(e?.message || String(e));
        setLayoutProgress("建模失败，请查看错误信息");
      }
      return false;
    } finally {
      releaseSessionRequest(controller);
      if (isSessionCurrent(requestSessionId)) setLayoutBusy(false);
    }
  }

  function validateEditedScene(candidate: SceneGraph, context?: SvgEditContext): SceneGraph {
    let checked = cloneScene(candidate);
    if (context) {
      const original = svgToStructure(context.originalSvg);
      checked = preserveBedroomSourceFurniture(checked, context.furnitureSource ?? null, original);
      const action = context.intent?.action;
      if (action === "add_bedroom" || action === "add_bathroom") {
        if (!context.validation?.targetRoomId || !context.validation?.newRoomId) throw new Error("改造缺少完整校验信息");
        const validation = assertBedroomSceneUsable(checked, original, context.validation.targetRoomId, context.validation.newRoomId, context.furnitureSource, action === "add_bathroom" ? "bathroom" : "bedroom");
        Object.assign(checked.nodes.building_house.metadata ||= {}, { editSceneValidation: validation });
      }
      Object.assign(checked.nodes.building_house.metadata ||= {}, {editInference:context.provenance,editIntent:context.intent,editValidation:context.validation});
    }
    if (!assertPascalSceneIntegrity(checked).valid || !validateVariantBlueprint(sceneToFloorplanBlueprint(checked)).valid)
      throw new Error("三维完整性或保存恢复校验失败，未接受场景");
    return checked;
  }

  async function generateFloorplan(fresh = false): Promise<boolean> {
    floorplanError.current = null;
    setError("");
    setFloorplanBusy(true);
    const requestId = ++floorplanRequestId.current;
    const requestSessionId = sessionId;
    floorplanAbortController.current?.abort();
    const controller = new AbortController();
    requestControllers.current.add(controller);
    floorplanAbortController.current = controller;
    const requestSourceVersionId = editSourceVersionId;
    try {
      if (blueprintDirty.current) throw new Error("请先在 Step3 保存或取消当前调整，再提交户型改造。");
      const selectedVersion = editSourceVersion;
      const sourceBinding = selectedVersion
        ? floorplanModelBinding(selectedVariant.variantId, selectedVersion.result, selectedVersion.id)
        : { variantId: selectedVariant.variantId, versionId: "original", canonicalImageUrl: selectedVariant.imageUrl };
      // Freeze only the committed scene of the chosen editing base. A scene
      // belonging to another image version must never supply its furniture.
      const sourceScene = [committedSceneRef.current, selectedVersion?.sceneSnapshot].find((entry) =>
        entry && entry.nodes.building_house?.metadata?.variantId === selectedVariant.variantId &&
        sameModelBinding(entry.nodes.building_house?.metadata?.modelBinding, sourceBinding));
      const furnitureSource = sourceScene ? cloneScene(sourceScene) : undefined;
      const sourceVersion = selectedVersion ? "V1" : "original";
      const sourceUrl = selectedVersion?.result?.url || selectedVariant.imageUrl;
      const originalImage = selectedVersion
          ? await imageUrlToDataUrl(sourceUrl, controller.signal)
          : selectedVariant.imageDataUrl || await imageUrlToDataUrl(sourceUrl, controller.signal);
      const sourceImageHash = selectedVersion?.sourceImageHash || selectedVariant.imageHash || await hashDataUrl(originalImage);
      const currentContext = currentFloorplanContext.current;
      if (!isSessionCurrent(requestSessionId) ||
          currentContext.variantId !== selectedVariant.variantId ||
          currentContext.imageHash !== sourceImageHash ||
          currentContext.prompt.trim() !== modificationRequest ||
          editSourceVersionId !== requestSourceVersionId) return false;
      const requestVariantId = selectedVariant.variantId;
      const requestPrompt = modificationRequest.trim();
      if (!requestPrompt) throw new Error("请输入平面调整需求");
      if (!originalImage) throw new Error("当前户型图片不可用，请重新选择户型。");
      console.info("[FLOORPLAN EDIT INPUT]", { sourceVersion, hasImage: true, instructionLength: requestPrompt.length, imageCount: 1, textCount: 1 });
      if (!selectedVariant.imageHash) {
        setSelectedVariant((current) =>
          current.variantId === selectedVariant.variantId
            ? { ...current, imageDataUrl: originalImage, imageHash: sourceImageHash }
            : current,
        );
      }
      // The hash may be computed lazily on the first request. Pin the request
      // context immediately so the response cannot be rejected because React
      // has not committed the async hash state update yet.
      currentFloorplanContext.current = { variantId: requestVariantId, imageHash: sourceImageHash, prompt: requestPrompt };
      let data: any;
      let editedSvg: string | undefined;
      let editContext: SvgEditContext | undefined;
      const inputSvg = selectedSvgSource(floorplanVersions, requestSourceVersionId, requestVariantId, svgSource);
      if (inputSvg) {
        // Step2 commits only validated SVG. Step3 owns all model/Pascal work.
        const svgEditRes = await fetch("/api/ai/svg-edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ svgText: inputSvg, instruction: requestPrompt, hasBoundScene: Boolean(furnitureSource) }),
          signal: controller.signal,
        });
        const svgEditData = await svgEditRes.json();
        if (!svgEditRes.ok) throw new Error(svgEditData?.message || svgEditData?.reason || svgEditData?.error || "SVG 编辑失败");
        if (svgEditData?.validation?.valid !== true || !svgEditData.svg) throw new Error("SVG_EDIT_NOT_VALIDATED");
        editedSvg = svgEditData.svg;
        const pngRes = await fetch("/api/ai/svg-render", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ svgText: svgEditData.svg }),
          signal: controller.signal,
        });
        if (!pngRes.ok) throw new Error("SVG_RENDER_FAILED");
        const pngBlob = await pngRes.blob();
        const pngDataUrl: string = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(pngBlob); });
        editContext = { originalSvg: inputSvg, intent: svgEditData.intent, validation: svgEditData.validation, provenance: svgEditData.provenance, furnitureSource };
        const warnings = ["二维结构已校验；三维模型与家具碰撞将在 Step3 单独生成并检查，失败不接受三维结果。",
          ...(svgEditData.intent?.action === "add_bedroom" ? ["新增卧室的采光和通风条件尚未验证；家具在 Step3 手动调整。"] : []),
          ...(svgEditData.intent?.action === "add_bathroom" ? ["卫生间为概念布局；给排水、防水和通风工程条件尚未验证。"] : [])];
        data = { prompt: requestPrompt, image: { url: pngDataUrl, model: "svg-edit", provider: "qwen", ephemeral: true, fallback: false, geometryVerified: true, warnings } };
      } else {
        const response = await fetch("/api/ai/floorplan-image", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceImage: originalImage, instruction: requestPrompt, fresh }),
          signal: controller.signal,
        });
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || "图像生成失败");
        if (data?.image?.fallback) throw new Error(data.image.fallbackReason || "户型修改未生成成功，请重试");
      }
      await assertImageDecodes(String(data?.image?.url || ""));
      const current = currentFloorplanContext.current;
      const responseMismatch = {
        requestSuperseded: requestId !== floorplanRequestId.current,
        sessionChanged: !isSessionCurrent(requestSessionId),
        variantChanged: current.variantId !== requestVariantId,
        imageHashChanged: current.imageHash !== sourceImageHash,
        promptChanged: current.prompt.trim() !== requestPrompt,
        sourceVersionChanged: editSourceVersionIdRef.current !== requestSourceVersionId,
        responsePromptChanged: data.prompt !== requestPrompt,
      };
      const mismatchReasons = Object.entries(responseMismatch)
        .filter(([, mismatch]) => mismatch)
        .map(([reason]) => reason);
      if (mismatchReasons.length) {
        console.warn("[DreamHouse][STEP2] stale preview response", { requestId, mismatchReasons });
        throw new Error(`AI 平面图结果与当前户型不一致（${mismatchReasons.join("、")}）`);
      }
      const nextFloorplan: GeneratedImage = {
        ...data.image,
        sourceVariantId: requestVariantId,
        sourceImageHash,
        userPrompt: data.prompt,
      };
      const versionId = `floorplan-${requestId}-${Date.now().toString(36)}`;
      const nextBinding = floorplanModelBinding(requestVariantId, nextFloorplan, versionId)!;
      // Commit the 2D preview without triggering 3D construction.
      confirmedBindingRef.current = null; setConfirmedBinding(null);
      cancelModelGenerationTimers(); setFloorPlanConfirmed(false);
      setModelGenerationPhase("idle"); setModel3DLoaded(false); setModelExperience("intro");
      setCapturedViews([]); setActiveCaptureId(null); setOverall(null);
      setRoomImages([]); setBom(null); setBudget(null);
      setAiFloorplan({
        sourceVariantId: requestVariantId,
        sourceImageHash,
        prompt: data.prompt,
        url: data.image.url,
        model: data.image.model,
        provider: data.image.provider,
        ephemeral: data.image.ephemeral,
        fallback: data.image.fallback,
        fallbackReason: data.image.fallbackReason,
      });
      setFloorplan(nextFloorplan);
      setFloorplanVersions((current) => [...current, { id: versionId, parentVersionId: requestSourceVersionId || undefined, svgSource: editedSvg, editContext, sourceVariantId: requestVariantId, sourceImageHash, submittedRequirement: requestPrompt, result: nextFloorplan, requestId: String(requestId), createdAt: new Date().toISOString(), validationStatus: "ready" as const }].slice(-8));
      setSelectedFloorplanVersionId(versionId);
      selectedFloorplanVersionIdRef.current = versionId;
      selectionEpoch.current = advanceSelectionEpoch(selectionEpoch.current, floorplanModelBinding(requestVariantId, nextFloorplan, versionId));
      const assetJob = { ...selectionEpoch.current };
      setAssetSaveError("");
      void saveFloorplanAsset(`${requestSessionId}:${requestVariantId}:${versionId}`, nextFloorplan.url).catch((error: any) => {
        if (isSessionCurrent(requestSessionId) && selectionJobCurrent(assetJob, selectionEpoch.current)) setAssetSaveError("图片已生成，但本地保存失败，可保留当前结果并重试保存。");
        console.warn("[DreamHouse][STEP2] image persistence failed", { errorType: error?.name || "unknown", projectId: requestVariantId, requestId: `floorplan-${requestId}` });
      });
      return true;
    } catch (e: any) {
      const message = e?.message || String(e);
      if (e?.name !== "AbortError" && requestId === floorplanRequestId.current && isSessionCurrent(requestSessionId)) {
        floorplanError.current = message;
        console.warn("[DreamHouse][STEP2] preview rejected", {
          requestId,
          errorName: e?.name || "Error",
          message,
          responseStatus: e?.status,
        });
        setError(message);
      }
      return false;
    } finally {
      if (requestId === floorplanRequestId.current) {
        if (isSessionCurrent(requestSessionId)) setFloorplanBusy(false);
        if (floorplanAbortController.current === controller)
          floorplanAbortController.current = null;
      }
      releaseSessionRequest(controller);
    }
  }

  async function analyzeFloorPlan() {
    if (analysisBusy) return;
    setAnalysisBusy(true);
    setError("");
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    try {
      const sourceImage = selectedVariant.imageDataUrl || await imageUrlToDataUrl(selectedVariant.imageUrl, controller.signal);
      const sourceImageHash = selectedVariant.imageHash || await hashDataUrl(sourceImage);
      const response = await fetch("/api/ai/floorplan-analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceImage, sourceImageHash, sourceVariantId: selectedVariant.variantId, residenceType: selectedVariant.residenceType, scene: makeDesign(scene, "Floorplan analysis"), userGoal: prompt }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "户型分析失败");
      if (!isSessionCurrent(requestSessionId)) return;
      setFloorplanAnalysis(data.analysis);
      setClarificationDraft("");
      setClarificationNote("");
      setClarificationResolution("");
      setExpandedSuggestionIds([]);
    } catch (e: any) {
      if (e?.name !== "AbortError" && isSessionCurrent(requestSessionId)) setError(e?.message || "户型分析失败");
    } finally {
      releaseSessionRequest(controller);
      if (isSessionCurrent(requestSessionId)) setAnalysisBusy(false);
    }
  }

  function applyClarification() {
    const question = floorplanAnalysis?.clarificationQuestion?.trim();
    const answer = clarificationDraft.trim();
    if (!question) return;
    if (!answer || (answer === CLARIFICATION_OPTIONS[2] && !clarificationNote.trim())) {
      setError("请先选择待确认问题的处理方式；如选择其他安排，请补充说明。");
      return;
    }
    const resolvedAnswer = answer === CLARIFICATION_OPTIONS[2]
      ? `${answer}：${clarificationNote.trim()}`
      : answer;
    const resolution = `针对待确认问题：${question}\n用户选择：${resolvedAnswer}`;
    setClarificationResolution(resolution);
    changeModificationDraft(prompt.includes(resolution) ? prompt : [prompt.trim(), resolution].filter(Boolean).join("\n"));
    setError("");
  }

  function focusPendingClarification() {
    clarificationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const input = clarificationRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:not([type='hidden']):checked, textarea, input:not([type='hidden'])");
      input?.focus();
    }, 180);
  }

  function focusPromptEditor() {
    promptEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => promptEditorRef.current?.focus(), 180);
  }

  function handleAdjustmentPrimaryAction() {
    if (!modificationRequest.trim()) {
      setError("请填写修改要求后再继续。");
      focusPromptEditor();
      return;
    }
    if (hasPendingClarification) {
      setError("请先回答待确认问题，确认后再生成户型。");
      focusPendingClarification();
      return;
    }
    void startDesignAdjustment();
  }

  function toggleSuggestion(suggestion: FloorplanAnalysis["suggestions"][number]) {
    const instruction = suggestion.editableInstruction.trim();
    if (!instruction) return;
    changeModificationDraft(prompt.includes(instruction) ? prompt.split("\n").filter((line) => line.trim() !== instruction).join("\n").trim() : [prompt.trim(), instruction].filter(Boolean).join("\n"));
  }

  function regionPoint(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function startRegion(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    regionStart.current = regionPoint(event);
    setSelectedRegion(null);
  }
  function updateRegion(event: PointerEvent<HTMLDivElement>) {
    if (!regionStart.current) return;
    const end = regionPoint(event); const start = regionStart.current;
    setSelectedRegion({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y), coordinateSpace: "source-image", sourceImageHash: selectedVariant.imageHash || "pending", baseVersionId: selectedFloorplanVersionId || "original" });
  }
  function finishRegion(event: PointerEvent<HTMLDivElement>) {
    updateRegion(event); regionStart.current = null;
  }

  async function generateRenders(fresh = false): Promise<boolean> {
    if (!modelMatchesSelection) { setError("请先完成当前户型的3D空间创建"); return false; }
    const job = { ...selectionEpoch.current };
    const requestRevision = sceneRevision;
    const requestScene = sceneForPersistence.current;
    const isCurrent = () => selectionJobCurrent(job, selectionEpoch.current) && sceneForPersistence.current === requestScene;
    setError("");
    setRenderBusy(true);
    const selected = capturedViews.find((v) => v.id === activeCaptureId && (v.image || v.screenshotDataUrl));
    if (!selected) {
      setError("请先选择一个已保存的空间视角");
      setRenderBusy(false);
      return false;
    }
    if (selected.sceneRevision !== requestRevision || !sameModelBinding((selected as any).modelBinding, modelBindingRef.current)) {
      setError("此视角属于之前的场景，请返回3D空间重新拍摄");
      setRenderBusy(false);
      return false;
    }
    const sourceImage = selected.image || selected.screenshotDataUrl;
    if (!/^data:image\/(?:png|jpeg|jpg);base64,/i.test(sourceImage || "") || sourceImage.length < 1000) {
      setError("当前拍摄视角没有有效图片，请返回3D空间重新拍摄");
      setRenderBusy(false);
      return false;
    }
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    try {
      setCapturedViews((current) => current.map((view) => view.id === selected.id ? { ...view, status: "rendering" } : view));
      renderAbortController.current = controller;
      const renderStyleId = lockedStyleId || selectedStyleId;
      const data = await generateInterior({
        image: sourceImage,
        prompt: buildInteriorPrompt(renderStyleId),
        styleId: renderStyleId,
        roomType: selected.roomType || inferRoomType(selected.roomName),
        roomName: selected.roomName,
        captureId: selected.id,
        camera: selected.camera,
        sessionId,
        sceneRevision,
        signal: controller.signal,
        fresh,
      });
      if (controller.signal.aborted || renderAbortController.current !== controller || !isSessionCurrent(requestSessionId) || !isCurrent()) return false;
      const main = data.image as GeneratedImage;
      setCapturedViews((current) => current.map((view) => view.id === selected.id ? {
        ...view,
        status: "done",
        styleId: renderStyleId,
        styleName: INTERIOR_STYLE_PRESETS[renderStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约",
        stylePrompt: buildInteriorPrompt(renderStyleId),
        renderedImage: {
          url: main.url,
          provider: main.provider,
          model: main.model,
          requestId: main.requestId,
          generation: main.generation,
          sourceCaptureId: selected.id,
          sourceImage,
          styleId: renderStyleId,
          styleName: INTERIOR_STYLE_PRESETS[renderStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约",
          camera: selected.camera,
          createdAt: new Date().toISOString(),
        },
      } : view));
      setOverall(main);
      setActiveCaptureId(selected.id);
      return true;
    } catch (e: any) {
      if (controller.signal.aborted || e?.name === "AbortError" || renderAbortController.current !== controller || !isSessionCurrent(requestSessionId) || !isCurrent()) return false;
      console.error("[Interior Generation Failed]", {
        error: e,
        captureId: selected.id,
        selectedStyleId,
      });
      setCapturedViews((current) => current.map((view) => view.id === selected.id ? { ...view, status: "failed" } : view));
      setError(e?.message || "本次装修效果暂时没有生成完成。");
      return false;
    } finally {
      releaseSessionRequest(controller);
      const ownsRequest = renderAbortController.current === controller;
      if (ownsRequest) renderAbortController.current = null;
      if (ownsRequest && isSessionCurrent(requestSessionId) && selectionJobCurrent(job, selectionEpoch.current)) {
        setRenderBusy(false);
        setCapturedViews((current) => current.map((view) => view.id === selected.id && view.status === "rendering" ? { ...view, status: "captured" } : view));
      }
    }
  }

  async function generateBom(): Promise<boolean> {
    if (!modelMatchesSelection) { setError("请先完成当前户型的3D空间创建"); return false; }
    const job = { ...selectionEpoch.current };
    const requestScene = sceneForPersistence.current;
    const isCurrent = () => selectionJobCurrent(job, selectionEpoch.current) && sceneForPersistence.current === requestScene;
    setError("");
    setBomBusy(true);
    const requestSessionId = sessionId;
    const controller = createSessionRequest();
    const design = makeDesign(scene, layoutRun?.summary || "Touch Design");
    const effectiveSettings: ResidentialBudgetSettings = {
      ...defaultResidentialBudgetSettings(),
      ...budgetSettings,
      priceDate: budgetSettings.priceDate || new Date().toISOString().slice(0, 10),
    };
    const localFallback = () => buildResidentialBudget(design, effectiveSettings);
    let timeout: number | null = null;
    try {
      timeout = window.setTimeout(() => controller.abort(), 180000);
      const res = await fetch("/api/bom/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          design,
          sessionId: requestSessionId,
          sourceImageHash: selectedVariant.imageHash,
          sceneRevision,
          variantId: selectedVariant.variantId,
          residenceType: selectedVariant.residenceType,
          budgetSettings: effectiveSettings,
          taskType: "residential",
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          `${data?.model || "Qwen BOM"}：${data?.error || "BOM生成失败"}`,
        );
      if (!isSessionCurrent(requestSessionId) || !isCurrent()) return false;
      const nextBudget = data.budget && Array.isArray(data.budget.items) && data.budget.items.length > 0 ? data.budget as ResidentialBudget : localFallback();
      setBom(data.bom || null);
      setBudget(nextBudget);
      return true;
    } catch (e: any) {
      if (e?.name !== "AbortError" && isSessionCurrent(requestSessionId)) console.warn("[BOM] remote generation failed, using local rules", e);
      if (!isSessionCurrent(requestSessionId) || !isCurrent()) return false;
      setBudget(localFallback());
      setBom(null);
      setSubmitMsg("远程预算服务未及时响应，已切换为本地完整预算，可继续查看和提交施工。");
      return true;
    } finally {
      if (timeout !== null) window.clearTimeout(timeout);
      releaseSessionRequest(controller);
      if (isSessionCurrent(requestSessionId) && selectionJobCurrent(job, selectionEpoch.current)) setBomBusy(false);
    }
  }

  function updateBudgetItem(itemId: string, patch: Partial<ResidentialBudget["items"][number]>) {
    setBudget((current) => current ? recalculateResidentialBudget({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }) : current);
  }

  function saveResidentialBudget() {
    if (!budget || !sessionId || !modelMatchesSelection) return;
    localStorage.setItem(sessionStorageKey(sessionId, `budget:${selectedVariant.variantId}:${sceneRevision}`), JSON.stringify({ modelBinding, budget }));
    setSubmitMsg("预算已保存到当前户型和方案版本");
  }

  async function startDesignAdjustment(fresh = false) {
    if (adjustmentInFlight.current || originalSelectionInFlight.current || layoutBusy || floorplanBusy) return;
    const normalizedPrompt = modificationRequest.trim();
    if (!normalizedPrompt) {
      setError("请输入或选择一条户型调整需求");
      return;
    }
    if (hasUnsavedChanges) { setError("请先在 Step3 保存或取消手动调整，再提交户型改造需求。"); return; }
    adjustmentInFlight.current = true;
    const requestSessionId = sessionId;
    const previewWaitMs = svgSource ? 4000 + Math.round(Math.random() * 3000) : 150000;
    const progressId = beginProgressTask("image-preview", previewWaitMs);
    const imageRequestId = floorplanRequestId.current + 1;
    // Estimates only drive progress presentation; completion never waits on a timer.
    const imageReady = await generateFloorplan(fresh);
    if (!isSessionCurrent(requestSessionId) || imageRequestId !== floorplanRequestId.current) return;
    if (imageReady) completeProgressTask(progressId);
    else completeProgressTask(
      progressId,
      floorplanError.current
        ? `图片预览未能显示：${floorplanError.current}`
        : "图片预览请求已取消或户型状态已变化，请确认当前户型后重试。",
    );
    adjustmentInFlight.current = false;
  }

  async function startStructureAdjustment() {
    if (structureBusy || variantImporting || floorplanBusy || !selectedVariant.imageHash || !modificationRequest.trim()) return;
    const requestScene = sceneForPersistence.current, instruction = modificationRequest.trim();
    const job = { ...selectionEpoch.current }, controller = createSessionRequest();
    const isCurrent = () => selectionJobCurrent(job, selectionEpoch.current) && sceneForPersistence.current === requestScene;
    setStructureBusy(true); setError("");
    try {
      const response = await fetch("/api/ai/structure-edit", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: selectedVariant.variantId, scene: requestScene, instruction }), signal: controller.signal });
      const data = await response.json();
      if (!isCurrent() || controller.signal.aborted) return;
      if (!response.ok || !data.ok || !data.validation?.valid || data.inputFingerprint !== structureEditFingerprint(requestScene))
        throw new Error((data.issues || ["结构修改未通过校验，原场景保留"]).join("；"));
      const nextScene = cloneScene(data.scene);
      if (!assertPascalSceneIntegrity(nextScene).valid || !validateVariantBlueprint(sceneToFloorplanBlueprint(nextScene)).valid)
        throw new Error("返回的结构无法保存，原场景保留");
      const url = await structureScenePng(nextScene);
      if (!isCurrent() || controller.signal.aborted) return;
      const versionId = `structure-${data.requestId}`;
      const result: GeneratedImage = { provider: "qwen", model: `${data.model}/validated-structure`, url,
        ephemeral: false, fallback: false, sourceVariantId: selectedVariant.variantId,
        sourceImageHash: selectedVariant.imageHash || "", userPrompt: instruction, geometryVerified: true,
        warnings: ["此二维图由已校验SceneGraph绘制；全部原家具保留，电视柜在客厅内移位。"] };
      const binding = floorplanModelBinding(selectedVariant.variantId, result, versionId)!;
      Object.assign(nextScene.nodes.building_house.metadata ||= {}, { floorplanSource: "source-driven-pascal-v2",
        sourceDrawing: url, sourceImageHash: await hashDataUrl(url), variantId: selectedVariant.variantId,
        modelBinding: binding, model: data.model });
      if (!isCurrent() || controller.signal.aborted) return;
      // The store receives a fully validated clone. No preview or failed model
      // response reaches React state, persistent versions, or the Pascal store.
      const commit = commitStructureScene(requestScene, nextScene, (snapshot) => applySceneSnapshot(snapshot as any, { origin: "host" }));
      if (!commit.ok) throw new Error(commit.issue);
      applyGeneratedScene(nextScene, true, true);
      invalidateConfirmedSelection(binding);
      selectionEpoch.current.binding = binding;
      confirmedBindingRef.current = binding; modelBindingRef.current = binding;
      setConfirmedBinding(binding); setModelBinding(binding);
      selectedFloorplanVersionIdRef.current = versionId;
      setFloorplanVersions((current) => [...current, { id: versionId, sourceVariantId: selectedVariant.variantId,
        sourceImageHash: result.sourceImageHash!, submittedRequirement: instruction, result, requestId: data.requestId,
        createdAt: new Date().toISOString(), validationStatus: "ready", sceneSnapshot: cloneScene(nextScene) }]);
      setSelectedFloorplanVersionId(versionId); setFloorplan(result);
      setAiFloorplan({ sourceVariantId: selectedVariant.variantId, sourceImageHash: result.sourceImageHash!, prompt: instruction,
        url, model: result.model, provider: "qwen", ephemeral: false, fallback: false });
      setModelGenerationPhase("completed"); setModel3DLoaded(true); setModelExperience("viewer"); setFloorPlanConfirmed(true);
      setStructureVisualPreview(null); setLayoutProgress(`结构修改已校验：书房${data.validation.studyAreaM2.toFixed(2)}㎡，原家具全部保留，电视柜移位。`);
      setModelSourceNotice({ source: "structure", reason: "本地Qwen结构操作已校验，二维与三维采用同一场景" }); setSlide(2);
    } catch (error: any) {
      if (!controller.signal.aborted && isCurrent()) setError(`${error.message || "结构修改失败"}；原户型未提交更改。`);
    } finally { releaseSessionRequest(controller); setStructureBusy(false); }
  }

  async function generateStructureVisualPreview(fresh = false) {
    const version = floorplanVersions.find((entry) => entry.id === selectedFloorplanVersionId);
    if (!version?.sceneSnapshot || !modelMatchesSelection || structureBusy || floorplanBusy) return;
    const job = { ...selectionEpoch.current }, snapshot = sceneForPersistence.current, controller = createSessionRequest();
    floorplanAbortController.current = controller;
    setFloorplanBusy(true); setError("");
    try {
      const response = await fetch("/api/ai/floorplan-image", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceImage: version.result.url, instruction: "仅优化此二维户型的线条和视觉配色。保留全部现有墙体、房间和门窗位置。", fresh }), signal: controller.signal });
      const data = await response.json();
      if (!selectionJobCurrent(job, selectionEpoch.current) || snapshot !== sceneForPersistence.current) return;
      if (!response.ok || !data.image?.url) throw new Error("视觉预览未完成");
      setStructureVisualPreview(data.image.url);
    } catch (error: any) { if (!controller.signal.aborted && selectionJobCurrent(job, selectionEpoch.current) && snapshot === sceneForPersistence.current) setError(error.message); }
    finally { releaseSessionRequest(controller); if (floorplanAbortController.current === controller) { floorplanAbortController.current = null; if (selectionJobCurrent(job, selectionEpoch.current)) setFloorplanBusy(false); } }
  }

  async function startRenderGeneration(fresh = false) {
    const requestSessionId = sessionId;
    const progressId = beginProgressTask("render");
    const ready = await generateRenders(fresh);
    if (!isSessionCurrent(requestSessionId)) return;
    if (ready) completeProgressTask(progressId);
    else setProgressTask((current) => current?.id === progressId ? null : current);
  }

  async function useOriginalFloorplan() {
    if (!canSelectOriginalFloorplan({ variantLoading: variantImporting, imageJobActive: floorplanBusy || adjustmentInFlight.current, layoutJobActive: layoutBusy, modelJobActive: modelGenerationPhase === "generating" || Boolean(modelGenerationAbortController.current), selectionActive: originalSelectionInFlight.current, progressActive: Boolean(progressTask) })) return;
    originalSelectionInFlight.current = true;
    setOriginalSelectionBusy(true);
    setError("");
    const requestSessionId = sessionId;
    const requestVariantId = variantRequestId.current;
    const job = { ...selectionEpoch.current };
    const controller = createSessionRequest();
    try {
      const bytes = selectedVariant.imageDataUrl || await imageUrlToDataUrl(selectedVariant.imageUrl, controller.signal);
      const imageHash = await hashDataUrl(bytes);
      if (!isSessionCurrent(requestSessionId) || !selectionJobCurrent(job, selectionEpoch.current) || requestVariantId !== variantRequestId.current || controller.signal.aborted || floorplanAbortController.current || adjustmentInFlight.current || modelGenerationAbortController.current) return;
      const original = originalFloorplanSelection(selectedVariant, imageHash, currentFloorplanContext.current.prompt);
      setSelectedVariant((current) => current.variantId === selectedVariant.variantId ? { ...current, imageDataUrl: bytes, imageHash } : current);
      setFloorplan(original);
      setAiFloorplan(null);
      setSelectedFloorplanVersionId(null);
      setEditSourceVersionId(null);
      confirmFloorPlanSelection(original);
    } catch (selectionError: any) {
      if (selectionError?.name !== "AbortError" && isSessionCurrent(requestSessionId)) setError(selectionError?.message || "原始户型暂时无法加载，请重试");
    } finally {
      originalSelectionInFlight.current = false;
      if (isSessionCurrent(requestSessionId)) setOriginalSelectionBusy(false);
      releaseSessionRequest(controller);
    }
  }

  function confirmFloorPlan() { confirmFloorPlanSelection(modifiedFloorPlan); }

  function selectFloorplanVersion(version: FloorplanVersion) {
    const binding = floorplanModelBinding(version.sourceVariantId, version.result, version.id);
    if (!sameModelBinding(binding, selectionEpoch.current.binding)) invalidateConfirmedSelection(binding);
    selectedFloorplanVersionIdRef.current = version.id;
    setSelectedFloorplanVersionId(version.id);
    setPrompt(version.submittedRequirement);
    setFloorplan(version.result);
    setAiFloorplan({ sourceVariantId: version.sourceVariantId, sourceImageHash: version.sourceImageHash, prompt: version.submittedRequirement, url: version.result.url, model: version.result.model, provider: version.result.provider, ephemeral: version.result.ephemeral, fallback: version.result.fallback, fallbackReason: version.result.fallbackReason });
  }

  function confirmFloorPlanSelection(selection: FloorplanSelection | null) {
    if (!selection) {
      setError("请先生成并确认您的户型方案");
      return;
    }
    const version = selection.provider === "preset" ? undefined : floorplanVersions.find((entry) => entry.id === selectedFloorplanVersionId);
    if (selection.provider !== "preset" && !version?.sceneSnapshot && selection.geometryVerified !== true) {
      setError("请先选择已校验结构版本；当前图片仅是视觉预览，可采用原始户型继续3D。");
      return;
    }
    const binding = floorplanModelBinding(selectedVariant.variantId, selection, version?.id, aiFloorplan, version);
    if (!binding) { setError("此户型图片缺少可恢复的来源，请重新选择或生成"); return; }
    const committed = committedSceneRef.current;
    const preserveCompletedModel = sameModelBinding(binding, modelBindingRef.current) && sameModelBinding(binding, committed.nodes.building_house?.metadata?.modelBinding) && assertPascalSceneIntegrity(committed).valid && validateVariantBlueprint(sceneToFloorplanBlueprint(committed)).valid;
    if (version?.sceneSnapshot && !preserveCompletedModel) {
      const snapshot = cloneScene(version.sceneSnapshot);
      if (!sameModelBinding(binding, snapshot.nodes.building_house?.metadata?.modelBinding) ||
        snapshot.nodes.building_house?.metadata?.sourceDrawing !== binding.canonicalImageUrl ||
        !assertPascalSceneIntegrity(snapshot).valid || !validateVariantBlueprint(sceneToFloorplanBlueprint(snapshot)).valid) {
        setError("此结构版本的来源或几何无效，未提交更改"); return;
      }
      const commit = commitStructureScene(sceneForPersistence.current, snapshot, (next) => applySceneSnapshot(next as any, { origin: "host" }));
      if (!commit.ok) { setError(commit.issue); return; }
      invalidateConfirmedSelection(binding);
      selectionEpoch.current.binding = binding;
      confirmedBindingRef.current = binding; modelBindingRef.current = binding;
      setConfirmedBinding(binding); setModelBinding(binding);
      applyGeneratedScene(snapshot, true, true);
      setFloorplan(selection); setPrompt(selection.userPrompt || ""); setFloorPlanConfirmed(true);
      setModelGenerationPhase("completed"); setModel3DLoaded(true); setModelExperience("viewer"); setSlide(2);
      return;
    }
    if (!sameModelBinding(binding, selectionEpoch.current.binding)) invalidateConfirmedSelection(binding);
    cancelModelGenerationTimers();
    selectionEpoch.current.binding = binding;
    confirmedBindingRef.current = binding;
    setConfirmedBinding(binding);
    setFloorplan(selection);
    setPrompt(selection.userPrompt || "");
    setFloorPlanConfirmed(true);
    if (preserveCompletedModel) {
      applySceneSnapshot(cloneScene(committed) as any, { origin: "host" });
      setScene(cloneScene(committed));
      setModelGenerationPhase("completed");
      setModel3DLoaded(true);
      setModelExperience("viewer");
      setProgressTask(null);
      setSlide(2);
      return;
    }
    setModelGenerationPhase("idle");
    setModel3DLoaded(false);
    setCapturedViews([]);
    setActiveCaptureId(null);
    setOverall(null);
    setRoomImages([]);
    setBom(null);
    setBudget(null);
    setModelExperience("intro");
    setProgressTask(null);
    // `setFloorPlanConfirmed` is asynchronous. Navigating through `go(2)`
    // immediately after it would read the previous `false` value and keep
    // the user on STEP 2. The presence of `modifiedFloorPlan` was validated
    // above, so commit the confirmation and advance in the same transaction.
    setSlide(2);
  }

  async function startBomGeneration() {
    const requestSessionId = sessionId;
    const progressId = beginProgressTask("bom");
    const ready = await generateBom();
    if (!isSessionCurrent(requestSessionId)) return;
    if (ready) completeProgressTask(progressId);
    else completeProgressTask(progressId, "工程清单暂时无法生成，请稍后重试。");
  }

  function submitToContractor() {
    if (!modelMatchesSelection) { setError("请先完成当前户型的3D空间创建"); return; }
    const now = Date.now(),
      design: DesignVersion = {
        ...makeDesign(scene, layoutRun?.summary || `${config.label} AI设计`),
        id: `touch-approved-${now}`,
        status: "approved",
      };
    const base = JSON.parse(JSON.stringify(createDemoOrders()[0])) as Order;
    const effectiveBudget = budget || buildResidentialBudget(makeDesign(scene, layoutRun?.summary || `${config.label} AI设计`), {
      ...defaultResidentialBudgetSettings(),
      ...budgetSettings,
      priceDate: budgetSettings.priceDate || new Date().toISOString().slice(0, 10),
    });
    if (!budget) setBudget(effectiveBudget);
    let order: Order = {
      ...base,
      id: `DH-TOUCH-${String(now).slice(-6)}`,
      customer: "展厅住户",
      projectName: `${config.label} · AI/Pascal联动方案`,
      status: "design",
      approvedVersion: 1,
      designVersions: [design],
      draftVersionId: undefined,
      changeRequest: undefined,
      aiLayoutHistory: layoutRun
        ? [
            {
              id: layoutRun.id,
              provider: layoutRun.provider,
              model: layoutRun.model,
              prompt: layoutRun.prompt,
              summary: layoutRun.summary,
              operations: layoutRun.operations,
              toolLog: layoutRun.toolLog,
              validation: layoutRun.validation,
              createdAt: layoutRun.createdAt,
              designVersion: 1,
            },
          ]
        : [],
      visualConcepts: [],
      videoConcepts: [],
      detailedBom: undefined,
    };
    order = syncOrderDownstream(order, design);
    const visuals: VisualConcept[] = [];
    if (overall)
      visuals.push({
        id: `overall-${now}`,
        style: INTERIOR_STYLE_PRESETS[selectedStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约",
        room: "整体",
        prompt: overall.prompt || "",
        imageDataUrl: overall.url,
        provider: overall.provider === "qwen" ? "qwen-image" : "mock",
        status: "ready",
        createdAt: new Date().toISOString(),
      });
    for (const r of roomImages)
      visuals.push({
        id: `room-${r.roomId}-${now}`,
        style: INTERIOR_STYLE_PRESETS[selectedStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约",
        roomId: r.roomId,
        room: r.roomName,
        prompt: r.image.prompt || "",
        imageDataUrl: r.image.url,
        provider: r.image.provider === "qwen" ? "qwen-image" : "mock",
        status: "ready",
        createdAt: new Date().toISOString(),
      });
    order = { ...order, detailedBom: bom || undefined, residentialBudget: effectiveBudget, visualConcepts: visuals };
    const existing = loadOrders();
    try {
      saveOrders([order, ...existing.filter((x) => x.id !== order.id)]);
    } catch (error) {
      // Large base64 previews can exceed localStorage; keep the order and IDs usable.
      const compactVisuals = (visuals: VisualConcept[]) => visuals.map((visual) => ({ ...visual, imageDataUrl: undefined }));
      const compactOrder = { ...order, visualConcepts: compactVisuals(visuals), drawing: order.drawing ? { ...order.drawing, previewDataUrl: undefined } : order.drawing };
      const compactExisting = existing.map((savedOrder) => ({
        ...savedOrder,
        visualConcepts: compactVisuals(savedOrder.visualConcepts || []),
        drawing: savedOrder.drawing ? { ...savedOrder.drawing, previewDataUrl: undefined } : savedOrder.drawing,
      }));
      try {
        saveOrders([compactOrder, ...compactExisting.filter((x) => x.id !== order.id)]);
      } catch (retryError) {
        try {
          saveOrders([compactOrder]);
        } catch (finalError) {
          console.error("[Contractor Submit] unable to persist order", { error, retryError, finalError });
          setSubmitMsg("订单保存失败，请清理浏览器本地空间后重试。");
          return;
        }
      }
    }
    setSubmitMsg(`已提交 ${order.id} 到远程监工，正在打开施工端…`);
    window.setTimeout(() => window.location.assign("/contractor"), 250);
  }

  const restartButton = <button type="button" className="session-reset-button" onClick={confirmResetSession}>重新开始</button>;

  return (
    <main className={`touch-customer-page ${slide === 1 ? "is-adjusting" : ""} ${walkthroughMode ? "is-walkthrough-active" : ""}`}>
      <header className="touch-topbar">
        <div>
          <Link href="/" className="touch-brand">
            IDEAL HOME 理想家
          </Link>
          <span>把家的想法，变成看得见的空间</span>
        </div>
        <BeijingConstructionLogo />
      </header>
      <section className="touch-stage">
        {slide === 0 && (
          <div className="touch-slide">
            <div className="touch-slide-head">
              <div>
                <small>STEP 1</small>
                <h1>先选择一个喜欢的户型</h1>
                <p>
                  我们会以这个户型为基础，为您创建可以自由调整的3D居住空间。
                </p>
              </div>
              <div><span className="touch-guidance-badge">点击卡片选择具体户型</span>{restartButton}</div>
            </div>
            <div className="residence-touch-grid">
              {RESIDENCES.map((x) => (
                <button
                  key={x.key}
                  className={residence === x.key ? "selected" : ""}
                  onClick={() => selectResidence(x.key)}
                >
                  <img
                    src={
                      selectedVariant.residenceType === x.key
                        ? selectedVariant.imageUrl
                        : x.image
                    }
                    alt={x.label}
                  />
                  <div>
                    <b>{x.label}</b>
                    <span>{x.sub}</span>
                    <small>
                      {selectedVariant.residenceType === x.key
                        ? "已选择此户型"
                        : "点击查看更多方案"}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {slide === 1 && (
          <div className="touch-slide step-adjustment-slide">
            <div className="touch-slide-head">
              <div>
                <small>STEP 2</small>
                <h1>调整您的户型</h1>
                <p>您可以像和设计师沟通一样描述自己的需求。</p>
              </div>
              <div>
                <button className="ghost" onClick={() => go(0)}>
                  上一页
                </button>
                <button type="button" disabled={!modifiedFloorPlan} onClick={confirmFloorPlan}>下一页</button>
                {restartButton}
                {!modifiedFloorPlan && <small className="step2-next-hint">可生成修改方案，或直接使用原户型创建3D空间</small>}
              </div>
            </div>
            <div className="design-adjustment-grid">
              <article className="touch-panel customer-prompt-panel">
                <div className="customer-prompt-header">
                  <h2>告诉我们您想怎么调整</h2>
                </div>
                {svgSource ? <div className="floorplan-example-list" aria-label="修改示例">
                  <button type="button" onClick={() => changeModificationDraft("在客餐厅合适的墙角新增一个矩形卧室，方向不限，保留入户通道和厨房、卫生间的位置")}>客餐厅增加卧室（方向不限）</button>
                  <button type="button" onClick={() => changeModificationDraft("在主卧内新增一个卫生间，需要加两面隔墙和一扇门")}>主卧增加卫生间</button>
                  <button type="button" onClick={() => changeModificationDraft("在客厅和阳台之间加一扇推拉门")}>客厅与阳台增加推拉门</button>
                </div> : <FloorplanEditExamples onSelect={(text) => {
                  changeModificationDraft(text);
                  window.setTimeout(() => promptEditorRef.current?.focus(), 0);
                }} />}
                <div className="customer-prompt-editor">
                  <label htmlFor="step2-modification-request">我的修改要求</label>
                  <textarea id="step2-modification-request" ref={promptEditorRef} value={prompt} onChange={(event) => changeModificationDraft(event.target.value)} placeholder={"例如：\n我希望增加一个卧室，\n同时保留厨房和卫生间的位置。"} />
                  {modifiedFloorPlan && modificationRequest !== (modifiedFloorPlan.userPrompt || "") && <div className="customer-result-note">当前仍保留已保存方案；新的文字需求尚未应用。生成失败不会替换原方案。</div>}
                  <small>户型改造会检查房间、入口和厨卫位置；家具请在 Step3 手动调整。</small>
                  <small className="customer-editor-status">{hasPendingClarification ? "还有待确认问题，请先完成回答。" : modificationRequest.trim() ? "需求已保存为当前草稿，可继续修改。" : "请填写修改要求"}</small>
                  {!svgSource && selectedVariant.variantId === "one-option-01" && <button type="button" className="touch-primary-cta" disabled={structureBusy || floorplanBusy || variantImporting || !selectedVariant.imageHash || !modificationRequest.trim()} onClick={() => void startStructureAdjustment()}>{structureBusy ? "正在理解需求并校验结构…" : "AI结构修改：客餐厅上侧新增书房"}</button>}
                  {!svgSource && selectedVariant.variantId === "one-option-01" && <small>当前仅支持上侧书房；保留全部家具，电视柜可在客厅内移位。校验失败保留原户型。</small>}
                  <button type="button" className="ghost" disabled={structureBusy || floorplanBusy || originalSelectionBusy || !modificationRequest.trim()} onClick={selectedImageVersion?.sceneSnapshot && !selectedImageVersion.svgSource ? () => void generateStructureVisualPreview() : handleAdjustmentPrimaryAction}>
                    {floorplanBusy ? "正在生成方案……" : svgSource ? "AI 修改户型并校验结构" : "生成AI图片预览（不作为结构依据）"}
                  </button>
                  <button type="button" className="ghost" disabled={!canSelectOriginalFloorplan({ variantLoading: variantImporting, imageJobActive: floorplanBusy || adjustmentInFlight.current, layoutJobActive: layoutBusy, modelJobActive: modelGenerationPhase === "generating", selectionActive: originalSelectionBusy, progressActive: Boolean(progressTask) })} onClick={() => void useOriginalFloorplan()}>{originalSelectionBusy ? "正在准备原户型…" : "使用原户型创建3D空间"}</button>
                  {modifiedFloorPlan && <div className="customer-result-note">{modifiedFloorPlan.provider === "preset" ? "已选择原始户型，可以进入3D空间" : modifiedFloorPlan.geometryVerified === true ? "结构方案已通过程序几何校验，可确认后进入3D空间" : "图片预览已生成，不表示结构修改已完成"}</div>}
                  {floorplanVersions.length > 0 && <div className="customer-result-note">已保留 {floorplanVersions.length} 个户型版本：{floorplanVersions.map((version, index) => <span key={version.id}><button type="button" className={version.id === selectedFloorplanVersionId ? "active" : "ghost"} onClick={() => selectFloorplanVersion(version)}>{`V${index + 1}`}</button><button type="button" className="ghost" onClick={() => { editSourceVersionIdRef.current = version.id; floorplanAbortController.current?.abort(); setEditSourceVersionId(version.id); }}>{editSourceVersionId === version.id ? "当前修改基准" : "继续修改此版本"}</button></span>)}</div>}
                  {assetSaveError && <div className="customer-error-note">{assetSaveError}</div>}
                  {structureVisualPreview && <div><small>AI视觉预览，结构仍采用已校验SceneGraph</small><img src={structureVisualPreview} alt="AI视觉预览" /></div>}
                  {floorplanBusy && <button type="button" className="ghost" onClick={() => { floorplanRequestId.current += 1; floorplanAbortController.current?.abort(); floorplanAbortController.current = null; adjustmentInFlight.current = false; setFloorplanBusy(false); setProgressTask(null); }}>取消图片生成</button>}
                  {!floorplanBusy && modifiedFloorPlan?.provider === "qwen" && <button type="button" className="ghost" onClick={() => void (selectedImageVersion?.sceneSnapshot && !selectedImageVersion.svgSource ? generateStructureVisualPreview(true) : startDesignAdjustment(true))}>重新生成图片预览</button>}
                  <small>图片仅用于视觉预览；房间、墙体和门窗修改以已校验结构为准。</small>
                  {modifiedFloorPlan && <button type="button" className="touch-primary-cta" onClick={modifiedFloorPlan.provider !== "preset" && !selectedImageVersion?.sceneSnapshot && modifiedFloorPlan.geometryVerified !== true ? () => void useOriginalFloorplan() : confirmFloorPlan}>{modifiedFloorPlan.provider === "preset" ? "继续使用原户型创建3D空间" : selectedImageVersion?.sceneSnapshot || modifiedFloorPlan.geometryVerified === true ? "确认结构并创建3D空间" : "以原始结构继续3D（图片仅作预览）"}</button>}
                  {error && <div className="customer-error-note">{debugUi ? error : customerErrorMessage(error)}</div>}
                  {floorPlanConfirmed && <div className="customer-result-note">已确认当前户型，您仍可以返回这里继续修改。</div>}
                </div>
              </article>
              <div className="floorplan-compare-grid customer-floorplan-compare">
                <article className="touch-panel"><h3>原始户型</h3><div style={{ position: "relative", touchAction: "none" }} onPointerDown={startRegion} onPointerMove={updateRegion} onPointerUp={finishRegion}><img src={selectedVariant.imageUrl} alt="原始户型" />{selectedRegion && <span aria-label="已选择修改区域" style={{ position: "absolute", left: `${selectedRegion.x * 100}%`, top: `${selectedRegion.y * 100}%`, width: `${selectedRegion.width * 100}%`, height: `${selectedRegion.height * 100}%`, border: "2px solid #1d5c52", background: "rgba(29,92,82,.16)", pointerEvents: "none" }} />}</div><button type="button" className="ghost" onClick={() => setSelectedRegion(null)}>清除区域选择</button>{editSourceVersionId && <button type="button" className="ghost" onClick={() => setEditSourceVersionId(null)}>重新基于原始户型修改</button>}</article>
                <article className="touch-panel">
                  <h3>{visibleFloorplan?.provider === "preset" ? "当前采用的原始户型" : visibleFloorplan?.geometryVerified === true ? "已通过几何校验的结构方案" : svgSource ? "改造后的户型" : "AI图片预览"}</h3>
                  {floorplanBusy ? (
                    <div className="floorplan-generation-state" aria-live="polite">
                      <strong>{svgSource ? "正在修改户型" : "正在生成AI图片预览"}</strong>
                      <span>{svgSource ? "正在理解改造需求，并检查二维结构…" : "正在根据原始图片和您的描述生成预览…"}</span>
                      <div className="floorplan-generation-dots"><i /><i /><i /></div>
                    </div>
                  ) : visibleFloorplan ? <img src={visibleFloorplan.url} alt={visibleFloorplan.provider === "preset" ? "当前采用的原始户型" : visibleFloorplan.geometryVerified === true ? "已通过几何校验的结构方案" : "AI图片预览"} /> : <div className="touch-empty">输入您的需求后，我们会在这里展示图片预览。</div>}
                  {visibleFloorplan?.warnings?.map((warning, index) => <div key={index} className="customer-old-result-note" role="status">{warning}</div>)}
                  {visibleFloorplan && !modifiedFloorPlan && <div className="customer-old-result-note">
                    <span>{visibleFloorplan.provider === "preset" ? "右侧仍保留原始户型；当前文字修改尚未执行。" : visibleFloorplan.geometryVerified === true ? "右侧仍保留上一次已校验的结构方案；当前草稿尚未生成新结果。" : "右侧仍保留上一次的图片预览；当前草稿尚未生成新结果。"}</span>
                    <button type="button" className="touch-primary-cta" onClick={() => confirmFloorPlanSelection(visibleFloorplan)}>继续采用此结果并进入下一步</button>
                  </div>}
                </article>
              </div>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="touch-slide step3-slide">
            <div className="touch-slide-head">
              <div><small>STEP 3</small><h1>创建您的3D空间</h1><p>我们会根据您确认的户型，建立墙体、地面、门窗以及基础家具。</p></div>
              <div><button className="ghost" onClick={() => go(1)}>上一页</button><button disabled={!modelMatchesSelection} onClick={() => go(3)}>下一页</button>{restartButton}</div>
            </div>
            {modelExperience !== "viewer" ? (
              <section className="model-generation-intro">
                <div className="model-generation-image"><img src={modifiedFloorPlan?.url || selectedVariant.imageUrl} alt="已确认的户型" /><span>{config.label} · 方案 {displayOptionIndex(selectedVariant.residenceType, selectedVariant.optionIndex)}</span></div>
                <div className="model-generation-copy"><small>已确认户型</small><h2>为您的户型创建3D空间</h2><p>{liveModelBusy ? "Qwen将识别原图中的墙体、房间和门窗，并通过Pascal重新建模。生成结果需要与原图核对。" : modifiedFloorPlan?.provider === "preset" ? "我们会核对原始户型图并载入对应的三维模型，您可以继续手动调整可编辑隔墙和门。" : "我们会读取最终户型图，依次建立墙体、房间、门窗和基础家具。生成过程会实时显示在编辑器中。"}</p><ul><li>还原户型墙体与房间轮廓</li><li>放置门窗并检查通行关系</li><li>加入适合房间的基础家具</li></ul>{modelGenerationPhase === "error" && <div className="customer-error-note">3D空间暂时无法加载。</div>}<button className="touch-primary-cta" onClick={() => void startModelGeneration()} disabled={modelExperience === "generating"}>{modelExperience === "generating" ? "正在创建3D空间" : modelGenerationPhase === "error" ? "重新创建3D空间" : "创建3D空间"}</button></div>
              </section>
            ) : (
            <div className={`touch-model-grid model-viewer-grid ${wallEditMode ? "wall-mode-grid" : ""}`}>
              <article className="touch-panel pascal-panel">
                {scene.nodes.building_house?.metadata?.floorplanSource === "verified-preset" && <div className="customer-result-note" role="status">内置户型图已核对，已载入对应的三维模型</div>}
                {error && <div className="customer-error-note" role="alert">{debugUi ? error : customerErrorMessage(error)}</div>}
                {scene.nodes.building_house?.metadata?.floorplanSource === "svg-deterministic/v1" && <div className="customer-result-note" role="status">已从当前方案实时构建三维空间；如需 AI 修改，请在 STEP 2 提交需求。</div>}
                {scene.nodes.building_house?.metadata?.floorplanSource === "mcp-qwen38-vulkan" && <div className="customer-result-note" role="status">Qwen3.8 看图现场建模 · 已通过程序校验，请对照原图核对房间和门窗</div>}
                {scene.nodes.building_house?.metadata?.floorplanSource === "mcp-qwen38-vulkan" && scene.nodes.building_house?.metadata?.scaleEstimated && (
                  <div className="customer-result-note" role="status">尺寸按标准门宽 0.86m 估算</div>
                )}
                {scene.nodes.building_house?.metadata?.floorplanSource === "fallback-prebuilt" && (
                  <div className="customer-error-note" role="alert">生成未成功，当前为预制模型预览：{String(scene.nodes.building_house?.metadata?.fallbackReason || modelSourceNotice?.reason || "本地3D生成未通过校验")} <button className="ghost" onClick={() => void startModelGeneration()}>重新创建3D空间</button></div>
                )}
                <div className="panel-inline-head">
                  <div>
                    <h3>我的3D户型</h3>
                    <p>调整家具和门的位置，或进入房间自由漫游。</p>
                  </div>
                  <div className="model-action-toolbar">
                    <button className="ghost" disabled={modelGenerationPhase === "generating" || hasUnsavedChanges || walkthroughMode} title="根据当前确认的二维图重新建模；成功后替换当前3D，失败恢复之前场景" onClick={() => void startModelGeneration("ai-live")}>{svgSource ? "从当前方案重新构建3D" : "Qwen现场重建3D"}</button>
                    {modifiedFloorPlan?.provider === "preset" && !svgSource && <button className="ghost" disabled={modelGenerationPhase === "generating" || hasUnsavedChanges || walkthroughMode} onClick={() => void startModelGeneration()}>载入目录3D</button>}
                    <button className="ghost" onClick={resetModel}>恢复推荐方案</button>
                    <button className="touch-primary-cta" onClick={() => saveCurrentVariantDesign(scene, "当前户型调整已保存")}>保存调整</button>
                    <button className="ghost" onClick={cancelDraftEdits} disabled={!hasUnsavedChanges}>取消本次调整</button>
                    <span className={`draft-save-status ${hasUnsavedChanges ? "pending" : "saved"}`} aria-live="polite">
                      {hasUnsavedChanges ? "● 尚未保存" : "✓ 已保存"}
                    </span>
                    <button className={editMode ? "active" : "ghost"} onClick={toggleFurnitureEditing}>{editMode ? "完成家具调整" : "调整家具"}</button>
                    <button className={doorEditMode ? "active" : "ghost"} onClick={toggleDoorEditing}>{doorEditMode ? "完成门调整" : "调整门"}</button>
                    <button className={doorPlacementMode ? "active" : "ghost"} onClick={() => {
                      setEditMode(false);
                      setDoorEditMode(false);
                      setDoorPlacementMode((value) => !value);
                      setWallEditMode(true);
                      setPascalViewMode("top");
                      setSelectedWallIds([]);
                      setLayoutProgress("添加门模式：请在顶视图选择一面可编辑墙体");
                    }}>{doorPlacementMode ? "退出添加门" : "添加门"}</button>
                    <button className={wallEditMode ? "active" : "ghost"} onClick={toggleWallEditing}>{wallEditMode ? "完成墙体修正" : "修正墙体"}</button>
                    <button className={walkthroughMode ? "active" : "ghost"} onClick={() => {
                      setEditMode(false);
                      setDoorEditMode(false);
                      setDoorPlacementMode(false);
                      setWallEditMode(false);
                      setSelectedWallIds([]);
                      setPascalViewMode("3d");
                      setWalkthroughMode((value) => !value);
                    }}>{walkthroughMode ? "退出漫游" : "进入漫游"}</button>
                  </div>
                </div>
                <div className="pascal-view-toolbar">
                   <div className="pascal-view-tabs" role="tablist" aria-label="空间视图">
                    <button className={pascalViewMode === "3d" ? "active" : ""} onClick={() => { setWallEditMode(false); setPascalViewMode("3d"); }}>3D</button>
                    <button className={pascalViewMode === "top" ? "active" : ""} onClick={() => { setDoorEditMode(false); setPascalViewMode("top"); }}>Top View</button>
                    <button disabled={!selectedModifiedFloorplan?.url} title={!selectedModifiedFloorplan?.url ? "请先生成修改后的户型" : "原始户型与当前修改版本叠加"} className={pascalViewMode === "overlay" ? "active" : ""} onClick={() => { if (!selectedModifiedFloorplan?.url) return; setDoorEditMode(false); console.info("[OVERLAY DEBUG]", { originalVariantId: selectedVariant.variantId, modifiedVersionId: selectedFloorplanVersionId || "current", hasOriginalImage: Boolean(selectedVariant.imageUrl), hasModifiedImage: Boolean(selectedModifiedFloorplan.url), renderMode: "modified-base-plus-original-overlay" }); setPascalViewMode("overlay"); }}>原图叠加</button>
                  </div>
                  {pascalViewMode === "overlay" && blueprintCalibration && (
                    <div className="overlay-calibration-controls">
                      <label className="overlay-opacity-control">
                        <span>透明度 {overlayOpacity}%</span>
                        <input aria-label="原图透明度" type="range" min="0" max="100" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
                      </label>
                      <label><span>缩放 {blueprintCalibration.imageScale.toFixed(2)}×</span><input aria-label="原图缩放" type="range" min="0.5" max="1.8" step="0.01" value={blueprintCalibration.imageScale} onChange={(event) => updateBlueprintCalibration({ imageScale: Number(event.target.value) })} /></label>
                      <label><span>旋转 {blueprintCalibration.imageRotation.toFixed(0)}°</span><input aria-label="原图旋转" type="range" min="-180" max="180" step="1" value={blueprintCalibration.imageRotation} onChange={(event) => updateBlueprintCalibration({ imageRotation: Number(event.target.value) })} /></label>
                      <label><span>X {blueprintCalibration.imageOffsetX.toFixed(2)}m</span><input aria-label="原图水平偏移" type="range" min="-5" max="5" step="0.05" value={blueprintCalibration.imageOffsetX} onChange={(event) => updateBlueprintCalibration({ imageOffsetX: Number(event.target.value) })} /></label>
                      <label><span>Y {blueprintCalibration.imageOffsetY.toFixed(2)}m</span><input aria-label="原图垂直偏移" type="range" min="-5" max="5" step="0.05" value={blueprintCalibration.imageOffsetY} onChange={(event) => updateBlueprintCalibration({ imageOffsetY: Number(event.target.value) })} /></label>
                    </div>
                  )}
                </div>
                {wallEditMode && (
                  <div className="wall-edit-toolbar">
                    <div className="wall-edit-actions">
                      <button title="撤销 Ctrl+Z" disabled={!wallUndoStack.length} onClick={undoWallEdit}>撤销</button>
                      <button title="重做 Ctrl+Y" disabled={!wallRedoStack.length} onClick={redoWallEdit}>重做</button>
                      <button className={wallAddMode ? "active" : ""} onClick={() => setWallAddMode((value) => !value)}>{wallAddMode ? "取消新增" : "新增墙"}</button>
                      <button disabled={selectedWallIds.length !== 1} onClick={requestWallDelete}>删除墙</button>
                      <button disabled={selectedWallIds.length < 2} onClick={() => runWallEdit("补齐墙体缺口", () => bridgeWallGap(scene, selectedWallIds[0], selectedWallIds[1]))}>补齐缺口</button>
                      <button disabled={selectedWallIds.length < 2} onClick={() => runWallEdit("拉直所选墙", () => straightenWallChain(scene, selectedWallIds))}>拉直所选墙</button>
                      <button disabled={selectedWallIds.length < 2} onClick={() => runWallEdit("合并共线墙", () => mergeCollinearWalls(scene, selectedWallIds))}>合并共线墙</button>
                    </div>
                    <div className="wall-edit-selection">
                      {selectedWall ? (
                        <>
                          <b>{debugUi ? selectedWall.wallId : "已选择墙体"}</b>
                          <span>长度 {selectedWall.length.toFixed(3)}m</span>
                          {debugUi && <span>Start [{selectedWall.start.map((value) => value.toFixed(2)).join(", ")}]</span>}
                          {debugUi && <span>End [{selectedWall.end.map((value) => value.toFixed(2)).join(", ")}]</span>}
                          <span>厚 {selectedWall.thickness.toFixed(2)}m · 高 {selectedWall.height.toFixed(2)}m</span>
                          <span>{selectedWall.locked ? "不可调整" : "可以调整"}</span>
                        </>
                      ) : <span>{selectedWallIds.length ? `已选择 ${selectedWallIds.length} 面墙` : "点击墙体选择；Shift/Ctrl 点击可多选"}</span>}
                    </div>
                    <div className={`wall-edit-message ${error ? "invalid" : ""}`}>{error ? (debugUi ? error : customerErrorMessage(error)) : layoutProgress}</div>
                  </div>
                )}
                {doorPlacementMode && (
                  <div className="door-placement-toolbar">
                    <b>添加门</b>
                    <span>{selectedWallIds.length === 1 ? "已选择墙体，请确认门的位置" : "请选择需要安装门的墙体"}</span>
                    <button type="button" className="touch-primary-cta" disabled={selectedWallIds.length !== 1} onClick={addDraftDoor}>确认添加</button>
                    <button type="button" className="ghost" onClick={() => { setDoorPlacementMode(false); setWallEditMode(false); setSelectedWallIds([]); setPascalViewMode("3d"); }}>退出添加门</button>
                  </div>
                )}
                <div className="touch-pascal-host">
                  <PascalViewer
                    key={`${selectedVariant.variantId}:${modelBinding?.versionId || "unconfirmed"}`}
                    scene={scene}
                    revision={sceneRevision}
                    editMode={editMode}
                    selectedItemId={selectedItemId}
                    onSelectItem={setSelectedItemId}
                    onNudgeItem={(id, dx, dz) => updateFurniture(id, dx, dz)}
                    onRotateItem={(id, d) =>
                      updateFurniture(id, 0, 0, d)
                    }
                    onDragCommit={(id, x, z) => {
                      setScene((current) => placeFurniture(current, id, x, z));
                      setSceneRevision((value) => value + 1);
                      markBlueprintDirty();
                    }}
                    selectedItemLabel={
                      selectedItemId ? scene.nodes[selectedItemId]?.name : ""
                    }
                    doorEditMode={doorEditMode}
                    selectedDoorId={selectedDoorId}
                    onSelectDoor={setSelectedDoorId}
                    onMoveDoor={commitDoorMove}
                    onDeleteDoor={deleteDraftDoor}
                    onToggleDoorHinge={(id) => toggleDraftDoorProperty(id, "hinge")}
                    onToggleDoorSwing={(id) => toggleDraftDoorProperty(id, "swing")}
                    doorPlacementMode={doorPlacementMode}
                    onPickDoorWall={(wallId) => {
                      setSelectedWallIds([wallId]);
                      setLayoutProgress("已选择墙体，请点击“确认添加”创建临时门");
                    }}
                    wallEditMode={wallEditMode}
                    selectedWallIds={selectedWallIds}
                    wallAddMode={wallAddMode}
                    onSelectWall={selectWall}
                    onWallEndpointCommit={(wallId, endpoint, point) => runWallEdit(
                      `${endpoint === "start" ? "调整起点" : "调整终点"} ${wallId}`,
                      () => updateWallEndpoint(scene, wallId, endpoint, point, { snap: true, snapDistance: 0.15 }),
                    )}
                    onWallParallelCommit={(wallId, distance) => runWallEdit(
                      `平行移动 ${wallId}`,
                      () => moveWallParallel(scene, wallId, distance),
                    )}
                    onAddWallCommit={(start, end) => {
                      runWallEdit("新增隔墙", () => addPartitionWall(scene, start, end, { snap: true }));
                      setWallAddMode(false);
                    }}
                    debugUi={debugUi}
                    viewMode={pascalViewMode}
                    blueprintImageUrl={selectedVariant.imageUrl}
                    modifiedBlueprintImageUrl={selectedModifiedFloorplan?.url}
                    overlayOpacity={overlayOpacity}
                    blueprintCalibration={blueprintCalibration || undefined}
                    walkthroughMode={walkthroughMode}
                    onExitWalkthrough={() => setWalkthroughMode(false)}
                    onCaptureView={captureView}
                    captureDisabled={capturedViews.length >= 5}
                    sessionId={sessionId}
                    roomName={rooms.find((room) => room.roomId === activeRenderRoomId)?.roomName}
                  />
                </div>
                {furniturePresetStatus && (
                  <div className="furniture-preset-status">
                    {furniturePresetStatus}
                  </div>
                )}
              </article>
            </div>
            )}
          </div>
        )}

        {slide === 3 && (
          <div className="touch-slide">
            <div className="touch-slide-head">
              <div>
                <small>STEP 4</small>
                <h1>选择视角并生成装修效果</h1>
                <p>在3D空间中自由移动，保存喜欢的位置和观察角度，然后选择其中一个视角生成装修效果。</p>
              </div>
              <div>
                <button className="ghost" onClick={() => go(2)}>
                  上一页
                </button>
                <button onClick={() => setWalkthroughMode(true)}>进入3D空间</button>
                <button disabled={renderBusy || !activeCaptureId || !hasValidSelectedCaptureImage || !selectedCaptureIsCurrent} onClick={() => void startRenderGeneration()}>
                  {renderBusy ? "正在生成装修效果" : "生成装修效果"}
                </button>
                {renderBusy && <button className="ghost" onClick={() => { renderAbortController.current?.abort(); setRenderBusy(false); setProgressTask(null); setCapturedViews((current) => current.map((view) => view.status === "rendering" ? { ...view, status: "captured" } : view)); }}>取消生成</button>}
                <button onClick={() => go(4)}>下一页</button>
                {restartButton}
              </div>
            </div>
            {error && <div className="customer-error-note" role="alert">{debugUi ? error : customerErrorMessage(error)}</div>}
            {selectedCaptureForRender && !selectedCaptureIsCurrent && <div className="customer-error-note" role="alert">此视角属于之前的场景，请进入3D空间重新拍摄；旧视角可在下方删除。</div>}
            {walkthroughMode && (
              <div className="touch-panel walkthrough-capture-panel">
                <div className="panel-inline-head">
                  <div>
                    <h3>在房间中选择视角</h3>
                    <p>移动到喜欢的位置并保存，最多可以保存5个视角。</p>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => setWalkthroughMode(false)}
                  >
                    退出漫游
                  </button>
                </div>
                <div className="touch-pascal-host">
                  <PascalViewer
                    key={`${selectedVariant.variantId}:${modelBinding?.versionId || "unconfirmed"}:walk`}
                    scene={scene}
                    revision={sceneRevision}
                    walkthroughMode
                    onExitWalkthrough={() => setWalkthroughMode(false)}
                    onCaptureView={captureView}
                    captureDisabled={capturedViews.length >= 5}
                    debugUi={debugUi}
                    sessionId={sessionId}
                    roomName={rooms.find((room) => room.roomId === activeRenderRoomId)?.roomName}
                  />
                </div>
              </div>
            )}
            <div className="render-touch-grid">
              <article className="touch-panel render-main-panel">
                {selectedCaptureForRender?.renderedImage?.url && hasValidSelectedCaptureImage ? (
                  <div className="interior-result-wrap">
                    <div className="interior-result-head">
                      <div>
                        <strong>AI装修图片已生成</strong>
                        <small>装修图片为视觉预览，房间与门窗结构以3D场景为准。</small>
                        <span>装修风格：{selectedCaptureForRender.renderedImage.styleName || INTERIOR_STYLE_PRESETS[selectedStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约"}</span>
                        <small>{selectedCaptureForRender.renderedImage.generation?.cacheHit ? "已复用相同视角和风格的效果" : selectedCaptureForRender.renderedImage.generation?.elapsedMs ? `本地AI生成 · ${(selectedCaptureForRender.renderedImage.generation.elapsedMs / 1000).toFixed(1)}秒` : "本地AI装修效果"}</small>
                      </div>
                      <div className="comparison-mode-toggle" role="group" aria-label="装修前后查看方式">
                        <button className={comparisonMode === "slider" ? "active" : ""} onClick={() => setComparisonMode("slider")}>滑动对比</button>
                        <button className={comparisonMode === "side-by-side" ? "active" : ""} onClick={() => setComparisonMode("side-by-side")}>并排查看</button>
                        <button type="button" className="ghost" onClick={() => openRenderLightbox(
                          selectedCaptureForRender.renderedImage!.url,
                          "装修前后互动对比",
                          selectedCaptureForRender.image || selectedCaptureForRender.screenshotDataUrl,
                        )}>放大互动对比</button>
                      </div>
                    </div>
                    {comparisonMode === "slider" ? (
                      <BeforeAfterComparison
                        beforeImage={selectedCaptureForRender.image || selectedCaptureForRender.screenshotDataUrl}
                        afterImage={selectedCaptureForRender.renderedImage.url}
                      />
                    ) : (
                      <div className="before-after-side-by-side">
                        <figure><img src={selectedCaptureForRender.image || selectedCaptureForRender.screenshotDataUrl} alt="装修前" /><figcaption>装修前</figcaption></figure>
                        <figure><img className="zoomable-render-image" src={selectedCaptureForRender.renderedImage.url} alt="装修后" onClick={() => openRenderLightbox(
                          selectedCaptureForRender.renderedImage!.url,
                          "装修前后互动对比",
                          selectedCaptureForRender.image || selectedCaptureForRender.screenshotDataUrl,
                        )} /><figcaption>装修后 · 点击放大互动对比</figcaption></figure>
                      </div>
                    )}
                  </div>
                ) : selectedCaptureForRender && hasValidSelectedCaptureImage ? (
                  <div className="source-capture-preview">
                    <img src={selectedCaptureImage} alt="当前拍摄视角" />
                    <span>已选择当前视角，点击“生成装修效果”开始设计。</span>
                  </div>
                ) : selectedCaptureForRender && !hasValidSelectedCaptureImage ? (
                  <div className="touch-empty">当前拍摄视角没有有效图片，请返回3D空间重新拍摄。</div>
                ) : renderView ? (
                  <img src={renderView.url} alt="当前空间视角" />
                ) : (
                  <div className="touch-empty">请先进入房间保存视角，再生成装修效果。</div>
                )}
                <div className="render-caption">
                  <b>{activeCaptureId ? `当前选择：${capturedViews.find((v) => v.id === activeCaptureId) ? captureRoomLabel(capturedViews.find((v) => v.id === activeCaptureId)!, rooms) : "视角"}` : "未选择视角"}</b>
                  <div className="view-library-wrap">
                    <span>已保存视角 {capturedViews.length} / 5</span>
                    <div className="view-library">
                      {capturedViews.map((v, index) => (
                        <button
                          key={v.id}
                          disabled={renderBusy}
                          className={activeCaptureId === v.id ? "active" : ""}
                          onClick={() => setActiveCaptureId(v.id)}
                        >
                          <img src={v.image || v.screenshotDataUrl} alt={`视角 ${index + 1}`} />
                          <span>{captureRoomLabel(v, rooms) === "视角" ? `空间视角 ${index + 1}` : captureRoomLabel(v, rooms)}</span>
                          {activeCaptureId === v.id && <strong>✓ 当前选择</strong>}
                          <i
                            onClick={(e) => {
                              e.stopPropagation();
                              setCapturedViews((current) => current.filter((x) => x.id !== v.id));
                              if (activeCaptureId === v.id)
                                setActiveCaptureId(null);
                              if (v.renderedImage && activeCaptureId === v.id) setOverall(null);
                            }}
                          >
                            删除
                          </i>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="interior-style-selector">
                    <h3>选择装修风格</h3>
                    <div className="interior-style-grid">
                      {Object.values(INTERIOR_STYLE_PRESETS).map((style) => (
                        <button key={style.id} disabled={renderBusy || Boolean(lockedStyleId && lockedStyleId !== style.id)} className={selectedStyleId === style.id ? "active" : ""} onClick={() => setSelectedStyleId(style.id)}>
                          {style.name}{selectedStyleId === style.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                    {error && <div className="customer-error-note">{debugUi ? error : customerErrorMessage(error)}</div>}
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}

        {slide === 4 && (
          <div className="touch-slide step5-budget-slide">
            <div className="touch-slide-head">
              <div>
                <small>STEP 5</small>
                <h1>装修预算与采购清单</h1>
                <p>
                  根据当前户型、确认方案和装修条件整理施工项目、材料、家具与家电预算。
                </p>
              </div>
              <div>
                <button className="ghost" onClick={() => go(3)}>
                  上一页
                </button>
                <button disabled={bomBusy} onClick={() => void (budget ? setBomDetailsVisible(true) : startBomGeneration())}>
                  {bomBusy ? "正在核算预算" : budget ? "查看预算明细" : "核算预算"}
                </button>
                <button className="ghost" disabled={!budget} onClick={saveResidentialBudget}>保存预算</button>
                <button onClick={submitToContractor}>提交施工</button>
                {restartButton}
                <button type="button" className="session-complete-button" onClick={confirmResetSession}>完成本次设计并清空</button>
              </div>
            </div>
            <div className="bom-touch-layout">
              <div className="budget-overview-grid">
                <section className="final-plan-summary touch-panel">
                  <h2>最终确认方案</h2>
                  <p>{floorPlanConfirmed ? "户型已确认" : "户型尚未确认"} · {model3DLoaded ? "3D空间已生成" : "3D空间待生成"}</p>
                  <p>已保存视角 {capturedViews.length} / 5 · 装修风格 {INTERIOR_STYLE_PRESETS[selectedStyleId as keyof typeof INTERIOR_STYLE_PRESETS]?.name || "现代简约"}</p>
                  {activeCaptureId && capturedViews.find((view) => view.id === activeCaptureId)?.renderedImage && <img className="final-plan-render zoomable-render-image" onClick={() => openRenderLightbox(capturedViews.find((view) => view.id === activeCaptureId)?.renderedImage?.url || "", "AI装修效果")} src={capturedViews.find((view) => view.id === activeCaptureId)?.renderedImage?.url} alt="AI装修效果" />}
                </section>
                <section className="budget-primary-summary touch-panel" aria-live="polite">
                  <div>
                    <span>{budget ? "预计总预算" : "预算结果"}</span>
                    <strong>{budget ? `¥ ${budget.summary.plannedFunds.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "等待核算"}</strong>
                    <small>{budget ? `已计价 ${budget.summary.pricedTotal.toFixed(2)} 元 · ${budget.summary.pendingCount} 项待复核` : "设置预算条件后点击核算预算"}</small>
                  </div>
                  {budget && <button type="button" className="ghost" onClick={() => setBomDetailsVisible((visible) => !visible)}>{bomDetailsVisible ? "收起详细清单" : "查看详细清单"}</button>}
                </section>
              </div>
              <div className="bom-metrics-touch residential-budget-meta">
                <span>当前户型<b>{config.label} · {selectedVariant.variantId}</b></span>
                <span>当前方案<b>V{selectedFloorplanVersionId || sceneRevision}</b></span>
                <span>预算日期<b>{budgetSettings.priceDate}</b></span>
                <span>预算状态<b>{budget?.summary.status || "尚未核算"}</b></span>
              </div>
              <section className="touch-panel residential-budget-settings">
                <h2>预算条件</h2>
                <div className="budget-settings-grid">
                  <label>所在城市<select value={budgetSettings.city} onChange={(e) => setBudgetSettings((s) => ({ ...s, city: e.target.value }))}><option value="">请选择城市</option><option value="北京">北京</option><option value="上海">上海</option><option value="深圳">深圳</option><option value="广州">广州</option><option value="杭州">杭州</option><option value="成都">成都</option><option value="武汉">武汉</option><option value="南京">南京</option><option value="重庆">重庆</option></select></label>
                  <label>房屋现状<select value={budgetSettings.condition} onChange={(e) => setBudgetSettings((s) => ({ ...s, condition: e.target.value as ResidentialBudgetSettings["condition"] }))}><option>毛坯装修</option><option>旧房翻新</option><option>精装局部改造</option></select></label>
                  <label>装修范围<select value={budgetSettings.scope} onChange={(e) => setBudgetSettings((s) => ({ ...s, scope: e.target.value as ResidentialBudgetSettings["scope"] }))}><option>全屋装修</option><option>指定房间</option><option>指定项目</option></select></label>
                  {budgetSettings.scope === "指定房间" && <label>目标房间<select value={budgetSettings.roomId || ""} onChange={(e) => setBudgetSettings((s) => ({ ...s, roomId: e.target.value }))}><option value="">请选择房间</option>{rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.roomName}</option>)}</select></label>}
                  <label>预算档次<select value={budgetSettings.grade} onChange={(e) => setBudgetSettings((s) => ({ ...s, grade: e.target.value as ResidentialBudgetSettings["grade"] }))}><option>经济</option><option>标准</option><option>品质</option><option>自定义</option></select></label>
                  <label>承包方式<select value={budgetSettings.contract} onChange={(e) => setBudgetSettings((s) => ({ ...s, contract: e.target.value as ResidentialBudgetSettings["contract"] }))}><option>清包</option><option>半包</option><option>全包</option></select></label>
                  <label>家具家电<select value={budgetSettings.furniture} onChange={(e) => setBudgetSettings((s) => ({ ...s, furniture: e.target.value as ResidentialBudgetSettings["furniture"] }))}><option>全部新购</option><option>部分保留</option><option>已有设备继续使用</option></select></label>
                  <label>报价日期<input type="date" value={budgetSettings.priceDate} onChange={(e) => setBudgetSettings((s) => ({ ...s, priceDate: e.target.value }))} /></label>
                </div>
                <p className="budget-note">城市未设置时，价格显示为商品或地区参考估算，不代表当地实时报价。调整条件后请重新核算。</p>
              </section>
              <article className="touch-panel bom-touch-panel">
                {budget && bomDetailsVisible ? (
                  <div className="detailed-bom-scroll touch-inner-scroll">
                    <div className="budget-tabs">{(["汇总", "工种", "房间", "家具家电"] as const).map((tab) => <button key={tab} className={budgetView === tab ? "active" : ""} onClick={() => setBudgetView(tab)}>{tab === "工种" ? "按工种查看" : tab === "房间" ? "按房间查看" : tab}</button>)}</div>
                    <div className="budget-summary-cards"><span>已计价合计<b>{budget.summary.pricedTotal.toFixed(2)} 元</b></span><span>装修工程费用<b>{budget.summary.constructionTotal.toFixed(2)} 元</b></span><span>材料采购费用<b>{budget.summary.materialTotal.toFixed(2)} 元</b></span><span>家具软装<b>{budget.summary.furnitureTotal.toFixed(2)} 元</b></span><span>家电设备<b>{budget.summary.applianceTotal.toFixed(2)} 元</b></span><span>计划资金（含预留金）<b>{budget.summary.plannedFunds.toFixed(2)} 元</b></span></div>
                    <table className="detailed-bom-table">
                      <thead>
                        <tr>
                          <th>项目名称</th>
                          <th>所属空间</th>
                          <th>规格</th>
                          <th>数量</th><th>单位</th><th>单价</th><th>项目合计</th><th>状态与备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budget.items.filter((x) => budgetView === "汇总" || budgetView === "家具家电" ? (budgetView === "汇总" || ["家具与软装", "家电与设备"].includes(x.category)) : budgetView === "房间" ? Boolean(x.room) : true).map((x) => (
                          <tr key={x.id}>
                            <td><b>{x.name}</b><small>{x.category}</small></td><td>{x.room || "全屋"}</td><td>{x.specification}</td>
                            <td><input className="budget-number-input" type="number" min="0" step="0.01" value={x.quantity} onChange={(e) => updateBudgetItem(x.id, { quantity: Number(e.target.value) || 0 })} /></td><td>{x.unit}</td>
                            <td><input className="budget-number-input" type="number" min="0" step="0.01" value={x.materialUnitPrice ?? 0} onChange={(e) => updateBudgetItem(x.id, { materialUnitPrice: Number(e.target.value) || 0 })} /><small>材料；人工 {x.laborCost.toFixed(2)} 元</small></td>
                            <td><strong>{x.total.toFixed(2)} 元</strong><small>材料 {x.materialCost.toFixed(2)} · 人工 {x.laborCost.toFixed(2)} · 安装 {x.installationCost.toFixed(2)}</small></td>
                            <td><span>{x.priceStatus} · {x.quantityStatus}</span><small>{x.purchaseBy} · {x.calculationBasis}{x.notes ? `；${x.notes}` : ""}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : budget ? (
                  <div className="bom-ready-summary">
                    <h2>装修预算已整理完成</h2>
                    <p>已计价项目合计 {budget.summary.pricedTotal.toFixed(2)} 元；另有 {budget.summary.pendingCount} 项工程量待复核。当前为{budget.summary.status}，不是最终施工报价。</p>
                    <button onClick={() => setBomDetailsVisible(true)}>查看详细清单</button>
                  </div>
                ) : (
                  <div className="touch-empty">点击“核算预算”，根据当前确认户型和装修条件生成施工、采购与家具家电预算。</div>
                )}
              </article>
              {submitMsg && (
                <div className="touch-submit-msg">
                  {submitMsg} <Link href="/contractor">打开远程监工 →</Link>
                </div>
              )}
            </div>
          </div>
        )}

      </section>
      {pickerResidence &&
        (() => {
          const picker = RESIDENCES.find((x) => x.key === pickerResidence)!;
          return (
            <div
              className="floorplan-picker-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label={`${picker.label}户型选择`}
            >
              <div className="floorplan-picker">
                <div className="floorplan-picker-head">
                  <div>
                    <small>选择户型方案</small>
                    <h2>{picker.label}</h2>
                    <p>
                      请选择一张作为当前户型。确认后，我们会带您进入3D空间创建页面。
                    </p>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => setPickerResidence(null)}
                  >
                    关闭
                  </button>
                </div>
                <div className="floorplan-picker-grid">
                  {picker.options.map((image, index) => (
                    <button
                      key={image}
                      className={
                        selectedVariant.imageUrl === image ? "selected" : ""
                      }
                      onClick={() => choosePresetImage(pickerResidence, image)}
                    >
                      <img
                        src={image}
                        alt={`${picker.label}方案 ${index + 1}`}
                      />
                      <span>方案 {index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      {wallDeletePrompt && (
        <div className="floorplan-picker-backdrop" role="dialog" aria-modal="true" aria-label="删除墙体确认">
          <div className="wall-delete-dialog">
            <small>墙体安全检查</small>
            <h2>当前墙体包含门窗</h2>
            <p>{debugUi ? `${wallDeletePrompt.wallId} 上` : "这面墙上"}有 {wallDeletePrompt.openingCount} 个门窗，请选择处理方式。</p>
            <div>
              <button className="ghost" onClick={() => setWallDeletePrompt(null)}>取消</button>
              <button className="ghost" onClick={() => deleteWallWithPolicy("migrate")}>迁移门窗</button>
              <button onClick={() => deleteWallWithPolicy("delete")}>连同门窗删除</button>
            </div>
          </div>
        </div>
      )}
      {idleWarningSeconds !== null && (
        <div className="session-idle-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-idle-title">
          <div className="session-idle-dialog">
            <small>公共终端会话保护</small>
            <h2 id="session-idle-title">本次设计即将结束</h2>
            <p>长时间未操作，本次设计将在 {idleWarningSeconds} 秒后结束。</p>
            <button type="button" onClick={() => setIdleWarningSeconds(null)}>继续设计</button>
          </div>
        </div>
      )}
      {captureToast && <div className="viewer-capture-toast" role="status" aria-live="polite">{captureToast}</div>}
      {renderLightbox && (
        <div className="render-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="放大查看装修效果" onClick={closeRenderLightbox}>
          <div className="render-lightbox" onClick={(event) => event.stopPropagation()}>
            <div className="render-lightbox-head">
              <strong>{renderLightbox.title}</strong>
              <div>
                <button type="button" className="ghost" onClick={() => setRenderScale((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}>缩小</button>
                <button type="button" className="ghost" onClick={() => setRenderScale(1)}>重置</button>
                <button type="button" className="ghost" onClick={() => setRenderScale((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}>放大</button>
                <button type="button" onClick={closeRenderLightbox}>关闭</button>
              </div>
            </div>
            <div className="render-lightbox-viewport" onWheel={(event) => {
              event.preventDefault();
              setRenderScale((value) => Math.max(0.5, Math.min(3, Number((value + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)))));
            }}>
              {renderLightbox.beforeUrl ? (
                <div className="render-lightbox-comparison-stage" style={{ transform: `scale(${renderScale})` }}>
                  <BeforeAfterComparison beforeImage={renderLightbox.beforeUrl} afterImage={renderLightbox.url} />
                </div>
              ) : (
                <img src={renderLightbox.url} alt={renderLightbox.title} style={{ transform: `scale(${renderScale})` }} />
              )}
            </div>
            <small>{renderLightbox.beforeUrl ? "拖动中间分界线查看装修前后" : "查看渲染图细节"} · 当前缩放 {Math.round(renderScale * 100)}%</small>
          </div>
        </div>
      )}
      <DebugPanel enabled={debugUi}>
        <section>
          <h3>Runtime</h3>
          <code>Mode: {status?.mode || "unknown"}</code>
          <code>Text: {status?.services?.text?.healthy ? "connected" : "offline"}</code>
          <code>Vision: {status?.services?.vision?.healthy ? "connected" : "offline"}</code>
          <code>Image: {status?.services?.image?.healthy ? "connected" : "offline"}</code>
          <code>MCP: {status?.services?.mcp?.healthy ? "connected" : "offline"}</code>
          <code>Vulkan: {status?.services?.vulkan?.healthy ? "ready" : "offline"}</code>
          <code>Layout model: {status?.models.layout || "Qwen3.8-27B-UD-Q4_K_XL"}</code>
          <code>Image model: {status?.models.image || "Qwen-Image-2.1"}</code>
        </section>
        <section>
          <h3>Design Session</h3>
          <code>Variant: {selectedVariant.variantId}</code>
          <code>Image hash: {selectedVariant.imageHash || "pending"}</code>
          <code>Scene revision: {sceneRevision}</code>
          <code>Pascal source: {blueprintSource}</code>
          {error && <code>Error: {error}</code>}
        </section>
        <section>
          <h3>Pascal Validation</h3>
          <code>Baseline: {baseline.valid ? "PASS" : baseline.issues.join("; ")}</code>
          <code>Blueprint: {blueprintValidation.valid ? "PASS" : blueprintValidation.issues.join("; ")}</code>
          <code>Compile RMS: {Number.isFinite(blueprintValidation.compileCoordinateErrorM) ? blueprintValidation.compileCoordinateErrorM.toFixed(4) : "N/A"}m</code>
          <code>Walls: {baseline.walls} / Zones: {baseline.zones} / Doors: {baseline.doors} / Windows: {baseline.windows}</code>
          {calibrationValidation && <code>Calibration: {calibrationValidation.status} / Area error {calibrationValidation.metrics.areaError.toFixed(2)}㎡ / Bounds error {calibrationValidation.metrics.boundsError.width.toFixed(3)}m × {calibrationValidation.metrics.boundsError.depth.toFixed(3)}m</code>}
        </section>
        {layoutRun && (
          <section>
            <h3>Qwen Layout</h3>
            <code>Provider: {layoutRun.provider}</code>
            <code>Model: {layoutRun.model}</code>
            <code>Validation: {layoutRun.validation.valid ? "PASS" : "FAIL"}</code>
            {layoutRun.goalVerification && <code>Goal verification: {layoutRun.goalVerification.satisfied ? "PASS" : "FAIL"}</code>}
            {sceneDiff && <code>Topology: {sceneDiff.topologyChanged ? "YES" : "NO"} / Semantic: {sceneDiff.semanticChanged ? "YES" : "NO"} / Furniture: {sceneDiff.furnitureChanged ? "YES" : "NO"}</code>}
            <div className="customer-debug-operations">
              {layoutRun.toolLog.map((log) => <code key={log.index}>{log.index}. {log.tool} / {log.ok ? "PASS" : "FAIL"} / {JSON.stringify(log.args)}</code>)}
            </div>
          </section>
        )}
        {visibleFloorplan && <section><h3>Floorplan Image</h3><code>Provider: {visibleFloorplan.provider}</code><code>Model: {visibleFloorplan.model}</code><code>Source variant: {visibleFloorplan.sourceVariantId}</code></section>}
        {scene.nodes.building_house?.metadata?.structureEdit && <section><h3>Qwen Structure Edit</h3><code>{JSON.stringify(scene.nodes.building_house.metadata.structureEdit)}</code></section>}
        {renderView && <section><h3>Walkthrough Render</h3><code>Provider: {renderView.provider}</code><code>Model: {renderView.model}</code></section>}
        {bom && <section><h3>BOM</h3><code>Provider: {bom.aiProvider}</code><code>Status: {bom.aiStatus}</code></section>}
      </DebugPanel>
      {progressTask && progressMeta && (
        <GenerationProgressModal
          title={progressMeta.title}
          stages={svgEditProgress ? [{label:"Qwen 理解修改需求"},{label:"执行并校验结构修改"},{label:"渲染同版本二维预览"}] : PROGRESS_STAGES[progressTask.kind]}
          progress={progressValue}
          elapsedSeconds={progressElapsed}
          estimatedSeconds={progressTask.totalDurationMs ? Math.ceil(progressTask.totalDurationMs / 1000) : progressMeta.estimatedSeconds}
          ready={progressPresentationReady}
          error={progressTask.error}
          maxProgress={progressTask.kind === "model" ? 100 : progressTask.kind === "layout" ? 95 : 92}
          showTimeoutMessage={progressTask.kind !== "model" && progressTask.kind !== "image-preview" && progressTask.kind !== "render"}
          currentStageDetail={svgEditProgress ? "正在理解需求并检查二维结构和通行关系…" : "正在处理请求，请稍候…"}
          completeTitle={progressMeta.completeTitle}
          completeDescription={progressMeta.completeDescription}
          actionLabel={progressMeta.actionLabel}
          onAction={closeProgressTask}
          allowFallback={false}
        />
      )}
      <footer className="touch-step-footer">
        {SLIDES.slice(0, 5).map((x, i) => (
          <button
            key={x}
            className={slide === i ? "active" : ""}
            onClick={() => go(i)}
          >
            <span>0{i + 1}</span>
            <b>{x}</b>
          </button>
        ))}
      </footer>
    </main>
  );
}
