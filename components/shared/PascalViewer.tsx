'use client'

import { useEffect,useRef,useState } from 'react'
import { loadPlugin } from '@pascal-app/core'
import { applySceneSnapshot } from '@pascal-app/editor'
import { Viewer,useViewer } from '@pascal-app/viewer'
import { builtinPlugin } from '@pascal-app/nodes'
import { CameraControls } from '@react-three/drei'
import type { SceneGraph } from '@/lib/types'

const pluginReady=loadPlugin(builtinPlugin)

function CameraRig({revision}:{revision:number}){
  const controls=useRef<any>(null)
  useEffect(()=>{requestAnimationFrame(()=>controls.current?.setLookAt(10.6,9.0,11.8,0,0.75,0,true))},[revision])
  return <CameraControls ref={controls} makeDefault minDistance={6} maxDistance={26} dollySpeed={0.55} truckSpeed={0.65}/>
}

export default function PascalViewer({scene,revision}:{scene:SceneGraph;revision:number}){
  const[ready,setReady]=useState(false)
  useEffect(()=>{
    let disposed=false
    void pluginReady.then(()=>{
      if(disposed)return
      applySceneSnapshot(scene as any,{origin:'load'})
      const v=useViewer.getState(),mobile=typeof window!=='undefined'&&window.innerWidth<800
      v.setRenderContext('viewer');v.setCameraMode('perspective');v.setWallMode('cutaway');v.setLevelMode('stacked')
      v.setShowZones(false);v.setShowGrid(false);v.setShowMeasurements(false);v.setShowGuides(false);v.setShowScans(false)
      v.setShading(mobile?'solid':'rendered');v.setTextures(true);v.setShadows(!mobile);v.setEdges(mobile?'off':'soft')
      setReady(true)
    })
    return()=>{disposed=true}
  },[scene,revision])
  if(!ready)return <div className="viewer-loading">正在加载住宅模型…</div>
  return <div className="pascal-viewer"><Viewer selectionManager="custom"><CameraRig revision={revision}/></Viewer></div>
}
