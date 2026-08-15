import type { GuardResult, RenovationPlan, SceneGraph, SceneNode, ScenePatch } from './types'
const bounds=(poly:[number,number][])=>({minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))})
const roomNode=(id:string,name:string,semantic:string,polygon:[number,number][],parentId:string):SceneNode=>({object:'node',id,type:'zone',name,parentId,visible:true,polygon,autoFromWalls:false,boundaryWallIds:[],spaceRole:'room',roomNumber:'',enclosureStatus:'auto',floorFinish:'',wallFinish:'',ceilingFinish:'',ceilingHeight:2.7,occupancy:'',clearDimensionPolicy:'none',color:'#dcecff',metadata:{semantic_type:semantic,lifecycle_scope:'scenario'}})

export function compileAndGuard(scene:SceneGraph,plan:RenovationPlan):GuardResult{
  const patches:ScenePatch[]=[]; const blocked:string[]=[]; const warnings=[...plan.warnings]
  for(const op of plan.operations){
    if(op.type==='resemanticize_room'){
      const room=scene.nodes[op.roomId]; if(!room||room.type!=='zone'){blocked.push(`房间不存在：${op.roomId}`);continue}
      patches.push({op:'update',id:room.id,data:{name:op.newName,metadata:{...(room.metadata??{}),semantic_type:op.newSemantic,lifecycle_scope:'scenario'}}}); continue
    }
    if(op.type==='remove_all_partitions'){
      for(const n of Object.values(scene.nodes)) if(n.type==='wall'&&n.metadata?.structural_type==='partition'&&n.metadata?.editable!==false) patches.push({op:'delete',id:n.id})
      for(const n of Object.values(scene.nodes)) if(n.type==='zone'&&n.metadata?.lifecycle_scope==='scenario') patches.push({op:'delete',id:n.id})
      warnings.push('旧房间 Zone 同步清除，随后请在 Pascal 中重新定义房间。'); continue
    }
    if(op.type==='split_room'){
      const room=scene.nodes[op.roomId]; if(!room||room.type!=='zone'||!Array.isArray(room.polygon)){blocked.push(`无法拆分房间：${op.roomId}`);continue}
      if(op.ratio<.2||op.ratio>.8){blocked.push(`拆分比例超限：${op.ratio}`);continue}
      const b=bounds(room.polygon as [number,number][]), parentId=room.parentId??'level_ground'
      let a:[number,number][],c:[number,number][],start:[number,number],end:[number,number]
      if(op.axis==='x'){const x=b.minX+(b.maxX-b.minX)*op.ratio;a=[[b.minX,b.minZ],[x,b.minZ],[x,b.maxZ],[b.minX,b.maxZ]];c=[[x,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[x,b.maxZ]];start=[x,b.minZ];end=[x,b.maxZ]}
      else {const z=b.minZ+(b.maxZ-b.minZ)*op.ratio;a=[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,z],[b.minX,z]];c=[[b.minX,z],[b.maxX,z],[b.maxX,b.maxZ],[b.minX,b.maxZ]];start=[b.minX,z];end=[b.maxX,z]}
      const wallId=`wall_split_${op.rooms[0].id}_${op.rooms[1].id}`; if(scene.nodes[wallId]){blocked.push(`拆分墙已经存在：${wallId}`);continue}
      patches.push({op:'delete',id:room.id})
      patches.push({op:'create',parentId,node:{object:'node',id:wallId,type:'wall',name:'新增非承重隔墙',parentId,visible:true,children:[],start,end,thickness:.12,height:2.8,frontSide:'unknown',backSide:'unknown',metadata:{structural_type:'partition',editable:true,lifecycle_scope:'scenario'}}})
      patches.push({op:'create',parentId,node:roomNode(op.rooms[0].id,op.rooms[0].name,op.rooms[0].semantic,a,parentId)})
      patches.push({op:'create',parentId,node:roomNode(op.rooms[1].id,op.rooms[1].name,op.rooms[1].semantic,c,parentId)}); continue
    }
    if(op.type==='add_partition'){
      const level=scene.nodes.level_ground; if(!level){blocked.push('找不到 level_ground');continue}
      const id=`wall_user_${Date.now()}_${patches.length}`
      patches.push({op:'create',parentId:level.id,node:{object:'node',id,type:'wall',name:op.name??'新增非承重隔墙',parentId:level.id,visible:true,children:[],start:op.start,end:op.end,thickness:.12,height:2.8,frontSide:'unknown',backSide:'unknown',metadata:{structural_type:'partition',editable:true,lifecycle_scope:'scenario'}}})
    }
  }
  const safe:ScenePatch[]=[]
  for(const p of patches){
    if(p.op==='delete'){const n=scene.nodes[p.id]; if(n?.type==='wall'&&(n.metadata?.structural_type==='load_bearing'||n.metadata?.editable===false)){blocked.push(`已阻止删除承重/锁定墙：${n.id}`);continue}}
    safe.push(p)
  }
  return {allowed:safe.length>0||plan.operations.length===0,patches:safe,blocked,warnings}
}
