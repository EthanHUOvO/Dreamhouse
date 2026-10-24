 'use client'
import { useEffect,useState } from 'react'
import PortalHeader from '@/components/shared/PortalHeader'
import OrderSidebar from './OrderSidebar'
import ContractorWorkspace from './ContractorWorkspace'
import { loadOrders } from '@/lib/order-store'
import type { Order } from '@/lib/types'

export default function ContractorPortal(){
  const[orders,setOrders]=useState<Order[]>([])
  useEffect(()=>{const sync=()=>setOrders(loadOrders());sync();window.addEventListener('dreamhouse:v11:orders-updated',sync as any);window.addEventListener('storage',sync);return()=>{window.removeEventListener('dreamhouse:v11:orders-updated',sync as any);window.removeEventListener('storage',sync)}},[])
  const order=orders[0]
  if(!order)return <div className="page-loading">暂无订单</div>
  return <main className="portal-page"><PortalHeader title="施工方端" subtitle="制造与施工"/><div className="contractor-shell"><OrderSidebar orders={orders}/><ContractorWorkspace key={order.id} order={order}/></div></main>
}
