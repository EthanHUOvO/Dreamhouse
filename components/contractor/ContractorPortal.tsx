'use client'
import { useEffect,useMemo,useState } from 'react'
import PortalHeader from '@/components/shared/PortalHeader'
import OrderSidebar from './OrderSidebar'
import ContractorOrderDetail from './ContractorOrderDetail'
import { acceptChange,loadOrders,saveOrders } from '@/lib/order-store'
import type { Order,OrderStatus } from '@/lib/types'

export default function ContractorPortal(){
  const[orders,setOrders]=useState<Order[]>([]),[selectedId,setSelectedId]=useState('DH-2026-001'),[filter,setFilter]=useState<'all'|OrderStatus>('all')
  useEffect(()=>{
    const sync=()=>setOrders(loadOrders())
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
  function mutate(fn:(o:Order)=>Order){if(!order)return;const next=orders.map(o=>o.id===order.id?fn(o):o);setOrders(next);saveOrders(next)}
  function advancePrinter(){mutate(o=>{const p=Math.min(100,o.printer.progress+12),done=p>=100;return {...o,printer:{...o.printer,progress:p,status:done?'完成':'运行中',task:done?`Design V${o.downstreamVersion??o.approvedVersion} 打印完成`:'墙体 / 地板生产'},productionProgress:Math.max(o.productionProgress,p),bom:o.bom.map(x=>x.category==='furniture'?x:{...x,status:done?'已完成':'生产中'}),status:done&&o.status==='production'?'transport':o.status}})}
  function advanceRobot(){mutate(o=>{const p=Math.min(100,o.robot.progress+12),done=p>=100;return {...o,robot:{...o.robot,progress:p,status:done?'完成':'运行中',task:done?'全部装配完成':'现场装配'},constructionProgress:Math.max(o.constructionProgress,p),robotTasks:o.robotTasks.map((x,i)=>({...x,status:done?'已完成':i===0?'已完成':'施工中'})),status:done?'acceptance':'construction'}})}
  function completeManual(){mutate(o=>({...o,manualTasks:o.manualTasks.map(x=>({...x,status:'已完成'}))}))}
  if(!order)return <div className="page-loading">正在加载施工订单…</div>
  return <main className="portal-page contractor-page"><PortalHeader title="施工方端" subtitle="Contractor Portal"/><div className="contractor-shell"><OrderSidebar orders={orders} selectedId={order.id} onSelect={setSelectedId} filter={filter} setFilter={setFilter}/><ContractorOrderDetail order={order} onAdvancePrinter={advancePrinter} onAdvanceRobot={advanceRobot} onCompleteManual={completeManual} onAcceptChange={()=>mutate(acceptChange)}/></div></main>
}
