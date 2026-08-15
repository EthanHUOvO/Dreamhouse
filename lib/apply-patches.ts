import type { SceneGraph, ScenePatch } from './types'
export function applyPatches(scene:SceneGraph,patches:ScenePatch[]):SceneGraph{
  const next:SceneGraph=JSON.parse(JSON.stringify(scene))
  const detach=(id:string,parentId?:string|null)=>{if(!parentId)return;const p=next.nodes[parentId];if(p?.children)p.children=p.children.filter(x=>x!==id)}
  const del=(id:string)=>{const n=next.nodes[id];if(!n)return;detach(id,n.parentId);for(const c of [...(n.children??[])])del(c);delete next.nodes[id]}
  for(const p of patches){
    if(p.op==='delete')del(p.id)
    else if(p.op==='update'){const old=next.nodes[p.id];if(old)next.nodes[p.id]={...old,...p.data}}
    else {const node={...p.node,parentId:p.parentId??p.node.parentId??null};next.nodes[node.id]=node;if(node.parentId){const parent=next.nodes[node.parentId];if(parent){parent.children=parent.children??[];if(!parent.children.includes(node.id))parent.children.push(node.id)}}}
  }
  return next
}
