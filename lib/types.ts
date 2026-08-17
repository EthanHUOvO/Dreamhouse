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
export type ScenarioType = 'single' | 'couple' | 'child' | 'nanny' | 'replan'
export type RenovationPlan = { type: ScenarioType; title: string; summary: string; changes: string[] }
export type DesignStatus = 'draft' | 'approved' | 'superseded'
export type OrderStatus = 'design' | 'production' | 'transport' | 'construction' | 'acceptance' | 'completed'

export type DesignVersion = {
  id: string
  version: number
  label: string
  status: DesignStatus
  scenario: ScenarioType
  scene: SceneGraph
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
  status: OrderStatus
  approvedVersion: number
  designVersions: DesignVersion[]
  draftVersionId?: string
  changeRequest?: ChangeRequest
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
