import { createDemoOrders } from './demo-orders'
import type { DesignVersion, Order, ScenarioType, SceneGraph } from './types'
import { createScenarioScene } from './scenarios'
import { syncOrderDownstream } from './downstream'

const KEY='dreamhouse.pascal.continuousflow.orders.v4'
const UPDATE_EVENT='dreamhouse:orders-updated'

export function loadOrders():Order[]{
  if(typeof window==='undefined')return createDemoOrders()
  try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw)}catch{}
  const fresh=createDemoOrders();saveOrders(fresh);return fresh
}
export function saveOrders(orders:Order[]){
  if(typeof window==='undefined')return
  localStorage.setItem(KEY,JSON.stringify(orders))
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
}
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
  const nextScene=createScenarioScene(scenario)
  if(order.draftVersionId){
    return {...order,designVersions:order.designVersions.map(v=>v.id===order.draftVersionId?{...v,scenario,label,scene:nextScene,notes:'固定方案已应用，后续家具调整自动保存'}:v)}
  }
  if(order.status==='design'){
    return {...order,designVersions:order.designVersions.map(v=>v.version===order.approvedVersion?{...v,scenario,label,scene:nextScene,notes:'固定方案已应用'}:v)}
  }
  return order
}
export function updateEditableScene(order:Order,scene:SceneGraph):Order{
  if(order.draftVersionId){
    return {...order,designVersions:order.designVersions.map(v=>v.id===order.draftVersionId?{...v,scene,notes:'家具布局已调整并自动保存'}:v)}
  }
  if(order.status==='design'){
    return {...order,designVersions:order.designVersions.map(v=>v.version===order.approvedVersion?{...v,scene,notes:'家具布局已调整并自动保存'}:v)}
  }
  return order
}

// 初始设计确认：冻结当前设计版本，并把同一份 Scene 自动转换为 BOM / 生产 / 施工任务。
export function confirmDesignAndStartProduction(order:Order):Order{
  if(order.status!=='design')return order
  const editable=getEditableDesign(order)
  const approved:DesignVersion={...editable,status:'approved',notes:'住户已确认设计，已同步至生产'}
  const next:Order={
    ...order,
    approvedVersion:approved.version,
    draftVersionId:undefined,
    changeRequest:undefined,
    designVersions:order.designVersions.map(v=>v.id===approved.id?approved:v.status==='approved'&&v.id!==approved.id?{...v,status:'superseded'}:v),
  }
  return syncOrderDownstream(next,approved)
}

// 已进入生产/施工后的修改先作为 Change Request 提交，施工方接受前不覆盖当前批准版本。
export function submitChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId)return order
  if(order.changeRequest.status==='accepted'||order.changeRequest.status==='rejected')return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId)
  return {
    ...order,
    changeRequest:{
      ...order.changeRequest,
      status:'submitted',
      summary:`${draft?.label??'设计变更'}：方案与家具布局已保存，等待施工方确认`,
    },
  }
}

// 施工方接受后：Draft 升级为 Approved，并立即用该版本重新生成 BOM / 生产 / 施工任务。
export function acceptChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId||order.changeRequest.status!=='submitted')return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId);if(!draft)return order
  const approved:DesignVersion={...draft,status:'approved',notes:'设计变更已由施工方接受，并同步至后续生产/施工'}
  const promoted:Order={
    ...order,
    approvedVersion:approved.version,
    designVersions:order.designVersions.map(v=>v.id===approved.id?approved:v.status==='approved'?{...v,status:'superseded'}:v),
    changeRequest:{...order.changeRequest,status:'accepted'},
    draftVersionId:undefined,
  }
  return syncOrderDownstream(promoted,approved)
}
