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

export type ScenarioType = 'single' | 'dressing' | 'couple' | 'child' | 'nanny' | 'open'

export type RenovationPlan = {
  type: ScenarioType | 'custom'
  title: string
  summary: string
  patchCount: number
  changes: string[]
  warning?: string
}
