import type { SceneGraph } from './types'

export const FURNITURE_MOVE_STEP = 0.15
// Furniture controls use quarter turns so layouts remain easy to align with walls.
export const FURNITURE_ROTATE_STEP_DEG = 90
export function cloneScene<T>(value:T):T{return JSON.parse(JSON.stringify(value))}
export function clampValue(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}
export function getFurnitureBounds(scene:SceneGraph,itemId:string){
  const item:any=scene.nodes[itemId]
  const roomId=item?.metadata?.room_id
  const zone:any=roomId?scene.nodes[roomId]:null
  const polygon:[number,number][]|undefined=zone?.polygon
  if(!polygon?.length)return{minX:-5.7,maxX:5.7,minZ:-4.2,maxZ:4.2}
  const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1])
  return{minX:Math.min(...xs)+.28,maxX:Math.max(...xs)-.28,minZ:Math.min(...zs)+.28,maxZ:Math.max(...zs)-.28}
}
export function moveFurniture(scene:SceneGraph,itemId:string,dx:number,dz:number){
  const current:any=scene.nodes[itemId];if(!current?.position)return scene
  const next=cloneScene(scene),node:any=next.nodes[itemId],b=getFurnitureBounds(next,itemId)
  const x=Number(node.position?.[0]??0),y=Number(node.position?.[1]??0),z=Number(node.position?.[2]??0)
  node.position=[clampValue(x+dx,b.minX,b.maxX),y,clampValue(z+dz,b.minZ,b.maxZ)]
  return next
}
export function rotateFurniture(scene:SceneGraph,itemId:string,deltaDegrees:number){
  const current:any=scene.nodes[itemId];if(!current)return scene
  const next=cloneScene(scene),node:any=next.nodes[itemId],r=Number(node.rotation?.[1]??0)
  node.rotation=[0,r+(deltaDegrees*Math.PI)/180,0]
  return next
}
export function placeFurniture(scene:SceneGraph,itemId:string,x:number,z:number){
  const current:any=scene.nodes[itemId];if(!current?.position)return scene
  const next=cloneScene(scene),node:any=next.nodes[itemId],b=getFurnitureBounds(next,itemId),y=Number(node.position?.[1]??0)
  node.position=[clampValue(x,b.minX,b.maxX),y,clampValue(z,b.minZ,b.maxZ)]
  return next
}
