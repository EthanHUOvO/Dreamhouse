'use client'
import { useEffect,useMemo,useState } from 'react'
import PortalHeader from '@/components/shared/PortalHeader'
import CustomerStepper from './CustomerStepper'
import CustomerDesign from './CustomerDesign'
import CustomerConstruction from './CustomerConstruction'
import CustomerAcceptance from './CustomerAcceptance'
import { acceptChange,createRedesign,loadOrders,saveOrders,submitChange,updateDraftScenario,updateEditableScene } from '@/lib/order-store'
import type { Order,ScenarioType, SceneGraph } from '@/lib/types'

type ViewStage='design'|'construction'|'acceptance'
function mapProjectStage(order:Order):ViewStage{
  if(order.status==='design')return 'design'
  if(['acceptance','completed'].includes(order.status))return 'acceptance'
  return 'construction'
}

export default function CustomerPortal(){
  const[orders,setOrders]=useState<Order[]>([])
  const[selectedId,setSelectedId]=useState('DH-2026-001')
  const[view,setView]=useState<ViewStage>('construction')
  useEffect(()=>setOrders(loadOrders()),[])
  const order=useMemo(()=>orders.find(o=>o.id===selectedId)??orders[0],[orders,selectedId])

  function mutate(fn:(o:Order)=>Order){
    if(!order)return
    const next=orders.map(o=>o.id===order.id?fn(o):o)
    setOrders(next);saveOrders(next)
  }
  if(!order)return <div className="page-loading">正在加载住户订单…</div>

  const projectStage=mapProjectStage(order)
  return <main className="portal-page">
    <PortalHeader title="住户端" subtitle="Customer Portal"/>
    <div className="customer-orderbar">
      <div><b>{order.id}</b><span>{order.projectName} · {order.customer}</span></div>
      <select value={selectedId} onChange={e=>{setSelectedId(e.target.value);const next=orders.find(o=>o.id===e.target.value);if(next)setView(mapProjectStage(next))}}>
        {orders.map(o=><option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}
      </select>
    </div>
    <div className="customer-shell">
      <section className="customer-main">
        {view==='design'&&<CustomerDesign
          order={order}
          onStartRedesign={()=>mutate(createRedesign)}
          onUpdateDraft={(scenario:ScenarioType,label:string)=>mutate(o=>updateDraftScenario(o,scenario,label))}
          onSubmitChange={()=>mutate(submitChange)}
          onSaveScene={(scene:SceneGraph)=>mutate(o=>updateEditableScene(o,scene))}
        />}
        {view==='construction'&&<CustomerConstruction order={order}/>}
        {view==='acceptance'&&(
          <CustomerAcceptance order={order} onAccept={()=>mutate(o=>({...o,accepted:true,status:'completed',acceptanceProgress:100}))}/>
        )}
      </section>
      <CustomerStepper current={view} projectStage={projectStage} onSelect={setView}/>
    </div>
  </main>
}
