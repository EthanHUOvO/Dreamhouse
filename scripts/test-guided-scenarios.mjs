import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamhouse-guided-test-'))
function transpile(name){
  const src=`lib/${name}.ts`,out=path.join(tmp,`${name}.js`)
  const result=ts.transpileModule(fs.readFileSync(src,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:src})
  fs.writeFileSync(out,result.outputText)
}
for(const name of ['house-scene','scenarios'])transpile(name)
const {createScenarioScene}=require(path.join(tmp,'scenarios.js'))
function assert(ok,msg){if(!ok)throw new Error(msg)}

const male=createScenarioScene('single')
assert(male.nodes.zone_gaming?.name==='电竞房','Single male should keep gaming room')
assert(male.nodes.zone_study?.name==='书房','Single male should keep single study')

const female=createScenarioScene('single_female')
assert(female.nodes.zone_gaming?.name==='衣帽间','Single female should use dressing room')
assert(female.nodes.zone_study?.name==='书房','Single female must keep single study')
assert(female.nodes.item_study_table,'Single female study furniture missing')
assert(female.nodes.item_single_dress_closet_1,'Single female dressing furniture missing')
assert(!female.nodes.item_shared_table_1,'Single female must not use shared-study furniture')

const couple=createScenarioScene('couple')
assert(couple.nodes.zone_gaming?.name==='衣帽间','Couple should use dressing room')
assert(couple.nodes.zone_study?.name==='双人书房','Couple should use shared study')

const child=createScenarioScene('child')
assert(child.nodes.zone_gaming?.name==='儿童房','Three-person child plan should use child room')
assert(child.nodes.zone_master_bath && child.nodes.zone_public_bath,'Child plan should split bathrooms')

const nanny=createScenarioScene('nanny')
assert(nanny.nodes.zone_study?.name==='保姆房','Nanny plan should use nanny room')
assert(nanny.nodes.zone_gaming?.name==='儿童房','Nanny plan should retain child room')

const ui=fs.readFileSync('components/customer/CustomerDesign.tsx','utf8')
for(const token of ['请选择居住人数','单身贵族','双人世界','三口之家','请选择居住者','男士','女士','育儿家庭方案','育儿 + 保姆方案','生成并应用方案'])assert(ui.includes(token),`Guided UI missing: ${token}`)
console.log('Guided household selection: PASS')
console.log('1 person: male -> gaming room; female -> dressing room + single study')
console.log('2 people: existing couple plan')
console.log('3-person family: child plan / child + nanny plan')
