'use client'

import { useEffect, useMemo, useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign, getEditableDesign } from '@/lib/order-store'
import { createScenarioScene } from '@/lib/scenarios'
import type { Order, ScenarioType, SceneGraph } from '@/lib/types'
import { cloneScene, moveFurniture, placeFurniture, rotateFurniture } from '@/lib/furniture-edit'

const SCHEMES: Record<ScenarioType, { scenario: ScenarioType; title: string; summary: string }> = {
  single: {
    scenario: 'single',
    title: '单身男性 · 电竞房方案',
    summary: '保留单人书房，并将独立兴趣房保留为电竞房。',
  },
  single_female: {
    scenario: 'single_female',
    title: '单身女性 · 衣帽间方案',
    summary: '保留单人书房，并将原电竞房调整为独立衣帽间。',
  },
  couple: {
    scenario: 'couple',
    title: '双人世界方案',
    summary: '沿用原来的双人方案：电竞房改为衣帽间，书房改为双人书房。',
  },
  child: {
    scenario: 'child',
    title: '育儿家庭方案',
    summary: '沿用原育儿方案：电竞房改为儿童房，卫生间拆分为主卫和公卫。',
  },
  nanny: {
    scenario: 'nanny',
    title: '育儿 + 保姆方案',
    summary: '沿用原育儿 + 保姆方案：儿童房、保姆房、主卫和公卫共同形成家庭空间。',
  },
  replan: {
    scenario: 'replan',
    title: '空间重新规划方案',
    summary: '旧版本保留项。可通过上方居住人数引导重新选择新的居住方案。',
  },
}

type HouseholdChoice = 'single' | 'couple' | 'family3'
type SingleGender = 'male' | 'female'
type FamilyPlan = 'child' | 'nanny'

function guidanceFromScenario(scenario: ScenarioType): {
  household: HouseholdChoice | null
  gender: SingleGender | null
  familyPlan: FamilyPlan | null
} {
  if (scenario === 'single') return { household: 'single', gender: 'male', familyPlan: null }
  if (scenario === 'single_female') return { household: 'single', gender: 'female', familyPlan: null }
  if (scenario === 'couple') return { household: 'couple', gender: null, familyPlan: null }
  if (scenario === 'child') return { household: 'family3', gender: null, familyPlan: 'child' }
  if (scenario === 'nanny') return { household: 'family3', gender: null, familyPlan: 'nanny' }
  return { household: null, gender: null, familyPlan: null }
}


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

  const initialGuidance = guidanceFromScenario(editable.scenario)
  const [chosen, setChosen] = useState<ScenarioType>(editable.scenario)
  const [household, setHousehold] = useState<HouseholdChoice | null>(initialGuidance.household)
  const [singleGender, setSingleGender] = useState<SingleGender | null>(initialGuidance.gender)
  const [familyPlan, setFamilyPlan] = useState<FamilyPlan | null>(initialGuidance.familyPlan)
  const [revision, setRevision] = useState(0)
  const [scene, setScene] = useState<SceneGraph>(() => cloneScene(editable.scene))
  const [furnitureEditMode, setFurnitureEditMode] = useState(false)
  const [walkthroughMode, setWalkthroughMode] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [saveMessage, setSaveMessage] = useState('当前设计已加载。后续方案应用和家具调整都会自动保存。')

  useEffect(() => {
    setScene(cloneScene(editable.scene))
    setChosen(editable.scenario)
    const guidance = guidanceFromScenario(editable.scenario)
    setHousehold(guidance.household)
    setSingleGender(guidance.gender)
    setFamilyPlan(guidance.familyPlan)
    setFurnitureEditMode(false)
    setWalkthroughMode(false)
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

  const currentScheme = useMemo(() => SCHEMES[chosen], [chosen])

  const selectedItem: any = selectedItemId ? scene.nodes[selectedItemId] : null
  const selectedRoomName = selectedItem
    ? (scene.nodes[selectedItem.metadata?.room_id]?.name ?? '未分类空间')
    : ''
  const selectedItemLabel = selectedItem ? `${selectedRoomName} · ${selectedItem.name}` : ''

  function chooseHousehold(next: HouseholdChoice) {
    if (!editableMode) return
    setHousehold(next)
    setFurnitureEditMode(false)
    setWalkthroughMode(false)
    setSelectedItemId('')
    if (next === 'single') {
      const gender = singleGender ?? 'male'
      setSingleGender(gender)
      setFamilyPlan(null)
      setChosen(gender === 'female' ? 'single_female' : 'single')
      return
    }
    if (next === 'couple') {
      setSingleGender(null)
      setFamilyPlan(null)
      setChosen('couple')
      return
    }
    const plan = familyPlan ?? 'child'
    setSingleGender(null)
    setFamilyPlan(plan)
    setChosen(plan)
  }

  function chooseSingleGender(gender: SingleGender) {
    if (!editableMode) return
    setSingleGender(gender)
    setChosen(gender === 'female' ? 'single_female' : 'single')
  }

  function chooseFamilyPlan(plan: FamilyPlan) {
    if (!editableMode) return
    setFamilyPlan(plan)
    setChosen(plan)
  }

  function applyScheme() {
    if (!editableMode) return
    // 先在当前页面立即显示新方案，再写回订单；用户点击后可以立刻看到 2D / Pascal 3D 的变化。
    const next = createScenarioScene(currentScheme.scenario)
    setScene(cloneScene(next))
    setFurnitureEditMode(false)
    setWalkthroughMode(false)
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
    setWalkthroughMode(false)
    setFurnitureEditMode((current) => {
      const next = !current
      if (!next) setSelectedItemId('')
      setSaveMessage(next
        ? '已进入家具调整模式：点击家具后可拖动，也可使用方向键和旋转键；每次修改自动保存。'
        : `家具调整已结束，当前布局已保存在 Design V${editable.version}。`)
      return next
    })
  }

  function toggleWalkthrough() {
    setWalkthroughMode((current) => {
      const next = !current
      if (next) {
        setFurnitureEditMode(false)
        setSelectedItemId('')
        setSaveMessage('已进入第一人称漫游：点击 3D 画面后使用 WASD 行走；靠近门可用左键或 E 开关。漫游只用于体验，不会改变家具设计。')
      } else {
        setSaveMessage(`已退出漫游，返回 Design V${editable.version} 的正常 3D 展示。`)
      }
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
        <section className="card interaction-card guided-scheme-card">
          <div className="card-title">居住需求引导</div>
          <div className="guided-flow">
            <div className="guided-step">
              <div className="guided-step-title"><span>1</span><b>请选择居住人数</b></div>
              <div className="guided-choice-grid household-grid">
                <button
                  className={`guided-choice ${household === 'single' ? 'selected' : ''}`}
                  onClick={() => chooseHousehold('single')}
                  disabled={!editableMode}
                >
                  <strong>单身贵族</strong>
                  <small>1 人居住</small>
                </button>
                <button
                  className={`guided-choice ${household === 'couple' ? 'selected' : ''}`}
                  onClick={() => chooseHousehold('couple')}
                  disabled={!editableMode}
                >
                  <strong>双人世界</strong>
                  <small>2 人居住</small>
                </button>
                <button
                  className={`guided-choice ${household === 'family3' ? 'selected' : ''}`}
                  onClick={() => chooseHousehold('family3')}
                  disabled={!editableMode}
                >
                  <strong>三口之家</strong>
                  <small>家庭居住</small>
                </button>
              </div>
            </div>

            {household === 'single' && (
              <div className="guided-step guided-followup">
                <div className="guided-step-title"><span>2</span><b>请选择居住者</b></div>
                <div className="guided-choice-grid two-choice-grid">
                  <button
                    className={`guided-choice detail-choice ${singleGender === 'male' ? 'selected' : ''}`}
                    onClick={() => chooseSingleGender('male')}
                    disabled={!editableMode}
                  >
                    <strong>男士</strong>
                    <small>保留电竞房 + 单人书房</small>
                  </button>
                  <button
                    className={`guided-choice detail-choice ${singleGender === 'female' ? 'selected' : ''}`}
                    onClick={() => chooseSingleGender('female')}
                    disabled={!editableMode}
                  >
                    <strong>女士</strong>
                    <small>衣帽间 + 单人书房</small>
                  </button>
                </div>
              </div>
            )}

            {household === 'couple' && (
              <div className="guided-step guided-followup">
                <div className="guided-step-title"><span>2</span><b>双人世界推荐</b></div>
                <button className="guided-result-option selected" disabled>
                  <strong>两人共同居住方案</strong>
                  <small>衣帽间 + 双人书房，沿用你之前确定的双人方案。</small>
                </button>
              </div>
            )}

            {household === 'family3' && (
              <div className="guided-step guided-followup">
                <div className="guided-step-title"><span>2</span><b>请选择家庭方案</b></div>
                <div className="guided-choice-grid two-choice-grid">
                  <button
                    className={`guided-choice detail-choice ${familyPlan === 'child' ? 'selected' : ''}`}
                    onClick={() => chooseFamilyPlan('child')}
                    disabled={!editableMode}
                  >
                    <strong>育儿家庭方案</strong>
                    <small>儿童房 + 主卫 / 公卫</small>
                  </button>
                  <button
                    className={`guided-choice detail-choice ${familyPlan === 'nanny' ? 'selected' : ''}`}
                    onClick={() => chooseFamilyPlan('nanny')}
                    disabled={!editableMode}
                  >
                    <strong>育儿 + 保姆方案</strong>
                    <small>儿童房 + 保姆房 + 主卫 / 公卫</small>
                  </button>
                </div>
              </div>
            )}

            <div className="guided-result-card">
              <span>当前将生成</span>
              <b>{currentScheme.title}</b>
              <p>{currentScheme.summary}</p>
            </div>
          </div>
          <button className="primary guided-apply" onClick={applyScheme} disabled={!editableMode || !household}>
            生成并应用方案
          </button>
        </section>

        <section className="card visual-card">
          <div className="card-title">2D图纸</div>
          <Floorplan2D scene={scene} />
        </section>

        <section className="card visual-card mover-visual-card">
          <div className="card-title viewer-titlebar">
            <span>3D展示</span>
            <div className="viewer-mode-actions">
              {editableMode && !walkthroughMode && (
                <button
                  className={`open-furniture-control ${furnitureEditMode ? 'active' : ''}`}
                  onClick={toggleFurnitureEdit}
                >
                  {furnitureEditMode ? '完成调整' : '调整家具'}
                </button>
              )}
              <button
                className={`open-walkthrough-control ${walkthroughMode ? 'active' : ''}`}
                onClick={toggleWalkthrough}
              >
                {walkthroughMode ? '退出漫游' : '进入漫游'}
              </button>
            </div>
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
            walkthroughMode={walkthroughMode}
            onExitWalkthrough={() => setWalkthroughMode(false)}
          />
        </section>
      </div>
    </div>
  )
}
