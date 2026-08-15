import { createInitialHouseScene, furnitureItem } from './house-scene'
import type { RenovationPlan, ScenarioType, SceneGraph, SceneNode } from './types'

function removeNode(scene:SceneGraph,id:string){
  const node=scene.nodes[id]
  if(!node)return
  if(node.parentId&&scene.nodes[node.parentId]?.children){
    scene.nodes[node.parentId].children=scene.nodes[node.parentId].children!.filter(x=>x!==id)
  }
  for(const child of [...(node.children??[])])removeNode(scene,child)
  delete scene.nodes[id]
}

function addLevelChild(scene:SceneGraph,node:SceneNode){
  scene.nodes[node.id]=node
  const level=scene.nodes.level_ground
  level.children=level.children??[]
  if(!level.children.includes(node.id))level.children.push(node.id)
}

function addWallChild(scene:SceneGraph,wallId:string,node:SceneNode){
  scene.nodes[node.id]=node
  const wall=scene.nodes[wallId]
  wall.children=wall.children??[]
  if(!wall.children.includes(node.id))wall.children.push(node.id)
}

function deleteRoomFurniture(scene:SceneGraph,roomId:string){
  for(const node of Object.values({...scene.nodes})){
    if(node.type==='item'&&node.metadata?.room_id===roomId)removeNode(scene,node.id)
  }
}

function setRoom(scene:SceneGraph,id:string,name:string,semantic:string,color:string){
  const z=scene.nodes[id]
  if(!z)return
  z.name=name
  z.color=color
  z.metadata={...(z.metadata??{}),semantic_type:semantic}
}

function partitionWall(id:string,start:[number,number],end:[number,number],children:string[]=[]):SceneNode{
  return {
    object:'node',id,type:'wall',parentId:'level_ground',visible:true,name:'新增非承重墙',
    children,thickness:.12,height:2.8,start,end,frontSide:'unknown',backSide:'unknown',
    metadata:{structural_type:'partition',editable:true}
  }
}

function roomZone(id:string,name:string,semantic:string,polygon:[number,number][],color:string):SceneNode{
  return {
    object:'node',id,type:'zone',parentId:'level_ground',visible:true,name,polygon,
    autoFromWalls:false,boundaryWallIds:[],spaceRole:'room',roomNumber:'',
    enclosureStatus:'auto',floorFinish:'tile',wallFinish:'paint',ceilingFinish:'paint',
    ceilingHeight:2.7,occupancy:'residential',clearDimensionPolicy:'none',color,
    metadata:{semantic_type:semantic}
  }
}

function doorNode(id:string,wallId:string,distance:number,name:string):SceneNode{
  return {
    object:'node',id,type:'door',parentId:wallId,wallId,visible:true,name,
    position:[distance,1.05,0],rotation:[0,0,0],width:.78,height:2.1,
    constructionType:'framed',dimensionReference:'nominal',doorCategory:'interior',
    doorType:'hinged',leafCount:1,operationState:0,slideDirection:'left',trackStyle:'none',
    garagePanelCount:4,openingKind:'door',openingShape:'rectangle',
    openingRadiusMode:'all',openingTopRadii:[.15,.15],cornerRadius:.08,archHeight:.45,
    openingRevealRadius:.025,frameThickness:.05,frameDepth:.07,threshold:true,
    thresholdHeight:.02,hingesSide:'right',swingDirection:'inward',swingAngle:Math.PI/7,
    segments:[{type:'panel',heightRatio:1,columnRatios:[1],dividerThickness:.03,panelDepth:.01,panelInset:.04}],
    handle:true,handleHeight:1.05,handleSide:'left',contentPadding:[.04,.04],
    doorCloser:false,panicBar:false,panicBarHeight:1,metadata:{opening_role:'door'}
  }
}

function applyCouple(scene:SceneGraph){
  setRoom(scene,'zone_gaming','衣帽间','dressing_room','#9b765d')
  deleteRoomFurniture(scene,'zone_gaming')
  ;[
    furnitureItem('item_dress_closet_1','zone_gaming','closet',[2.2,0,3.7],0,[.75,1,.62]),
    furnitureItem('item_dress_closet_2','zone_gaming','closet',[4.1,0,3.7],0,[.75,1,.62]),
    furnitureItem('item_dress_dresser','zone_gaming','dresser',[5.25,0,2.2],Math.PI/2,[.7,1,.65])
  ].forEach(n=>addLevelChild(scene,n))

  setRoom(scene,'zone_study','双人书房','shared_study','#4f7f86')
  deleteRoomFurniture(scene,'zone_study')
  ;[
    furnitureItem('item_shared_table_1','zone_study','table',[2.8,0,-3.15],0,[.62,1,.7]),
    furnitureItem('item_shared_chair_1','zone_study','diningChair',[2.8,0,-2.3],Math.PI),
    furnitureItem('item_shared_table_2','zone_study','table',[4.8,0,-3.15],0,[.62,1,.7]),
    furnitureItem('item_shared_chair_2','zone_study','diningChair',[4.8,0,-2.3],Math.PI)
  ].forEach(n=>addLevelChild(scene,n))
}

function splitBathroom(scene:SceneGraph){
  if(scene.nodes.zone_bath)removeNode(scene,'zone_bath')
  deleteRoomFurniture(scene,'zone_bath')

  addLevelChild(scene,partitionWall('wall_bath_split',[-.3,1.2],[-.3,4.5]))
  addLevelChild(scene,roomZone(
    'zone_master_bath','主卫','master_bathroom',
    [[-1.8,1.2],[-.3,1.2],[-.3,4.5],[-1.8,4.5]],'#3b7e91'
  ))
  addLevelChild(scene,roomZone(
    'zone_public_bath','公卫','public_bathroom',
    [[-.3,1.2],[1.2,1.2],[1.2,4.5],[-.3,4.5]],'#4d9387'
  ))

  addWallChild(scene,'wall_s_v1',doorNode('door_master_bath','wall_s_v1',1.0,'主卫门'))

  ;[
    furnitureItem('item_masterbath_toilet','zone_master_bath','toilet',[-1.35,0,3.55],0,[.55,1,.65]),
    furnitureItem('item_masterbath_sink','zone_master_bath','sink',[-1.1,0,2.0],Math.PI/2,[.42,1,.42]),
    furnitureItem('item_publicbath_toilet','zone_public_bath','toilet',[.55,0,3.55],0,[.55,1,.65]),
    furnitureItem('item_publicbath_sink','zone_public_bath','sink',[.45,0,2.0],-Math.PI/2,[.42,1,.42])
  ].forEach(n=>addLevelChild(scene,n))
}

function applyChild(scene:SceneGraph,nanny=false){
  setRoom(scene,'zone_gaming','儿童房','child_room','#4e897b')
  deleteRoomFurniture(scene,'zone_gaming')
  ;[
    furnitureItem('item_child_bed','zone_gaming','singleBed',[3.0,0,3.0],0,[.9,1,.9]),
    furnitureItem('item_child_bedside','zone_gaming','bedside',[2.0,0,3.7]),
    furnitureItem('item_child_dresser','zone_gaming','dresser',[5.1,0,3.65],Math.PI/2,[.65,1,.62]),
    furnitureItem('item_child_table','zone_gaming','table',[4.5,0,1.95],0,[.5,1,.6]),
    furnitureItem('item_child_chair','zone_gaming','diningChair',[4.5,0,2.55],Math.PI)
  ].forEach(n=>addLevelChild(scene,n))

  splitBathroom(scene)

  if(nanny){
    setRoom(scene,'zone_study','保姆房','nanny_room','#8a7654')
    deleteRoomFurniture(scene,'zone_study')
    ;[
      furnitureItem('item_nanny_bed','zone_study','singleBed',[3.0,0,-2.5],Math.PI,[.85,1,.85]),
      furnitureItem('item_nanny_dresser','zone_study','dresser',[5.1,0,-3.5],Math.PI/2,[.65,1,.62])
    ].forEach(n=>addLevelChild(scene,n))
  }
}

export function createScenarioScene(type:ScenarioType):SceneGraph{
  const scene=createInitialHouseScene()
  if(type==='couple')applyCouple(scene)
  if(type==='child')applyChild(scene,false)
  if(type==='nanny')applyChild(scene,true)
  scene.nodes.building_house.metadata={
    ...(scene.nodes.building_house.metadata??{}),
    scenario:type,
    updated_at:new Date().toISOString()
  }
  return scene
}

export function planFromPrompt(prompt:string):RenovationPlan{
  const p=prompt.trim()

  if(/保姆/.test(p)){
    return {
      type:'nanny',
      title:'育儿 + 保姆方案',
      summary:'儿童房、保姆房、主卫、公卫共同形成育儿阶段的住宅空间方案。',
      changes:['电竞房改为儿童房','书房改为保姆房','卫生间拆分为主卫和公卫']
    }
  }

  if(/孩子|儿童|宝宝|育儿/.test(p)){
    return {
      type:'child',
      title:'育儿家庭方案',
      summary:'将电竞房调整为儿童房，并把原卫生间拆分成主卫和公卫。',
      changes:['电竞房改为儿童房','卫生间拆分为主卫和公卫']
    }
  }

  if(/结婚|两个人|伴侣|双人|衣帽/.test(p)){
    return {
      type:'couple',
      title:'两人共同居住方案',
      summary:'电竞房改为衣帽间，书房改为双人书房。',
      changes:['电竞房改为衣帽间','书房改为双人书房']
    }
  }

  return {
    type:'single',
    title:'单人居住方案',
    summary:'保留主卧、电竞房、书房、客餐厨和卫生间。',
    changes:['恢复单人居住空间语义']
  }
}
