'use client'

import { useEffect, useMemo, useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign, getEditableDesign } from '@/lib/order-store'
import { createScenarioScene } from '@/lib/scenarios'
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
  onConfirmDesign,
  onSaveScene,
}: {
  order: Order
  onStartRedesign: () => void
  onUpdateDraft: (scenario: ScenarioType, label: string) => void
  onSubmitChange: () => void
  onConfirmDesign: () => void
  onSaveScene: (scene: SceneGraph) => void
}) {
  const editable = getEditableDesign(order)
  const approved = getApprovedDesign(order)
  const redesign = Boolean(order.draftVersionId)
  const changeSubmitted = order.changeRequest?.status === 'submitted'
  const editableMode = order.status === 'design' || (redesign && !changeSubmitted)

  const [chosen, setChosen] = useState<ScenarioType>(editable.scenario)
  const [revision, setRevision] = useState(0)
  const [scene, setScene] = useState<SceneGraph>(() => cloneScene(editable.scene))
  const [furnitureEditMode, setFurnitureEditMode] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [saveMessage, setSaveMessage] = useState('当前设计已加载。后续方案应用和家具调整都会自动保存。')

  useEffect(() => {
    setScene(cloneScene(editable.scene))
    setChosen(editable.scenario)
    setFurnitureEditMode(false)
    setSelectedItemId('')
  }, [editable.id, editable.scenario])

  useEffect(() => {
    setScene(cloneScene(editable.scene))
  }, [editable.scene])

  useEffect(() => {
    if (!editableMode) {
      setFurnitureEditMode(false)
      setSelectedItemId('')
    }
  }, [editableMode])

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
    // 先在当前页面立即显示新方案，再写回订单；用户点击后可以立刻看到 2D / Pascal 3D 的变化。
    const next = createScenarioScene(currentScheme.scenario)
    setScene(cloneScene(next))
    setFurnitureEditMode(false)
    setSelectedItemId('')
    onUpdateDraft(currentScheme.scenario, currentScheme.title)
    setRevision((value) => value + 1)
    setSaveMessage(`${currentScheme.title} 已应用并自动保存到 Design V${editable.version}。可以继续调整家具，或提交到下一阶段。`)
  }

  function commitScene(next: SceneGraph, message: string) {
    setScene(next)
    onSaveScene(next)
    setSaveMessage(message)
  }

  function moveItem(itemId: string, dx: number, dz: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = moveFurniture(scene, itemId, dx, dz)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：位置已调整，Design V${editable.version} 已自动保存。`)
  }

  function rotateItem(itemId: string, deltaDegrees: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = rotateFurniture(scene, itemId, deltaDegrees)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：朝向已调整，Design V${editable.version} 已自动保存。`)
  }

  function commitDrag(itemId: string, x: number, z: number) {
    if (!editableMode || !furnitureEditMode) return
    const next = placeFurniture(scene, itemId, x, z)
    if (next === scene) return
    const node: any = next.nodes[itemId]
    const room = next.nodes[node.metadata?.room_id]?.name ?? '空间'
    commitScene(next, `${room} · ${node.name}：拖动位置已保存到 Design V${editable.version}。`)
  }

  function toggleFurnitureEdit() {
    if (!editableMode) return
    setFurnitureEditMode((current) => {
      const next = !current
      if (!next) setSelectedItemId('')
      setSaveMessage(next
        ? '已进入家具调整模式：点击家具后可拖动，也可使用方向键和旋转键；每次修改自动保存。'
        : `家具调整已结束，当前布局已保存在 Design V${editable.version}。`)
      return next
    })
  }

  return (
    <div className="customer-design">
      {order.status !== 'design' && !redesign && (
        <div className="version-warning">
          <div>
            <strong>当前后续流程使用：Design V{approved.version}</strong>
            <span>如需继续修改，可从施工页点击“重新设计”，或直接在这里创建新的设计变更版本。原批准版本不会被直接覆盖。</span>
          </div>
          <button onClick={onStartRedesign}>重新设计</button>
        </div>
      )}

      {order.status === 'design' && (
        <div className="design-flow-banner">
          <div>
            <strong>Design V{editable.version} · 设计中</strong>
            <span>应用方案和家具调整均自动保存。确认后会生成对应 BOM，并进入生产阶段。</span>
          </div>
          <button className="flow-primary" onClick={onConfirmDesign}>确认设计并进入生产</button>
        </div>
      )}

      {redesign && !changeSubmitted && (
        <div className="design-flow-banner draft-flow">
          <div>
            <strong>Design V{editable.version} · Draft</strong>
            <span>当前修改已自动保存；完成后提交设计变更，施工方接受后才会同步到 BOM / 生产 / 施工。</span>
          </div>
          <button className="flow-primary" onClick={onSubmitChange}>提交设计变更</button>
        </div>
      )}

      {redesign && changeSubmitted && (
        <div className="design-flow-banner submitted-flow">
          <div>
            <strong>Design V{editable.version} · 已提交</strong>
            <span>正在等待施工方确认。确认前 Design V{approved.version} 仍是施工依据，当前 Draft 暂时锁定，避免提交后继续修改。</span>
          </div>
          <button disabled>等待施工方确认</button>
        </div>
      )}

      <div className="design-save-status">
        <b>保存状态</b>
        <span>{saveMessage}</span>
      </div>

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
            应用并保存当前方案
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
            onSelectItem={(itemId) => setSelectedItemId(itemId)}
            onNudgeItem={moveItem}
            onRotateItem={rotateItem}
            onDragCommit={commitDrag}
            onClearSelection={() => setSelectedItemId('')}
          />
        </section>
      </div>
    </div>
  )
}
