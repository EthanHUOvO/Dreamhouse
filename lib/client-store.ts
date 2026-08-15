import { createInitialHouseScene } from './house-scene'
import type { SceneGraph, ScenarioType } from './types'

const CURRENT='dreamhouse.v2.current'
const VERSIONS='dreamhouse.v2.versions'

export function loadScene():SceneGraph{
  if(typeof window==='undefined')return createInitialHouseScene()
  try{
    const raw=localStorage.getItem(CURRENT)
    if(raw)return JSON.parse(raw) as SceneGraph
  }catch{}
  const scene=createInitialHouseScene();saveScene(scene);return scene
}

export function saveScene(scene:SceneGraph){
  if(typeof window==='undefined')return
  localStorage.setItem(CURRENT,JSON.stringify(scene))
}

export function saveVersion(scene:SceneGraph,label:string,scenario?:ScenarioType){
  if(typeof window==='undefined')return
  let versions:any[]=[]
  try{versions=JSON.parse(localStorage.getItem(VERSIONS)||'[]')}catch{}
  versions.unshift({id:`v_${Date.now()}`,label,scenario,createdAt:new Date().toISOString(),scene})
  localStorage.setItem(VERSIONS,JSON.stringify(versions.slice(0,20)))
  saveScene(scene)
}

export function listVersions(){
  if(typeof window==='undefined')return []
  try{return JSON.parse(localStorage.getItem(VERSIONS)||'[]')}catch{return []}
}

export function clearAll(){
  if(typeof window==='undefined')return
  localStorage.removeItem(CURRENT);localStorage.removeItem(VERSIONS)
}
