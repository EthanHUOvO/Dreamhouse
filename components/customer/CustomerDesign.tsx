'use client'

import { useEffect, useMemo, useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign, getEditableDesign } from '@/lib/order-store'
import type { Order, ScenarioType, SceneGraph } from '@/lib/types'
import { cloneScene, moveFurniture, placeFurniture, rotateFurniture } from '@/lib/furniture-edit'

const SCHEMES: { scenario: ScenarioType; title: string; summary: string }[] = [
  { scenario: 'single', title: '单人居住方案', summary: '主卧、书房、客餐厨一体与开放走廊。' },
  { scenario: 'couple', title: '两人共同居住方案', summary: '电竞房改为衣帽间，书房改为双人书房。' },
  { scenario: 'child', title: '育儿家庭方案', summary: '电竞房改为儿童房，卫生间拆分为主卫和公卫。' },
  { scenario: 'nanny', title: '育儿 + 保姆方案', summary: '增加儿童房、保姆房、主卫和公卫。' },
  { scenario: 'replan', title: '空间重新规划方案', summary: '南侧房间拆成书房 + 储物间，原书房改儿童房。' },
]

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
  const [furnitureEditMode, setFurnitureEditMode] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [moveMessage, setMoveMessage] = useState('')

  useEffect(() => {
    setScene(cloneScene(editable.scene))
    setChosen(editable.scenario)
    setFurnitureEditMode(false)
    setSelectedItemId('')
    setMoveMessage('')
  }, [editable.id, editable.scenario])

  useEffect(() => {
    setScene(cloneScene(editable.scene))
  }, [editable.scene])

  const currentScheme = useMemo(
    () => SCHEMES.find((scheme) => scheme.scenario === chosen) ?? SCHEMES[0],
    [chosen],
  )

  const selectedItem: any = selectedItemId ? scene.nodes[selectedItemId] : null
  const selectedRoomName = selectedItem
    ? (scene.nodes[selectedItem.metadata?.room_id]?.name ?? '未分类空间')
    : ''
  const selectedItemLabel = selectedItem ? `${selectedRoomName} · ${selectedItem.name}` : ''

  function applyScheme() {
    if (!editableMode) return
    setFurnitureEditMode(false)
    setSelectedItemId('')
    onUpdateDraft(currentScheme.scenario, currentScheme.title)
    setRevision((value) => value + 1)
    setMoveMessage('固定方案已应用。')
  }

  function commitScene(next: SceneGraph, message: string) {
    setScene(next)
    onSaveScene(next)
    setMoveMessage(message)
  }

  function moveItem(itemId: string, dx: number, dz: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = moveFurniture(scene, itemId, dx, dz)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：位置已调整并自动保存。`)
  }

  function rotateItem(itemId: string, deltaDegrees: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = rotateFurniture(scene, itemId, deltaDegrees)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：朝向已调整并自动保存。`)
  }

  function commitDrag(itemId: string, x: number, z: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = placeFurniture(scene, itemId, x, z)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：拖动位置已自动保存。`)
  }

  function toggleFurnitureEdit() {
    if (!editableMode) return
    setFurnitureEditMode((current) => {
      const next = !current
      if (!next) setSelectedItemId('')
      setMoveMessage(next ? '已进入家具调整模式：点击家具显示控制键，也可以直接拖动。' : '')
      return next
    })
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
          <span>家具调整会自动保存到当前 Draft；完成后再提交设计变更。</span>
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
          <div className="card-title viewer-titlebar">
            <span>3D展示</span>
            {editableMode && (
              <button
                className={`open-furniture-control ${furnitureEditMode ? 'active' : ''}`}
                onClick={toggleFurnitureEdit}
              >
                {furnitureEditMode ? '完成调整' : '调整家具'}
              </button>
            )}
          </div>
          <PascalViewer
            scene={scene}
            revision={revision}
            editMode={furnitureEditMode}
            selectedItemId={selectedItemId}
            selectedItemLabel={selectedItemLabel}
            onSelectItem={(itemId) => {
              setSelectedItemId(itemId)
              setMoveMessage('')
            }}
            onNudgeItem={moveItem}
            onRotateItem={rotateItem}
            onDragCommit={commitDrag}
            onClearSelection={() => setSelectedItemId('')}
          />
          {furnitureEditMode && moveMessage && <div className="viewer-move-message">{moveMessage}</div>}
        </section>
      </div>
    </div>
  )
}
