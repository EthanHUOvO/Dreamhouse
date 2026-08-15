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

export type SceneGraph = {
  nodes: Record<string, SceneNode>
  rootNodeIds: string[]
}

export type ScenarioType = 'single' | 'couple' | 'child' | 'nanny'

export type RenovationPlan = {
  type: ScenarioType
  title: string
  summary: string
  changes: string[]
}

export type BomRow = {
  id: string
  order: number
  category: 'floor' | 'wall' | 'furniture'
  label: string
  quantity: number
  method: '3D打印' | '采购'
  status: '待生产' | '生产中' | '已完成'
}

export type InventoryStatus = '待入库' | '已入库' | '已出库' | '运输中' | '已到场'

export type InventoryRow = {
  id: string
  label: string
  quantity: number
  status: InventoryStatus
}

export type ConstructionTask = {
  id: string
  label: string
  method: '人工' | '机械臂'
  status: '待施工' | '施工中' | '已完成'
}

export type PipelineState = {
  approved: boolean
  approvedVersion: string
  bom: BomRow[]
  inventory: InventoryRow[]
  construction: ConstructionTask[]
  printerProgress: number
  robotProgress: number
  accepted: boolean
}
