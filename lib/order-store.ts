import { createDemoOrders } from './demo-orders'
import type {
  DesignVersion,
  DrawingImportRecord,
  DrawingImportRequest,
  Order,
  ScenarioType,
  SceneGraph,
  UserProfile,
} from './types'
import { createScenarioScene } from './scenarios'
import { syncOrderDownstream } from './downstream'
import { applyFurnitureOverridesToScene, captureFurnitureOverrides } from './furniture-overrides'

const KEY='dreamhouse.pascal.profile-layer.orders.v10'
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
  const draft:DesignVersion={
    id:`design-${order.id}-${nextVersion}-${Date.now()}`,
    version:nextVersion,
    label:`设计变更 V${nextVersion}`,
    status:'draft',
    scenario:approved.scenario,
    scene:JSON.parse(JSON.stringify(approved.scene)),
    furnitureOverrides:JSON.parse(JSON.stringify(approved.furnitureOverrides??{})),
    createdAt:new Date().toISOString(),
    notes:'住户回到设计阶段重新设计',
  }
  return {
    ...order,
    draftVersionId:draft.id,
    designVersions:[...order.designVersions,draft],
    changeRequest:{
      id:`CR-${order.id}-${nextVersion}`,
      fromVersion:approved.version,
      toVersion:nextVersion,
      status:'draft',
      summary:'住户发起设计变更',
      createdAt:new Date().toISOString(),
    },
  }
}

/**
 * Preset application is now non-destructive:
 * 1) generate structural/semantic preset;
 * 2) overlay the user's persistent furniture transforms;
 * 3) keep transforms from other scenarios so switching away and back restores them.
 */
export function updateDraftScenario(order:Order,scenario:ScenarioType,label:string):Order{
  const update=(v:DesignVersion):DesignVersion=>{
    const generated=createScenarioScene(scenario)
    const scene=applyFurnitureOverridesToScene(generated,v.furnitureOverrides)
    return {
      ...v,
      scenario,
      label,
      scene,
      notes:'居住方案已应用；已保留用户家具位置与旋转覆盖',
    }
  }
  if(order.draftVersionId){
    return {...order,designVersions:order.designVersions.map(v=>v.id===order.draftVersionId?update(v):v)}
  }
  if(order.status==='design'){
    return {...order,designVersions:order.designVersions.map(v=>v.version===order.approvedVersion?update(v):v)}
  }
  return order
}

export function updateEditableScene(order:Order,scene:SceneGraph):Order{
  const update=(v:DesignVersion):DesignVersion=>({
    ...v,
    scene,
    furnitureOverrides:captureFurnitureOverrides(scene,v.furnitureOverrides),
    notes:'家具布局已调整并保存为用户覆盖；再次应用方案不会重置这些位置',
  })
  if(order.draftVersionId){
    return {...order,designVersions:order.designVersions.map(v=>v.id===order.draftVersionId?update(v):v)}
  }
  if(order.status==='design'){
    return {...order,designVersions:order.designVersions.map(v=>v.version===order.approvedVersion?update(v):v)}
  }
  return order
}

function summarizeImportedScene(scene:SceneGraph){
  const nodes=Object.values(scene.nodes)
  return {
    rooms:nodes.filter(node=>node.type==='zone').length,
    walls:nodes.filter(node=>node.type==='wall').length,
    doors:nodes.filter(node=>node.type==='door').length,
    windows:nodes.filter(node=>node.type==='window').length,
  }
}

function makeDrawingRecord(orderId:string,request:DrawingImportRequest,scene:SceneGraph):DrawingImportRecord{
  const now=new Date().toISOString()
  return {
    ...request,
    id:`drawing-${orderId}-${Date.now()}`,
    status:'parsed',
    importedAt:now,
    parsedAt:now,
    parserMode:'demo-template',
    templateId:'HOUSE_001',
    detected:summarizeImportedScene(scene),
  }
}

/** Create a new residential project from the new front-door setup page. */
export function createOrderFromInitialSetup(profile:UserProfile,request:DrawingImportRequest):Order{
  const scenario=profile.preferredScenario
  const scene=createScenarioScene(scenario)
  const stamp=Date.now()
  const id=`DH-USER-${String(stamp).slice(-7)}`
  const drawing=makeDrawingRecord(id,request,scene)
  const version:DesignVersion={
    id:`design-${id}-1`,
    version:1,
    label:'初始个性化方案',
    status:'draft',
    scenario,
    scene,
    furnitureOverrides:{},
    createdAt:new Date().toISOString(),
    notes:'由初始设置中的用户画像和二维图纸创建',
  }
  return {
    id,
    customer:profile.displayName,
    projectName:'个性化住宅设计',
    houseId:'HOUSE_001',
    userProfileId:profile.id,
    status:'design',
    approvedVersion:1,
    designVersions:[version],
    drawing,
    bom:[],
    manualTasks:[],
    robotTasks:[],
    printer:{name:'Printer-Pending',status:'待机',task:'等待设计确认',progress:0},
    robot:{name:'Robot-Pending',status:'待机',task:'等待设计确认',progress:0},
    productionProgress:0,
    constructionProgress:0,
    acceptanceProgress:0,
    accepted:false,
  }
}

// Demo 图纸重新导入：文件选择/预览是真实的，但当前解析仍映射到 HOUSE_001。
// 新的图纸被视为新的几何基线，因此会清空当前 Design Version 的家具覆盖，避免把旧户型坐标误套到新户型。
export function applyDrawingImport(order:Order,request:DrawingImportRequest):Order{
  let working=order
  if(working.status!=='design'&&!working.draftVersionId){working=createRedesign(working)}
  const currentScenario=getEditableDesign(working).scenario
  const scene=createScenarioScene(currentScenario)
  const drawing=makeDrawingRecord(working.id,request,scene)
  const update=(v:DesignVersion):DesignVersion=>({
    ...v,
    scenario:currentScenario,
    label:'重新导入图纸 · 初始住宅',
    scene,
    furnitureOverrides:{},
    notes:`已载入 ${request.fileName}；Demo 解析映射到 HOUSE_001，家具覆盖已按新图纸基线重置`,
  })
  if(working.draftVersionId){
    return {...working,houseId:'HOUSE_001',drawing,designVersions:working.designVersions.map(v=>v.id===working.draftVersionId?update(v):v)}
  }
  if(working.status==='design'){
    return {...working,houseId:'HOUSE_001',drawing,designVersions:working.designVersions.map(v=>v.version===working.approvedVersion?update(v):v)}
  }
  return {...working,houseId:'HOUSE_001',drawing}
}

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

export function submitChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId)return order
  if(order.changeRequest.status==='accepted'||order.changeRequest.status==='rejected')return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId)
  return {...order,changeRequest:{...order.changeRequest,status:'submitted',summary:`${draft?.label??'设计变更'}：方案与家具布局已保存，等待施工方确认`}}
}

export function withdrawChange(order:Order):Order{
  if(!order.changeRequest||!order.draftVersionId||order.changeRequest.status!=='submitted')return order
  const draft=order.designVersions.find(v=>v.id===order.draftVersionId)
  return {...order,changeRequest:{...order.changeRequest,status:'draft',summary:`${draft?.label??'设计变更'}：住户已撤回提交，继续修改`}}
}

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
