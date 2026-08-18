import type { SceneGraph, SceneNode } from './types'

export const WALKTHROUGH_EYE_HEIGHT = 1.65
export const WALKTHROUGH_PLAYER_RADIUS = 0.22
export const WALKTHROUGH_WALK_SPEED = 2.0
export const WALKTHROUGH_RUN_SPEED = 4.2
export const WALKTHROUGH_DOOR_DISTANCE = 2.35

type XZ = { x: number; z: number }

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

function pointInPolygon(x:number,z:number,polygon:[number,number][]) {
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,zi]=polygon[i]
    const [xj,zj]=polygon[j]
    const hit=((zi>z)!==(zj>z)) && (x < (xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi)
    if(hit)inside=!inside
  }
  return inside
}

function segmentProjection(x:number,z:number,start:[number,number],end:[number,number]){
  const vx=end[0]-start[0], vz=end[1]-start[1]
  const len2=vx*vx+vz*vz
  if(len2<1e-9)return {distance:Math.hypot(x-start[0],z-start[1]),t:0,length:0}
  const length=Math.sqrt(len2)
  const t=clamp(((x-start[0])*vx+(z-start[1])*vz)/len2,0,1)
  const px=start[0]+vx*t, pz=start[1]+vz*t
  return {distance:Math.hypot(x-px,z-pz),t,length}
}

function floorPolygon(scene:SceneGraph):[number,number][]|null{
  const slab:any=Object.values(scene.nodes).find((node:any)=>node.type==='slab'&&Array.isArray(node.polygon)&&node.polygon.length>=3)
  return slab?.polygon??null
}

function isDoorGapPassable(scene:SceneGraph,wall:any,along:number,openDoorIds:Set<string>,radius:number){
  for(const childId of wall.children??[]){
    const door:any=scene.nodes[childId]
    if(door?.type!=='door'||door.openingKind==='opening')continue
    const center=Number(door.position?.[0]??0)
    const width=Number(door.width??0.86)
    const clearance=Math.max(0.16,width/2-radius*0.55)
    if(Math.abs(along-center)<=clearance && openDoorIds.has(door.id))return true
  }
  return false
}

function itemBlocks(scene:SceneGraph,x:number,z:number,radius:number){
  for(const node of Object.values(scene.nodes) as SceneNode[]){
    if(node.type!=='item'||node.visible===false)continue
    const p:any=node.position??[0,0,0]
    const dims:any=node.asset?.dimensions??[0.7,1,0.7]
    const scale:any=node.scale??[1,1,1]
    const width=Math.max(0.15,Number(dims[0]??0.7)*Math.abs(Number(scale[0]??1)))
    const depth=Math.max(0.15,Number(dims[2]??0.7)*Math.abs(Number(scale[2]??1)))
    const yaw=Number(node.rotation?.[1]??0)
    const dx=x-Number(p[0]??0), dz=z-Number(p[2]??0)
    const c=Math.cos(-yaw),s=Math.sin(-yaw)
    const lx=dx*c-dz*s, lz=dx*s+dz*c
    if(Math.abs(lx)<=width/2+radius && Math.abs(lz)<=depth/2+radius)return true
  }
  return false
}

export function isWalkthroughPositionBlocked(
  scene:SceneGraph,
  x:number,
  z:number,
  openDoorIds:Set<string>=new Set(),
  radius=WALKTHROUGH_PLAYER_RADIUS,
){
  const floor=floorPolygon(scene)
  if(floor&&!pointInPolygon(x,z,floor))return true

  for(const wall of Object.values(scene.nodes) as any[]){
    if(wall.type!=='wall'||wall.visible===false||!Array.isArray(wall.start)||!Array.isArray(wall.end))continue
    const projected=segmentProjection(x,z,wall.start,wall.end)
    const thickness=Math.max(0.06,Number(wall.thickness??0.12))
    if(projected.distance>radius+thickness/2)continue
    const along=projected.t*projected.length
    if(isDoorGapPassable(scene,wall,along,openDoorIds,radius))continue
    return true
  }

  return itemBlocks(scene,x,z,radius)
}

export function resolveWalkthroughMove(
  scene:SceneGraph,
  current:XZ,
  desired:XZ,
  openDoorIds:Set<string>=new Set(),
  radius=WALKTHROUGH_PLAYER_RADIUS,
):XZ{
  const dx=desired.x-current.x,dz=desired.z-current.z
  const distance=Math.hypot(dx,dz)
  const steps=Math.max(1,Math.ceil(distance/0.065))
  const sx=dx/steps,sz=dz/steps
  let x=current.x,z=current.z
  for(let i=0;i<steps;i++){
    const nextX=x+sx
    if(!isWalkthroughPositionBlocked(scene,nextX,z,openDoorIds,radius))x=nextX
    const nextZ=z+sz
    if(!isWalkthroughPositionBlocked(scene,x,nextZ,openDoorIds,radius))z=nextZ
  }
  return {x,z}
}

export function resolveWalkthroughSpawn(scene:SceneGraph){
  const spawn:any=Object.values(scene.nodes).find((node:any)=>node.type==='spawn'&&node.visible!==true)
    ??Object.values(scene.nodes).find((node:any)=>node.type==='spawn')
  if(spawn){
    return {
      x:Number(spawn.position?.[0]??0),
      z:Number(spawn.position?.[2]??0),
      eyeY:Number(spawn.position?.[1]??0)+WALKTHROUGH_EYE_HEIGHT,
      yaw:Number(spawn.rotation??0),
    }
  }
  return {x:0,z:0.6,eyeY:WALKTHROUGH_EYE_HEIGHT,yaw:Math.PI/2}
}

export function doorWorldXZ(scene:SceneGraph,door:SceneNode):XZ|null{
  const wall:any=door.parentId?scene.nodes[door.parentId]:null
  if(wall?.type!=='wall'||!Array.isArray(wall.start)||!Array.isArray(wall.end))return null
  const vx=wall.end[0]-wall.start[0],vz=wall.end[1]-wall.start[1]
  const length=Math.hypot(vx,vz)
  if(length<1e-9)return null
  const distance=Number(door.position?.[0]??0)
  return {x:wall.start[0]+vx/length*distance,z:wall.start[1]+vz/length*distance}
}

export function findWalkthroughDoorTarget(scene:SceneGraph,position:XZ,yaw:number,maxDistance=WALKTHROUGH_DOOR_DISTANCE){
  const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)}
  let best:{id:string;distance:number}|null=null
  for(const node of Object.values(scene.nodes) as SceneNode[]){
    if(node.type!=='door'||node.visible===false||node.openingKind==='opening')continue
    const center=doorWorldXZ(scene,node)
    if(!center)continue
    const dx=center.x-position.x,dz=center.z-position.z
    const distance=Math.hypot(dx,dz)
    if(distance<0.05||distance>maxDistance)continue
    const dot=(dx/distance)*forward.x+(dz/distance)*forward.z
    if(dot<0.78)continue
    const lateral=Math.abs(dx*forward.z-dz*forward.x)
    if(lateral>0.9)continue
    if(!best||distance<best.distance)best={id:node.id,distance}
  }
  return best?.id??null
}
