import { createInitialHouseScene } from './house-scene'
import type { PipelineState, SceneGraph } from './types'

const SCENE_KEY='dreamhouse.whiteboard.scene.v1'
const PIPELINE_KEY='dreamhouse.whiteboard.pipeline.v1'

export const initialPipeline:PipelineState={
  approved:false,
  approvedVersion:'',
  bom:[],
  inventory:[],
  construction:[],
  printerProgress:0,
  robotProgress:0,
  accepted:false
}

export function loadScene():SceneGraph{
  if(typeof window==='undefined')return createInitialHouseScene()
  try{
    const raw=localStorage.getItem(SCENE_KEY)
    if(raw)return JSON.parse(raw)
  }catch{}
  const scene=createInitialHouseScene()
  saveScene(scene)
  return scene
}

export function saveScene(scene:SceneGraph){
  if(typeof window==='undefined')return
  localStorage.setItem(SCENE_KEY,JSON.stringify(scene))
}

export function loadPipeline():PipelineState{
  if(typeof window==='undefined')return initialPipeline
  try{
    const raw=localStorage.getItem(PIPELINE_KEY)
    if(raw)return JSON.parse(raw)
  }catch{}
  return initialPipeline
}

export function savePipeline(state:PipelineState){
  if(typeof window==='undefined')return
  localStorage.setItem(PIPELINE_KEY,JSON.stringify(state))
}

export function resetAll(){
  if(typeof window==='undefined')return
  localStorage.removeItem(SCENE_KEY)
  localStorage.removeItem(PIPELINE_KEY)
}
