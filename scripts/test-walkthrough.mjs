import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamhouse-walkthrough-test-'))
function transpile(src,out){
  const result=ts.transpileModule(fs.readFileSync(src,'utf8'),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
    fileName:src,
  })
  fs.writeFileSync(out,result.outputText)
}
transpile('lib/house-scene.ts',path.join(tmp,'house-scene.js'))
const {createInitialHouseScene}=require(path.join(tmp,'house-scene.js'))
function assert(ok,msg){if(!ok)throw new Error(msg)}

const scene=createInitialHouseScene()
const spawn=scene.nodes.spawn_walkthrough
assert(spawn,'Walkthrough spawn node missing')
assert(spawn.type==='spawn',`Unexpected spawn type: ${spawn.type}`)
assert(spawn.parentId==='level_ground',`Unexpected spawn parent: ${spawn.parentId}`)
assert(spawn.visible===false,'Spawn marker should be hidden in normal presentation')
assert(spawn.position[0]===5.15 && spawn.position[1]===0 && spawn.position[2]===0.60,`Unexpected spawn position: ${spawn.position}`)
assert(Math.abs(spawn.rotation-Math.PI/2)<1e-10,`Unexpected spawn rotation: ${spawn.rotation}`)
assert(scene.nodes.level_ground.children.includes('spawn_walkthrough'),'Level does not own walkthrough spawn')

const doors=Object.values(scene.nodes).filter(node=>node.type==='door')
assert(doors.length>=5,`Expected at least five doors, got ${doors.length}`)
for(const door of doors){
  assert(door.openingKind==='door',`${door.id} is not a real door opening`)
  assert(door.width>0.7,`${door.id} width invalid`)
  assert(door.doorType==='hinged',`${door.id} should be hinged for walkthrough interaction`)
  assert(typeof door.swingAngle==='number',`${door.id} has no swing angle`)
  assert(door.swingAngle===0,`${door.id} should start closed for walkthrough: ${door.swingAngle}`)
}

const viewer=fs.readFileSync('components/shared/PascalViewer.tsx','utf8')
for(const token of [
  "import { applySceneSnapshot, FirstPersonControls } from '@pascal-app/editor'",
  "import { InteractiveSystem, Viewer, useViewer } from '@pascal-app/viewer'",
  'maxFps={walkthroughMode ? 60 : 50}',
  "selectionManager={walkthroughMode ? 'default' : 'custom'}",
  '<FirstPersonControls />',
  '<InteractiveSystem />',
  "viewer.setWallMode('up')",
  'viewer.setWalkthroughMode(true)',
  'document.pointerLockElement',
  '左键 / E 开关门',
]) assert(viewer.includes(token),`Walkthrough source missing: ${token}`)

const design=fs.readFileSync('components/customer/CustomerDesign.tsx','utf8')
for(const token of ['进入漫游','退出漫游','toggleWalkthrough','walkthroughMode={walkthroughMode}','setFurnitureEditMode(false)'])assert(design.includes(token),`Customer walkthrough control missing: ${token}`)

console.log('Pascal walkthrough integration: PASS')
console.log(`Spawn: X ${spawn.position[0].toFixed(2)}, Y ${spawn.position[1].toFixed(2)}, Z ${spawn.position[2].toFixed(2)}`)
console.log(`Interactive door-ready nodes: ${doors.length}`)
console.log('Controls wired: WASD/mouse via Pascal FirstPersonControls, pointer lock lifecycle, native door targeting/toggle path.')
