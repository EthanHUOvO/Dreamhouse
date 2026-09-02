'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './CustomerProjectSettings.module.css'
import type {
  FamilyPlan,
  HouseholdChoice,
  Order,
  SingleGender,
  UserProfile,
} from '@/lib/types'
import { formatUserProfile, scenarioFromPreferences } from '@/lib/user-profile-store'

export type UserProfileInput = {
  displayName: string
  household: HouseholdChoice
  singleGender?: SingleGender
  familyPlan?: FamilyPlan
}

export default function CustomerProjectSettings({
  open,
  order,
  profile,
  drawingLocked,
  onClose,
  onOpenDrawingImport,
  onSaveProfile,
}: {
  open: boolean
  order: Order
  profile?: UserProfile
  drawingLocked?: boolean
  onClose: () => void
  onOpenDrawingImport: () => void
  onSaveProfile: (input: UserProfileInput) => void
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? order.customer ?? '')
  const [household, setHousehold] = useState<HouseholdChoice>(profile?.household ?? 'single')
  const [singleGender, setSingleGender] = useState<SingleGender>(profile?.singleGender ?? 'male')
  const [familyPlan, setFamilyPlan] = useState<FamilyPlan>(profile?.familyPlan ?? 'child')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setDisplayName(profile?.displayName ?? order.customer ?? '')
    setHousehold(profile?.household ?? 'single')
    setSingleGender(profile?.singleGender ?? 'male')
    setFamilyPlan(profile?.familyPlan ?? 'child')
    setSaved(false)
  }, [open, order.customer, order.id, profile?.id, profile?.displayName, profile?.household, profile?.singleGender, profile?.familyPlan])

  const scenario = useMemo(
    () => scenarioFromPreferences(
      household,
      household === 'single' ? singleGender : undefined,
      household === 'family3' ? familyPlan : undefined,
    ),
    [familyPlan, household, singleGender],
  )

  if (!open) return null

  function save() {
    onSaveProfile({
      displayName: displayName.trim() || '住户',
      household,
      singleGender: household === 'single' ? singleGender : undefined,
      familyPlan: household === 'family3' ? familyPlan : undefined,
    })
    setSaved(true)
  }

  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="项目设置">
      <button className={styles.dismiss} aria-label="关闭项目设置" onClick={onClose} />
      <aside className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span>PROJECT SETTINGS</span>
            <h2>项目设置</h2>
            <p>{order.id} · {order.projectName}</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>01</span>
              <div><b>二维图纸</b><small>住宅空间的基础输入</small></div>
            </div>

            {order.drawing ? (
              <div className={styles.drawingCard}>
                <div className={styles.fileIcon}>2D</div>
                <div className={styles.fileMeta}>
                  <b>{order.drawing.fileName}</b>
                  <span>{order.drawing.templateId} · {order.drawing.parserMode === 'demo-template' ? 'Demo 模板解析' : '已解析'}</span>
                  <small>
                    {order.drawing.detected.rooms} 个空间 · {order.drawing.detected.walls} 面墙 · {order.drawing.detected.doors} 个门 · {order.drawing.detected.windows} 个窗
                  </small>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <b>尚未关联二维图纸</b>
                <span>当前 Demo 订单可以在这里补充图纸，解析结果映射到 HOUSE_001。</span>
              </div>
            )}

            <button
              className={styles.secondaryButton}
              onClick={onOpenDrawingImport}
              disabled={drawingLocked}
            >
              {order.drawing ? '重新上传二维图纸' : '添加二维图纸'}
            </button>
            {drawingLocked && <p className={styles.lockNote}>当前设计变更已经提交，需先撤回后才能重新导入图纸。</p>}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>02</span>
              <div><b>用户画像</b><small>用于个性化住宅需求推荐</small></div>
            </div>

            {profile ? (
              <div className={styles.profileStatus}>
                <span>当前画像</span>
                <b>{formatUserProfile(profile)}</b>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <b>该 Demo 订单尚未建立用户画像</b>
                <span>填写下面的信息并保存后，会把当前订单关联到用户信息库。</span>
              </div>
            )}

            <label className={styles.field}>
              <span>姓名 / 称呼</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：李女士" />
            </label>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>居住人数</span>
              <div className={styles.choiceGrid3}>
                <button className={household === 'single' ? styles.selected : ''} onClick={() => setHousehold('single')}>
                  <b>单身贵族</b><small>1 人</small>
                </button>
                <button className={household === 'couple' ? styles.selected : ''} onClick={() => setHousehold('couple')}>
                  <b>双人世界</b><small>2 人</small>
                </button>
                <button className={household === 'family3' ? styles.selected : ''} onClick={() => setHousehold('family3')}>
                  <b>三口之家</b><small>家庭</small>
                </button>
              </div>
            </div>

            {household === 'single' && (
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>居住者</span>
                <div className={styles.choiceGrid2}>
                  <button className={singleGender === 'male' ? styles.selected : ''} onClick={() => setSingleGender('male')}>
                    <b>男士</b><small>电竞房 + 书房</small>
                  </button>
                  <button className={singleGender === 'female' ? styles.selected : ''} onClick={() => setSingleGender('female')}>
                    <b>女士</b><small>衣帽间 + 书房</small>
                  </button>
                </div>
              </div>
            )}

            {household === 'family3' && (
              <div className={styles.fieldBlock}>
                <span className={styles.fieldLabel}>家庭需求</span>
                <div className={styles.choiceGrid2}>
                  <button className={familyPlan === 'child' ? styles.selected : ''} onClick={() => setFamilyPlan('child')}>
                    <b>育儿家庭</b><small>儿童房 + 双卫</small>
                  </button>
                  <button className={familyPlan === 'nanny' ? styles.selected : ''} onClick={() => setFamilyPlan('nanny')}>
                    <b>育儿 + 保姆</b><small>儿童房 + 保姆房</small>
                  </button>
                </div>
              </div>
            )}

            <div className={styles.recommendation}>
              <span>画像推荐场景</span>
              <b>{scenario}</b>
              <small>保存画像只更新用户需求库，不会直接覆盖你当前的 Design Version。需要改变户型方案时，回到设计区点击“生成并应用方案”。</small>
            </div>

            <button className={styles.primaryButton} onClick={save}>
              {profile ? '保存用户画像修改' : '创建并关联用户画像'}
            </button>
            {saved && <div className={styles.saved}>用户画像已保存，并已关联当前住宅项目。</div>}
          </section>
        </div>
      </aside>
    </div>
  )
}
