import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
let ts
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=process.cwd(),files=[]
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name)&&!e.name.endsWith('.d.ts'))files.push(p)}}
walk(root)
let errors=0
for(const file of files){const text=fs.readFileSync(file,'utf8');const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve},reportDiagnostics:true,fileName:file});for(const d of result.diagnostics||[]){if(d.category===ts.DiagnosticCategory.Error){errors++;console.error(file,ts.flattenDiagnosticMessageText(d.messageText,' '))}}}
console.log(`TS/TSX syntax checked: ${files.length} files, ${errors} errors`)
if(errors)process.exit(1)
