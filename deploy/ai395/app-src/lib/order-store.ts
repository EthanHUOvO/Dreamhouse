import { createDemoOrders } from './demo-orders'
import { captureFurnitureOverrides } from './furniture-overrides'
import { createScenarioScene } from './scenarios'
import { buildDesignScene } from './design-engine'
import { syncOrderDownstream } from './downstream'
import type { AiDesignProposal, AiLayoutRun, DesignVersion, DetailedBomDocument, DrawingSource, Order, SceneGraph, VisualConcept, VideoConcept } from './types'

const KEY='dreamhouse.v11.orders'
const UPDATE_EVENT='dreamhouse:v11:orders-updated'

export function loadOrders():Order[]{
  if(typeof window==='undefined')return createDemoOrders()
  try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw)}catch{}
  const fresh=createDemoOrders();saveOrders(fresh);return fresh
}
export function saveOrders(orders:Order[]){if(typeof window==='undefined')return;localStorage.setItem(KEY,JSON.stringify(orders));window.dispatchEvent(new CustomEvent(UPDATE_EVENT))}
export function resetOrders(){if(typeof window!=='undefined')localStorage.removeItem(KEY)}
export function getApprovedDesign(order:Order):DesignVersion{return order.designVersions.find(v=>v.version===order.approvedVersion)??order.designVersions[0]}
export function getEditableDesign(order:Order):DesignVersion{
  if(order.draftVersionId){const draft=order.designVersions.find(v=>v.id===order.draftVersionId);if(draft)return draft}
  return getApprovedDesign(order)
}

export function createProjectOrder(input:{customer:string;userProfileId:string;drawing:DrawingSource;scenario:DesignVersion['scenario']}):Order{
  const scene=createScenarioScene(input.scenario)
  const version:DesignVersion={id:`design-${Date.now()}`,version:1,label:'AI初始设计 V1',status:'draft',scenario:input.scenario,scene,furnitureOverrides:captureFurnitureOverrides(scene),createdAt:new Date().toISOString(),notes:'由初始设置创建，等待AI候选方案'}
  return{id:`DH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,customer:input.customer,projectName:`${input.customer}的个性化住宅`,houseId:'HOUSE_001',userProfileId:input.userProfileId,drawing:input.drawing,status:'design',approvedVersion:1,designVersions:[version],aiProposals:[],visualConcepts:[],videoConcepts:[],artifacts:[],bom:[],manualTasks:[],robotTasks:[],printer:{name:'Printer-01',status:'待机',task:'等待设计确认',progress:0},robot:{name:'Robot-01',status:'待机',task:'等待设计确认',progress:0},productionProgress:0,transportProgress:0,constructionProgress:0,acceptanceProgress:0,accepted:false}
}

export function addOrder(order:Order){const orders=loadOrders();const next=[order,...orders.filter(o=>o.id!==order.id)];saveOrders(next);return order}
export function replaceOrder(orders:Order[],id:string,fn:(o:Order)=>Order){return orders.map(o=>o.id===id?fn(o):o)}

export function setAiProposals(order:Order,proposals:AiDesignProposal[]):Order{return{...order,aiProposals:proposals}}
export function addVisualConcept(order:Order,concept:VisualConcept):Order{return{...order,visualConcepts:[concept,...order.visualConcepts]}}
export function addVideoConcept(order:Order,concept:VideoConcept):Order{return{...order,videoConcepts:[concept,...order.videoConcepts]}}
export function attachDetailedBom(order:Order,bom:DetailedBomDocument):Order{
  const artifacts=order.artifacts.map(a=>a.type==='BOM'?{...a,label:`Detailed BOM V${bom.sourceDesignVersion} · ${bom.status}`,status:'ready' as const}:a)
  return{...order,detailedBom:bom,artifacts}
}

export function applyAiProposal(order:Order,proposal:AiDesignProposal):Order{
  const editable=getEditableDesign(order)
  const scene=buildDesignScene(proposal.scenario,editable.furnitureOverrides)
  const patch=(v:DesignVersion):DesignVersion=>v.id===editable.id?{...v,label:proposal.title,scenario:proposal.scenario,scene,aiProposalId:proposal.id,notes:'AI候选方案已应用；用户家具覆盖优先级高于模板默认值'}:v
  return{...order,designVersions:order.designVersions.map(patch)}
}

export function applyAiLayoutRun(order:Order,run:AiLayoutRun):Order{
  if(!run.validation.valid)return order
  const editable=getEditableDesign(order)
  const scene=JSON.parse(JSON.stringify(run.scene)) as SceneGraph
  const overrides=captureFurnitureOverrides(scene,editable.furnitureOverrides)
  const historyEntry={id:run.id,provider:run.provider,model:run.model,prompt:run.prompt,summary:run.summary,operations:run.operations,toolLog:run.toolLog,validation:run.validation,createdAt:run.createdAt,designVersion:editable.version}
  const versions=order.designVersions.map(v=>v.id===editable.id?{...v,scene,furnitureOverrides:overrides,aiProposalId:undefined,aiLayoutRunId:run.id,aiLayoutPrompt:run.prompt,notes:`AI Layout Agent 已应用：${run.summary}`}:v)
  return{...order,designVersions:versions,aiLayoutHistory:[historyEntry,...(order.aiLayoutHistory??[])].slice(0,20)}
}

export function updateEditableScene(order:Order,scene:SceneGraph):Order{
  const editable=getEditableDesign(order)
  const overrides=captureFurnitureOverrides(scene,editable.furnitureOverrides)
  return{...order,designVersions:order.designVersions.map(v=>v.id===editable.id?{...v,scene,furnitureOverrides:overrides,notes:'用户家具调整已自动保存'}:v)}
}
export function attachDrawing(order:Order,drawing:DrawingSource):Order{return{...order,drawing}}
export function createRedesign(order:Order):Order{
  if(order.draftVersionId)return order
  const approved=getApprovedDesign(order),nextVersion=Math.max(...order.designVersions.map(v=>v.version))+1
  const draft:DesignVersion={...JSON.parse(JSON.stringify(approved)),id:`design-${order.id}-${nextVersion}-${Date.now()}`,version:nextVersion,label:`设计变更 V${nextVersion}`,status:'draft',createdAt:new Date().toISOString(),notes:'住户从当前批准版本创建新的设计变更'}
  return{...order,draftVersionId:draft.id,designVersions:[...order.designVersions,draft],changeRequest:{id:`CR-${order.id}-${nextVersion}`,fromVersion:approved.version,toVersion:nextVersion,status:'draft',summary:'住户发起设计变更',createdAt:new Date().toISOString()}}
}
export function submitChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId)return order
  return{...order,changeRequest:{...order.changeRequest,status:'submitted',summary:'方案、家具和视觉概念已保存，等待施工方确认'}}
}
export function withdrawChange(order:Order):Order{
  if(!order.changeRequest||order.changeRequest.status!=='submitted')return order
  return{...order,changeRequest:{...order.changeRequest,status:'draft',summary:'住户已撤回提交并继续修改'}}
}
export function confirmDesignAndStartProduction(order:Order):Order{
  if(order.status!=='design')return order
  const editable=getEditableDesign(order)
  const approved:DesignVersion={...editable,status:'approved',notes:'住户确认设计，进入BOM/MES链'}
  const next={...order,approvedVersion:approved.version,draftVersionId:undefined,changeRequest:undefined,designVersions:order.designVersions.map(v=>v.id===approved.id?approved:v.status==='approved'&&v.id!==approved.id?{...v,status:'superseded' as const}:v)}
  return syncOrderDownstream(next,approved)
}
export function acceptChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId||order.changeRequest.status!=='submitted')return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId);if(!draft)return order
  const approved:DesignVersion={...draft,status:'approved',notes:'设计变更已由施工方接受并同步到MES'}
  const promoted={...order,approvedVersion:approved.version,designVersions:order.designVersions.map(v=>v.id===approved.id?approved:v.status==='approved'?{...v,status:'superseded' as const}:v),changeRequest:{...order.changeRequest,status:'accepted' as const},draftVersionId:undefined}
  return syncOrderDownstream(promoted,approved)
}
