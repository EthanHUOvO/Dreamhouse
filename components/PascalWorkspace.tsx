'use client'
import { useEffect,useState } from 'react'
import { loadPlugin } from '@pascal-app/core'
import { Editor } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
const pluginReady=loadPlugin(builtinPlugin)
export default function PascalWorkspace({reloadKey}:{reloadKey:number}){
  const[ready,setReady]=useState(false);useEffect(()=>{void pluginReady.then(()=>setReady(true))},[])
  if(!ready)return <div className="pascal-loading">正在加载 Pascal 建筑编辑器…</div>
  return <div className="pascal-wrap" key={reloadKey}><Editor projectId="HOUSE_001" layoutVersion="v2"
    onLoad={async()=>{const r=await fetch('/api/scene',{cache:'no-store'});if(!r.ok)throw new Error('无法加载 HOUSE_001');return await r.json()}}
    onSave={async(scene)=>{await fetch('/api/scene',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(scene)})}}
    onDirty={()=>{}} disablePostFx={false}/></div>
}
