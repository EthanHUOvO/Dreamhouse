'use client'

import { useEffect,useRef,useState } from 'react'
import { loadPlugin } from '@pascal-app/core'
import { applySceneSnapshot } from '@pascal-app/editor'
import { Viewer,useViewer } from '@pascal-app/viewer'
import { builtinPlugin } from '@pascal-app/nodes'
import { CameraControls } from '@react-three/drei'
import { loadScene } from '@/lib/client-store'

const pluginReady=loadPlugin(builtinPlugin)

function CameraRig({revision}:{revision:number}){
  const controls=useRef<any>(null)
  useEffect(()=>{
    requestAnimationFrame(()=>{
      controls.current?.setLookAt(10.6,9.0,11.8,0,0.75,0,true)
    })
  },[revision])

  return <CameraControls
    ref={controls}
    makeDefault
    minDistance={6}
    maxDistance={26}
    dollySpeed={0.55}
    truckSpeed={0.65}
    azimuthRotateSpeed={0.65}
    polarRotateSpeed={0.65}
  />
}

export default function PascalViewer({revision}:{revision:number}){
  const[ready,setReady]=useState(false)

  useEffect(()=>{
    let disposed=false
    void pluginReady.then(()=>{
      if(disposed)return
      applySceneSnapshot(loadScene() as any,{origin:'load'})
      const viewer=useViewer.getState()
      viewer.setRenderContext('viewer')
      viewer.setCameraMode('perspective')
      viewer.setWallMode('cutaway')
      viewer.setLevelMode('stacked')
      viewer.setShowZones(false)
      viewer.setShowGrid(false)
      viewer.setShowMeasurements(false)
      viewer.setShowGuides(false)
      viewer.setShowScans(false)
      viewer.setShading('rendered')
      viewer.setTextures(true)
      viewer.setShadows(true)
      viewer.setEdges('soft')
      setReady(true)
    })
    return()=>{disposed=true}
  },[revision])

  if(!ready)return <div className="loading">正在加载 3D 展示…</div>

  return <div className="pascal-viewer">
    <Viewer selectionManager="custom">
      <CameraRig revision={revision}/>
    </Viewer>
  </div>
}
