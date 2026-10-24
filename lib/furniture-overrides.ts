import type { FurnitureOverrides, SceneGraph } from './types'
import { cloneScene } from './furniture-edit'

export function captureFurnitureOverrides(scene:SceneGraph,existing:FurnitureOverrides={}):FurnitureOverrides{
  const next={...existing}
  for(const node of Object.values(scene.nodes) as any[]){
    if(node.type!=='item')continue
    next[node.id]={
      position:Array.isArray(node.position)?[...node.position] as [number,number,number]:undefined,
      rotation:Array.isArray(node.rotation)?[...node.rotation] as [number,number,number]:undefined,
      scale:Array.isArray(node.scale)?[...node.scale] as [number,number,number]:undefined,
    }
  }
  return next
}
export function applyFurnitureOverrides(scene:SceneGraph,overrides:FurnitureOverrides={}):SceneGraph{
  const next=cloneScene(scene)
  for(const [id,override] of Object.entries(overrides)){
    const node:any=next.nodes[id]
    if(!node||node.type!=='item')continue
    if(override.position)node.position=[...override.position]
    if(override.rotation)node.rotation=[...override.rotation]
    if(override.scale)node.scale=[...override.scale]
  }
  return next
}
