'use client'

import { useEffect,useState } from 'react'
import { loadPlugin } from '@pascal-app/core'
import { Editor } from '@pascal-app/editor'
import { builtinPlugin } from '@pascal-app/nodes'
import { loadScene, saveScene } from '@/lib/client-store'

const pluginReady=loadPlugin(builtinPlugin)

export default function PascalWorkspace({revision}:{revision:number}){
  const[ready,setReady]=useState(false)
  useEffect(()=>{void pluginReady.then(()=>setReady(true))},[])
  if(!ready)return <div className="pascal-loading"><span/>正在加载 Pascal 建筑编辑器…</div>

  return <div className="pascal-wrap" key={revision}>
    <Editor
      projectId="HOUSE_001"
      layoutVersion="v2"
      onLoad={async()=>loadScene() as any}
      onSave={async(scene)=>saveScene(scene as any)}
      onDirty={()=>{}}
    />
  </div>
}
