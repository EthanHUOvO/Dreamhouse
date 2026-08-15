import type { SceneGraph, SceneNode } from './types'

const levelId = 'level_ground'

function wall(id: string, start: [number, number], end: [number, number], structuralType: 'load_bearing' | 'partition'): SceneNode {
  const editable = structuralType === 'partition'
  return {
    object:'node', id, type:'wall', name: editable ? '非承重隔墙' : '承重墙', parentId:levelId,
    visible:true, children:[], start, end, thickness: editable ? 0.12 : 0.24, height:2.8,
    frontSide:'unknown', backSide:'unknown',
    metadata:{ structural_type:structuralType, editable, lifecycle_scope: editable ? 'scenario' : 'base' }
  }
}

function zone(id:string, name:string, semanticType:string, polygon:[number,number][], color:string): SceneNode {
  return {
    object:'node', id, type:'zone', name, parentId:levelId, visible:true, polygon,
    autoFromWalls:false, boundaryWallIds:[], spaceRole:'room', roomNumber:'', enclosureStatus:'auto',
    floorFinish:'', wallFinish:'', ceilingFinish:'', ceilingHeight:2.7, occupancy:'',
    clearDimensionPolicy:'none', color,
    metadata:{ semantic_type:semanticType, lifecycle_scope:'scenario' }
  }
}

export function createBaseHouseScene(): SceneGraph {
  const nodes: Record<string, SceneNode> = {}
  nodes.site_house = {
    object:'node', id:'site_house', type:'site', name:'Ideal Home Site', parentId:null, visible:true,
    polygon:{type:'polygon', points:[[-2,-2],[14,-2],[14,11],[-2,11]]}, children:['building_house'],
    metadata:{house_id:'HOUSE_001'}
  }
  nodes.building_house = {
    object:'node', id:'building_house', type:'building', name:'HOUSE_001', parentId:'site_house', visible:true,
    children:[levelId], position:[0,0,0], rotation:[0,0,0], metadata:{immutable_footprint:true}
  }
  const walls = [
    wall('wall_ext_s',[0,0],[12,0],'load_bearing'), wall('wall_ext_e',[12,0],[12,9],'load_bearing'),
    wall('wall_ext_n',[12,9],[0,9],'load_bearing'), wall('wall_ext_w',[0,9],[0,0],'load_bearing'),
    wall('wall_p_h1',[0,4],[12,4],'partition'), wall('wall_p_v1',[4,0],[4,4],'partition'),
    wall('wall_p_v2',[8,0],[8,4],'partition'), wall('wall_p_v3',[7,4],[7,9],'partition')
  ]
  walls.forEach(n => nodes[n.id] = n)
  nodes.slab_ground = {
    object:'node', id:'slab_ground', type:'slab', name:'Floor', parentId:levelId, visible:true,
    polygon:[[0,0],[12,0],[12,9],[0,9]], holes:[], holeMetadata:[], elevation:0.05,
    thickness:0.05, recessed:false, autoFromWalls:false,
    metadata:{manufacturing_layer:'floor', lifecycle_scope:'base'}
  }
  const zones = [
    zone('zone_master','主卧','master_bedroom',[[0,0],[4,0],[4,4],[0,4]],'#d9e8ff'),
    zone('zone_gaming','电竞房','gaming_room',[[4,0],[8,0],[8,4],[4,4]],'#efe0ff'),
    zone('zone_bath','卫生间','bathroom',[[8,0],[12,0],[12,4],[8,4]],'#dff7f2'),
    zone('zone_living','客厅','living_room',[[0,4],[7,4],[7,9],[0,9]],'#fff1cf'),
    zone('zone_study','书房','study',[[7,4],[12,4],[12,9],[7,9]],'#e7f0db')
  ]
  zones.forEach(n => nodes[n.id] = n)
  nodes[levelId] = {
    object:'node', id:levelId, type:'level', name:'住宅一层', parentId:'building_house', visible:true,
    level:0, baseElevation:0, height:2.8,
    children:['slab_ground', ...walls.map(x=>x.id), ...zones.map(x=>x.id)],
    metadata:{lifecycle_scope:'base'}
  }
  return { nodes, rootNodeIds:['site_house'] }
}
