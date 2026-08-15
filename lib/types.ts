export type SceneNode = {
  object?: string
  id: string
  type: string
  name?: string
  parentId?: string | null
  visible?: boolean
  children?: string[]
  metadata?: Record<string, any>
  [key: string]: any
}

export type SceneGraph = { nodes: Record<string, SceneNode>; rootNodeIds: string[] }

export type RoomSemantic =
  | 'master_bedroom' | 'gaming_room' | 'study' | 'shared_study' | 'dressing_room'
  | 'bathroom' | 'master_bathroom' | 'public_bathroom' | 'living_room'
  | 'child_room' | 'nanny_room' | 'custom'

export type RenovationOperation =
  | { type: 'resemanticize_room'; roomId: string; newName: string; newSemantic: RoomSemantic }
  | { type: 'split_room'; roomId: string; axis: 'x' | 'z'; ratio: number; rooms: [
      { id: string; name: string; semantic: RoomSemantic },
      { id: string; name: string; semantic: RoomSemantic }
    ] }
  | { type: 'remove_all_partitions' }
  | { type: 'add_partition'; start: [number, number]; end: [number, number]; name?: string }

export type RenovationPlan = {
  title: string
  summary: string
  operations: RenovationOperation[]
  warnings: string[]
}

export type ScenePatch =
  | { op: 'create'; parentId?: string; node: SceneNode }
  | { op: 'update'; id: string; data: Partial<SceneNode> }
  | { op: 'delete'; id: string; cascade?: boolean }

export type GuardResult = {
  allowed: boolean
  patches: ScenePatch[]
  blocked: string[]
  warnings: string[]
}
