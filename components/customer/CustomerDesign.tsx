'use client'

import { useEffect, useMemo, useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign, getEditableDesign } from '@/lib/order-store'
import type { Order, ScenarioType, SceneGraph } from '@/lib/types'

const SCHEMES: { scenario: ScenarioType; title: string; summary: string }[] = [
  { scenario: 'single', title: '单人居住方案', summary: '主卧、书房、客餐厨一体与开放走廊。' },
  { scenario: 'couple', title: '两人共同居住方案', summary: '电竞房改为衣帽间，书房改为双人书房。' },
  { scenario: 'child', title: '育儿家庭方案', summary: '电竞房改为儿童房，卫生间拆分为主卫和公卫。' },
  { scenario: 'nanny', title: '育儿 + 保姆方案', summary: '增加儿童房、保姆房、主卫和公卫。' },
  { scenario: 'replan', title: '空间重新规划方案', summary: '南侧房间拆成书房 + 储物间，原书房改儿童房。' },
]

const MOVE_STEP = 0.15

function cloneScene<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function zoneBounds(scene: SceneGraph, roomId?: string) {
  const zone: any = roomId ? scene.nodes[roomId] : null
  const polygon: [number, number][] | undefined = zone?.polygon
  if (!polygon?.length) return { minX: -5.7, maxX: 5.7, minZ: -4.2, maxZ: 4.2 }

  const xs = polygon.map((p) => p[0])
  const zs = polygon.map((p) => p[1])
  return {
    minX: Math.min(...xs) + 0.28,
    maxX: Math.max(...xs) - 0.28,
    minZ: Math.min(...zs) + 0.28,
    maxZ: Math.max(...zs) - 0.28,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function CustomerDesign({
  order,
  onStartRedesign,
  onUpdateDraft,
  onSubmitChange,
  onSaveScene,
}: {
  order: Order
  onStartRedesign: () => void
  onUpdateDraft: (scenario: ScenarioType, label: string) => void
  onSubmitChange: () => void
  onSaveScene: (scene: SceneGraph) => void
}) {
  const editable = getEditableDesign(order)
  const approved = getApprovedDesign(order)
  const redesign = Boolean(order.draftVersionId)
  const editableMode = redesign || order.status === 'design'

  const [chosen, setChosen] = useState<ScenarioType>(editable.scenario)
  const [revision, setRevision] = useState(0)
  const [scene, setScene] = useState<SceneGraph>(() => cloneScene(editable.scene))
  const [selectedItemId, setSelectedItemId] = useState('')
  const [moveMessage, setMoveMessage] = useState('')

  // Important: listen to the scene object as well as the draft id.
  // A scheme change can update the same draft id with a completely new scene.
  useEffect(() => {
    const next = cloneScene(editable.scene)
    setScene(next)
    setChosen(editable.scenario)

    const items = Object.values(next.nodes).filter((node: any) => node.type === 'item') as any[]
    setSelectedItemId((current) =>
      current && next.nodes[current]?.type === 'item' ? current : (items[0]?.id ?? ''),
    )
    setMoveMessage('')
  }, [editable.id, editable.scenario, editable.scene])

  const currentScheme = useMemo(
    () => SCHEMES.find((scheme) => scheme.scenario === chosen) ?? SCHEMES[0],
    [chosen],
  )

  const items = useMemo(
    () =>
      (Object.values(scene.nodes).filter((node: any) => node.type === 'item') as any[]).sort((a, b) => {
        const ar = scene.nodes[a.metadata?.room_id]?.name ?? ''
        const br = scene.nodes[b.metadata?.room_id]?.name ?? ''
        return `${ar}-${a.name}`.localeCompare(`${br}-${b.name}`, 'zh-CN')
      }),
    [scene],
  )

  const selectedItem: any = items.find((item) => item.id === selectedItemId) ?? items[0]
  const selectedRoomName = selectedItem
    ? (scene.nodes[selectedItem.metadata?.room_id]?.name ?? '未分类空间')
    : ''

  function applyScheme() {
    if (!editableMode) return
    onUpdateDraft(currentScheme.scenario, currentScheme.title)
    setRevision((value) => value + 1)
    setMoveMessage('固定方案已应用，可继续用方向键移动家具。')
  }

  function moveSelected(dx: number, dz: number, label: string) {
    if (!editableMode || !selectedItem) return

    const next = cloneScene(scene)
    const node: any = next.nodes[selectedItem.id]
    if (!node) return

    const bounds = zoneBounds(next, node.metadata?.room_id)
    const x = Number(node.position?.[0] ?? 0)
    const y = Number(node.position?.[1] ?? 0) // height is locked
    const z = Number(node.position?.[2] ?? 0)

    const nextX = clamp(x + dx, bounds.minX, bounds.maxX)
    const nextZ = clamp(z + dz, bounds.minZ, bounds.maxZ)

    node.position = [nextX, y, nextZ]
    setScene(next)

    // Save on every click. There is no separate numeric editor or save workflow.
    onSaveScene(next)
    setMoveMessage(`${selectedRoomName} · ${selectedItem.name}：已${label}`)
  }

  return (
    <div className="customer-design">
      {order.status !== 'design' && !redesign && (
        <div className="version-warning">
          <div>
            <strong>当前施工依据：Design V{approved.version}</strong>
            <span>如需调整家具或方案，请先创建新的设计变更版本。</span>
          </div>
          <button onClick={onStartRedesign}>重新设计</button>
        </div>
      )}

      {redesign && (
        <div className="change-banner">
          <strong>Design V{editable.version} · Draft</strong>
          <span>方向键移动会自动保存到当前 Draft；完成后再提交设计变更。</span>
          <button onClick={onSubmitChange}>提交设计变更</button>
        </div>
      )}

      <div className="design-columns">
        <section className="card interaction-card fixed-scheme-card">
          <div className="card-title">固定方案选择</div>
          <div className="scheme-intro">
            <b>{currentScheme.title}</b>
            <span>{currentScheme.summary}</span>
          </div>
          <div className="scheme-list">
            {SCHEMES.map((scheme) => (
              <button
                key={scheme.scenario}
                className={`scheme-item ${chosen === scheme.scenario ? 'selected' : ''}`}
                onClick={() => setChosen(scheme.scenario)}
                disabled={!editableMode}
              >
                <b>{scheme.title}</b>
                <span>{scheme.summary}</span>
              </button>
            ))}
          </div>
          <button className="primary" onClick={applyScheme} disabled={!editableMode}>
            应用当前固定方案
          </button>
        </section>

        <section className="card visual-card">
          <div className="card-title">2D图纸</div>
          <Floorplan2D scene={scene} />
        </section>

        <section className="card visual-card mover-visual-card">
          <div className="card-title">3D展示 · 家具傻瓜式移动</div>
          <PascalViewer scene={scene} revision={revision} />

          <div className="simple-mover" aria-label="家具方向移动控制器">
            <label>
              <span>选择家具</span>
              <select
                value={selectedItem?.id ?? ''}
                onChange={(event) => {
                  setSelectedItemId(event.target.value)
                  setMoveMessage('')
                }}
                disabled={!editableMode}
              >
                {items.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {scene.nodes[item.metadata?.room_id]?.name ?? '空间'} · {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mover-selected">
              {selectedItem ? `${selectedRoomName} · ${selectedItem.name}` : '暂无家具'}
            </div>

            <div className="dpad">
              <span />
              <button onClick={() => moveSelected(0, -MOVE_STEP, '向前移动')} disabled={!editableMode || !selectedItem}>↑<small>前</small></button>
              <span />
              <button onClick={() => moveSelected(-MOVE_STEP, 0, '向左移动')} disabled={!editableMode || !selectedItem}>←<small>左</small></button>
              <div className="dpad-center">移动</div>
              <button onClick={() => moveSelected(MOVE_STEP, 0, '向右移动')} disabled={!editableMode || !selectedItem}>→<small>右</small></button>
              <span />
              <button onClick={() => moveSelected(0, MOVE_STEP, '向后移动')} disabled={!editableMode || !selectedItem}>↓<small>后</small></button>
              <span />
            </div>

            <div className="mover-help">只允许平面前后左右移动，高度固定；每次移动 15 cm，并自动保存。</div>
            {moveMessage && <div className="mover-message">{moveMessage}</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
