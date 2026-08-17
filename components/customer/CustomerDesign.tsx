'use client'
import { useEffect,useMemo,useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { getApprovedDesign,getEditableDesign } from '@/lib/order-store'
import type { Order,ScenarioType, SceneGraph } from '@/lib/types'

const SCHEMES:{scenario:ScenarioType;title:string;summary:string}[]=[
  {scenario:'single',title:'单人居住方案',summary:'保留主卧、书房、客餐厨一体与开放式走廊关系。'},
  {scenario:'couple',title:'两人共同居住方案',summary:'电竞房改为衣帽间，书房改为双人书房。'},
  {scenario:'child',title:'育儿家庭方案',summary:'电竞房改为儿童房，卫生间拆分为主卫和公卫。'},
  {scenario:'nanny',title:'育儿 + 保姆方案',summary:'儿童房、保姆房、主卫、公卫共同形成育儿阶段方案。'},
  {scenario:'replan',title:'空间重新规划方案',summary:'将原儿童/电竞房拆分为书房与储物间，并将原书房调整为儿童房。'}
]
function cloneScene<T>(x:T):T{return JSON.parse(JSON.stringify(x))}

export default function CustomerDesign({
  order,
  onStartRedesign,
  onUpdateDraft,
  onSubmitChange,
  onSaveScene
}:{
  order:Order
  onStartRedesign:()=>void
  onUpdateDraft:(scenario:ScenarioType,label:string)=>void
  onSubmitChange:()=>void
  onSaveScene:(scene:SceneGraph)=>void
}){
  const editable=getEditableDesign(order)
  const approved=getApprovedDesign(order)
  const redesign=Boolean(order.draftVersionId)
  const editableMode=redesign||order.status==='design'
  const[chosen,setChosen]=useState<ScenarioType>(editable.scenario)
  const[revision,setRevision]=useState(0)
  const[scene,setScene]=useState<SceneGraph>(cloneScene(editable.scene))
  const[selectedItemId,setSelectedItemId]=useState<string>('')
  useEffect(()=>{
    setChosen(editable.scenario)
    const next=cloneScene(editable.scene)
    setScene(next)
    const first=Object.values(next.nodes).find((n:any)=>n.type==='item')?.id ?? ''
    setSelectedItemId(first)
  },[editable.id,editable.scene])
  const currentScheme=useMemo(()=>SCHEMES.find(x=>x.scenario===chosen)??SCHEMES[0],[chosen])
  const items=useMemo(()=>Object.values(scene.nodes).filter((n:any)=>n.type==='item').sort((a:any,b:any)=>`${a.metadata?.room_id}-${a.name}`.localeCompare(`${b.metadata?.room_id}-${b.name}`)),[scene])
  const selectedItem:any=items.find((x:any)=>x.id===selectedItemId)??items[0]

  function apply(){
    if(!editableMode)return
    onUpdateDraft(currentScheme.scenario,currentScheme.title)
    setRevision(x=>x+1)
  }
  function updateSelected(field:'x'|'z'|'rot',value:number){
    if(!selectedItem)return
    const next=cloneScene(scene)
    const node:any=next.nodes[selectedItem.id]
    if(field==='x')node.position=[value,node.position?.[1]??0,node.position?.[2]??0]
    if(field==='z')node.position=[node.position?.[0]??0,node.position?.[1]??0,value]
    if(field==='rot')node.rotation=[0,value*Math.PI/180,0]
    setScene(next)
    setRevision(x=>x+1)
  }
  function saveLayout(){
    onSaveScene(scene)
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

    <div className="design-columns design-columns-editable">
      <section className="card interaction-card fixed-scheme-card">
        <div className="card-title">固定方案选择</div>
        <div className="chat-history">
          <div className="ai-msg">当前住宅设计版本：V{editable.version}。可先选择固定方案，再按需微调家具位置。</div>
          <div className="ai-msg proposal"><b>{currentScheme.title}</b><span>{currentScheme.summary}</span></div>
        </div>
        <div className="scheme-list">
          {SCHEMES.map(s=><button key={s.scenario} className={`scheme-item ${chosen===s.scenario?'selected':''}`} onClick={()=>setChosen(s.scenario)} disabled={!editableMode}>
            <b>{s.title}</b>
            <span>{s.summary}</span>
          </button>)}
        </div>
        <button className="primary" onClick={apply} disabled={!editableMode}>应用当前固定方案</button>
      </section>

      <section className="card visual-card">
        <div className="card-title">2D图纸</div>
        <Floorplan2D scene={scene}/>
      </section>

      <section className="card visual-card">
        <div className="card-title">3D展示</div>
        <PascalViewer scene={scene} revision={revision}/>
      </section>

      <section className="card editor-card">
        <div className="card-title">家具位置微调</div>
        <div className="editor-body">
          <div className="editor-tip">可以自行在界面上微调家具位置与朝向。当前版本提供数值化编辑：选择家具后可修改 X / Z 平面位置和旋转角度。</div>
          <div className="editor-list">
            {items.map((item:any)=><button key={item.id} className={`editor-item ${selectedItemId===item.id?'selected':''}`} onClick={()=>setSelectedItemId(item.id)}>
              <b>{item.name}</b><span>{item.metadata?.room_id ?? 'room'}</span>
            </button>)}
          </div>
          {selectedItem&&<div className="editor-form">
            <label>当前家具：<b>{selectedItem.name}</b></label>
            <label>X 位置<input type="number" step="0.05" value={Number(selectedItem.position?.[0]??0).toFixed(2)} onChange={e=>updateSelected('x',Number(e.target.value))}/></label>
            <label>Z 位置<input type="number" step="0.05" value={Number(selectedItem.position?.[2]??0).toFixed(2)} onChange={e=>updateSelected('z',Number(e.target.value))}/></label>
            <label>旋转角度<input type="number" step="5" value={Math.round(((selectedItem.rotation?.[1]??0)*180/Math.PI))} onChange={e=>updateSelected('rot',Number(e.target.value))}/></label>
          </div>}
          <button className="primary" onClick={saveLayout} disabled={!editableMode}>保存当前家具布局</button>
        </div>
      </section>
    </div>
  </div>
}
