'use client'
import { useEffect,useMemo,useState } from 'react'
import PortalHeader from '@/components/shared/PortalHeader'
import CustomerStepper from './CustomerStepper'
import CustomerDesign from './CustomerDesign'
import CustomerConstruction from './CustomerConstruction'
import CustomerAcceptance from './CustomerAcceptance'
import ProjectSettings from './ProjectSettings'
import { addVideoConcept,addVisualConcept,applyAiLayoutRun,applyAiProposal,attachDetailedBom,attachDrawing,confirmDesignAndStartProduction,createRedesign,getApprovedDesign,loadOrders,replaceOrder,saveOrders,setAiProposals,submitChange,updateEditableScene,withdrawChange } from '@/lib/order-store'
import { getActiveProjectId,getProfile,setActiveProjectId,upsertProfile } from '@/lib/user-profile-store'
import type { AiDesignProposal, AiLayoutRun, DrawingSource, Order, SceneGraph, UserProfile, VisualConcept, VideoConcept } from '@/lib/types'

type Stage='design'|'construction'|'acceptance'
function projectStage(o:Order):Stage{return o.status==='design'?'design':o.status==='acceptance'||o.status==='completed'?'acceptance':'construction'}
export default function CustomerPortal(){
  const[orders,setOrders]=useState<Order[]>([]),[selectedId,setSelectedId]=useState(''),[view,setView]=useState<Stage>('design'),[settings,setSettings]=useState(false)
  useEffect(()=>{const sync=()=>{const list=loadOrders();setOrders(list);const active=getActiveProjectId();const id=(active&&list.some(o=>o.id===active)?active:list[0]?.id)||'';setSelectedId(v=>v||id);const o=list.find(x=>x.id===id);if(o)setView(projectStage(o))};sync();window.addEventListener('dreamhouse:v11:orders-updated',sync as any);window.addEventListener('storage',sync);return()=>{window.removeEventListener('dreamhouse:v11:orders-updated',sync as any);window.removeEventListener('storage',sync)}},[])
  const order=useMemo(()=>orders.find(o=>o.id===selectedId)??orders[0],[orders,selectedId]);const profile=order?.userProfileId?getProfile(order.userProfileId):undefined
  function saveOrder(nextOrder:Order){const next=replaceOrder(orders,nextOrder.id,()=>nextOrder);setOrders(next);saveOrders(next)}
  function mutate(fn:(o:Order)=>Order){if(!order)return;saveOrder(fn(order))}
  async function requestDetailedBom(nextOrder:Order){
    const design=getApprovedDesign(nextOrder)
    try{
      const res=await fetch('/api/bom/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({design,profile,drawing:nextOrder.drawing})})
      if(!res.ok)throw new Error(await res.text())
      const data=await res.json()
      const fresh=loadOrders(),updated=replaceOrder(fresh,nextOrder.id,o=>attachDetailedBom(o,data.bom))
      setOrders(updated);saveOrders(updated)
    }catch(error){console.error('[DreamHouse] detailed BOM generation failed',error)}
  }
  function confirmAndGenerateBom(){if(!order)return;const confirmed=confirmDesignAndStartProduction(order);saveOrder(confirmed);setView('construction');void requestDetailedBom(confirmed)}
  if(!order)return <div className="page-loading">暂无住宅项目，请从首页自助设计创建项目。</div>
  const pstage=projectStage(order)
  return <main className="portal-page"><PortalHeader title="住户端" subtitle="Customer Portal"/><div className="customer-orderbar"><div><b>{order.id}</b><span>{order.projectName} · {order.customer}</span></div><div className="order-actions"><button onClick={()=>setSettings(true)}>项目设置</button><select value={order.id} onChange={e=>{const id=e.target.value;setSelectedId(id);setActiveProjectId(id);const o=orders.find(x=>x.id===id);if(o)setView(projectStage(o))}}>{orders.map(o=><option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}</select></div></div><div className="customer-shell"><section className="customer-main">{view==='design'&&<CustomerDesign order={order} profile={profile} onSetPlans={(p:AiDesignProposal[])=>mutate(o=>setAiProposals(o,p))} onApplyProposal={(p)=>mutate(o=>applyAiProposal(o,p))} onApplyLayout={(run:AiLayoutRun)=>mutate(o=>applyAiLayoutRun(o,run))} onSaveScene={(s:SceneGraph)=>mutate(o=>updateEditableScene(o,s))} onAddVisual={(v:VisualConcept)=>mutate(o=>addVisualConcept(o,v))} onAddVideo={(v:VideoConcept)=>mutate(o=>addVideoConcept(o,v))} onStartRedesign={()=>mutate(createRedesign)} onSubmitChange={()=>mutate(submitChange)} onConfirmDesign={confirmAndGenerateBom}/>}{view==='construction'&&<CustomerConstruction order={order} onRedesign={()=>{mutate(createRedesign);setView('design')}} onContinueDraft={()=>setView('design')} onWithdrawAndEdit={()=>{mutate(withdrawChange);setView('design')}}/>}{view==='acceptance'&&<CustomerAcceptance order={order} onAccept={()=>mutate(o=>({...o,accepted:true,status:'completed',acceptanceProgress:100}))}/>}</section><CustomerStepper current={view} projectStage={pstage} onSelect={setView}/></div>{settings&&<ProjectSettings order={order} profile={profile} onClose={()=>setSettings(false)} onSaveProfile={(p:UserProfile)=>{const saved=upsertProfile(p);mutate(o=>({...o,userProfileId:saved.id,customer:saved.displayName}));setSettings(false)}} onSaveDrawing={(d:DrawingSource)=>{mutate(o=>attachDrawing(o,d));setSettings(false)}}/>}</main>
}
