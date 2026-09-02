export type SceneNode = {
  object?: string
  id: string
  type: string
  parentId?: string | null
  visible?: boolean
  name?: string
  children?: string[]
  metadata?: Record<string, any>
  [key: string]: any
}

export type SceneGraph = { nodes: Record<string, SceneNode>; rootNodeIds: string[] }
export type ScenarioType = 'single' | 'single_female' | 'couple' | 'child' | 'nanny' | 'replan'
export type RenovationPlan = { type: ScenarioType; title: string; summary: string; changes: string[] }
export type DesignStatus = 'draft' | 'approved' | 'superseded'
export type OrderStatus = 'design' | 'production' | 'transport' | 'construction' | 'acceptance' | 'completed'

export type HouseholdChoice = 'single' | 'couple' | 'family3'
export type SingleGender = 'male' | 'female'
export type FamilyPlan = 'child' | 'nanny'

export type UserProfile = {
  id: string
  displayName: string
  household: HouseholdChoice
  singleGender?: SingleGender
  familyPlan?: FamilyPlan
  preferredScenario: ScenarioType
  createdAt: string
  updatedAt: string
}

export type DrawingImportRequest = {
  source: 'upload' | 'sample'
  fileName: string
  fileType: string
  fileSize: number
}

export type DrawingImportRecord = DrawingImportRequest & {
  id: string
  status: 'parsed'
  importedAt: string
  parsedAt: string
  parserMode: 'demo-template'
  templateId: 'HOUSE_001'
  detected: {
    rooms: number
    walls: number
    doors: number
    windows: number
  }
}

export type FurnitureTransformOverride = {
  position: [number, number, number]
  rotation: [number, number, number]
}
export type FurnitureOverrideMap = Record<string, FurnitureTransformOverride>

export type DesignVersion = {
  id: string
  version: number
  label: string
  status: DesignStatus
  scenario: ScenarioType
  scene: SceneGraph
  /**
   * User-owned furniture transforms are stored independently from the scenario preset.
   * Re-applying a scenario must overlay these values instead of resetting furniture.
   */
  furnitureOverrides?: FurnitureOverrideMap
  createdAt: string
  notes?: string
}

export type ChangeRequest = {
  id: string
  fromVersion: number
  toVersion: number
  status: 'draft' | 'submitted' | 'accepted' | 'rejected'
  summary: string
  createdAt: string
}

export type BomItem = {
  id: string
  order: number
  category: 'floor' | 'wall' | 'furniture'
  label: string
  quantity: number
  source: '3D打印' | '采购'
  status: '待处理' | '生产中' | '已完成'
}

export type TaskItem = {
  id: string
  label: string
  method: '人工' | '机械臂'
  status: '待施工' | '施工中' | '已完成'
}

export type DeviceState = {
  name: string
  status: '待机' | '运行中' | '完成' | '离线'
  task: string
  progress: number
}

export type Order = {
  id: string
  customer: string
  projectName: string
  houseId: string
  /** Links the residential project back to the user-profile repository. */
  userProfileId?: string
  status: OrderStatus
  approvedVersion: number
  designVersions: DesignVersion[]
  draftVersionId?: string
  changeRequest?: ChangeRequest
  drawing?: DrawingImportRecord
  bom: BomItem[]
  manualTasks: TaskItem[]
  robotTasks: TaskItem[]
  printer: DeviceState
  robot: DeviceState
  productionProgress: number
  constructionProgress: number
  acceptanceProgress: number
  accepted: boolean
  downstreamVersion?: number
  lastDesignSyncAt?: string
}
