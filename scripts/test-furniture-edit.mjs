import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let ts
try { ts = require('typescript') } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript') }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamhouse-furniture-test-'))

function transpile(src, out) {
  const code = fs.readFileSync(src, 'utf8')
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: src,
  })
  fs.writeFileSync(out, result.outputText)
}

transpile('lib/house-scene.ts', path.join(tmp, 'house-scene.js'))
transpile('lib/furniture-edit.ts', path.join(tmp, 'furniture-edit.js'))

const { createInitialHouseScene } = require(path.join(tmp, 'house-scene.js'))
const { moveFurniture, rotateFurniture, placeFurniture } = require(path.join(tmp, 'furniture-edit.js'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const scene = createInitialHouseScene()
const bed = scene.nodes.item_master_bed
assert(bed.position[0] === -4.15, `Unexpected bed X: ${bed.position[0]}`)
assert(bed.position[1] === 0, `Unexpected bed Y: ${bed.position[1]}`)

const moved = moveFurniture(scene, 'item_master_bed', 0.15, 0)
assert(Math.abs(moved.nodes.item_master_bed.position[0] - (-4.0)) < 1e-9, 'Right nudge failed')
assert(moved.nodes.item_master_bed.position[1] === bed.position[1], 'Furniture height changed during nudge')
assert(scene.nodes.item_master_bed.position[0] === -4.15, 'Original scene was mutated')

const rotated = rotateFurniture(scene, 'item_master_bed', 15)
const beforeDeg = scene.nodes.item_master_bed.rotation[1] * 180 / Math.PI
const afterDeg = rotated.nodes.item_master_bed.rotation[1] * 180 / Math.PI
assert(Math.abs(beforeDeg - (-90)) < 1e-8, `Unexpected initial rotation: ${beforeDeg}`)
assert(Math.abs(afterDeg - (-75)) < 1e-8, `Rotate +15 failed: ${afterDeg}`)

const dragged = placeFurniture(scene, 'item_master_bed', 999, 999)
const p = dragged.nodes.item_master_bed.position
assert(p[1] === bed.position[1], 'Furniture height changed during drag commit')
assert(p[0] < 0 && p[2] <= 4.22, `Room-bound clamp failed: ${p}`)

const shower = scene.nodes.item_bath_shower
assert(shower.position[0] === -1.15 && shower.position[2] === 3.78, `Bathroom shower position changed: ${shower.position}`)

console.log('Furniture edit logic: PASS')
console.log(`Bed nudge: X ${bed.position[0].toFixed(2)} -> ${moved.nodes.item_master_bed.position[0].toFixed(2)}; Y locked at ${bed.position[1].toFixed(2)}`)
console.log(`Bed rotation: ${beforeDeg.toFixed(0)}° -> ${afterDeg.toFixed(0)}°`)
console.log(`Drag clamp result: X ${p[0].toFixed(2)}, Z ${p[2].toFixed(2)}`)
console.log(`Bathroom shower: X ${shower.position[0].toFixed(2)}, Z ${shower.position[2].toFixed(2)}`)
