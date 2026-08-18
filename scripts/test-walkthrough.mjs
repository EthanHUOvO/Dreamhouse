import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamhouse-walkthrough-v8-'))
function transpile(src,out){
  const result=ts.transpileModule(fs.readFileSync(src,'utf8'),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
    fileName:src,
  })
  fs.writeFileSync(out,result.outputText)
}
transpile('lib/house-scene.ts',path.join(tmp,'house-scene.js'))
transpile('lib/walkthrough-runtime.ts',path.join(tmp,'walkthrough-runtime.js'))
const {createInitialHouseScene}=require(path.join(tmp,'house-scene.js'))
const runtime=require(path.join(tmp,'walkthrough-runtime.js'))
function assert(ok,msg){if(!ok)throw new Error(msg)}
function near(a,b,eps=.035){return Math.abs(a-b)<=eps}

const scene=createInitialHouseScene()
const spawn=runtime.resolveWalkthroughSpawn(scene)
assert(near(spawn.x,5.15,.001)&&near(spawn.z,.60,.001),`Unexpected spawn: ${JSON.stringify(spawn)}`)
assert(near(spawn.eyeY,1.65,.001),'Eye height must be 1.65m')
assert(!runtime.isWalkthroughPositionBlocked(scene,spawn.x,spawn.z,new Set()),'Indoor spawn is blocked')

// Corridor movement must work immediately after entering walkthrough.
const corridor=runtime.resolveWalkthroughMove(scene,{x:5.15,z:.60},{x:3.50,z:.60},new Set())
assert(near(corridor.x,3.50),'Player cannot move inside corridor')

// Closed door blocks, opened door creates a passable gap in the wall.
const beforeDoor={x:-3.8,z:.75}
const closed=runtime.resolveWalkthroughMove(scene,beforeDoor,{x:-3.8,z:1.65},new Set())
assert(closed.z<1.05,`Closed master door did not block player: ${closed.z}`)
const opened=runtime.resolveWalkthroughMove(scene,beforeDoor,{x:-3.8,z:1.65},new Set(['door_master']))
assert(opened.z>1.55,`Open master door did not allow passage: ${opened.z}`)

// Door targeting uses the player's actual facing direction, not the isometric camera.
const target=runtime.findWalkthroughDoorTarget(scene,{x:-3.8,z:.55},Math.PI)
assert(target==='door_master',`Expected door_master target, got ${target}`)

const viewer=fs.readFileSync('components/shared/PascalViewer.tsx','utf8')
const controller=fs.readFileSync('components/shared/PascalWalkthroughController.tsx','utf8')
for(const token of [
  "import PascalWalkthroughController from '@/components/shared/PascalWalkthroughController'",
  'selectionManager="custom"',
  '!walkthroughMode && (',
  '<PascalWalkthroughController',
  'onReadyChange={setWalkthroughReady}',
  "viewer.setWallMode('up')",
  '已经进入住宅内部',
])assert(viewer.includes(token),`Viewer walkthrough integration missing: ${token}`)
for(const token of [
  'camera.position.set(spawn.x,spawn.eyeY,spawn.z)',
  "camera.rotation.set(0,spawn.yaw,0,'YXZ')",
  'useFrame((_,rawDelta)=>',
  'resolveWalkthroughMove(',
  'requestPointerLock',
  'KeyW','KeyA','KeyS','KeyD','KeyE',
  'setDoorOpen(',
  'swingAngle:open?Math.PI/2:0',
])assert(controller.includes(token),`Headless walkthrough controller missing: ${token}`)
assert(!viewer.includes('<FirstPersonControls />'),'Old Editor-bound FirstPersonControls is still mounted')
assert(!viewer.includes('<WalkthroughLifecycleBridge'),'Old duplicate lifecycle bridge is still mounted')

console.log('Pascal headless walkthrough runtime: PASS')
console.log(`Indoor spawn: X ${spawn.x.toFixed(2)}, eyeY ${spawn.eyeY.toFixed(2)}, Z ${spawn.z.toFixed(2)}`)
console.log(`Corridor move: X 5.15 -> ${corridor.x.toFixed(2)}`)
console.log(`Closed door stop Z: ${closed.z.toFixed(2)}; opened door pass Z: ${opened.z.toFixed(2)}`)
console.log('Camera switch, WASD, mouse-look/pointer-lock, collision and door open/close paths are wired.')
