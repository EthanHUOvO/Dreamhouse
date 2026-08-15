'use client'
import { useViewer } from '@pascal-app/editor'

export default function DesignControls(){
  const setShading=useViewer(s=>s.setShading)
  const setTextures=useViewer(s=>s.setTextures)
  const setColorPreset=useViewer(s=>s.setColorPreset)
  const setWallMode=useViewer(s=>s.setWallMode)
  const setShowZones=useViewer(s=>s.setShowZones)
  const setCameraMode=useViewer(s=>s.setCameraMode)

  function renderMode(){setShading('rendered');setTextures(true);setColorPreset('white');setWallMode('cutaway');setShowZones(false)}
  function semanticMode(){setShading('solid');setTextures(false);setColorPreset('white');setWallMode('cutaway');setShowZones(true)}
  function structureMode(){setShading('solid');setTextures(false);setColorPreset('blueprint');setWallMode('translucent');setShowZones(false)}

  return <div className="design-controls">
    <button onClick={renderMode}>Render</button><button onClick={semanticMode}>Semantic</button><button onClick={structureMode}>Structure</button>
    <button onClick={()=>setCameraMode('perspective')}>透视</button><button onClick={()=>setCameraMode('orthographic')}>正交</button>
  </div>
}
