'use client'
import { useEffect,useMemo,useState } from 'react'
import PortalHeader from '@/components/shared/PortalHeader'
import CustomerStepper from './CustomerStepper'
import CustomerDesign from './CustomerDesign'
import CustomerConstruction from './CustomerConstruction'
import CustomerAcceptance from './CustomerAcceptance'
import CustomerDrawingImport from './CustomerDrawingImport'
import DrawingSourceBar from './DrawingSourceBar'
import { applyDrawingImport,confirmDesignAndStartProduction,createRedesign,loadOrders,saveOrders,submitChange,updateDraftScenario,updateEditableScene,withdrawChange } from '@/lib/order-store'
import { formatUserProfile,getActiveCustomerOrderId,getUserProfile,setActiveCustomerOrderId,updateUserProfileScenario } from '@/lib/user-profile-store'
import type { DrawingImportRequest, Order,ScenarioType, SceneGraph } from '@/lib/types'

type ViewStage='design'|'construction'|'acceptance'
function mapProjectStage(order:Order):ViewStage{
  if(order.status==='design')return 'design'
  if(['acceptance','completed'].includes(order.status))return 'acceptance'
  return 'construction'
}

export default function CustomerPortal(){
  const[orders,setOrders]=useState<Order[]>([])
  const[selectedId,setSelectedId]=useState('')
  const[view,setView]=useState<ViewStage>('design')
  const[drawingImportOpen,setDrawingImportOpen]=useState(false)

  useEffect(()=>{
    const sync=()=>{
      const loaded=loadOrders()
      setOrders(loaded)
      setSelectedId(current=>{
        const active=getActiveCustomerOrderId()
        const desired=current||active||'DH-2026-001'
        const next=loaded.find(item=>item.id===desired)??loaded[0]
        if(next){setView(mapProjectStage(next));return next.id}
        return ''
      })
    }
    sync()
    window.addEventListener('storage',sync)
    window.addEventListener('dreamhouse:orders-updated',sync)
    window.addEventListener('focus',sync)
    return()=>{
      window.removeEventListener('storage',sync)
      window.removeEventListener('dreamhouse:orders-updated',sync)
      window.removeEventListener('focus',sync)
    }
  },[])

  const order=useMemo(()=>orders.find(o=>o.id===selectedId)??orders[0],[orders,selectedId])
  const profile=order?.userProfileId?getUserProfile(order.userProfileId):undefined

  useEffect(()=>{setDrawingImportOpen(false)},[selectedId])

  function mutate(fn:(o:Order)=>Order){
    if(!order)return
    const next=orders.map(o=>o.id===order.id?fn(o):o)
    setOrders(next);saveOrders(next)
  }
  if(!order)return <div className="page-loading">正在加载住户订单…</div>

  const projectStage=mapProjectStage(order)
  const drawingLocked=order.changeRequest?.status==='submitted'

  function finishDrawingImport(request:DrawingImportRequest){
    mutate(o=>applyDrawingImport(o,request))
    setDrawingImportOpen(false)
    setView('design')
  }

  function switchOrder(orderId:string){
    setSelectedId(orderId)
    setActiveCustomerOrderId(orderId)
    const next=orders.find(o=>o.id===orderId)
    if(next)setView(mapProjectStage(next))
  }

  return <main className="portal-page">
    <PortalHeader title="住户端" subtitle="Customer Portal"/>
    <div className="customer-orderbar">
      <div><b>{order.id}</b><span>{order.projectName} · {order.customer}{profile?` · ${formatUserProfile(profile)}`:''}</span></div>
      <select value={selectedId} onChange={e=>switchOrder(e.target.value)}>
        {orders.map(o=><option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}
      </select>
    </div>
    <div className="customer-shell">
      <section className="customer-main">
        {view==='design'&&drawingImportOpen&&<CustomerDrawingImport
          currentDrawing={order.drawing}
          onParsed={finishDrawingImport}
          onCancel={()=>setDrawingImportOpen(false)}
        />}

        {view==='design'&&!drawingImportOpen&&<>
          {order.drawing&&<DrawingSourceBar
            drawing={order.drawing}
            disabled={drawingLocked}
            onReimport={()=>setDrawingImportOpen(true)}
          />}
          <CustomerDesign
            order={order}
            onStartRedesign={()=>mutate(createRedesign)}
            onUpdateDraft={(scenario:ScenarioType,label:string)=>{
              mutate(o=>updateDraftScenario(o,scenario,label))
              updateUserProfileScenario(order.userProfileId,scenario)
            }}
            onSubmitChange={()=>mutate(submitChange)}
            onConfirmDesign={()=>{
              mutate(confirmDesignAndStartProduction)
              setView('construction')
            }}
            onSaveScene={(scene:SceneGraph)=>mutate(o=>updateEditableScene(o,scene))}
          />
        </>}

        {view==='construction'&&<CustomerConstruction
          order={order}
          onRedesign={()=>{mutate(createRedesign);setView('design')}}
          onContinueDraft={()=>setView('design')}
          onWithdrawAndEdit={()=>{mutate(withdrawChange);setView('design')}}
        />} 
        {view==='acceptance'&&<CustomerAcceptance order={order} onAccept={()=>mutate(o=>({...o,accepted:true,status:'completed',acceptanceProgress:100}))}/>} 
      </section>
      <CustomerStepper current={view} projectStage={projectStage} onSelect={stage=>{setView(stage);if(stage!=='design')setDrawingImportOpen(false)}}/>
    </div>
  </main>
}
