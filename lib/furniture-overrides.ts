import type { FurnitureOverrideMap, SceneGraph } from './types'

function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value))}

function asVec3(value:unknown, fallback:[number,number,number]):[number,number,number]{
  if(!Array.isArray(value)||value.length<3)return [...fallback]
  return [Number(value[0]??fallback[0]),Number(value[1]??fallback[1]),Number(value[2]??fallback[2])]
}

/**
 * Merge the current visible furniture transforms into the persistent override map.
 * Items from other scenarios are intentionally retained so switching away and back
 * restores the user's previous arrangement for that scenario.
 */
export function captureFurnitureOverrides(
  scene:SceneGraph,
  existing:FurnitureOverrideMap={}
):FurnitureOverrideMap{
  const next:FurnitureOverrideMap=clone(existing)
  for(const node of Object.values(scene.nodes)){
    if(node.type!=='item')continue
    const current=next[node.id]
    next[node.id]={
      position:asVec3(node.position,current?.position??[0,0,0]),
      rotation:asVec3(node.rotation,current?.rotation??[0,0,0]),
    }
  }
  return next
}

/** Apply user transforms after a preset scene has been generated. */
export function applyFurnitureOverridesToScene(
  scene:SceneGraph,
  overrides:FurnitureOverrideMap|undefined
):SceneGraph{
  if(!overrides||Object.keys(overrides).length===0)return clone(scene)
  const next=clone(scene)
  for(const [itemId,override] of Object.entries(overrides)){
    const node=next.nodes[itemId]
    if(!node||node.type!=='item')continue
    node.position=[...override.position]
    node.rotation=[...override.rotation]
  }
  return next
}
