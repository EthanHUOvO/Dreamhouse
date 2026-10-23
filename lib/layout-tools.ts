import { furnitureItem } from './house-scene'
import type { LayoutOperation, LayoutValidation, RoomSemantic, SceneGraph, SceneNode } from './types'
import { addDoor as addBlueprintDoor, moveDoor as moveBlueprintDoor, removeDoor as removeBlueprintDoor } from './floorplans/door-edit'
import { recompileSceneFromBlueprint } from './floorplans/blueprint'
import {
  addPartitionWall as addBlueprintPartitionWall,
  bridgeWallGap as bridgeBlueprintWallGap,
  mergeCollinearWalls as mergeBlueprintCollinearWalls,
  moveWallParallel as moveBlueprintWallParallel,
  removeWallSafe as removeBlueprintWallSafe,
  straightenWallChain as straightenBlueprintWallChain,
  updateWallEndpoint as updateBlueprintWallEndpoint,
} from './floorplans/wall-edit'

const LEVEL='level_ground'
const MIN_ROOM_SIZE=1.8
const EPS=1e-5

type Bounds={minX:number;maxX:number;minZ:number;maxZ:number;width:number;depth:number;area:number;cx:number;cz:number}

type ToolResult={
  ok:boolean
  scene:SceneGraph
  message:string
  data?:any
  operation?:LayoutOperation
}

const ROOM_LABELS:Record<RoomSemantic,string>={
  master_bedroom:'主卧',bedroom:'卧室',living_room:'客餐厨一体',kitchen:'厨房',study:'书房',shared_study:'双人书房',child_room:'儿童房',nanny_room:'保姆房',dressing_room:'衣帽间',gaming_room:'电竞房',storage:'储物间',bathroom:'卫生间',corridor:'走廊'
}
const ROOM_COLORS:Record<RoomSemantic,string>={
  master_bedroom:'#6276a3',bedroom:'#7086aa',living_room:'#4f92b6',kitchen:'#598e9c',study:'#5b8f82',shared_study:'#4f7f86',child_room:'#4e897b',nanny_room:'#8a7654',dressing_room:'#9b765d',gaming_room:'#806a9c',storage:'#8f806e',bathroom:'#4f8b91',corridor:'#8a7d62'
}

function cloneScene(scene:SceneGraph):SceneGraph{return JSON.parse(JSON.stringify(scene))}
function nearly(a:number,b:number,t=.03){return Math.abs(a-b)<=t}
function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function wallLength(w:any){return Math.hypot(Number(w.end?.[0]??0)-Number(w.start?.[0]??0),Number(w.end?.[1]??0)-Number(w.start?.[1]??0))}
function polygonArea(poly:[number,number][]){let a=0;for(let i=0,j=poly.length-1;i<poly.length;j=i++)a+=(poly[j][0]+poly[i][0])*(poly[j][1]-poly[i][1]);return Math.abs(a/2)}
function verticalIntervals(poly:[number,number][],x:number){const hits:number[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(a[0]===b[0])continue;const lo=Math.min(a[0],b[0]),hi=Math.max(a[0],b[0]);if(x<=lo||x>=hi)continue;hits.push(a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]))}hits.sort((a,b)=>a-b);const out:[number,number][]=[];for(let i=0;i+1<hits.length;i+=2)out.push([hits[i],hits[i+1]]);return out}
function polygonOverlapArea(a:[number,number][],b:[number,number][]){const xs=[...new Set([...a,...b].map(p=>p[0]))].sort((x,y)=>x-y);let area=0;for(let i=0;i+1<xs.length;i++){const width=xs[i+1]-xs[i];if(width<=EPS)continue;const x=(xs[i]+xs[i+1])/2,ai=verticalIntervals(a,x),bi=verticalIntervals(b,x);for(const aa of ai)for(const bb of bi)area+=Math.max(0,Math.min(aa[1],bb[1])-Math.max(aa[0],bb[0]))*width}return area}
function boundsOfPolygon(poly:[number,number][]):Bounds{
  const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs)
  return{minX,maxX,minZ,maxZ,width:maxX-minX,depth:maxZ-minZ,area:polygonArea(poly),cx:(minX+maxX)/2,cz:(minZ+maxZ)/2}
}
function zoneBounds(node:any):Bounds{if(!Array.isArray(node?.polygon)||node.polygon.length<3)throw new Error(`空间 ${node?.id||''} 缺少有效polygon`);return boundsOfPolygon(node.polygon)}
function rectPolygon(b:Pick<Bounds,'minX'|'maxX'|'minZ'|'maxZ'>):[number,number][]{return[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]]}
function floorBounds(scene:SceneGraph){const slab:any=Object.values(scene.nodes).find((n:any)=>n.type==='slab'&&Array.isArray(n.polygon));return slab?boundsOfPolygon(slab.polygon):{minX:-6,maxX:6,minZ:-4.5,maxZ:4.5,width:12,depth:9,area:108,cx:0,cz:0}}
function semanticOf(zone:any):RoomSemantic{return(zone?.metadata?.semantic_type||'bedroom') as RoomSemantic}
function displayRegion(scene:SceneGraph,b:Bounds){
  const f=floorBounds(scene),nx=(b.cx-f.minX)/(f.width||1),nz=(b.cz-f.minZ)/(f.depth||1)
  const h=nx<.38?'左':nx>.62?'右':'中',v=nz<.38?'上':nz>.62?'下':'中'
  if(h==='中'&&v==='中')return'中部'
  if(h==='中')return`${v}部`
  if(v==='中')return`${h}部`
  return`${h}${v}`
}
function addLevelNode(scene:SceneGraph,node:SceneNode){scene.nodes[node.id]=node;const level:any=scene.nodes[LEVEL];level.children=level.children||[];if(!level.children.includes(node.id))level.children.push(node.id)}
function detachFromParent(scene:SceneGraph,node:any){if(!node?.parentId)return;const p:any=scene.nodes[node.parentId];if(p?.children)p.children=p.children.filter((id:string)=>id!==node.id)}
function removeNode(scene:SceneGraph,id:string){const node:any=scene.nodes[id];if(!node)return;for(const childId of [...(node.children||[])])removeNode(scene,childId);detachFromParent(scene,node);for(const p of Object.values(scene.nodes) as any[]){if(p.children)p.children=p.children.filter((x:string)=>x!==id)}delete scene.nodes[id]}
function removeRoomFurniture(scene:SceneGraph,zoneId:string){for(const node of Object.values({...scene.nodes}) as any[])if(node.type==='item'&&node.metadata?.room_id===zoneId)removeNode(scene,node.id)}
function uniqueId(scene:SceneGraph,prefix:string){let i=1,id=prefix;while(scene.nodes[id])id=`${prefix}_${i++}`;return id}
function putItem(scene:SceneGraph,zoneId:string,role:string,asset:any,position:[number,number,number],rotation=0,scale:[number,number,number]=[1,1,1]){
  const id=uniqueId(scene,`ai_${zoneId}_${role}`)
  addLevelNode(scene,furnitureItem(id,zoneId,asset,position,rotation,scale))
}
function safePoint(b:Bounds,x:number,z:number):[number,number,number]{return[clamp(x,b.minX+.35,b.maxX-.35),0,clamp(z,b.minZ+.35,b.maxZ-.35)]}

export function regenerateFurnitureForZone(scene:SceneGraph,zoneId:string,semantic?:RoomSemantic){
  const zone:any=scene.nodes[zoneId];if(zone?.type!=='zone')throw new Error(`找不到空间 ${zoneId}`)
  const s=semantic||semanticOf(zone),b=zoneBounds(zone),cx=b.cx,cz=b.cz
  removeRoomFurniture(scene,zoneId)
  if(s==='corridor')return
  if(s==='master_bedroom'){
    putItem(scene,zoneId,'bed','doubleBed',safePoint(b,cx-.25,cz+.25),-Math.PI/2,[.82,1,.82])
    putItem(scene,zoneId,'closet','closet',safePoint(b,b.maxX-.55,cz-.35),Math.PI/2,[.62,1,.58])
    putItem(scene,zoneId,'bedside','bedside',safePoint(b,b.minX+.55,b.maxZ-.55),0,[.9,1,.9]);return
  }
  if(s==='bedroom'||s==='child_room'||s==='nanny_room'){
    putItem(scene,zoneId,'bed','singleBed',safePoint(b,b.minX+1.0,cz+.2),-Math.PI/2,[.78,1,.78])
    putItem(scene,zoneId,'dresser','dresser',safePoint(b,b.maxX-.55,b.maxZ-.6),Math.PI/2,[.56,1,.52])
    if(b.width>3.1){putItem(scene,zoneId,'table','table',safePoint(b,b.maxX-1.0,b.minZ+.75),0,[.42,1,.52]);putItem(scene,zoneId,'chair','diningChair',safePoint(b,b.maxX-1.0,b.minZ+1.35),Math.PI,[.9,1,.9])}return
  }
  if(s==='study'||s==='shared_study'||s==='gaming_room'){
    const two=s==='shared_study'&&b.width>3.8
    putItem(scene,zoneId,'table1','table',safePoint(b,two?b.minX+b.width*.3:cx,b.minZ+.8),0,[.48,1,.58])
    putItem(scene,zoneId,'chair1','diningChair',safePoint(b,two?b.minX+b.width*.3:cx,b.minZ+1.45),Math.PI)
    if(two){putItem(scene,zoneId,'table2','table',safePoint(b,b.minX+b.width*.7,b.minZ+.8),0,[.48,1,.58]);putItem(scene,zoneId,'chair2','diningChair',safePoint(b,b.minX+b.width*.7,b.minZ+1.45),Math.PI)}
    putItem(scene,zoneId,'closet','closet',safePoint(b,b.maxX-.55,b.maxZ-.7),Math.PI/2,[.55,1,.52]);return
  }
  if(s==='dressing_room'||s==='storage'){
    putItem(scene,zoneId,'closet1','closet',safePoint(b,b.maxX-.55,b.minZ+b.depth*.32),Math.PI/2,[.58,1,.52])
    if(b.depth>2.4)putItem(scene,zoneId,'closet2','closet',safePoint(b,b.maxX-.55,b.minZ+b.depth*.72),Math.PI/2,[.58,1,.52])
    if(s==='dressing_room')putItem(scene,zoneId,'dresser','dresser',safePoint(b,b.minX+.7,b.maxZ-.65),0,[.58,1,.55]);return
  }
  if(s==='bathroom'){
    putItem(scene,zoneId,'toilet','toilet',safePoint(b,b.minX+.65,b.minZ+.8),Math.PI/2,[.58,1,.62])
    putItem(scene,zoneId,'sink','sink',safePoint(b,b.maxX-.65,b.maxZ-.6),0,[.44,1,.44])
    if(b.area>5)putItem(scene,zoneId,'shower','shower',safePoint(b,b.minX+.65,b.maxZ-.7),0,[.58,1,.58]);return
  }
  if(s==='living_room'){
    putItem(scene,zoneId,'sofa','sofa',safePoint(b,b.minX+Math.min(1.6,b.width*.28),cz),Math.PI/2,[.72,1,.68])
    putItem(scene,zoneId,'coffee','coffee',safePoint(b,cx,cz),0,[.6,1,.58])
    putItem(scene,zoneId,'tv','tv',safePoint(b,b.maxX-.65,cz),Math.PI/2,[.68,1,.68])
    if(b.area>22){putItem(scene,zoneId,'table','table',safePoint(b,cx,b.minZ+.75),0,[.58,1,.65]);putItem(scene,zoneId,'chair','diningChair',safePoint(b,cx-.85,b.minZ+.75),Math.PI/2)}
  }
}

function setRoomFunction(scene:SceneGraph,zoneId:string,semantic:RoomSemantic,name?:string,regenerate=true){
  const zone:any=scene.nodes[zoneId];if(zone?.type!=='zone')throw new Error(`找不到空间 ${zoneId}`)
  if(semantic==='corridor'&&semanticOf(zone)!=='corridor')throw new Error('不能把普通房间直接改成走廊；请通过空间重组工具处理')
  zone.name=name?.trim()||ROOM_LABELS[semantic]||name||zone.name
  zone.color=ROOM_COLORS[semantic]||zone.color
  zone.metadata={...(zone.metadata||{}),semantic_type:semantic,ai_modified:true}
  if(regenerate)regenerateFurnitureForZone(scene,zoneId,semantic)
}

function wallNode(id:string,start:[number,number],end:[number,number]):SceneNode{return{object:'node',id,type:'wall',parentId:LEVEL,visible:true,name:'AI新增非承重墙',children:[],thickness:.12,height:2.8,start,end,frontSide:'unknown',backSide:'unknown',metadata:{structural_type:'partition',editable:true,ai_generated:true}}}
function zoneNode(id:string,name:string,semantic:RoomSemantic,b:Pick<Bounds,'minX'|'maxX'|'minZ'|'maxZ'>):SceneNode{return{object:'node',id,type:'zone',parentId:LEVEL,visible:true,name,polygon:rectPolygon(b),autoFromWalls:false,boundaryWallIds:[],spaceRole:'room',roomNumber:'',enclosureStatus:'auto',floorFinish:semantic==='bathroom'?'tile':'wood',wallFinish:'paint',ceilingFinish:'paint',ceilingHeight:2.7,occupancy:'residential',clearDimensionPolicy:'none',color:ROOM_COLORS[semantic],metadata:{semantic_type:semantic,ai_generated:true}}}
function doorNode(id:string,wallId:string,distance:number,name='室内门'):SceneNode{return{object:'node',id,type:'door',parentId:wallId,wallId,visible:true,name,position:[distance,1.05,0],rotation:[0,0,0],width:.86,height:2.1,constructionType:'framed',dimensionReference:'nominal',doorCategory:'interior',doorType:'hinged',leafCount:1,operationState:0,slideDirection:'left',trackStyle:'none',garagePanelCount:4,openingKind:'door',openingShape:'rectangle',openingRadiusMode:'all',openingTopRadii:[.15,.15],cornerRadius:.08,archHeight:.45,openingRevealRadius:.025,frameThickness:.05,frameDepth:.07,threshold:true,thresholdHeight:.02,hingesSide:'left',swingDirection:'inward',swingAngle:0,segments:[{type:'panel',heightRatio:1,columnRatios:[1],dividerThickness:.03,panelDepth:.01,panelInset:.04}],handle:true,handleHeight:1.05,handleSide:'right',contentPadding:[.04,.04],doorCloser:false,panicBar:false,panicBarHeight:1,metadata:{opening_role:'door',ai_generated:true}}}

export function getHouseConstraints(scene:SceneGraph){
  const f=floorBounds(scene)
  const zones=Object.values(scene.nodes).filter((n:any)=>n.type==='zone').map((z:any)=>{const b=zoneBounds(z);return{id:z.id,name:z.name,semantic:semanticOf(z),region:displayRegion(scene,b),area:+b.area.toFixed(2),bounds:{minX:+b.minX.toFixed(2),maxX:+b.maxX.toFixed(2),minZ:+b.minZ.toFixed(2),maxZ:+b.maxZ.toFixed(2)},center:{x:+b.cx.toFixed(2),z:+b.cz.toFixed(2)}}})
  const walls=Object.values(scene.nodes).filter((n:any)=>n.type==='wall').map((w:any)=>({id:w.id,name:w.name,structuralType:w.metadata?.structural_type||'partition',editable:Boolean(w.metadata?.editable),length:+wallLength(w).toFixed(2),start:w.start,end:w.end,children:w.children||[]}))
  const doors=Object.values(scene.nodes).filter((n:any)=>n.type==='door').map((d:any)=>({id:d.id,name:d.name,wallId:d.wallId,positionRatio:+(Number(d.position?.[0]??0)/(wallLength(scene.nodes[d.wallId] as any)||1)).toFixed(3),locked:d.id==='door_entry'}))
  return{
    houseId:(scene.nodes.building_house as any)?.name||'HOUSE_001',
    coordinateHint:'Floorplan2D中 x 越小越靠左，z 越小越靠上；区域已提供中文位置名，优先使用 zoneId 而不是自己猜坐标。',
    floor:{width:+f.width.toFixed(2),depth:+f.depth.toFixed(2),area:+f.area.toFixed(2)},zones,walls,doors,
    rules:[
      '外墙和承重墙禁止修改',
      '入户门 door_entry 禁止删除或移动',
      '优先通过房间功能重分配、合并/拆分矩形空间和非承重墙调整完成需求',
      `拆分或移动边界后每个房间净宽/净深不得小于 ${MIN_ROOM_SIZE}m`,
      'AI工具修改后必须调用 validate_layout，只有 valid=true 才能应用到 Design Version'
    ]
  }
}
export function getRoomGeometry(scene:SceneGraph,zoneId:string){const z:any=scene.nodes[zoneId];if(z?.type!=='zone')throw new Error(`找不到空间 ${zoneId}`);const b=zoneBounds(z);return{id:z.id,name:z.name,semantic:semanticOf(z),region:displayRegion(scene,b),polygon:z.polygon,bounds:b,items:Object.values(scene.nodes).filter((n:any)=>n.type==='item'&&n.metadata?.room_id===zoneId).map((n:any)=>({id:n.id,name:n.name,position:n.position}))}}

function sharedEdge(a:Bounds,b:Bounds){
  if(nearly(a.maxX,b.minX)||nearly(b.maxX,a.minX)){const x=nearly(a.maxX,b.minX)?a.maxX:b.maxX,lo=Math.max(a.minZ,b.minZ),hi=Math.min(a.maxZ,b.maxZ);if(hi-lo>.05)return{orientation:'vertical' as const,coordinate:x,start:lo,end:hi}}
  if(nearly(a.maxZ,b.minZ)||nearly(b.maxZ,a.minZ)){const z=nearly(a.maxZ,b.minZ)?a.maxZ:b.maxZ,lo=Math.max(a.minX,b.minX),hi=Math.min(a.maxX,b.maxX);if(hi-lo>.05)return{orientation:'horizontal' as const,coordinate:z,start:lo,end:hi}}
  return null
}
function wallOnEdge(w:any,edge:ReturnType<typeof sharedEdge>){if(!edge||w?.type!=='wall')return false;if(edge.orientation==='vertical'){if(!nearly(w.start[0],edge.coordinate)||!nearly(w.end[0],edge.coordinate))return false;const lo=Math.min(w.start[1],w.end[1]),hi=Math.max(w.start[1],w.end[1]);return lo<=edge.start+.05&&hi>=edge.end-.05}if(!nearly(w.start[1],edge.coordinate)||!nearly(w.end[1],edge.coordinate))return false;const lo=Math.min(w.start[0],w.end[0]),hi=Math.max(w.start[0],w.end[0]);return lo<=edge.start+.05&&hi>=edge.end-.05}

function mergeRooms(scene:SceneGraph,zoneIds:string[],semantic:RoomSemantic,name?:string){
  if(zoneIds.length!==2)throw new Error('当前稳定版本一次只合并两个相邻矩形空间')
  const a:any=scene.nodes[zoneIds[0]],b:any=scene.nodes[zoneIds[1]];if(a?.type!=='zone'||b?.type!=='zone')throw new Error('合并空间ID无效')
  const ba=zoneBounds(a),bb=zoneBounds(b),edge=sharedEdge(ba,bb);if(!edge)throw new Error('两个空间不相邻，不能直接合并')
  const union={minX:Math.min(ba.minX,bb.minX),maxX:Math.max(ba.maxX,bb.maxX),minZ:Math.min(ba.minZ,bb.minZ),maxZ:Math.max(ba.maxZ,bb.maxZ)}
  const unionArea=(union.maxX-union.minX)*(union.maxZ-union.minZ)
  if(Math.abs(unionArea-(ba.area+bb.area))>.08)throw new Error('两个空间合并后不是规则矩形，当前Geometry Engine拒绝自动合并')
  for(const w of Object.values({...scene.nodes}) as any[])if(w.type==='wall'&&wallOnEdge(w,edge)){if(w.metadata?.structural_type==='load_bearing'||w.metadata?.editable===false)throw new Error(`共享边界 ${w.id} 为承重/锁定墙，禁止合并`);removeNode(scene,w.id)}
  removeRoomFurniture(scene,a.id);removeRoomFurniture(scene,b.id);removeNode(scene,b.id)
  a.polygon=rectPolygon(union);a.name=name?.trim()||ROOM_LABELS[semantic];a.color=ROOM_COLORS[semantic];a.metadata={...(a.metadata||{}),semantic_type:semantic,ai_modified:true,merged_from:zoneIds}
  regenerateFurnitureForZone(scene,a.id,semantic)
  return{resultZoneId:a.id,removedZoneId:b.id,sharedEdge:edge}
}

function splitRoom(scene:SceneGraph,args:any){
  const zone:any=scene.nodes[args.zoneId];if(zone?.type!=='zone')throw new Error(`找不到空间 ${args.zoneId}`)
  if(semanticOf(zone)==='corridor')throw new Error('当前版本不允许自动拆分主走廊')
  const b=zoneBounds(zone),axis=args.axis==='z'?'z':'x',ratio=clamp(Number(args.ratio??.5),.25,.75)
  const firstSemantic=args.firstFunction as RoomSemantic,secondSemantic=args.secondFunction as RoomSemantic
  if(!ROOM_LABELS[firstSemantic]||!ROOM_LABELS[secondSemantic])throw new Error('拆分后的房间功能无效')
  let b1:any,b2:any,start:[number,number],end:[number,number]
  if(axis==='x'){
    const x=b.minX+b.width*ratio;if(x-b.minX<MIN_ROOM_SIZE||b.maxX-x<MIN_ROOM_SIZE)throw new Error('拆分后房间宽度不足')
    b1={minX:b.minX,maxX:x,minZ:b.minZ,maxZ:b.maxZ};b2={minX:x,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ};start=[x,b.minZ];end=[x,b.maxZ]
  }else{
    const z=b.minZ+b.depth*ratio;if(z-b.minZ<MIN_ROOM_SIZE||b.maxZ-z<MIN_ROOM_SIZE)throw new Error('拆分后房间进深不足')
    b1={minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:z};b2={minX:b.minX,maxX:b.maxX,minZ:z,maxZ:b.maxZ};start=[b.minX,z];end=[b.maxX,z]
  }
  removeRoomFurniture(scene,zone.id)
  zone.polygon=rectPolygon(b1);zone.name=args.firstName?.trim()||ROOM_LABELS[firstSemantic];zone.color=ROOM_COLORS[firstSemantic];zone.metadata={...(zone.metadata||{}),semantic_type:firstSemantic,ai_modified:true,split_role:'first'}
  const secondId=uniqueId(scene,`${zone.id}_split`),second=zoneNode(secondId,args.secondName?.trim()||ROOM_LABELS[secondSemantic],secondSemantic,b2),wallId=uniqueId(scene,`ai_wall_split_${zone.id}`)
  addLevelNode(scene,second);addLevelNode(scene,wallNode(wallId,start,end));regenerateFurnitureForZone(scene,zone.id,firstSemantic);regenerateFurnitureForZone(scene,second.id,secondSemantic)
  return{firstZoneId:zone.id,secondZoneId:second.id,wallId,axis,ratio}
}

function removePartitionWall(scene:SceneGraph,wallId:string){const wall:any=scene.nodes[wallId];if(wall?.type!=='wall')throw new Error(`找不到墙体 ${wallId}`);if(wall.metadata?.structural_type==='load_bearing'||wall.metadata?.editable===false)throw new Error(`墙体 ${wallId} 为承重/锁定墙，禁止删除`);removeNode(scene,wallId)}

function findAdjacentZonesForWall(scene:SceneGraph,wall:any){
  const vertical=nearly(wall.start[0],wall.end[0]),coord=vertical?wall.start[0]:wall.start[1],lo=Math.min(vertical?wall.start[1]:wall.start[0],vertical?wall.end[1]:wall.end[0]),hi=Math.max(vertical?wall.start[1]:wall.start[0],vertical?wall.end[1]:wall.end[0])
  const sideA:any[]=[],sideB:any[]=[]
  for(const z of Object.values(scene.nodes) as any[]){if(z.type!=='zone')continue;const b=zoneBounds(z);if(vertical){if(nearly(b.maxX,coord)&&b.minZ<=lo+.05&&b.maxZ>=hi-.05)sideA.push({z,b});if(nearly(b.minX,coord)&&b.minZ<=lo+.05&&b.maxZ>=hi-.05)sideB.push({z,b})}else{if(nearly(b.maxZ,coord)&&b.minX<=lo+.05&&b.maxX>=hi-.05)sideA.push({z,b});if(nearly(b.minZ,coord)&&b.minX<=lo+.05&&b.maxX>=hi-.05)sideB.push({z,b})}}
  return{vertical,coord,lo,hi,sideA,sideB}
}
function movePartitionWall(scene:SceneGraph,wallId:string,ratio:number){
  const wall:any=scene.nodes[wallId];if(wall?.type!=='wall')throw new Error(`找不到墙体 ${wallId}`);if(wall.metadata?.structural_type==='load_bearing'||wall.metadata?.editable===false)throw new Error('承重墙/锁定墙禁止移动')
  const a=findAdjacentZonesForWall(scene,wall);if(a.sideA.length!==1||a.sideB.length!==1)throw new Error('该墙同时关联多个空间或不是完整房间边界，当前版本拒绝自动移动')
  const A=a.sideA[0],B=a.sideB[0],r=clamp(Number(ratio),.25,.75)
  if(hasBlueprint(scene)){
    const target=a.vertical?A.b.minX+(B.b.maxX-A.b.minX)*r:A.b.minZ+(B.b.maxZ-A.b.minZ)*r
    const dx=Number(wall.end[0])-Number(wall.start[0]),dz=Number(wall.end[1])-Number(wall.start[1]),len=Math.hypot(dx,dz)||1
    const delta=a.vertical?[target-Number(wall.start[0]),0]:[0,target-Number(wall.start[1])]
    const normalDistance=delta[0]*(-dz/len)+delta[1]*(dx/len)
    const result=moveBlueprintWallParallel(scene,wallId,normalDistance)
    return{wallId,zoneA:A.z.id,zoneB:B.z.id,ratio:r,scene:result.scene}
  }
  if(a.vertical){const min=A.b.minX,max=B.b.maxX,x=min+(max-min)*r;if(x-min<MIN_ROOM_SIZE||max-x<MIN_ROOM_SIZE)throw new Error('移动后房间宽度不足');A.z.polygon=rectPolygon({...A.b,maxX:x});B.z.polygon=rectPolygon({...B.b,minX:x});wall.start=[x,wall.start[1]];wall.end=[x,wall.end[1]]}
  else{const min=A.b.minZ,max=B.b.maxZ,z=min+(max-min)*r;if(z-min<MIN_ROOM_SIZE||max-z<MIN_ROOM_SIZE)throw new Error('移动后房间进深不足');A.z.polygon=rectPolygon({...A.b,maxZ:z});B.z.polygon=rectPolygon({...B.b,minZ:z});wall.start=[wall.start[0],z];wall.end=[wall.end[0],z]}
  regenerateFurnitureForZone(scene,A.z.id);regenerateFurnitureForZone(scene,B.z.id);wall.metadata={...(wall.metadata||{}),ai_modified:true};return{wallId,zoneA:A.z.id,zoneB:B.z.id,ratio:r}
}
function hasBlueprint(scene:SceneGraph){return scene.nodes.building_house?.metadata?.floorplanBlueprint?.schema==='dreamhouse-floorplan-blueprint/v1'}
function addDoor(scene:SceneGraph,wallId:string,positionRatio:number,name?:string){
  const wall:any=scene.nodes[wallId];if(wall?.type!=='wall')throw new Error(`找不到墙体 ${wallId}`);if(wall.metadata?.structural_type==='load_bearing'||wall.metadata?.editable===false)throw new Error('当前AI不允许在承重/锁定墙新增门洞');const len=wallLength(wall);if(len<1.25)throw new Error('墙体过短，无法安全新增门洞');const r=clamp(Number(positionRatio??.5),.14,.86),id=uniqueId(scene,'ai_door'),width=.86,offset=len*r-width/2
  if(hasBlueprint(scene))return{...addBlueprintDoor(scene,{id,name:name||'AI新增门',hostWallId:wallId,offset,width,height:2.1,doorType:'hinged',hingeSide:'left',swingDirection:'inward',swingAngle:0,connects:[null,null]}),wallId,positionRatio:r}
  const d=doorNode(id,wallId,len*r,name||'AI新增门');scene.nodes[id]=d;wall.children=wall.children||[];wall.children.push(id);return{doorId:id,wallId,positionRatio:r,scene}
}
function moveDoor(scene:SceneGraph,doorId:string,targetWallId:string,positionRatio:number){
  const door:any=scene.nodes[doorId];if(door?.type!=='door')throw new Error(`找不到门 ${doorId}`);if(doorId==='door_entry')throw new Error('入户门禁止移动');const wall:any=scene.nodes[targetWallId];if(wall?.type!=='wall')throw new Error(`找不到目标墙 ${targetWallId}`);const ratio=clamp(Number(positionRatio),.14,.86),offset=wallLength(wall)*ratio-Number(door.width||.86)/2
  if(hasBlueprint(scene))return{...moveBlueprintDoor(scene,doorId,targetWallId,offset),doorId,positionRatio:ratio}
  detachFromParent(scene,door);door.parentId=targetWallId;door.wallId=targetWallId;door.position=[wallLength(wall)*ratio,Number(door.position?.[1]??1.05),0];wall.children=wall.children||[];if(!wall.children.includes(doorId))wall.children.push(doorId);door.metadata={...(door.metadata||{}),ai_modified:true};return{doorId,targetWallId,positionRatio:ratio,scene}
}
function removeDoor(scene:SceneGraph,doorId:string){if(doorId==='door_entry')throw new Error('入户门禁止删除');const d:any=scene.nodes[doorId];if(d?.type!=='door')throw new Error(`找不到门 ${doorId}`);if(hasBlueprint(scene))return removeBlueprintDoor(scene,doorId);removeNode(scene,doorId);return{scene,doorId}}

export function validateLayout(scene:SceneGraph):LayoutValidation{
  const issues:string[]=[],warnings:string[]=[],floor=floorBounds(scene),zones=Object.values(scene.nodes).filter((n:any)=>n.type==='zone') as any[]
  const masters=zones.filter(z=>semanticOf(z)==='master_bedroom'),living=zones.filter(z=>semanticOf(z)==='living_room'),bath=zones.filter(z=>semanticOf(z)==='bathroom'||String(semanticOf(z)).includes('bathroom'))
  if(masters.length!==1)issues.push(`主卧数量必须为1，当前为 ${masters.length}`)
  if(!living.length)issues.push('至少需要一个客厅/公共生活空间')
  if(!bath.length)issues.push('至少需要一个卫生间')
  if(!scene.nodes.door_entry)issues.push('入户门 door_entry 丢失')
  const rects:{id:string;b:Bounds;polygon:[number,number][]}[]=[]
  for(const z of zones){try{const b=zoneBounds(z);rects.push({id:z.id,b,polygon:z.polygon});if(b.area<3.5)warnings.push(`${z.name||z.id} 面积仅 ${b.area.toFixed(2)}㎡`);if(b.minX<floor.minX-.02||b.maxX>floor.maxX+.02||b.minZ<floor.minZ-.02||b.maxZ>floor.maxZ+.02)issues.push(`${z.name||z.id} 超出住宅边界`);if(b.width<.9||b.depth<.9)issues.push(`${z.name||z.id} 尺寸无效`)}catch(e:any){issues.push(e.message)}}
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(polygonOverlapArea(a.polygon,b.polygon)>.002)issues.push(`空间 ${a.id} 与 ${b.id} 发生重叠`)}
  for(const w of Object.values(scene.nodes) as any[]){if(w.type!=='wall')continue;if(!Array.isArray(w.start)||!Array.isArray(w.end)||wallLength(w)<.05)issues.push(`墙体 ${w.id} 几何无效`);if(w.metadata?.structural_type==='load_bearing'&&w.metadata?.editable===true)issues.push(`承重墙 ${w.id} 不应标记为可编辑`)}
  for(const d of Object.values(scene.nodes) as any[]){if(d.type!=='door')continue;const wall:any=scene.nodes[d.wallId||d.parentId];if(wall?.type!=='wall')issues.push(`门 ${d.id} 未绑定有效墙体`);else{const pos=Number(d.position?.[0]??-1),len=wallLength(wall);if(pos<.05||pos>len-.05)issues.push(`门 ${d.id} 超出墙体范围`)}}
  for(const item of Object.values(scene.nodes) as any[]){if(item.type!=='item')continue;const zone:any=scene.nodes[item.metadata?.room_id];if(!zone||zone.type!=='zone'){warnings.push(`家具 ${item.id} 未绑定有效房间`);continue}const b=zoneBounds(zone),x=Number(item.position?.[0]??0),z=Number(item.position?.[2]??0);if(x<b.minX-.05||x>b.maxX+.05||z<b.minZ-.05||z>b.maxZ+.05)warnings.push(`家具 ${item.id} 中心点超出 ${zone.name||zone.id}`)}
  return{valid:issues.length===0,issues,warnings,checkedAt:new Date().toISOString()}
}

export const LAYOUT_TOOL_SCHEMAS:any[]=[
  {type:'function',function:{name:'get_house_constraints',description:'读取当前住宅的所有空间位置、房间功能、承重墙、可编辑隔墙、门以及自动设计规则。开始规划前必须先调用。',parameters:{type:'object',properties:{}}}},
  {type:'function',function:{name:'get_room_geometry',description:'读取某一个空间的精确边界、位置、面积和已有家具。',parameters:{type:'object',properties:{zoneId:{type:'string',description:'空间zoneId'}},required:['zoneId']}}},
  {type:'function',function:{name:'assign_room_function',description:'将已有空间重新指定为主卧、书房、儿童房等功能，可用于把主卧搬到另一个现有房间。默认会重新生成该空间的建议家具。',parameters:{type:'object',properties:{zoneId:{type:'string'},roomFunction:{type:'string',enum:Object.keys(ROOM_LABELS)},roomName:{type:'string'},regenerateFurniture:{type:'boolean'}},required:['zoneId','roomFunction']}}},
  {type:'function',function:{name:'merge_rooms',description:'合并两个相邻且合并后仍为矩形的空间；共享的非承重墙会自动删除。',parameters:{type:'object',properties:{zoneIds:{type:'array',items:{type:'string'},minItems:2,maxItems:2},newFunction:{type:'string',enum:Object.keys(ROOM_LABELS)},newName:{type:'string'}},required:['zoneIds','newFunction']}}},
  {type:'function',function:{name:'split_room',description:'把一个矩形空间沿x或z方向拆成两个空间，并自动创建新的非承重隔墙。ratio是从左/上侧起的比例。',parameters:{type:'object',properties:{zoneId:{type:'string'},axis:{type:'string',enum:['x','z']},ratio:{type:'number',minimum:.25,maximum:.75},firstFunction:{type:'string',enum:Object.keys(ROOM_LABELS)},firstName:{type:'string'},secondFunction:{type:'string',enum:Object.keys(ROOM_LABELS)},secondName:{type:'string'}},required:['zoneId','axis','ratio','firstFunction','secondFunction']}}},
  {type:'function',function:{name:'add_partition_wall',description:'按米制坐标新增缺失的非承重隔墙。',parameters:{type:'object',properties:{start:{type:'array',items:{type:'number'},minItems:2,maxItems:2},end:{type:'array',items:{type:'number'},minItems:2,maxItems:2}},required:['start','end']}}},
  {type:'function',function:{name:'remove_partition_wall',description:'删除可编辑的非承重隔墙。绝不能用于承重墙或外墙。',parameters:{type:'object',properties:{wallId:{type:'string'}},required:['wallId']}}},
  {type:'function',function:{name:'move_partition_wall',description:'移动一面只分隔两个规则矩形房间的非承重墙，以改变两个房间面积。ratio为合并总宽/总深中的新边界比例。',parameters:{type:'object',properties:{wallId:{type:'string'},ratio:{type:'number',minimum:.25,maximum:.75}},required:['wallId','ratio']}}},
  {type:'function',function:{name:'extend_wall_endpoint',description:'拖动墙体起点或终点到目标米制坐标，自动吸附邻墙。',parameters:{type:'object',properties:{wallId:{type:'string'},endpoint:{type:'string',enum:['start','end']},target:{type:'array',items:{type:'number'},minItems:2,maxItems:2}},required:['wallId','endpoint','target']}}},
  {type:'function',function:{name:'trim_wall_endpoint',description:'缩短墙体起点或终点到目标米制坐标，门窗超界时拒绝。',parameters:{type:'object',properties:{wallId:{type:'string'},endpoint:{type:'string',enum:['start','end']},target:{type:'array',items:{type:'number'},minItems:2,maxItems:2}},required:['wallId','endpoint','target']}}},
  {type:'function',function:{name:'move_wall_parallel',description:'沿墙法线平行移动非承重墙，distance单位米。',parameters:{type:'object',properties:{wallId:{type:'string'},distance:{type:'number'}},required:['wallId','distance']}}},
  {type:'function',function:{name:'straighten_wall_chain',description:'把连续墙链投影到首尾参考直线。',parameters:{type:'object',properties:{wallIds:{type:'array',items:{type:'string'},minItems:2}},required:['wallIds']}}},
  {type:'function',function:{name:'merge_collinear_walls',description:'合并端点相连且夹角小于2度的共线墙，自动重映射门窗host和offset。',parameters:{type:'object',properties:{wallIds:{type:'array',items:{type:'string'},minItems:2}},required:['wallIds']}}},
  {type:'function',function:{name:'bridge_wall_gap',description:'补齐两面墙最近端点之间的缺口。',parameters:{type:'object',properties:{firstWallId:{type:'string'},secondWallId:{type:'string'}},required:['firstWallId','secondWallId']}}},
  {type:'function',function:{name:'add_door',description:'在非承重墙上新增室内门。positionRatio是门中心沿墙的比例。',parameters:{type:'object',properties:{wallId:{type:'string'},positionRatio:{type:'number',minimum:.14,maximum:.86},name:{type:'string'}},required:['wallId','positionRatio']}}},
  {type:'function',function:{name:'move_door',description:'将已有室内门移动到目标非承重墙或调整其位置。入户门不可移动。',parameters:{type:'object',properties:{doorId:{type:'string'},targetWallId:{type:'string'},positionRatio:{type:'number',minimum:.14,maximum:.86}},required:['doorId','targetWallId','positionRatio']}}},
  {type:'function',function:{name:'remove_door',description:'删除室内门；入户门不可删除。',parameters:{type:'object',properties:{doorId:{type:'string'}},required:['doorId']}}},
  {type:'function',function:{name:'regenerate_furniture',description:'根据当前房间功能重新生成该空间的初始家具建议。不会改变墙体。',parameters:{type:'object',properties:{zoneId:{type:'string'}},required:['zoneId']}}},
  {type:'function',function:{name:'validate_layout',description:'检查新户型是否存在空间重叠、房间缺失、墙/门几何错误等问题。完成改造后必须调用。',parameters:{type:'object',properties:{}}}},
]

export function executeLayoutTool(inputScene:SceneGraph,name:string,args:Record<string,any>):ToolResult{
  let scene=cloneScene(inputScene)
  try{
    if(name==='get_house_constraints')return{ok:true,scene,message:'已读取住宅约束',data:getHouseConstraints(scene)}
    if(name==='get_room_geometry')return{ok:true,scene,message:`已读取 ${args.zoneId} 几何`,data:getRoomGeometry(scene,args.zoneId)}
    if(name==='validate_layout'){const v=validateLayout(scene);return{ok:v.valid,scene,message:v.valid?'户型校验通过':`户型校验失败：${v.issues.join('；')}`,data:v}}
    let data:any,description=''
    if(name==='assign_room_function'){const s=args.roomFunction as RoomSemantic;setRoomFunction(scene,args.zoneId,s,args.roomName,args.regenerateFurniture!==false);data={zoneId:args.zoneId,roomFunction:s,name:(scene.nodes[args.zoneId] as any)?.name};description=`${args.zoneId} → ${data.name}`}
    else if(name==='merge_rooms'){data=mergeRooms(scene,args.zoneIds,args.newFunction,args.newName);if(hasBlueprint(scene))scene=recompileSceneFromBlueprint(scene);description=`合并 ${args.zoneIds.join(' + ')} → ${(scene.nodes[data.resultZoneId] as any)?.name}`}
    else if(name==='split_room'){data=splitRoom(scene,args);if(hasBlueprint(scene))scene=recompileSceneFromBlueprint(scene);description=`拆分 ${args.zoneId} → ${data.firstZoneId} / ${data.secondZoneId}`}
    else if(name==='add_partition_wall'){const result=addBlueprintPartitionWall(scene,args.start,args.end),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`新增非承重墙 ${summary.wallIds[0]}`}
    else if(name==='remove_partition_wall'){if(hasBlueprint(scene)){const result=removeBlueprintWallSafe(scene,args.wallId),{scene:nextScene,...summary}=result;scene=nextScene;data=summary}else{removePartitionWall(scene,args.wallId);data={wallId:args.wallId}}description=`删除非承重墙 ${args.wallId}`}
    else if(name==='move_partition_wall'){data=movePartitionWall(scene,args.wallId,args.ratio);if(data.scene){scene=data.scene;delete data.scene}else if(hasBlueprint(scene))scene=recompileSceneFromBlueprint(scene);description=`移动非承重墙 ${args.wallId}`}
    else if(name==='extend_wall_endpoint'||name==='trim_wall_endpoint'){const result=updateBlueprintWallEndpoint(scene,args.wallId,args.endpoint,args.target),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`调整墙体端点 ${args.wallId}`}
    else if(name==='move_wall_parallel'){const result=moveBlueprintWallParallel(scene,args.wallId,args.distance),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`平行移动墙体 ${args.wallId}`}
    else if(name==='straighten_wall_chain'){const result=straightenBlueprintWallChain(scene,args.wallIds),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`拉直 ${args.wallIds.length} 段墙体`}
    else if(name==='merge_collinear_walls'){const result=mergeBlueprintCollinearWalls(scene,args.wallIds),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`合并 ${args.wallIds.length} 段共线墙`}
    else if(name==='bridge_wall_gap'){const result=bridgeBlueprintWallGap(scene,args.firstWallId,args.secondWallId),{scene:nextScene,...summary}=result;scene=nextScene;data=summary;description=`补齐墙体缺口`}
    else if(name==='add_door'){const result=addDoor(scene,args.wallId,args.positionRatio,args.name),{scene:nextScene,...summary}=result;scene=nextScene||scene;data=summary;description=`新增室内门 ${data.doorId}`}
    else if(name==='move_door'){const result=moveDoor(scene,args.doorId,args.targetWallId,args.positionRatio),{scene:nextScene,...summary}=result;scene=nextScene||scene;data=summary;description=`移动门 ${args.doorId} → ${args.targetWallId}`}
    else if(name==='remove_door'){const result=removeDoor(scene,args.doorId),{scene:nextScene,...summary}=result;scene=nextScene||scene;data=summary;description=`删除室内门 ${args.doorId}`}
    else if(name==='regenerate_furniture'){regenerateFurnitureForZone(scene,args.zoneId);data={zoneId:args.zoneId};description=`重新布置 ${(scene.nodes[args.zoneId] as any)?.name||args.zoneId} 家具`}
    else throw new Error(`未知布局工具 ${name}`)
    return{ok:true,scene,message:description,data,operation:{tool:name,args,description}}
  }catch(e:any){return{ok:false,scene:inputScene,message:e?.message||String(e),data:{error:e?.message||String(e)}}}
}
