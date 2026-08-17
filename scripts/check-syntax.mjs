import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let ts
try { ts = require('typescript') } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript') }

const files=[]
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const file=`${dir}/${name}`
    const stat=fs.statSync(file)
    if(stat.isDirectory())walk(file)
    else if(/\.tsx?$/.test(file))files.push(file)
  }
}
for(const dir of ['app','components','lib'])walk(dir)
let errors=0
for(const file of files){
  const source=fs.readFileSync(file,'utf8')
  const result=ts.transpileModule(source,{
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
    fileName:file,
    reportDiagnostics:true,
  })
  for(const diagnostic of result.diagnostics??[]){
    if(diagnostic.category!==ts.DiagnosticCategory.Error)continue
    errors++
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n')}`)
  }
}
console.log(`TS/TSX syntax: ${errors===0?'PASS':'FAIL'} (${files.length} files, ${errors} errors)`)
if(errors)process.exit(1)
