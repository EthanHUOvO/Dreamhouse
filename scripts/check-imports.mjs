import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd(),files=[]
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))files.push(p)}}walk(root)
let errors=0
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/from\s+['"](@\/[^'"]+)['"]/g)){const rel=m[1].slice(2),candidates=[path.join(root,rel),path.join(root,rel+'.ts'),path.join(root,rel+'.tsx'),path.join(root,rel+'.json'),path.join(root,rel,'index.ts'),path.join(root,rel,'index.tsx')];if(!candidates.some(fs.existsSync)){console.error(`Missing internal import ${m[1]} in ${path.relative(root,file)}`);errors++}}}
console.log(`Internal import check: ${errors?'FAIL':'PASS'}`)
if(errors)process.exit(1)
