'use client'
import { useEffect,useMemo,useState } from 'react'
import Floorplan2D from '@/components/shared/Floorplan2D'
import PascalViewer from '@/components/shared/PascalViewer'
import { getApprovedDesign,getEditableDesign } from '@/lib/order-store'
import { cloneScene,moveFurniture,placeFurniture,rotateFurniture } from '@/lib/furniture-edit'
import { buildDesignScene } from '@/lib/design-engine'
import type { AiDesignProposal, AiLayoutRun, Order, SceneGraph, UserProfile, VisualConcept, VideoConcept } from '@/lib/types'

type AiStatus={provider:'mock'|'qwen';configured:boolean;model:string;baseUrl?:string;bomAiEnabled:boolean;imageConfigured:boolean;videoConfigured:boolean}

const PROMPT_EXAMPLES=[
  '把主卧搬到右下角，原主卧改成书房，卫生间保持不动。',
  '把书房和客厅打通，合并成更大的开放公共空间。',
  '把右下角房间拆成主卧和衣帽间，外墙和承重墙不要变化。',
]
const TOOL_NAMES:Record<string,string>={
  get_house_constraints:'读取住宅约束',get_room_geometry:'读取房间几何',assign_room_function:'更换房间功能',merge_rooms:'合并空间',split_room:'拆分空间',remove_partition_wall:'删除非承重墙',move_partition_wall:'移动非承重墙',add_door:'新增室内门',move_door:'移动室内门',remove_door:'删除室内门',regenerate_furniture:'重新布置家具',validate_layout:'校验新户型'
}

export default function CustomerDesign({order,profile,onSetPlans,onApplyProposal,onApplyLayout,onSaveScene,onAddVisual,onAddVideo,onStartRedesign,onSubmitChange,onConfirmDesign}:{order:Order;profile?:UserProfile;onSetPlans:(p:AiDesignProposal[])=>void;onApplyProposal:(p:AiDesignProposal)=>void;onApplyLayout:(run:AiLayoutRun)=>void;onSaveScene:(s:SceneGraph)=>void;onAddVisual:(v:VisualConcept)=>void;onAddVideo:(v:VideoConcept)=>void;onStartRedesign:()=>void;onSubmitChange:()=>void;onConfirmDesign:()=>void}){
  const editable=getEditableDesign(order),approved=getApprovedDesign(order),redesign=Boolean(order.draftVersionId),submitted=order.changeRequest?.status==='submitted',editableMode=order.status==='design'||(redesign&&!submitted)
  const[scene,setScene]=useState(()=>cloneScene(editable.scene)),[revision,setRevision]=useState(0),[editMode,setEditMode]=useState(false),[walkthrough,setWalkthrough]=useState(false),[selectedId,setSelectedId]=useState(''),[loadingPlans,setLoadingPlans]=useState(false),[selectedPlanId,setSelectedPlanId]=useState(editable.aiProposalId||''),[style,setStyle]=useState(profile?.preferredStyle||'modern'),[room,setRoom]=useState('客餐厨一体'),[rendering,setRendering]=useState(false),[videoing,setVideoing]=useState(false),[message,setMessage]=useState('当前 Design Version 已加载。')
  const[aiStatus,setAiStatus]=useState<AiStatus|null>(null),[aiPrompt,setAiPrompt]=useState(editable.aiLayoutPrompt||PROMPT_EXAMPLES[0]),[layoutRunning,setLayoutRunning]=useState(false),[layoutPreview,setLayoutPreview]=useState<AiLayoutRun|null>(null),[layoutError,setLayoutError]=useState('')

  useEffect(()=>{setScene(cloneScene(editable.scene));setSelectedPlanId(editable.aiProposalId||'');setAiPrompt(editable.aiLayoutPrompt||PROMPT_EXAMPLES[0]);setLayoutPreview(null);setEditMode(false);setWalkthrough(false);setSelectedId('')},[editable.id,editable.scene])
  useEffect(()=>{let cancelled=false;fetch('/api/ai/status').then(r=>r.json()).then(x=>{if(!cancelled)setAiStatus(x)}).catch(()=>{if(!cancelled)setAiStatus(null)});return()=>{cancelled=true}},[])

  const visibleScene=layoutPreview?.scene??scene
  const selected:any=selectedId?visibleScene.nodes[selectedId]:null
  const selectedLabel=selected?`${visibleScene.nodes[selected.metadata?.room_id]?.name||'空间'} · ${selected.name}`:''
  const selectedPlan=useMemo(()=>order.aiProposals.find(p=>p.id===selectedPlanId),[order.aiProposals,selectedPlanId])
  const previewActive=Boolean(layoutPreview)

  async function generateFreeLayout(){
    if(!editableMode||!aiPrompt.trim())return
    setLayoutRunning(true);setLayoutError('');setLayoutPreview(null);setEditMode(false);setWalkthrough(false);setSelectedId('');setMessage('AI Layout Agent 正在读取住宅约束并调用空间工具…')
    try{
      const design={...editable,scene}
      const res=await fetch('/api/ai/layout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile,drawing:order.drawing,design,prompt:aiPrompt.trim()})})
      const data=await res.json();if(!res.ok)throw new Error(data.error||'AI Layout Agent failed')
      const run:AiLayoutRun=data.run
      setLayoutPreview(run);setRevision(v=>v+1)
      if(run.validation.valid)setMessage(`${run.model} 已完成空间重组，当前显示为“预览”，尚未写入 Design V${editable.version}。`)
      else setMessage('AI已返回方案，但Geometry Engine校验未通过；当前方案不能应用。')
    }catch(e:any){setLayoutError(e.message);setMessage(`AI空间规划失败：${e.message}`)}finally{setLayoutRunning(false)}
  }
  function applyLayoutPreview(){if(!layoutPreview?.validation.valid)return;onApplyLayout(layoutPreview);setScene(cloneScene(layoutPreview.scene));setLayoutPreview(null);setRevision(v=>v+1);setMessage(`AI空间重组已写入 Design V${editable.version}。后续确认设计时将按新Scene重新生成BOM。`)}
  function discardLayoutPreview(){setLayoutPreview(null);setRevision(v=>v+1);setMessage('已放弃AI预览，恢复当前 Design Version。')}

  async function generatePlans(){if(!profile)return;setLoadingPlans(true);setMessage('AI正在生成快速候选方案…');try{const res=await fetch('/api/ai/plans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile,drawing:order.drawing,currentScenario:editable.scenario})});const data=await res.json();if(!res.ok)throw new Error(data.error);onSetPlans(data.proposals);setSelectedPlanId(data.proposals?.[0]?.id||'');setMessage(`已生成 ${data.proposals?.length||0} 个快速方案。自由空间重构请使用上方 AI Layout Agent。`)}catch(e:any){setMessage(`方案生成失败：${e.message}`)}finally{setLoadingPlans(false)}}
  function applyPlan(){if(!selectedPlan||!editableMode)return;const next=buildDesignScene(selectedPlan.scenario,editable.furnitureOverrides);setScene(next);setLayoutPreview(null);onApplyProposal(selectedPlan);setRevision(v=>v+1);setEditMode(false);setWalkthrough(false);setMessage(`${selectedPlan.title} 已应用。该入口属于快速Scenario，不等同于自由空间重构。`)}
  function commit(next:SceneGraph,text:string){setScene(next);onSaveScene(next);setRevision(v=>v+1);setMessage(text)}
  function nudge(id:string,dx:number,dz:number){if(previewActive)return;const next=moveFurniture(scene,id,dx,dz);if(next!==scene)commit(next,'家具位置已自动保存到当前 Design Version。')}
  function rotate(id:string,d:number){if(previewActive)return;const next=rotateFurniture(scene,id,d);if(next!==scene)commit(next,'家具旋转已自动保存到当前 Design Version。')}
  function drag(id:string,x:number,z:number){if(previewActive)return;const next=placeFurniture(scene,id,x,z);if(next!==scene)commit(next,'家具拖动位置已自动保存，并写入 Furniture Overrides。')}
  async function renderConcept(){if(!profile)return;setRendering(true);try{const res=await fetch('/api/ai/render',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile,style,room,proposal:selectedPlan})});const data=await res.json();if(!res.ok)throw new Error(data.error);onAddVisual(data.concept);setMessage('装修视觉概念已生成。')}catch(e:any){setMessage(`效果图生成失败：${e.message}`)}finally{setRendering(false)}}
  async function generateVideo(){if(!profile)return;setVideoing(true);try{const latest=order.visualConcepts[0];const res=await fetch('/api/ai/video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile,prompt:`${room} ${style} 住宅展示视频`,imageDataUrl:latest?.imageDataUrl})});const data=await res.json();if(!res.ok)throw new Error(data.error);onAddVideo(data.concept);setMessage('AI展示视频任务已进入队列。')}catch(e:any){setMessage(`视频任务失败：${e.message}`)}finally{setVideoing(false)}}

  const engineClass=aiStatus?.provider==='qwen'?(aiStatus.configured?'ready':'warning'):'mock'
  const engineText=aiStatus?.provider==='qwen'?(aiStatus.configured?'API 已配置':'缺少服务端 API Key'):'Demo Mode'

  return <div className="customer-design">
    {order.status!=='design'&&!redesign&&<div className="version-warning"><div><strong>当前后续流程使用 Design V{approved.version}</strong><span>如需修改，创建新的 Draft，不覆盖正在生产/施工的版本。</span></div><button onClick={onStartRedesign}>重新设计</button></div>}
    {order.status==='design'&&<div className="design-flow-banner"><div><strong>Design V{editable.version} · 设计中</strong><span>AI先生成可校验的空间改动；只有点击“应用到Design”后才会保存。</span></div><button onClick={onConfirmDesign} disabled={previewActive}>确认设计并进入生产</button></div>}
    {redesign&&!submitted&&<div className="design-flow-banner"><div><strong>Design V{editable.version} · Draft</strong><span>AI布局和家具修改均保存在新版本，不覆盖已批准版本。</span></div><button onClick={onSubmitChange} disabled={previewActive}>提交设计变更</button></div>}
    {submitted&&<div className="design-flow-banner"><div><strong>Design V{editable.version} · 已提交</strong><span>等待施工方接受，当前 Draft 暂时锁定。</span></div><button disabled>等待确认</button></div>}
    <div className="design-save-status"><b>状态</b><span>{message}</span></div>

    <div className="design-grid-v11 design-grid-v12">
      <section className="card ai-plan-panel ai-layout-agent-panel">
        <div className="ai-engine-row"><div><span className="eyebrow">AI SPACE AGENT</span><div className="card-title">自然语言空间重构</div></div><div className={`ai-engine-badge ${engineClass}`}><i/ ><span>{aiStatus?.model||'检测中…'}</span><small>{engineText}</small></div></div>
        <div className="agent-context"><span>已接入上下文</span><b>用户画像</b><b>当前2D户型</b><b>Pascal Scene</b><b>承重约束</b></div>
        <label className="ai-layout-prompt"><span>直接描述你希望怎么改房子</span><textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} disabled={!editableMode||layoutRunning} placeholder="例如：把主卧搬到右下角，原主卧改成书房，卫生间保持不动。"/></label>
        <div className="prompt-examples">{PROMPT_EXAMPLES.map(x=><button key={x} onClick={()=>setAiPrompt(x)} disabled={!editableMode||layoutRunning}>{x}</button>)}</div>
        <button className="primary agent-run-button" onClick={generateFreeLayout} disabled={!editableMode||layoutRunning||!aiPrompt.trim()}>{layoutRunning?'Qwen / Agent 正在调用空间工具…':'让 AI 真正重新规划空间'}</button>
        {layoutRunning&&<div className="agent-running"><span>读取住宅约束</span><span>选择 Function Calling 工具</span><span>执行 Geometry Engine</span><span>校验新户型</span></div>}
        {layoutError&&<div className="agent-error">{layoutError}</div>}

        {layoutPreview&&<div className="agent-result">
          <div className="agent-result-head"><div><b>{layoutPreview.model}</b><span>{layoutPreview.provider==='qwen'?'真实 API 返回':'Mock Tool Agent 演示'}</span></div><em className={layoutPreview.validation.valid?'valid':'invalid'}>{layoutPreview.validation.valid?'Geometry ✓ 可应用':'Geometry ✕ 不可应用'}</em></div>
          <p>{layoutPreview.summary}</p>
          <div className="operation-list">{layoutPreview.operations.length?layoutPreview.operations.map((op,i)=><span key={`${op.tool}-${i}`}><b>{i+1}</b>{op.description}</span>):<span>未产生实际空间修改。</span>}</div>
          {layoutPreview.validation.issues.length>0&&<div className="validation-issues">{layoutPreview.validation.issues.map(x=><span key={x}>• {x}</span>)}</div>}
          <details className="tool-log"><summary>查看 Agent 工具调用记录（{layoutPreview.toolLog.length}）</summary>{layoutPreview.toolLog.map(log=><div key={log.index} className={log.ok?'ok':'failed'}><b>{log.index}. {TOOL_NAMES[log.tool]||log.tool}</b><small>{log.ok?'成功':'失败'} · {log.message}</small></div>)}</details>
          <div className="agent-result-actions"><button onClick={discardLayoutPreview}>放弃预览</button><button className="primary" disabled={!layoutPreview.validation.valid} onClick={applyLayoutPreview}>应用到 Design V{editable.version}</button></div>
        </div>}

        <details className="quick-scenario-panel"><summary>快速预置方案（兼容旧Scenario）</summary><div className="profile-context"><b>{profile?.displayName||order.customer}</b><span>{profile?`${profile.household} · ${profile.preferredStyle} · 收纳${profile.storagePriority==='high'?'优先':'常规'}`:'Demo订单'}</span></div><button onClick={generatePlans} disabled={!profile||loadingPlans}>{loadingPlans?'生成中…':'生成3个快速方案'}</button><div className="proposal-list">{order.aiProposals.map(p=><button key={p.id} className={`proposal-card ${selectedPlanId===p.id?'selected':''}`} onClick={()=>setSelectedPlanId(p.id)}><div><b>{p.title}</b><em>{p.score}</em></div><p>{p.summary}</p></button>)}</div>{selectedPlan&&<div className="proposal-detail"><b>方案变化</b>{selectedPlan.roomChanges.map(x=><span key={x}>• {x}</span>)}{selectedPlan.wallChanges.map(x=><span key={x}>• {x}</span>)}<button className="primary" disabled={!editableMode} onClick={applyPlan}>应用快速方案</button></div>}</details>
      </section>

      <section className={`card visual-card ${previewActive?'ai-preview-card':''}`}><div className="card-title viewer-titlebar"><span>2D图纸 {previewActive&&<em>AI PREVIEW</em>}</span>{previewActive&&<small>未保存</small>}</div><Floorplan2D scene={visibleScene}/></section>
      <section className={`card visual-card ${previewActive?'ai-preview-card':''}`}><div className="card-title viewer-titlebar"><span>Pascal 3D验证 {previewActive&&<em>AI PREVIEW</em>}</span><div><button disabled={!editableMode||walkthrough||previewActive} className={editMode?'active':''} onClick={()=>{setWalkthrough(false);setEditMode(v=>!v);setSelectedId('')}}>{editMode?'完成调整':'调整家具'}</button><button className={walkthrough?'active':''} onClick={()=>{setEditMode(false);setSelectedId('');setWalkthrough(v=>!v)}}>{walkthrough?'退出漫游':'进入漫游'}</button></div></div><PascalViewer scene={visibleScene} revision={revision} editMode={editMode&&!previewActive} selectedItemId={selectedId} selectedItemLabel={selectedLabel} onSelectItem={setSelectedId} onNudgeItem={nudge} onRotateItem={rotate} onDragCommit={drag} onClearSelection={()=>setSelectedId('')} walkthroughMode={walkthrough} onExitWalkthrough={()=>setWalkthrough(false)}/></section>
    </div>

    <section className="card concept-panel"><div className="card-title">AI装修视觉预览</div><div className="concept-controls"><label>空间<select value={room} onChange={e=>setRoom(e.target.value)}><option>客餐厨一体</option><option>主卧</option><option>书房</option><option>儿童房</option></select></label><label>风格<select value={style} onChange={e=>setStyle(e.target.value as any)}><option value="modern">现代简约</option><option value="nordic">北欧</option><option value="new_chinese">新中式</option></select></label><button onClick={renderConcept} disabled={!profile||rendering}>{rendering?'生成中…':'生成效果图概念'}</button><button onClick={generateVideo} disabled={!profile||videoing}>{videoing?'提交中…':'生成展示视频任务'}</button></div><div className="concept-gallery">{order.visualConcepts.slice(0,3).map(v=><article key={v.id}>{v.imageDataUrl?<img src={v.imageDataUrl} alt={v.style}/>:<div className="concept-empty">等待图像Provider</div>}<b>{v.room} · {v.style}</b><small>{v.provider}</small></article>)}{order.visualConcepts.length===0&&<div className="concept-empty">Qwen-Image 接通后，此处显示真实装修效果图；它与精确 Pascal Scene 分工独立。</div>}</div><div className="video-task-list">{order.videoConcepts.slice(0,3).map(v=><span key={v.id}><b>{v.provider}</b> · {v.status} · {v.prompt}</span>)}</div></section>
  </div>
}
