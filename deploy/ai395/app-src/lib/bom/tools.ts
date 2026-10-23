import type { DetailedBomDocument, DetailedBomItem, DesignVersion, DrawingSource, SceneGraph, SceneNode, UserProfile } from '../types'

const MAX_WALL_MODULE_LENGTH = 1.2
const FLOOR_PANEL_SIZE = 1.2
const CONNECTORS_PER_WALL_JOINT = 2

function round(value:number,digits=3){const p=10**digits;return Math.round(value*p)/p}
function dist(a:[number,number],b:[number,number]){return Math.hypot(b[0]-a[0],b[1]-a[1])}
function polygonArea(poly:[number,number][]=[]) {let sum=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];sum+=a[0]*b[1]-b[0]*a[1]}return Math.abs(sum)/2}
function roomName(scene:SceneGraph,roomId?:string){return roomId?scene.nodes[roomId]?.name||roomId:undefined}
function itemDims(node:any){const d=node.asset?.dimensions||[0,0,0],s=node.scale||[1,1,1];return{width:round(Number(d[0]||0)*Math.abs(Number(s[0]||1))),height:round(Number(d[1]||0)*Math.abs(Number(s[1]||1))),length:round(Number(d[2]||0)*Math.abs(Number(s[2]||1)))}}

export function getMaterialCatalog(){
  return {
    wall:{default:'轻质可打印墙体材料',finish:'环保内墙涂层',alternatives:['模块化轻质复合材料','预制墙板']},
    floor:{default:'模块化地板基材',finish:'木饰面/耐磨面层',alternatives:['预制地板模块']},
    door:{default:'成品室内门',finish:'工厂饰面'},window:{default:'成品铝合金窗',finish:'工厂饰面'},
    furniture:{default:'成品/定制家具',finish:'按家具目录'},sanitary:{default:'成品卫浴设备',finish:'成品'},connector:{default:'标准连接件',finish:'防腐处理'}
  }
}

export function getManufacturingRules(){return{maxWallModuleLength:MAX_WALL_MODULE_LENGTH,floorPanelSize:FLOOR_PANEL_SIZE,connectorsPerWallJoint:CONNECTORS_PER_WALL_JOINT,principles:['AI不得修改几何计算得到的数量','外墙/承重墙材料需人工复核','门窗和卫浴优先走成品采购','3D打印构件必须绑定Design Version和sourceNodeId']}}

export function calculateFloorArea(node:any){return round(polygonArea(node.polygon||[]))}

export function calculateWallQuantity(scene:SceneGraph,wall:any){
  const length=round(dist(wall.start,wall.end)),height=round(Number(wall.height||2.8)),thickness=round(Number(wall.thickness||0.12))
  const grossArea=round(length*height)
  let openingArea=0
  for(const childId of wall.children||[]){const n:any=scene.nodes[childId];if(n&&(n.type==='door'||n.type==='window'))openingArea+=Number(n.width||0)*Number(n.height||0)}
  openingArea=round(openingArea)
  const netArea=round(Math.max(0,grossArea-openingArea))
  const moduleCount=Math.max(1,Math.ceil(length/MAX_WALL_MODULE_LENGTH))
  return{length,height,thickness,grossArea,openingArea,netArea,moduleCount}
}

export function getSceneGeometry(scene:SceneGraph){
  const nodes=Object.values(scene.nodes)
  const slabs=nodes.filter(n=>n.type==='slab') as any[]
  const walls=nodes.filter(n=>n.type==='wall') as any[]
  const doors=nodes.filter(n=>n.type==='door') as any[]
  const windows=nodes.filter(n=>n.type==='window') as any[]
  const items=nodes.filter(n=>n.type==='item') as any[]
  const floorArea=round(slabs.reduce((s,n)=>s+calculateFloorArea(n),0))
  const wallMetrics=walls.map(w=>({id:w.id,...calculateWallQuantity(scene,w)}))
  return{floorArea,walls:wallMetrics,wallCount:walls.length,doorCount:doors.length,windowCount:windows.length,furnitureCount:items.length,grossWallArea:round(wallMetrics.reduce((s,w)=>s+w.grossArea,0)),netWallArea:round(wallMetrics.reduce((s,w)=>s+w.netArea,0))}
}

export function createBomDraft(input:{design:DesignVersion;profile?:UserProfile;drawing?:DrawingSource}):DetailedBomDocument{
  const {design,drawing}=input,scene=design.scene,catalog=getMaterialCatalog(),items:DetailedBomItem[]=[]
  let order=1
  const push=(item:Omit<DetailedBomItem,'order'>)=>items.push({...item,order:order++})

  for(const slab of Object.values(scene.nodes).filter(n=>n.type==='slab') as any[]){
    const area=calculateFloorArea(slab),panelCount=Math.max(1,Math.ceil(area/(FLOOR_PANEL_SIZE*FLOOR_PANEL_SIZE)))
    push({id:`DBOM-D-${slab.id}`,level:'design',category:'floor',sourceNodeId:slab.id,componentCode:`F-${slab.id}`,label:slab.name||'住宅地板',specification:`面积 ${area}㎡ · 厚度 ${Number(slab.thickness||0).toFixed(2)}m`,dimensions:{area,thickness:Number(slab.thickness||0)},quantity:area,unit:'㎡',material:catalog.floor.default,finish:catalog.floor.finish,source:'3D打印',process:'按设计面积制造',installationMethod:'模块化铺装',performance:[],status:'待确认'})
    push({id:`DBOM-M-${slab.id}`,level:'manufacturing',category:'floor',sourceNodeId:slab.id,componentCode:`FP-${slab.id}`,label:'地板预制模块',specification:`建议模块 ${FLOOR_PANEL_SIZE}×${FLOOR_PANEL_SIZE}m`,dimensions:{area},quantity:panelCount,unit:'块',material:catalog.floor.default,finish:catalog.floor.finish,source:'预制',process:'模块化预制/3D打印',installationMethod:'机械臂定位 + 人工复核',performance:[],notes:'数量为几何分块预排，正式排版可进一步优化边角损耗。',status:'待确认'})
  }

  for(const wall of Object.values(scene.nodes).filter(n=>n.type==='wall') as any[]){
    const m=calculateWallQuantity(scene,wall),structural=wall.metadata?.structural_type==='load_bearing'?'承重墙':'非承重墙'
    push({id:`DBOM-D-${wall.id}`,level:'design',category:'wall',sourceNodeId:wall.id,componentCode:`W-${wall.id}`,label:`${structural} · ${wall.id}`,specification:`${m.length}×${m.height}×${m.thickness}m · 净面积 ${m.netArea}㎡`,dimensions:m,quantity:1,unit:'段',material:catalog.wall.default,finish:catalog.wall.finish,source:'3D打印',process:'几何驱动墙体制造',installationMethod:'机械臂辅助定位安装',performance:[],notes:`洞口扣减 ${m.openingArea}㎡`,status:'待确认'})
    push({id:`DBOM-M-${wall.id}`,level:'manufacturing',category:'wall',sourceNodeId:wall.id,componentCode:`WM-${wall.id}`,label:`墙体打印模块 · ${wall.id}`,specification:`单模块建议长度 ≤ ${MAX_WALL_MODULE_LENGTH}m · H ${m.height}m · T ${m.thickness}m`,dimensions:{length:m.length,height:m.height,thickness:m.thickness,netArea:m.netArea},quantity:m.moduleCount,unit:'模块',material:catalog.wall.default,finish:catalog.wall.finish,source:'3D打印',process:'分段打印 + 编码',installationMethod:'按BOM顺序机械臂安装',performance:[],notes:'模块数由墙长按当前制造规则预排；门窗洞口模块需在生产排版阶段细化。',status:'待确认'})
    const joints=Math.max(0,m.moduleCount-1),connectorQty=joints*CONNECTORS_PER_WALL_JOINT
    if(connectorQty>0)push({id:`DBOM-C-${wall.id}`,level:'manufacturing',category:'connector',sourceNodeId:wall.id,componentCode:`CN-${wall.id}`,label:`墙体连接件 · ${wall.id}`,specification:`每模块接缝 ${CONNECTORS_PER_WALL_JOINT} 件`,quantity:connectorQty,unit:'件',material:catalog.connector.default,finish:catalog.connector.finish,source:'采购',process:'标准件采购',installationMethod:'随墙体模块安装',performance:[],status:'待确认'})
  }

  for(const node of Object.values(scene.nodes) as SceneNode[]){
    if(node.type==='door'||node.type==='window'){
      const n:any=node,cat=node.type as 'door'|'window',c=(catalog as any)[cat]
      push({id:`DBOM-D-${node.id}`,level:'design',category:cat,sourceNodeId:node.id,componentCode:`${cat==='door'?'D':'WIN'}-${node.id}`,label:node.name||cat,specification:`${Number(n.width||0).toFixed(2)}×${Number(n.height||0).toFixed(2)}m`,dimensions:{width:Number(n.width||0),height:Number(n.height||0)},quantity:1,unit:cat==='door'?'樘':'扇',material:c.default,finish:c.finish,source:'采购',process:'成品采购/定制',installationMethod:'人工复核洞口后安装',performance:[],status:'待确认'})
    }
    if(node.type==='item'){
      const n:any=node,assetCat=String(n.asset?.category||'furniture'),cat=assetCat==='bathroom'?'sanitary':'furniture',c=cat==='sanitary'?catalog.sanitary:catalog.furniture,d=itemDims(n)
      const roomId = typeof n.metadata?.room_id === 'string' ? n.metadata.room_id : undefined
      push({id:`DBOM-D-${node.id}`,level:'design',category:cat,sourceNodeId:node.id,roomId,room:roomName(scene,roomId),componentCode:`${cat==='sanitary'?'SAN':'FUR'}-${node.id}`,label:n.name||n.asset?.name||'家具',specification:`${d.width}×${d.length}×${d.height}m`,dimensions:d,quantity:1,unit:'件',material:c.default,finish:c.finish,source:'采购',process:cat==='sanitary'?'成品采购':'成品采购/定制加工',installationMethod:'按Pascal最终坐标定位摆放',performance:[],status:'待确认'})
    }
  }
  const geometry=getSceneGeometry(scene),now=new Date().toISOString()
  return{id:`DBOM-V${design.version}-${Date.now()}`,sourceDesignVersion:design.version,designLabel:design.label,drawingId:drawing?.id,status:'draft',aiStatus:'pending',aiProvider:'mock',generatedAt:now,updatedAt:now,geometrySummary:{floorArea:geometry.floorArea,grossWallArea:geometry.grossWallArea,netWallArea:geometry.netWallArea,wallCount:geometry.wallCount,doorCount:geometry.doorCount,windowCount:geometry.windowCount,furnitureCount:geometry.furnitureCount},items,validation:{valid:false,geometryValid:false,quantityValid:false,materialRulesValid:false,issues:[],checkedAt:now}}
}

export function validateBom(doc:DetailedBomDocument):DetailedBomDocument{
  const issues:string[]=[]
  let geometryValid=true,quantityValid=true,materialRulesValid=true
  for(const item of doc.items){
    if(!Number.isFinite(item.quantity)||item.quantity<=0){quantityValid=false;issues.push(`${item.componentCode} 数量无效`)}
    const dims=item.dimensions||{}
    for(const [k,v] of Object.entries(dims)){if(v!==undefined&&(!Number.isFinite(v)||v<0)){geometryValid=false;issues.push(`${item.componentCode} ${k} 几何值无效`)}}
    if(item.category==='wall'&&!item.sourceNodeId){geometryValid=false;issues.push(`${item.componentCode} 未绑定墙体节点`)}
    if(!item.material.trim()){materialRulesValid=false;issues.push(`${item.componentCode} 缺少材料`)}
  }
  const validation={valid:geometryValid&&quantityValid&&materialRulesValid,geometryValid,quantityValid,materialRulesValid,issues,checkedAt:new Date().toISOString()}
  return{...doc,status:validation.valid?'validated':'draft',validation,updatedAt:new Date().toISOString()}
}
