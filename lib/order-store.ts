import { createDemoOrders } from './demo-orders'
import type { DesignVersion, Order, ScenarioType } from './types'
import { createScenarioScene } from './scenarios'

const KEY='dreamhouse.dualportal.orders.v2'

export function loadOrders():Order[]{
  if(typeof window==='undefined')return createDemoOrders()
  try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw)}catch{}
  const fresh=createDemoOrders();saveOrders(fresh);return fresh
}
export function saveOrders(orders:Order[]){if(typeof window!=='undefined')localStorage.setItem(KEY,JSON.stringify(orders))}
export function resetOrders(){if(typeof window!=='undefined')localStorage.removeItem(KEY)}
export function getApprovedDesign(order:Order):DesignVersion{return order.designVersions.find(v=>v.version===order.approvedVersion)??order.designVersions[0]}
export function getEditableDesign(order:Order):DesignVersion{
  if(order.draftVersionId){const draft=order.designVersions.find(v=>v.id===order.draftVersionId);if(draft)return draft}
  return getApprovedDesign(order)
}
export function createRedesign(order:Order):Order{
  if(order.draftVersionId)return order
  const approved=getApprovedDesign(order),nextVersion=Math.max(...order.designVersions.map(v=>v.version))+1
  const draft:DesignVersion={id:`design-${order.id}-${nextVersion}-${Date.now()}`,version:nextVersion,label:`设计变更 V${nextVersion}`,status:'draft',scenario:approved.scenario,scene:JSON.parse(JSON.stringify(approved.scene)),createdAt:new Date().toISOString(),notes:'住户回到设计阶段重新设计'}
  return {...order,draftVersionId:draft.id,designVersions:[...order.designVersions,draft],changeRequest:{id:`CR-${order.id}-${nextVersion}`,fromVersion:approved.version,toVersion:nextVersion,status:'draft',summary:'住户发起设计变更',createdAt:new Date().toISOString()}}
}
export function updateDraftScenario(order:Order,scenario:ScenarioType,label:string):Order{
  if(!order.draftVersionId)return order
  return {...order,designVersions:order.designVersions.map(v=>v.id===order.draftVersionId?{...v,scenario,label,scene:createScenarioScene(scenario)}:v)}
}
export function submitChange(order:Order):Order{return order.changeRequest?{...order,changeRequest:{...order.changeRequest,status:'submitted'}}:order}
export function acceptChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId)return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId);if(!draft)return order
  return {...order,approvedVersion:draft.version,designVersions:order.designVersions.map(v=>v.id===draft.id?{...v,status:'approved'}:v.status==='approved'?{...v,status:'superseded'}:v),changeRequest:{...order.changeRequest,status:'accepted'},draftVersionId:undefined}
}
