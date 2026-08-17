'use client'
import { useMemo,useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign,getEditableDesign } from '@/lib/order-store'
import type { Order,ScenarioType } from '@/lib/types'

const SCHEMES:{scenario:ScenarioType;title:string;summary:string}[]=[
  {scenario:'single',title:'单人居住方案',summary:'保留主卧、书房、客餐厨一体与开放式走廊关系。'},
  {scenario:'couple',title:'两人共同居住方案',summary:'电竞房改为衣帽间，书房改为双人书房。'},
  {scenario:'child',title:'育儿家庭方案',summary:'电竞房改为儿童房，卫生间拆分为主卫和公卫。'},
  {scenario:'nanny',title:'育儿 + 保姆方案',summary:'儿童房、保姆房、主卫、公卫共同形成育儿阶段方案。'},
  {scenario:'replan',title:'空间重新规划方案',summary:'将原儿童/电竞房拆分为书房与储物间，并将原书房调整为儿童房。'}
]

export default function CustomerDesign({
  order,
  onStartRedesign,
  onUpdateDraft,
  onSubmitChange
}:{
  order:Order
  onStartRedesign:()=>void
  onUpdateDraft:(scenario:ScenarioType,label:string)=>void
  onSubmitChange:()=>void
}){
  const editable=getEditableDesign(order)
  const approved=getApprovedDesign(order)
  const redesign=Boolean(order.draftVersionId)
  const[chosen,setChosen]=useState<ScenarioType>(editable.scenario)
  const[revision,setRevision]=useState(0)
  const currentScheme=useMemo(()=>SCHEMES.find(x=>x.scenario===chosen)??SCHEMES[0],[chosen])

  const scene=editable.scene
  function apply(){
    if(!redesign&&order.status!=='design')return
    onUpdateDraft(currentScheme.scenario,currentScheme.title)
    setRevision(x=>x+1)
  }

  return <div className="customer-design">
    {order.status!=='design'&&!redesign&&<div className="version-warning">
      <div><strong>当前施工依据：Design V{approved.version}</strong><span>如果现在重新修改，将创建新的设计变更版本，不会直接覆盖施工中的方案。</span></div>
      <button onClick={onStartRedesign}>重新设计</button>
    </div>}

    {redesign&&<div className="change-banner">
      <strong>Design V{editable.version} · Draft</strong>
      <span>原施工版本仍为 V{approved.version}。完成修改后请提交设计变更。</span>
      <button onClick={onSubmitChange}>提交设计变更</button>
    </div>}

    <div className="design-columns">
      <section className="card interaction-card fixed-scheme-card">
        <div className="card-title">对话式交互（固定方案）</div>
        <div className="chat-history">
          <div className="ai-msg">当前住宅设计版本：V{editable.version}。此版本改为固定方案选择，不再使用自由输入。</div>
          <div className="ai-msg proposal"><b>{currentScheme.title}</b><span>{currentScheme.summary}</span></div>
        </div>
        <div className="scheme-list">
          {SCHEMES.map(s=><button key={s.scenario} className={`scheme-item ${chosen===s.scenario?'selected':''}`} onClick={()=>setChosen(s.scenario)} disabled={!redesign&&order.status!=='design'}>
            <b>{s.title}</b>
            <span>{s.summary}</span>
          </button>)}
        </div>
        <button className="primary" onClick={apply} disabled={!redesign&&order.status!=='design'}>应用当前固定方案</button>
      </section>

      <section className="card visual-card">
        <div className="card-title">2D图纸</div>
        <Floorplan2D scene={scene}/>
      </section>

      <section className="card visual-card">
        <div className="card-title">3D展示</div>
        <PascalViewer scene={scene} revision={revision}/>
      </section>
    </div>
  </div>
}
