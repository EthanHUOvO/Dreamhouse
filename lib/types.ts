export type SceneNode = {
  object?: string;
  id: string;
  type: string;
  parentId?: string | null;
  visible?: boolean;
  name?: string;
  children?: string[];
  metadata?: Record<string, any>;
  [key: string]: any;
};

export type SceneGraph = {
  nodes: Record<string, SceneNode>;
  rootNodeIds: string[];
};
export type SelectedVariant = {
  residenceType: "one" | "two" | "three";
  variantId: string;
  optionIndex: number;
  imageUrl: string;
  imageDataUrl: string | null;
  imageHash: string | null;
};
/** Stable internal identity for a room. Names are presentation-only and may repeat. */
export type RoomIdentity = {
  roomId: string;
  roomName: string;
  area?: number;
};
export type CameraPose = {
  position: [number, number, number];
  target?: [number, number, number];
  rotation?: [number, number, number];
  fov?: number;
};
export type PascalViewCapture = {
  id: string;
  sessionId: string;
  sceneRevision: number;
  roomId?: string;
  roomName?: string;
  roomType?: import("@/config/roomTypes").RoomType;
  camera: CameraPose;
  /** Canonical persisted screenshot field. */
  image?: string;
  /** Legacy alias retained for persisted v14 sessions. */
  screenshotDataUrl: string;
  capturedAt: string;
  sceneVersion?: string;
};
export type CapturedView = PascalViewCapture & {
  stylePrompt: string;
  styleId?: string;
  styleName?: string;
  renderedImage?: {
    url: string;
    provider: string;
    model: string;
    requestId?: string;
    generation?: { elapsedMs?: number; cacheHit?: boolean; changedRatio?: number };
    sourceCaptureId?: string;
    sourceImage?: string;
    styleId?: string;
    styleName?: string;
    camera?: CameraPose;
    createdAt?: string;
  };
  status: "captured" | "rendering" | "done" | "failed";
};
export type InteriorDesignResult = {
  id: string;
  sourceCaptureId: string;
  sourceImage: string;
  camera: CameraPose;
  styleId: string;
  styleName: string;
  prompt: string;
  renderedImage: string;
  createdAt: string;
};
export type AiFloorplanResult = {
  sourceImageHash: string;
  sourceVariantId: string;
  prompt: string;
  url: string;
  model: "qwen-image-3.0-pro" | string;
  provider: "qwen" | "mock";
  ephemeral: boolean;
  fallback: boolean;
  fallbackReason?: string;
};
export type RenderResult = {
  id: string;
  sourceSceneRevision: number;
  roomId?: string;
  roomName?: string;
  url: string;
  provider: string;
  model: string;
};
export type StyleBible = {
  styleName: string;
  wallMaterial: string;
  floorMaterial: string;
  primaryWood: string;
  palette: string[];
  furnitureStyle: string;
  lighting: string;
};
export type DesignSession = {
  id: string;
  selectedVariant: SelectedVariant;
  requirement: string;
  aiFloorplan: AiFloorplanResult | null;
  basePascalScene: SceneGraph;
  currentPascalScene: SceneGraph;
  pascalOperations: LayoutOperation[];
  renders: RenderResult[];
  floorplanSpec: any | null;
  /** Legacy alias retained for persisted v14 sessions. */
  pascalScene: SceneGraph | null;
  sceneRevision: number;
  layoutOperations: LayoutOperation[];
  aiLayoutResult: AiLayoutRun | null;
  generatedFloorplan: any | null;
  generatedFloorplanImage?: string | null;
  capturedViews: CapturedView[];
  bom: any | null;
  bomResult?: any | null;
  overallRenderImage?: string | null;
  roomRenderImages?: string[];
  selectedCaptureId?: string | null;
  selectedStyleId?: string;
  generatedInteriorImages?: InteriorDesignResult[];
  floorPlanConfirmed?: boolean;
  model3DLoaded?: boolean;
  styleBible: StyleBible;
  status:
    | "variant-selected"
    | "importing"
    | "pascal-ready"
    | "editing"
    | "rendering"
    | "bom-ready";
  sceneVersion?: string;
};

export type ScenarioType =
  "single" | "single_female" | "couple" | "child" | "nanny" | "replan";
export type HouseholdType = "single" | "couple" | "family3";
export type SingleGender = "male" | "female";
export type FamilyPlan = "child" | "nanny";

export type DrawingSource = {
  id: string;
  source: "upload" | "demo";
  fileName: string;
  fileType: string;
  fileSize: number;
  importedAt: string;
  templateId: "HOUSE_001";
  parserMode: "demo-template";
  previewDataUrl?: string;
  detected: { rooms: number; walls: number; doors: number; windows: number };
};

export type UserProfile = {
  id: string;
  displayName: string;
  household: HouseholdType;
  singleGender?: SingleGender;
  familyPlan?: FamilyPlan;
  adults: number;
  children: number;
  nanny: boolean;
  workFromHome: boolean;
  storagePriority: "normal" | "high";
  preferredStyle: "modern" | "nordic" | "new_chinese";
  preferredScenario: ScenarioType;
  createdAt: string;
  updatedAt: string;
};

export type FurnitureTransform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};
export type FurnitureOverrides = Record<string, FurnitureTransform>;

export type RoomSemantic =
  | "master_bedroom"
  | "bedroom"
  | "living_room"
  | "kitchen"
  | "study"
  | "shared_study"
  | "child_room"
  | "nanny_room"
  | "dressing_room"
  | "gaming_room"
  | "storage"
  | "bathroom"
  | "corridor";

export type LayoutOperation = {
  tool: string;
  args: Record<string, any>;
  description: string;
};

export type LayoutValidation = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  checkedAt: string;
};

export type LayoutToolLog = {
  index: number;
  tool: string;
  args: Record<string, any>;
  ok: boolean;
  message: string;
};

export type AiLayoutRun = {
  id: string;
  provider: "mock" | "qwen";
  model: string;
  prompt: string;
  summary: string;
  scene: SceneGraph;
  operations: LayoutOperation[];
  toolLog: LayoutToolLog[];
  validation: LayoutValidation;
  requirementTarget?: import("./ai/requirement-target").RequirementTarget;
  goalVerification?: {
    target: import("./ai/requirement-target").RequirementTarget;
    actual: import("./ai/requirement-target").RequirementTarget;
    satisfied: boolean;
    checks: Record<string, boolean>;
  };
  createdAt: string;
};

export type AiLayoutHistoryEntry = Omit<AiLayoutRun, "scene"> & {
  designVersion: number;
};

export type AiDesignProposal = {
  id: string;
  title: string;
  summary: string;
  scenario: ScenarioType;
  strategy: "balanced" | "storage" | "growth";
  goals: string[];
  roomChanges: string[];
  wallChanges: string[];
  furnitureAdvice: string[];
  score: number;
  provider: "mock" | "qwen";
  createdAt: string;
};

export type VisualConcept = {
  id: string;
  style: string;
  roomId?: string;
  room: string;
  prompt: string;
  imageDataUrl?: string;
  provider: "mock" | "qwen-image";
  status: "ready" | "queued" | "failed";
  createdAt: string;
};

export type VideoConcept = {
  id: string;
  prompt: string;
  provider: "mock" | "wan";
  status: "queued" | "ready" | "failed";
  videoUrl?: string;
  createdAt: string;
};

export type DesignStatus = "draft" | "approved" | "superseded";
export type OrderStatus =
  | "design"
  | "production"
  | "transport"
  | "construction"
  | "acceptance"
  | "completed";

export type DesignVersion = {
  id: string;
  version: number;
  label: string;
  status: DesignStatus;
  scenario: ScenarioType;
  scene: SceneGraph;
  furnitureOverrides: FurnitureOverrides;
  aiProposalId?: string;
  aiLayoutRunId?: string;
  aiLayoutPrompt?: string;
  visualConceptIds?: string[];
  createdAt: string;
  notes?: string;
};

export type ChangeRequest = {
  id: string;
  fromVersion: number;
  toVersion: number;
  status: "draft" | "submitted" | "accepted" | "rejected";
  summary: string;
  createdAt: string;
};

export type BomItem = {
  id: string;
  order: number;
  category: "floor" | "wall" | "furniture";
  label: string;
  quantity: number;
  source: "3D打印" | "采购";
  status: "待处理" | "生产中" | "已完成";
};

export type DetailedBomLevel = "design" | "manufacturing" | "construction";
export type DetailedBomCategory =
  | "floor"
  | "wall"
  | "door"
  | "window"
  | "furniture"
  | "sanitary"
  | "connector"
  | "equipment";

export type DetailedBomDimensions = {
  length?: number;
  width?: number;
  height?: number;
  thickness?: number;
  area?: number;
  grossArea?: number;
  openingArea?: number;
  netArea?: number;
};

export type DetailedBomItem = {
  id: string;
  order: number;
  level: DetailedBomLevel;
  category: DetailedBomCategory;
  sourceNodeId?: string;
  /** Pascal zone id; never use the display name as a room key. */
  roomId?: string;
  room?: string;
  componentCode: string;
  label: string;
  specification: string;
  dimensions?: DetailedBomDimensions;
  quantity: number;
  unit: string;
  material: string;
  finish?: string;
  source: "3D打印" | "预制" | "采购" | "现场施工";
  process: string;
  installationMethod: string;
  performance: string[];
  notes?: string;
  status: "待确认" | "待处理" | "生产中" | "已完成";
};

export type BomValidation = {
  valid: boolean;
  geometryValid: boolean;
  quantityValid: boolean;
  materialRulesValid: boolean;
  issues: string[];
  checkedAt: string;
};

export type DetailedBomDocument = {
  id: string;
  sourceDesignVersion: number;
  designLabel: string;
  drawingId?: string;
  status: "draft" | "validated" | "frozen" | "failed";
  aiStatus: "pending" | "enriched" | "failed" | "skipped";
  aiProvider: "mock" | "qwen";
  generatedAt: string;
  updatedAt: string;
  geometrySummary: {
    floorArea: number;
    grossWallArea: number;
    netWallArea: number;
    wallCount: number;
    doorCount: number;
    windowCount: number;
    furnitureCount: number;
  };
  items: DetailedBomItem[];
  validation: BomValidation;
  aiError?: string;
};

export type BomAiItemEnrichment = {
  itemId: string;
  material?: string;
  finish?: string;
  process?: string;
  installationMethod?: string;
  performance?: string[];
  notes?: string;
};

export type BomAiEnrichment = {
  summary: string;
  items: BomAiItemEnrichment[];
};

export type TaskItem = {
  id: string;
  label: string;
  method: "人工" | "机械臂";
  status: "待施工" | "施工中" | "已完成";
};

export type DeviceState = {
  name: string;
  status: "待机" | "运行中" | "完成" | "离线";
  task: string;
  progress: number;
};

export type ManufacturingArtifact = {
  id: string;
  type: "STL" | "GLB" | "BOM";
  label: string;
  status: "ready" | "pending";
  sourceDesignVersion: number;
};

export type MesStage = {
  id:
    | "design"
    | "bom"
    | "schedule"
    | "production"
    | "transport"
    | "installation"
    | "qc"
    | "acceptance";
  label: string;
  status: "done" | "active" | "pending";
};

export type Order = {
  id: string;
  customer: string;
  projectName: string;
  houseId: string;
  userProfileId?: string;
  drawing?: DrawingSource;
  status: OrderStatus;
  approvedVersion: number;
  designVersions: DesignVersion[];
  draftVersionId?: string;
  changeRequest?: ChangeRequest;
  aiProposals: AiDesignProposal[];
  aiLayoutHistory?: AiLayoutHistoryEntry[];
  visualConcepts: VisualConcept[];
  videoConcepts: VideoConcept[];
  artifacts: ManufacturingArtifact[];
  bom: BomItem[];
  detailedBom?: DetailedBomDocument;
  residentialBudget?: import("./bom/residential").ResidentialBudget;
  manualTasks: TaskItem[];
  robotTasks: TaskItem[];
  printer: DeviceState;
  robot: DeviceState;
  productionProgress: number;
  transportProgress: number;
  constructionProgress: number;
  acceptanceProgress: number;
  accepted: boolean;
  downstreamVersion?: number;
  lastDesignSyncAt?: string;
};
