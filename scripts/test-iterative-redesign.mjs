import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamhouse-iterative-test-'))
function transpile(name){
  const src=`lib/${name}.ts`,out=path.join(tmp,`${name}.js`)
  const result=ts.transpileModule(fs.readFileSync(src,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:src})
  fs.writeFileSync(out,result.outputText)
}
for(const name of ['house-scene','scenarios','downstream','demo-orders','furniture-edit','order-store'])transpile(name)
const {createDemoOrders}=require(path.join(tmp,'demo-orders.js'))
const {createRedesign,submitChange,withdrawChange,acceptChange}=require(path.join(tmp,'order-store.js'))
function assert(ok,msg){if(!ok)throw new Error(msg)}

const portal=fs.readFileSync('components/customer/CustomerPortal.tsx','utf8')
const construction=fs.readFileSync('components/customer/CustomerConstruction.tsx','utf8')
assert(construction.includes('重新设计'),'Construction page missing redesign button')
assert(construction.includes('继续修改 Design V'),'Construction page missing continue-draft button')
assert(construction.includes('撤回并继续修改'),'Construction page missing withdraw button')
assert(portal.includes("mutate(createRedesign);setView('design')"),'Portal does not return to design after creating redesign')

let order=createDemoOrders()[0]
const startApproved=order.approvedVersion
order=createRedesign(order)
let firstDraft=order.designVersions.find(v=>v.id===order.draftVersionId)
assert(firstDraft?.version===startApproved+1,`Expected Draft V${startApproved+1}`)
assert(order.approvedVersion===startApproved,'Creating a redesign overwrote the approved design')

order=submitChange(order)
assert(order.changeRequest?.status==='submitted','Draft was not submitted')
const submittedDraftId=order.draftVersionId
order=withdrawChange(order)
assert(order.changeRequest?.status==='draft','Submitted change was not withdrawn back to draft')
assert(order.draftVersionId===submittedDraftId,'Withdraw should continue editing the same draft')
assert(order.approvedVersion===startApproved,'Withdraw changed approved version')

order=submitChange(order)
order=acceptChange(order)
const acceptedVersion=order.approvedVersion
assert(acceptedVersion===firstDraft.version,'Accepted redesign did not become approved')
assert(!order.draftVersionId,'Accepted redesign did not clear draft')

order=createRedesign(order)
const secondDraft=order.designVersions.find(v=>v.id===order.draftVersionId)
assert(secondDraft?.version===acceptedVersion+1,'A second redesign cycle did not create the next version')
assert(order.approvedVersion===acceptedVersion,'Second redesign overwrote current approved version')

console.log('Iterative redesign workflow: PASS')
console.log(`Approved V${startApproved} -> Draft V${firstDraft.version} -> Submit -> Withdraw -> Resubmit -> Accept -> Draft V${secondDraft.version}`)
console.log('Approved versions remain protected until contractor acceptance.')
