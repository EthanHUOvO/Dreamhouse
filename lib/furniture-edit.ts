import type { SceneGraph } from './types'

export const FURNITURE_MOVE_STEP = 0.15
export const FURNITURE_ROTATE_STEP_DEG = 15

export function cloneScene<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getFurnitureBounds(scene: SceneGraph, itemId: string) {
  const item: any = scene.nodes[itemId]
  const roomId = item?.metadata?.room_id
  const zone: any = roomId ? scene.nodes[roomId] : null
  const polygon: [number, number][] | undefined = zone?.polygon
  if (!polygon?.length) return { minX: -5.7, maxX: 5.7, minZ: -4.2, maxZ: 4.2 }
  const xs = polygon.map((point) => point[0])
  const zs = polygon.map((point) => point[1])
  return {
    minX: Math.min(...xs) + 0.28,
    maxX: Math.max(...xs) - 0.28,
    minZ: Math.min(...zs) + 0.28,
    maxZ: Math.max(...zs) - 0.28,
  }
}

export function moveFurniture(scene: SceneGraph, itemId: string, dx: number, dz: number) {
  const current: any = scene.nodes[itemId]
  if (!current?.position) return scene
  const next = cloneScene(scene)
  const node: any = next.nodes[itemId]
  const bounds = getFurnitureBounds(next, itemId)
  const x = Number(node.position?.[0] ?? 0)
  const y = Number(node.position?.[1] ?? 0)
  const z = Number(node.position?.[2] ?? 0)
  node.position = [
    clampValue(x + dx, bounds.minX, bounds.maxX),
    y,
    clampValue(z + dz, bounds.minZ, bounds.maxZ),
  ]
  return next
}

export function rotateFurniture(scene: SceneGraph, itemId: string, deltaDegrees: number) {
  const current: any = scene.nodes[itemId]
  if (!current) return scene
  const next = cloneScene(scene)
  const node: any = next.nodes[itemId]
  const currentRotation = Number(node.rotation?.[1] ?? 0)
  node.rotation = [0, currentRotation + (deltaDegrees * Math.PI) / 180, 0]
  return next
}

export function placeFurniture(scene: SceneGraph, itemId: string, x: number, z: number) {
  const current: any = scene.nodes[itemId]
  if (!current?.position) return scene
  const next = cloneScene(scene)
  const node: any = next.nodes[itemId]
  const bounds = getFurnitureBounds(next, itemId)
  const y = Number(node.position?.[1] ?? 0)
  node.position = [
    clampValue(x, bounds.minX, bounds.maxX),
    y,
    clampValue(z, bounds.minZ, bounds.maxZ),
  ]
  return next
}
