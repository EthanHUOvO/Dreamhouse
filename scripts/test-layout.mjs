import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),cache=new Map()
function loadTs(rel){
  const file=path.resolve(root,rel.endsWith('.ts')?rel:`${rel}.ts`)
  if(cache.has(file))return cache.get(file).exports
  const source=fs.readFileSync(file,'utf8')
  const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:file}).outputText
  const mod={exports:{}};cache.set(file,mod)
  const localRequire=(id)=>{
    if(!id.startsWith('.'))return require(id)
    const resolved=path.resolve(path.dirname(file),id)
    for(const candidate of [resolved,resolved+'.ts',path.join(resolved,'index.ts')])if(fs.existsSync(candidate))return loadTs(path.relative(root,candidate))
    throw new Error(`Cannot resolve ${id} from ${file}`)
  }
  new Function('require','module','exports','__filename','__dirname',out)(localRequire,mod,mod.exports,file,path.dirname(file))
  return mod.exports
}
function assert(v,m){if(!v)throw new Error(m)}
const {createInitialHouseScene}=loadTs('lib/house-scene.ts')
const {getHouseConstraints,validateLayout,executeLayoutTool}=loadTs('lib/layout-tools.ts')
const {runMockLayoutAgent}=loadTs('lib/ai/mock-layout-agent.ts')
const base=createInitialHouseScene()
const lockedBefore=JSON.stringify(getHouseConstraints(base).walls.filter(w=>w.structuralType==='load_bearing'))
const design={id:'test',version:1,label:'Test',status:'draft',scenario:'single',scene:base,furnitureOverrides:{},createdAt:new Date().toISOString()}
const run=await runMockLayoutAgent({design,prompt:'把主卧搬到右下角，原主卧改成书房，卫生间保持不动。'})
assert(run.validation.valid,'Relocation layout must validate')
const zones=getHouseConstraints(run.scene).zones
assert(zones.find(z=>z.region==='右下')?.semantic==='master_bedroom','Master bedroom was not relocated to bottom-right')
assert(zones.find(z=>z.id==='zone_master')?.semantic==='study','Original master was not converted to study')
assert(JSON.stringify(getHouseConstraints(run.scene).walls.filter(w=>w.structuralType==='load_bearing'))===lockedBefore,'Load-bearing walls changed')
let merged=executeLayoutTool(base,'merge_rooms',{zoneIds:['zone_living','zone_study'],newFunction:'living_room',newName:'开放公共空间'})
assert(merged.ok&&validateLayout(merged.scene).valid,'Living/study merge failed')
assert(!merged.scene.nodes.wall_n_v,'Shared partition was not removed')
console.log('Interactive Layout Agent tests: PASS')
