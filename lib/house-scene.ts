import type { SceneGraph, SceneNode } from './types'

const LEVEL = 'level_ground'
const FLOOR = 'slab_floor'
const H = 2.8

const ASSETS = {
  doubleBed: { id:'double-bed', category:'furniture', name:'Double Bed', thumbnail:'/items/double-bed/thumbnail.webp', src:'/items/double-bed/model.glb', dimensions:[2,0.8,2.5], offset:[0,0,-0.03], rotation:[0,0,0], scale:[1,1,1] },
  singleBed: { id:'single-bed', category:'furniture', name:'Single Bed', thumbnail:'/items/single-bed/thumbnail.webp', src:'/items/single-bed/model.glb', dimensions:[1.5,0.7,2.5], offset:[0,0,0], rotation:[0,0,0], scale:[1,1,1] },
  bedside: { id:'bedside-table', category:'furniture', name:'Bedside Table', thumbnail:'/items/bedside-table/thumbnail.webp', src:'/items/bedside-table/model.glb', dimensions:[0.5,0.5,0.5], offset:[0,0,-0.01], rotation:[0,0,0], scale:[1,1,1], surface:{height:0.5} },
  dresser: { id:'dresser', category:'furniture', name:'Dresser', thumbnail:'/items/dresser/thumbnail.webp', src:'/items/dresser/model.glb', dimensions:[1.5,0.8,1], offset:[0,0,0], rotation:[0,0,0], scale:[1,1,1], surface:{height:0.8} },
  closet: { id:'closet', category:'furniture', name:'Closet', thumbnail:'/items/closet/thumbnail.webp', src:'/items/closet/model.glb', dimensions:[2,2.5,1], offset:[0,0,-0.01], rotation:[0,0,0], scale:[1,1,1] },
  sofa: { id:'sofa', category:'furniture', name:'Sofa', thumbnail:'/items/sofa/thumbnail.webp', src:'/items/sofa/model.glb', dimensions:[2.5,0.8,1.5], offset:[0,0,0.04], rotation:[0,0,0], scale:[1,1,1] },
  coffee: { id:'coffee-table', category:'furniture', name:'Coffee Table', thumbnail:'/items/coffee-table/thumbnail.webp', src:'/items/coffee-table/model.glb', dimensions:[2,0.4,1.5], offset:[0,0,0], rotation:[0,0,0], scale:[1,1,1], surface:{height:0.3} },
  tv: { id:'tv-stand', category:'furniture', name:'TV Stand', thumbnail:'/items/tv-stand/thumbnail.webp', src:'/items/tv-stand/model.glb', dimensions:[2,0.4,0.5], offset:[0,0.21,0], rotation:[0,0,0], scale:[1,1,1], surface:{height:0.36} },
  table: { id:'dining-table', category:'furniture', name:'Table', thumbnail:'/items/dining-table/thumbnail.webp', src:'/items/dining-table/model.glb', dimensions:[2.5,0.8,1], offset:[0,0,-0.01], rotation:[0,0,0], scale:[1,1,1], surface:{height:0.8} },
  diningChair: { id:'dining-chair', category:'furniture', name:'Chair', thumbnail:'/items/dining-chair/thumbnail.webp', src:'/items/dining-chair/model.glb', dimensions:[0.5,1,0.5], offset:[0,0,0], rotation:[0,0,0], scale:[1,1,1] },
  kitchen: { id:'kitchen', category:'kitchen', name:'Kitchen', thumbnail:'/items/kitchen/thumbnail.webp', src:'/items/kitchen/model.glb', dimensions:[2.5,1.1,1], offset:[0,0,0], rotation:[0,0,0], scale:[1,1,1] },
  fridge: { id:'fridge', category:'kitchen', name:'Fridge', thumbnail:'/items/fridge/thumbnail.webp', src:'/items/fridge/model.glb', dimensions:[1,2,1], offset:[0.01,0,-0.05], rotation:[0,0,0], scale:[1,1,1] },
  toilet: { id:'toilet', category:'bathroom', name:'Toilet', thumbnail:'/items/toilet/thumbnail.webp', src:'/items/toilet/model.glb', dimensions:[1,0.9,1], offset:[0,0,-0.23], rotation:[0,0,0], scale:[1,1,1] },
  sink: { id:'bathroom-sink', category:'bathroom', name:'Bathroom Sink', thumbnail:'/items/bathroom-sink/thumbnail.webp', src:'/items/bathroom-sink/model.glb', dimensions:[2,1,1.5], offset:[0.11,0,0.02], rotation:[0,0,0], scale:[1,1,1] },
  shower: { id:'shower-square', category:'bathroom', name:'Shower', thumbnail:'/items/shower-square/thumbnail.webp', src:'/items/shower-square/model.glb', dimensions:[1,2,1], offset:[0.41,0,-0.42], rotation:[0,0,0], scale:[1,1,1] }
} as const

function wall(id:string,start:[number,number],end:[number,number],structural:'load_bearing'|'partition',children:string[]=[]):SceneNode{
  return {
    object:'node',id,type:'wall',parentId:LEVEL,visible:true,
    name:structural==='load_bearing'?'承重墙':'非承重墙',
    children,
    thickness:structural==='load_bearing'?0.22:0.12,
    height:H,start,end,frontSide:'unknown',backSide:'unknown',
    metadata:{structural_type:structural,editable:structural==='partition'}
  }
}

function door(id:string,wallId:string,distance:number,width=.86,options:Partial<SceneNode>={}):SceneNode{
  return {
    object:'node',id,type:'door',parentId:wallId,wallId,visible:true,name:'门',
    position:[distance,1.05,0],rotation:[0,0,0],width,height:2.1,
    constructionType:'framed',dimensionReference:'nominal',
    doorCategory:'interior',doorType:'hinged',leafCount:1,operationState:0,
    slideDirection:'left',trackStyle:'none',garagePanelCount:4,
    openingKind:'door',openingShape:'rectangle',openingRadiusMode:'all',
    openingTopRadii:[0.15,0.15],cornerRadius:0.08,archHeight:0.45,openingRevealRadius:0.025,
    frameThickness:0.05,frameDepth:0.07,threshold:true,thresholdHeight:0.02,
    hingesSide:'left',swingDirection:'inward',swingAngle:Math.PI/7,
    segments:[{type:'panel',heightRatio:1,columnRatios:[1],dividerThickness:0.03,panelDepth:0.01,panelInset:0.04}],
    handle:true,handleHeight:1.05,handleSide:'right',contentPadding:[0.04,0.04],
    doorCloser:false,panicBar:false,panicBarHeight:1,
    metadata:{opening_role:'door'},...options
  }
}

function windowNode(id:string,wallId:string,distance:number,width:number,height=1.45,sillHeight=1.0,options:Partial<SceneNode>={}):SceneNode{
  return {
    object:'node',id,type:'window',parentId:wallId,wallId,visible:true,name:'窗',
    position:[distance,sillHeight+height/2,0],rotation:[0,0,0],width,height,
    constructionType:'framed',dimensionReference:'nominal',openingKind:'window',
    windowType:'sliding',operationState:0,awningDirection:'up',casementStyle:'single',
    hingesSide:'left',openingShape:'rectangle',openingRadiusMode:'all',
    openingCornerRadii:[0.04,0.04,0.04,0.04],cornerRadius:0.04,archHeight:0.35,
    openingRevealRadius:0.025,frameThickness:0.055,frameDepth:0.07,
    columnRatios:[0.5,0.5],rowRatios:[1],
    columnDividerThickness:0.035,rowDividerThickness:0.03,
    sill:true,sillDepth:0.1,sillThickness:0.035,
    metadata:{opening_role:'window'},...options
  }
}

function zone(id:string,name:string,semantic:string,polygon:[number,number][],color:string):SceneNode{
  return {
    object:'node',id,type:'zone',parentId:LEVEL,visible:true,name,polygon,
    autoFromWalls:false,boundaryWallIds:[],spaceRole:'room',roomNumber:'',
    enclosureStatus:'auto',floorFinish:'wood',wallFinish:'paint',ceilingFinish:'paint',
    ceilingHeight:2.7,occupancy:'residential',clearDimensionPolicy:'none',color,
    metadata:{semantic_type:semantic}
  }
}

export function furnitureItem(id:string,roomId:string,assetKey:keyof typeof ASSETS,position:[number,number,number],rotationY=0,scale:[number,number,number]=[1,1,1]):SceneNode{
  const asset=ASSETS[assetKey]
  return {
    object:'node',id,type:'item',parentId:LEVEL,visible:true,name:asset.name,
    position,rotation:[0,rotationY,0],scale,children:[],supportSlabId:FLOOR,
    asset:{...asset},metadata:{room_id:roomId,furniture_role:asset.id}
  }
}

export function createInitialHouseScene():SceneGraph{
  const nodes:Record<string,SceneNode>={}

  nodes.site_house={
    object:'node',id:'site_house',type:'site',parentId:null,visible:true,name:'Ideal Home Site',
    polygon:{type:'polygon',points:[[-7,-5.5],[7,-5.5],[7,5.5],[-7,5.5]]},
    children:['building_house'],metadata:{house_id:'HOUSE_001'}
  }

  nodes.building_house={
    object:'node',id:'building_house',type:'building',parentId:'site_house',visible:true,
    name:'HOUSE_001',children:[LEVEL],position:[0,0,0],rotation:[0,0,0],
    metadata:{scenario:'single',scene_schema_version:4}
  }

  const openings:SceneNode[]=[
    door('door_entry','wall_e',5.10,1.05,{name:'入户门'}),
    door('door_study','wall_n_band',2.55,.86,{name:'书房门'}),
    door('door_master','wall_s_band',2.20,.90,{name:'主卧门'}),
    door('door_bath','wall_s_band',6.45,.82,{name:'卫生间门'}),
    door('door_gaming','wall_s_band',9.60,.90,{name:'电竞房门'}),

    windowNode('win_n_living_1','wall_n',1.90,1.65,1.45,.9,{name:'客厅北窗1'}),
    windowNode('win_n_living_2','wall_n',4.70,1.65,1.45,.9,{name:'客厅北窗2'}),
    windowNode('win_n_study','wall_n',9.80,1.75,1.45,.9,{name:'书房北窗'}),
    windowNode('win_s_master','wall_s',2.10,1.80,1.45,.9,{name:'主卧南窗'}),
    windowNode('win_s_bath','wall_s',6.00,.75,.75,1.65,{name:'卫生间高窗',windowType:'fixed',columnRatios:[1]}),
    windowNode('win_s_gaming','wall_s',9.80,1.80,1.45,.9,{name:'电竞房南窗'}),
    windowNode('win_w_living','wall_w',2.20,1.40,1.35,.95,{name:'客厅西窗'}),
    windowNode('win_w_master','wall_w',7.20,1.40,1.35,.95,{name:'主卧西窗'}),
    windowNode('win_e_study','wall_e',2.00,1.40,1.35,.95,{name:'书房东窗'}),
    windowNode('win_e_gaming','wall_e',7.30,1.40,1.35,.95,{name:'电竞房东窗'})
  ]
  for(const n of openings)nodes[n.id]=n

  const walls=[
    wall('wall_n',[-6,-4.5],[6,-4.5],'load_bearing',['win_n_living_1','win_n_living_2','win_n_study']),
    wall('wall_e',[6,-4.5],[6,4.5],'load_bearing',['win_e_study','door_entry','win_e_gaming']),
    wall('wall_s',[-6,4.5],[6,4.5],'load_bearing',['win_s_master','win_s_bath','win_s_gaming']),
    wall('wall_w',[-6,-4.5],[-6,4.5],'load_bearing',['win_w_living','win_w_master']),
    wall('wall_n_band',[1.5,0],[6,0],'partition',['door_study']),
    wall('wall_s_band',[-6,1.2],[6,1.2],'partition',['door_master','door_bath','door_gaming']),
    wall('wall_n_v',[1.5,-4.5],[1.5,0],'partition'),
    wall('wall_s_v1',[-1.8,1.2],[-1.8,4.5],'partition'),
    wall('wall_s_v2',[1.2,1.2],[1.2,4.5],'partition')
  ]
  for(const n of walls)nodes[n.id]=n

  nodes[FLOOR]={
    object:'node',id:FLOOR,type:'slab',parentId:LEVEL,visible:true,name:'住宅地板',
    polygon:[[-6,-4.5],[6,-4.5],[6,4.5],[-6,4.5]],holes:[],holeMetadata:[],
    elevation:.05,thickness:.08,recessed:false,autoFromWalls:false,
    metadata:{manufacturing_layer:'floor'}
  }

  const zones=[
    zone('zone_living','客餐厨一体','living_room',[[-6,-4.5],[1.5,-4.5],[1.5,0],[-6,0]],'#4f92b6'),
    zone('zone_study','书房','study',[[1.5,-4.5],[6,-4.5],[6,0],[1.5,0]],'#5b8f82'),
    zone('zone_corridor','走廊','corridor',[[-6,0],[6,0],[6,1.2],[-6,1.2]],'#8a7d62'),
    zone('zone_master','主卧','master_bedroom',[[-6,1.2],[-1.8,1.2],[-1.8,4.5],[-6,4.5]],'#6276a3'),
    zone('zone_bath','卫生间','bathroom',[[-1.8,1.2],[1.2,1.2],[1.2,4.5],[-1.8,4.5]],'#4f8b91'),
    zone('zone_gaming','电竞房','gaming_room',[[1.2,1.2],[6,1.2],[6,4.5],[1.2,4.5]],'#806a9c')
  ]
  for(const n of zones)nodes[n.id]=n

  const items=[
    furnitureItem('item_master_bed','zone_master','doubleBed',[-4.2,0,3.0]),
    furnitureItem('item_master_bedside','zone_master','bedside',[-5.35,0,3.6]),
    furnitureItem('item_master_closet','zone_master','closet',[-2.55,0,3.55],Math.PI/2,[.78,1,.72]),
    furnitureItem('item_living_sofa','zone_living','sofa',[-3.8,0,-1.8],Math.PI/2,[.9,1,.85]),
    furnitureItem('item_living_coffee','zone_living','coffee',[-2.45,0,-1.8],0,[.75,1,.7]),
    furnitureItem('item_living_tv','zone_living','tv',[-1.2,0,-1.8],Math.PI/2,[.8,1,.8]),
    furnitureItem('item_dining_table','zone_living','table',[-2.0,0,-3.55],0,[.7,1,.8]),
    furnitureItem('item_dining_chair_1','zone_living','diningChair',[-2.9,0,-3.55],Math.PI/2),
    furnitureItem('item_dining_chair_2','zone_living','diningChair',[-1.1,0,-3.55],-Math.PI/2),
    furnitureItem('item_kitchen','zone_living','kitchen',[0.3,0,-3.75],0,[.75,1,.78]),
    furnitureItem('item_fridge','zone_living','fridge',[1.0,0,-3.55],0,[.85,1,.85]),
    furnitureItem('item_study_table','zone_study','table',[3.6,0,-3.0],0,[.72,1,.75]),
    furnitureItem('item_study_chair','zone_study','diningChair',[3.6,0,-2.15],Math.PI),
    furnitureItem('item_study_closet','zone_study','closet',[5.2,0,-3.7],Math.PI/2,[.65,1,.62]),
    furnitureItem('item_gaming_table','zone_gaming','table',[3.6,0,3.6],0,[.72,1,.7]),
    furnitureItem('item_gaming_chair','zone_gaming','diningChair',[3.6,0,2.75],Math.PI),
    furnitureItem('item_gaming_closet','zone_gaming','closet',[5.2,0,3.65],Math.PI/2,[.65,1,.62]),
    furnitureItem('item_bath_toilet','zone_bath','toilet',[-1.15,0,3.7],0,[.7,1,.75]),
    furnitureItem('item_bath_sink','zone_bath','sink',[0.35,0,3.6],0,[.55,1,.55]),
    furnitureItem('item_bath_shower','zone_bath','shower',[0.55,0,1.9],0,[.72,1,.72])
  ]
  for(const n of items)nodes[n.id]=n

  nodes[LEVEL]={
    object:'node',id:LEVEL,type:'level',parentId:'building_house',visible:true,
    name:'住宅一层',level:0,baseElevation:0,height:H,
    children:[FLOOR,...walls.map(x=>x.id),...zones.map(x=>x.id),...items.map(x=>x.id)],
    metadata:{}
  }

  return {nodes,rootNodeIds:['site_house']}
}
