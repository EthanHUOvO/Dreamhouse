import fs from 'node:fs/promises'
import path from 'node:path'
import type { SceneGraph } from './types'
import { createBaseHouseScene } from './base-house'

const houseDir = path.join(process.cwd(),'data','house_001')
const currentFile = path.join(houseDir,'current-scene.json')
const versionsDir = path.join(houseDir,'versions')

async function ensureStore(){
  await fs.mkdir(versionsDir,{recursive:true})
  try { await fs.access(currentFile) }
  catch { await fs.writeFile(currentFile, JSON.stringify(createBaseHouseScene(),null,2),'utf8') }
}

export async function loadCurrentScene(): Promise<SceneGraph>{
  await ensureStore(); return JSON.parse(await fs.readFile(currentFile,'utf8')) as SceneGraph
}

export async function saveCurrentScene(scene:SceneGraph, reason='manual'){
  await ensureStore()
  const stamp = new Date().toISOString().replace(/[:.]/g,'-')
  const versionId = `${stamp}_${reason.replace(/[^a-zA-Z0-9_-]+/g,'_')}`
  await fs.writeFile(currentFile,JSON.stringify(scene,null,2),'utf8')
  await fs.writeFile(path.join(versionsDir,`${versionId}.json`),JSON.stringify(scene,null,2),'utf8')
  return versionId
}

export async function resetHouse(){ const scene=createBaseHouseScene(); await saveCurrentScene(scene,'reset'); return scene }
export async function listVersions(){
  await ensureStore(); const names=(await fs.readdir(versionsDir)).filter(x=>x.endsWith('.json')).sort().reverse()
  return names.map(name=>({id:name.replace(/\.json$/,''),file:name}))
}
