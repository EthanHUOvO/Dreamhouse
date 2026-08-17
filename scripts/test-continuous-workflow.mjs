import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let ts
try { ts = require('typescript') } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript') }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamhouse-flow-test-'))

function transpile(name) {
  const src=`lib/${name}.ts`, out=path.join(tmp,`${name}.js`)
  const result=ts.transpileModule(fs.readFileSync(src,'utf8'),{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:src,
  })
  fs.writeFileSync(out,result.outputText)
}
for(const name of ['house-scene','scenarios','downstream','demo-orders','furniture-edit','order-store'])transpile(name)

const { createDemoOrders }=require(path.join(tmp,'demo-orders.js'))
const { moveFurniture }=require(path.join(tmp,'furniture-edit.js'))
const { createRedesign,updateDraftScenario,updateEditableScene,submitChange,acceptChange }=require(path.join(tmp,'order-store.js'))

function assert(ok,msg){if(!ok)throw new Error(msg)}
let order=createDemoOrders()[0]
const originalApproved=order.approvedVersion
order=createRedesign(order)
assert(order.draftVersionId,'Draft was not created')
const draftId=order.draftVersionId
order=updateDraftScenario(order,'replan','空间重新规划方案')
let draft=order.designVersions.find(v=>v.id===draftId)
assert(draft?.scenario==='replan','Fixed scheme did not save to draft')

const bedBefore=draft.scene.nodes.item_master_bed.position[0]
const adjustedScene=moveFurniture(draft.scene,'item_master_bed',0.15,0)
order=updateEditableScene(order,adjustedScene)
draft=order.designVersions.find(v=>v.id===draftId)
assert(Math.abs(draft.scene.nodes.item_master_bed.position[0]-(bedBefore+0.15))<1e-9,'Furniture edit did not save to draft')

order=submitChange(order)
assert(order.changeRequest?.status==='submitted','Change request was not submitted')
assert(order.approvedVersion===originalApproved,'Submitted draft incorrectly overwrote approved design')

order=acceptChange(order)
assert(order.approvedVersion===draft.version,'Accepted draft was not promoted')
assert(order.downstreamVersion===draft.version,'Approved version was not synchronized downstream')
assert(order.status==='production','Accepted change did not return order to production')
assert(order.productionProgress===0 && order.constructionProgress===0,'Downstream progress was not reset for new design')
assert(!order.draftVersionId,'Draft was not cleared after acceptance')
const wallQty=order.bom.find(x=>x.category==='wall')?.quantity
const furnitureQty=order.bom.find(x=>x.category==='furniture')?.quantity
const expectedWalls=Object.values(draft.scene.nodes).filter(n=>n.type==='wall').length
const expectedFurniture=Object.values(draft.scene.nodes).filter(n=>n.type==='item').length
assert(wallQty===expectedWalls,`BOM wall count mismatch: ${wallQty} vs ${expectedWalls}`)
assert(furnitureQty===expectedFurniture,`BOM furniture count mismatch: ${furnitureQty} vs ${expectedFurniture}`)

console.log('Continuous design workflow: PASS')
console.log(`Approved V${originalApproved} -> Draft V${draft.version} -> Submitted -> Accepted -> Production`)
console.log(`BOM regenerated from approved Scene: walls=${wallQty}, furniture=${furnitureQty}`)
