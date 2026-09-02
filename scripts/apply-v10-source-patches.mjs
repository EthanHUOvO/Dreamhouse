import fs from 'node:fs'
import path from 'node:path'

const root=path.resolve(process.argv[2]||'.')
const target=path.join(root,'components/customer/CustomerDesign.tsx')
if(!fs.existsSync(target)){
  console.error('[v10 patch] CustomerDesign.tsx not found:',target)
  process.exit(2)
}
let text=fs.readFileSync(target,'utf8')
const importAnchor="import { cloneScene, moveFurniture, placeFurniture, rotateFurniture } from '@/lib/furniture-edit'"
const importLine="import { applyFurnitureOverridesToScene, captureFurnitureOverrides } from '@/lib/furniture-overrides'"
if(!text.includes(importLine)){
  if(!text.includes(importAnchor))throw new Error('Unable to locate furniture-edit import in CustomerDesign.tsx')
  text=text.replace(importAnchor,`${importAnchor}\n${importLine}`)
}
const oldLine='    const next = createScenarioScene(currentScheme.scenario)'
const replacement=[
  '    const preservedOverrides = captureFurnitureOverrides(scene, editable.furnitureOverrides)',
  '    const next = applyFurnitureOverridesToScene(createScenarioScene(currentScheme.scenario), preservedOverrides)',
].join('\n')
if(text.includes(oldLine))text=text.replace(oldLine,replacement)
else if(!text.includes(replacement))throw new Error('Unable to patch applyScheme preset generation')
fs.writeFileSync(target,text)
console.log('[v10 patch] CustomerDesign preset preservation: OK')
