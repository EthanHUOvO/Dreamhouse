'use client'

import { useEffect, useRef, useState } from 'react'
import { emitter, loadPlugin, sceneRegistry } from '@pascal-app/core'
import { applySceneSnapshot } from '@pascal-app/editor'
import { Viewer, useViewer } from '@pascal-app/viewer'
import { builtinPlugin } from '@pascal-app/nodes'
import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { SceneGraph } from '@/lib/types'
import { clampValue, FURNITURE_MOVE_STEP, FURNITURE_ROTATE_STEP_DEG, getFurnitureBounds } from '@/lib/furniture-edit'

const pluginReady = loadPlugin(builtinPlugin)
type Anchor = { x: number; y: number }

type PascalViewerProps = {
  scene: SceneGraph
  revision: number
  editMode?: boolean
  selectedItemId?: string
  selectedItemLabel?: string
  onSelectItem?: (itemId: string) => void
  onNudgeItem?: (itemId: string, dx: number, dz: number) => void
  onRotateItem?: (itemId: string, deltaDegrees: number) => void
  onDragCommit?: (itemId: string, x: number, z: number) => void
  onClearSelection?: () => void
}

function CameraRig({ revision, interactionActive }: { revision: number; interactionActive: boolean }) {
  const controls = useRef<any>(null)
  useEffect(() => {
    requestAnimationFrame(() => controls.current?.setLookAt(10.6, 9.0, 11.8, 0, 0.75, 0, true))
  }, [revision])
  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={!interactionActive}
      minDistance={6}
      maxDistance={26}
      dollySpeed={0.55}
      truckSpeed={0.65}
    />
  )
}

function FurnitureInteractionBridge({
  scene,
  editMode,
  selectedItemId,
  onSelectItem,
  onAnchorChange,
  onInteractionActive,
  onDragCommit,
}: {
  scene: SceneGraph
  editMode: boolean
  selectedItemId?: string
  onSelectItem?: (itemId: string) => void
  onAnchorChange: (anchor: Anchor | null) => void
  onInteractionActive: (active: boolean) => void
  onDragCommit?: (itemId: string, x: number, z: number) => void
}) {
  const { camera, gl } = useThree()
  const raycaster = useRef(new Raycaster())
  const pointer = useRef(new Vector2())
  const plane = useRef(new Plane())
  const point = useRef(new Vector3())
  const tempWorld = useRef(new Vector3())
  const lastProjectedAt = useRef(0)
  const drag = useRef<null | {
    id: string
    y: number
    worldY: number
    offsetX: number
    offsetZ: number
    lastX: number
    lastZ: number
    startClientX: number
    startClientY: number
    moved: boolean
  }>(null)

  function anchorFromClient(clientX: number, clientY: number) {
    const rect = gl.domElement.getBoundingClientRect()
    const panelW = 176
    const panelH = 168
    return {
      x: clampValue(clientX - rect.left + 14, 8, Math.max(8, rect.width - panelW - 8)),
      y: clampValue(clientY - rect.top - panelH * 0.46, 8, Math.max(8, rect.height - panelH - 8)),
    }
  }

  useEffect(() => {
    const canvas = gl.domElement
    canvas.dataset.furnitureEdit = editMode ? 'true' : 'false'
    canvas.style.cursor = editMode ? 'default' : ''
    canvas.style.touchAction = editMode ? 'none' : ''
    if (!editMode) {
      drag.current = null
      onInteractionActive(false)
      onAnchorChange(null)
    }
    return () => {
      delete canvas.dataset.furnitureEdit
      canvas.style.cursor = ''
      canvas.style.touchAction = ''
    }
  }, [editMode, gl, onAnchorChange, onInteractionActive])

  useEffect(() => {
    if (!editMode) return

    const selectItem = (event: any) => {
      const itemId = event?.node?.id
      if (!itemId || scene.nodes[itemId]?.type !== 'item') return
      event.stopPropagation?.()
      const native = event.nativeEvent
      const clientX = Number(native?.clientX ?? native?.nativeEvent?.clientX ?? 0)
      const clientY = Number(native?.clientY ?? native?.nativeEvent?.clientY ?? 0)
      onSelectItem?.(itemId)
      if (clientX || clientY) onAnchorChange(anchorFromClient(clientX, clientY))
    }

    const pointerDown = (event: any) => {
      const itemId = event?.node?.id
      const node: any = scene.nodes[itemId]
      if (!itemId || node?.type !== 'item') return

      event.stopPropagation?.()
      event.nativeEvent?.stopPropagation?.()
      const native = event.nativeEvent
      const clientX = Number(native?.clientX ?? native?.nativeEvent?.clientX ?? 0)
      const clientY = Number(native?.clientY ?? native?.nativeEvent?.clientY ?? 0)

      onSelectItem?.(itemId)
      if (clientX || clientY) onAnchorChange(anchorFromClient(clientX, clientY))
      onInteractionActive(true)

      const object = sceneRegistry.nodes.get(itemId)
      const parent = object?.parent ?? null
      const localHit = new Vector3(...(event.position ?? node.position ?? [0, 0, 0]))
      if (parent) parent.worldToLocal(localHit)

      const worldPosition = object?.getWorldPosition(tempWorld.current) ?? new Vector3(...(node.position ?? [0, 0, 0]))
      drag.current = {
        id: itemId,
        y: Number(node.position?.[1] ?? object?.position.y ?? 0),
        worldY: worldPosition.y,
        offsetX: Number(node.position?.[0] ?? 0) - localHit.x,
        offsetZ: Number(node.position?.[2] ?? 0) - localHit.z,
        lastX: Number(node.position?.[0] ?? 0),
        lastZ: Number(node.position?.[2] ?? 0),
        startClientX: clientX,
        startClientY: clientY,
        moved: false,
      }
    }

    emitter.on('item:click', selectItem as any)
    emitter.on('item:pointerdown', pointerDown as any)
    return () => {
      emitter.off('item:click', selectItem as any)
      emitter.off('item:pointerdown', pointerDown as any)
    }
  }, [editMode, scene, gl, onSelectItem, onAnchorChange, onInteractionActive])

  useEffect(() => {
    if (!editMode) return

    function handlePointerMove(event: PointerEvent) {
      const state = drag.current
      if (!state) return
      const object = sceneRegistry.nodes.get(state.id)
      if (!object) return

      const distance = Math.hypot(event.clientX - state.startClientX, event.clientY - state.startClientY)
      if (distance < 3 && !state.moved) return
      state.moved = true

      const rect = gl.domElement.getBoundingClientRect()
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.current.setFromCamera(pointer.current, camera)
      plane.current.set(new Vector3(0, 1, 0), -state.worldY)
      const hit = raycaster.current.ray.intersectPlane(plane.current, point.current)
      if (!hit) return

      const local = hit.clone()
      if (object.parent) object.parent.worldToLocal(local)
      const bounds = getFurnitureBounds(scene, state.id)
      const x = clampValue(local.x + state.offsetX, bounds.minX, bounds.maxX)
      const z = clampValue(local.z + state.offsetZ, bounds.minZ, bounds.maxZ)

      object.position.set(x, state.y, z)
      object.updateMatrixWorld(true)
      state.lastX = x
      state.lastZ = z
    }

    function handlePointerUp() {
      const state = drag.current
      if (!state) return
      drag.current = null
      onInteractionActive(false)
      if (state.moved) onDragCommit?.(state.id, state.lastX, state.lastZ)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [editMode, scene, camera, gl, onAnchorChange, onInteractionActive, onDragCommit])

  useEffect(() => {
    const viewer: any = useViewer.getState()
    const selectedObjects: any[] | undefined = viewer?.outliner?.selectedObjects
    if (!selectedObjects) return
    selectedObjects.length = 0
    if (editMode && selectedItemId) {
      const object = sceneRegistry.nodes.get(selectedItemId)
      if (object) selectedObjects.push(object)
    }
  }, [editMode, selectedItemId, scene])

  useFrame(({ clock }) => {
    if (!editMode || !selectedItemId || drag.current) return
    const elapsed = clock.elapsedTime
    if (elapsed - lastProjectedAt.current < 0.12) return
    lastProjectedAt.current = elapsed
    const object = sceneRegistry.nodes.get(selectedItemId)
    if (!object) return
    const world = object.getWorldPosition(tempWorld.current)
    const projected = world.clone().project(camera)
    const rect = gl.domElement.getBoundingClientRect()
    const clientX = rect.left + ((projected.x + 1) / 2) * rect.width
    const clientY = rect.top + ((1 - projected.y) / 2) * rect.height
    if (projected.z > 1 || projected.z < -1) return
    onAnchorChange(anchorFromClient(clientX, clientY))
  })

  return null
}

export default function PascalViewer({
  scene,
  revision,
  editMode = false,
  selectedItemId,
  selectedItemLabel,
  onSelectItem,
  onNudgeItem,
  onRotateItem,
  onDragCommit,
  onClearSelection,
}: PascalViewerProps) {
  const [ready, setReady] = useState(false)
  const [interactionActive, setInteractionActive] = useState(false)
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  useEffect(() => {
    let disposed = false
    void pluginReady.then(() => {
      if (disposed) return
      applySceneSnapshot(scene as any, { origin: 'load' })
      const v = useViewer.getState()
      const mobile = typeof window !== 'undefined' && window.innerWidth < 800
      v.setRenderContext('viewer')
      v.setCameraMode('perspective')
      v.setWallMode('cutaway')
      v.setLevelMode('stacked')
      v.setShowZones(false)
      v.setShowGrid(false)
      v.setShowMeasurements(false)
      v.setShowGuides(false)
      v.setShowScans(false)
      v.setShading(mobile ? 'solid' : 'rendered')
      v.setTextures(true)
      v.setShadows(!mobile)
      v.setEdges(mobile ? 'off' : 'soft')
      setReady(true)
    })
    return () => {
      disposed = true
    }
  }, [scene, revision])

  useEffect(() => {
    if (!editMode) {
      setAnchor(null)
      setInteractionActive(false)
    }
  }, [editMode])

  if (!ready) return <div className="viewer-loading">正在加载住宅模型…</div>

  return (
    <div className={`pascal-viewer-shell ${editMode ? 'is-furniture-editing' : ''}`}>
      <div className="pascal-viewer">
        <Viewer selectionManager="custom">
          <CameraRig revision={revision} interactionActive={interactionActive} />
          <FurnitureInteractionBridge
            scene={scene}
            editMode={editMode}
            selectedItemId={selectedItemId}
            onSelectItem={onSelectItem}
            onAnchorChange={setAnchor}
            onInteractionActive={setInteractionActive}
            onDragCommit={onDragCommit}
          />
        </Viewer>
      </div>

      {editMode && (
        <div className="furniture-edit-hint">
          <b>家具调整中</b>
          <span>点击家具显示控制键；按住家具可直接拖动。</span>
        </div>
      )}

      {editMode && anchor && selectedItemId && (
        <div className="inworld-furniture-control" style={{ left: anchor.x, top: anchor.y }}>
          <div className="inworld-control-head">
            <b>{selectedItemLabel || '已选择家具'}</b>
            <button
              aria-label="关闭家具控制"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setAnchor(null)
                onClearSelection?.()
              }}
            >
              ×
            </button>
          </div>
          <div className="inworld-dpad">
            <span />
            <button onClick={() => onNudgeItem?.(selectedItemId, 0, -FURNITURE_MOVE_STEP)}>↑</button>
            <span />
            <button onClick={() => onNudgeItem?.(selectedItemId, -FURNITURE_MOVE_STEP, 0)}>←</button>
            <span className="inworld-center">移动</span>
            <button onClick={() => onNudgeItem?.(selectedItemId, FURNITURE_MOVE_STEP, 0)}>→</button>
            <span />
            <button onClick={() => onNudgeItem?.(selectedItemId, 0, FURNITURE_MOVE_STEP)}>↓</button>
            <span />
          </div>
          <div className="inworld-rotate-row">
            <button onClick={() => onRotateItem?.(selectedItemId, -FURNITURE_ROTATE_STEP_DEG)}>↺ 左转</button>
            <button onClick={() => onRotateItem?.(selectedItemId, FURNITURE_ROTATE_STEP_DEG)}>右转 ↻</button>
          </div>
          <div className="inworld-drag-tip">也可以直接按住该家具拖动</div>
        </div>
      )}
    </div>
  )
}
