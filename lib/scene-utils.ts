import { createInitialHouseScene, furnitureItem } from './house-scene'
import type { RenovationPlan, ScenarioType, SceneGraph, SceneNode } from './types'

export function cloneScene(scene:SceneGraph):SceneGraph{
  return JSON.parse(JSON.stringify(scene)) as SceneGraph
}

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
  z.metadata={...(z.metadata??{}),semantic_type:semantic,lifecycle_scope:'scenario'}
}

function doorNode(
  id:string,
  wallId:string,
  distanceFromWallStart:number,
  name:string,
):SceneNode{
  return {
    object:'node',
    id,
    type:'door',
    parentId:wallId,
    wallId,
    visible:true,
    name,
    position:[distanceFromWallStart,1.05,0],
    rotation:[0,0,0],
    width:.78,
    height:2.1,
    constructionType:'framed',
    dimensionReference:'nominal',
    doorCategory:'interior',
    doorType:'hinged',
    leafCount:1,
    operationState:0,
    slideDirection:'left',
    trackStyle:'none',
    garagePanelCount:4,
    openingKind:'door',
    openingShape:'rectangle',
    openingRadiusMode:'all',
    openingTopRadii:[.15,.15],
    cornerRadius:.08,
    archHeight:.45,
    openingRevealRadius:.025,
    frameThickness:.05,
    frameDepth:.07,
    threshold:true,
    thresholdHeight:.02,
    hingesSide:'right',
    swingDirection:'inward',
    swingAngle:Math.PI/7,
    segments:[{
      type:'panel',
      heightRatio:1,
      columnRatios:[1],
      dividerThickness:.03,
      panelDepth:.01,
      panelInset:.04,
    }],
    handle:true,
    handleHeight:1.05,
    handleSide:'left',
    contentPadding:[.04,.04],
    doorCloser:false,
    panicBar:false,
    panicBarHeight:1,
    metadata:{lifecycle_scope:'scenario',opening_role:'door'},
  }
}

function partitionWall(
  id:string,
  start:[number,number],
  end:[number,number],
  children:string[]=[],
):SceneNode{
  return {
    object:'node',
    id,
    type:'wall',
    parentId:'level_ground',
    visible:true,
    name:'新增非承重墙',
    children,
    thickness:.12,
    height:2.8,
    start,
    end,
    frontSide:'unknown',
    backSide:'unknown',
    metadata:{structural_type:'partition',editable:true,lifecycle_scope:'scenario'},
  }
}

function roomZone(
  id:string,
  name:string,
  semantic:string,
  polygon:[number,number][],
  color:string,
):SceneNode{
  return {
    object:'node',
    id,
    type:'zone',
    parentId:'level_ground',
    visible:true,
    name,
    polygon,
    autoFromWalls:false,
    boundaryWallIds:[],
    spaceRole:'room',
    roomNumber:'',
    enclosureStatus:'auto',
    floorFinish:'tile',
    wallFinish:'paint',
    ceilingFinish:'paint',
    ceilingHeight:2.7,
    occupancy:'residential',
    clearDimensionPolicy:'none',
    color,
    metadata:{semantic_type:semantic,lifecycle_scope:'scenario'},
  }
}

function applyDressing(scene:SceneGraph){
  setRoom(scene,'zone_gaming','衣帽间','dressing_room','#9b765d')
  deleteRoomFurniture(scene,'zone_gaming')
  ;[
    furnitureItem('item_dress_closet_1','zone_gaming','closet',[2.2,0,3.7],0,[.75,1,.62]),
    furnitureItem('item_dress_closet_2','zone_gaming','closet',[4.1,0,3.7],0,[.75,1,.62]),
    furnitureItem('item_dress_dresser','zone_gaming','dresser',[5.25,0,2.2],Math.PI/2,[.7,1,.65]),
  ].forEach(n=>addLevelChild(scene,n))
}

function applyCouple(scene:SceneGraph){
  applyDressing(scene)
  setRoom(scene,'zone_study','双人书房','shared_study','#4f7f86')
  deleteRoomFurniture(scene,'zone_study')
  ;[
    furnitureItem('item_shared_table_1','zone_study','table',[2.8,0,-3.15],0,[.62,1,.7]),
    furnitureItem('item_shared_chair_1','zone_study','diningChair',[2.8,0,-2.3],Math.PI),
    furnitureItem('item_shared_table_2','zone_study','table',[4.8,0,-3.15],0,[.62,1,.7]),
    furnitureItem('item_shared_chair_2','zone_study','diningChair',[4.8,0,-2.3],Math.PI),
  ].forEach(n=>addLevelChild(scene,n))
}

function splitBathroom(scene:SceneGraph){
  if(scene.nodes.zone_bath)removeNode(scene,'zone_bath')
  deleteRoomFurniture(scene,'zone_bath')

  const wall=partitionWall('wall_bath_split',[-.3,1.2],[-.3,4.5])
  addLevelChild(scene,wall)

  addLevelChild(scene,roomZone(
    'zone_master_bath',
    '主卫',
    'master_bathroom',
    [[-1.8,1.2],[-.3,1.2],[-.3,4.5],[-1.8,4.5]],
    '#3b7e91',
  ))
  addLevelChild(scene,roomZone(
    'zone_public_bath',
    '公卫',
    'public_bathroom',
    [[-.3,1.2],[1.2,1.2],[1.2,4.5],[-.3,4.5]],
    '#4d9387',
  ))

  /*
   * wall_s_v1 starts at z=1.2 and ends at z=4.5.
   * Put the new master-bath door around world z=2.2:
   * local distance = 2.2 - 1.2 = 1.0m.
   */
  const masterDoor=doorNode('door_master_bath','wall_s_v1',1.0,'主卫门')
  addWallChild(scene,'wall_s_v1',masterDoor)

  ;[
    furnitureItem('item_masterbath_toilet','zone_master_bath','toilet',[-1.35,0,3.55],0,[.55,1,.65]),
    furnitureItem('item_masterbath_sink','zone_master_bath','sink',[-1.1,0,2.0],Math.PI/2,[.42,1,.42]),
    furnitureItem('item_publicbath_toilet','zone_public_bath','toilet',[.55,0,3.55],0,[.55,1,.65]),
    furnitureItem('item_publicbath_sink','zone_public_bath','sink',[.45,0,2.0],-Math.PI/2,[.42,1,.42]),
  ].forEach(n=>addLevelChild(scene,n))
}

function applyChild(scene:SceneGraph,nanny=false){
  setRoom(scene,'zone_gaming','儿童房','child_room','#4e897b')
  deleteRoomFurniture(scene,'zone_gaming')
  ;[
    furnitureItem('item_child_bed','zone_gaming','singleBed',[3.0,0,3.0],0,[.9,1,.9]),
    furnitureItem('item_child_bedside','zone_gaming','bedside',[2.0,0,3.7],0),
    furnitureItem('item_child_dresser','zone_gaming','dresser',[5.1,0,3.65],Math.PI/2,[.65,1,.62]),
    furnitureItem('item_child_table','zone_gaming','table',[4.5,0,1.95],0,[.5,1,.6]),
    furnitureItem('item_child_chair','zone_gaming','diningChair',[4.5,0,2.55],Math.PI),
  ].forEach(n=>addLevelChild(scene,n))

  splitBathroom(scene)

  if(nanny){
    setRoom(scene,'zone_study','保姆房','nanny_room','#8a7654')
    deleteRoomFurniture(scene,'zone_study')
    ;[
      furnitureItem('item_nanny_bed','zone_study','singleBed',[3.0,0,-2.5],Math.PI,[.85,1,.85]),
      furnitureItem('item_nanny_dresser','zone_study','dresser',[5.1,0,-3.5],Math.PI/2,[.65,1,.62]),
    ].forEach(n=>addLevelChild(scene,n))
  }
}

function applyOpen(scene:SceneGraph){
  const protectedWalls=new Set(['wall_n','wall_e','wall_s','wall_w'])

  for(const node of Object.values({...scene.nodes})){
    if(
      node.type==='wall' &&
      !protectedWalls.has(node.id) &&
      node.metadata?.structural_type==='partition'
    ){
      removeNode(scene,node.id)
    }
  }

  for(const node of Object.values({...scene.nodes})){
    if(node.type==='zone')removeNode(scene,node.id)
    if(node.type==='item')removeNode(scene,node.id)
  }

  addLevelChild(scene,roomZone(
    'zone_open',
    '自由规划空间',
    'open_plan',
    [[-6,-4.5],[6,-4.5],[6,4.5],[-6,4.5]],
    '#446a72',
  ))
}

export function createScenarioScene(type:ScenarioType):SceneGraph{
  const scene=createInitialHouseScene()

  if(type==='dressing')applyDressing(scene)
  if(type==='couple')applyCouple(scene)
  if(type==='child')applyChild(scene,false)
  if(type==='nanny')applyChild(scene,true)
  if(type==='open')applyOpen(scene)

  scene.nodes.building_house.metadata={
    ...(scene.nodes.building_house.metadata??{}),
    scenario:type,
    scene_schema_version:3,
    updated_at:new Date().toISOString(),
  }

  return scene
}

export function planFromPrompt(prompt:string):RenovationPlan{
  const p=prompt.trim()

  if(/拆.*(非承重|隔墙)|清空.*(隔墙|空间)/.test(p)){
    return {
      type:'open',
      title:'住宅空壳重构',
      summary:'保留外轮廓、承重墙、入户门和外窗，清空内部非承重隔墙与旧房间语义。',
      patchCount:9,
      changes:['删除全部内部非承重墙','清除旧 Zone','保留承重结构和外窗'],
      warning:'进入自由规划状态后，需要重新规划隔墙、门和房间语义。',
    }
  }

  if(/保姆/.test(p)){
    return {
      type:'nanny',
      title:'育儿 + 保姆方案',
      summary:'电竞房改儿童房，书房改保姆房，同时把卫生间拆成主卫和公卫。',
      patchCount:12,
      changes:['电竞房 → 儿童房','书房 → 保姆房','卫生间 → 主卫 + 公卫','新增主卫门和卫生间隔墙','替换相应家具'],
      warning:'真实卫生间改造仍需校核给排水、防水、通风和规范。',
    }
  }

  if(/孩子|儿童|宝宝|育儿/.test(p)){
    return {
      type:'child',
      title:'育儿家庭方案',
      summary:'电竞房改为儿童房，原卫生间拆分为主卫和公卫，并增加主卧侧主卫门。',
      patchCount:9,
      changes:['电竞房 → 儿童房','卫生间 → 主卫 + 公卫','新增非承重隔墙','新增主卫门','替换儿童房/卫生间家具'],
      warning:'承重墙与外轮廓保持锁定。',
    }
  }

  if(/结婚|两个人|伴侣|双人/.test(p)){
    return {
      type:'couple',
      title:'两人共同居住方案',
      summary:'电竞房变衣帽间，书房变双人办公空间，房间几何主体保持不变。',
      patchCount:7,
      changes:['电竞房 → 衣帽间','书房 → 双人书房','替换两组家具'],
      warning:'不修改承重墙。',
    }
  }

  if(/电竞.*衣帽|游戏.*衣帽|衣帽间/.test(p)){
    return {
      type:'dressing',
      title:'房间语义重构',
      summary:'保持原电竞房几何边界不变，改为衣帽间并替换家具。',
      patchCount:4,
      changes:['Zone semantic 修改','电竞家具移除','衣柜/斗柜加入'],
    }
  }

  if(/单人|一个人/.test(p)){
    return {
      type:'single',
      title:'单人居住初始方案',
      summary:'恢复主卧、电竞房、书房、客餐厨和单卫生间的单人生活方案。',
      patchCount:1,
      changes:['恢复基准生活场景'],
    }
  }

  return {
    type:'custom',
    title:'需要自由规划',
    summary:'当前展示版只执行受控生命周期指令。后续可以接入 LLM Planner 处理自由自然语言。',
    patchCount:0,
    changes:['建议后续接入 LLM Planner。'],
  }
}
