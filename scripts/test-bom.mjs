import fs from 'node:fs'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import os from 'node:os'
import path from 'node:path'
const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const src=fs.readFileSync('lib/bom/tools.ts','utf8')
const out=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const tmp=path.join(os.tmpdir(),`dreamhouse-bom-${Date.now()}.mjs`);fs.writeFileSync(tmp,out)
const mod=await import(pathToFileURL(tmp).href)
const scene={rootNodeIds:['site'],nodes:{
 site:{id:'site',type:'site'},level:{id:'level',type:'level'},
 slab:{id:'slab',type:'slab',name:'Floor',polygon:[[0,0],[4,0],[4,3],[0,3]],thickness:.08},
 wall:{id:'wall',type:'wall',name:'Wall',start:[0,0],end:[4,0],height:2.8,thickness:.12,children:['door'],metadata:{structural_type:'partition'}},
 door:{id:'door',type:'door',name:'Door',parentId:'wall',width:1,height:2.1},
 room:{id:'room',type:'zone',name:'卧室',polygon:[[0,0],[4,0],[4,3],[0,3]]},
 bed:{id:'bed',type:'item',name:'Bed',position:[2,0,2],scale:[1,1,1],asset:{category:'furniture',dimensions:[2,1,2]},metadata:{room_id:'room'}}
}}
const design={id:'d1',version:3,label:'Design V3',status:'approved',scenario:'single',scene,furnitureOverrides:{},createdAt:new Date().toISOString()}
const m=mod.calculateWallQuantity(scene,scene.nodes.wall)
if(m.length!==4)throw new Error(`wall length ${m.length}`)
if(Math.abs(m.netArea-9.1)>.001)throw new Error(`wall net area ${m.netArea}`)
const doc=mod.validateBom(mod.createBomDraft({design}))
if(!doc.validation.valid)throw new Error(JSON.stringify(doc.validation))
if(doc.geometrySummary.floorArea!==12)throw new Error(`floor area ${doc.geometrySummary.floorArea}`)
if(!doc.items.some(x=>x.componentCode==='W-wall'))throw new Error('wall design BOM missing')
if(!doc.items.some(x=>x.componentCode==='WM-wall'))throw new Error('wall manufacturing BOM missing')
if(!doc.items.some(x=>x.sourceNodeId==='bed'))throw new Error('furniture BOM missing')
console.log(`Detailed BOM logic: PASS · ${doc.items.length} lines · floor ${doc.geometrySummary.floorArea}㎡ · wall net ${doc.geometrySummary.netWallArea}㎡`)
fs.unlinkSync(tmp)
