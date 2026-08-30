import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'app/page.tsx','app/globals.css','components/PresetDemoPage.tsx',
  'public/preset/initial-two-bedroom.png','public/preset/generated-plan-01.png','public/preset/generated-plan-02.png','public/preset/generated-render.png',
  'public/data/pc-bom.json','public/data/whole-house-bom.json',
  'public/bom/pc-components-bom-52sqm.xlsx','public/bom/whole-house-bom-budget-52sqm.xlsx',
  'public/preset/one-bedroom/original.png',
  'public/preset/one-bedroom/plan-01.png','public/preset/one-bedroom/plan-02.png','public/preset/one-bedroom/plan-03.png',
  'public/preset/one-bedroom/render-01.webp','public/preset/one-bedroom/render-02.webp','public/preset/one-bedroom/render-03.webp',
  'public/data/one-bedroom/bom-plan-01.json','public/data/one-bedroom/bom-plan-02.json','public/data/one-bedroom/bom-plan-03.json',
  'public/bom/one-bedroom/BOM-方案1.xlsx','public/bom/one-bedroom/BOM-方案2.xlsx','public/bom/one-bedroom/BOM-方案3.xlsx',
  'public/preset/one-bedroom/add-bedroom/plan-01.png','public/preset/one-bedroom/add-bedroom/plan-02.png','public/preset/one-bedroom/add-bedroom/plan-03.png',
  'public/preset/one-bedroom/add-bedroom/render-01.webp','public/preset/one-bedroom/add-bedroom/render-02.webp','public/preset/one-bedroom/add-bedroom/render-03.webp',
  'public/data/one-bedroom/add-bedroom-bom-plan-01.json','public/data/one-bedroom/add-bedroom-bom-plan-02.json','public/data/one-bedroom/add-bedroom-bom-plan-03.json',
  'public/bom/one-bedroom/add-bedroom/BOM-方案1.xlsx','public/bom/one-bedroom/add-bedroom/BOM-方案2.xlsx','public/bom/one-bedroom/add-bedroom/BOM-方案3.xlsx'
]
let failed = false
for (const file of required) {
  const full = path.join(root, file)
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) { console.error('MISSING', file); failed = true }
}

const checkJson = (file, expectedHeaders = 8) => {
  const data = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  if (!Array.isArray(data.headers) || data.headers.length !== expectedHeaders) {
    console.error('Headers unexpected:', file)
    failed = true
  }
  if (!Array.isArray(data.rows) || data.rows.length < 10) {
    console.error('Rows unexpected:', file)
    failed = true
  }
}

checkJson('public/data/one-bedroom/bom-plan-01.json')
checkJson('public/data/one-bedroom/bom-plan-02.json')
checkJson('public/data/one-bedroom/bom-plan-03.json')
checkJson('public/data/one-bedroom/add-bedroom-bom-plan-01.json')
checkJson('public/data/one-bedroom/add-bedroom-bom-plan-02.json')
checkJson('public/data/one-bedroom/add-bedroom-bom-plan-03.json')

const component = fs.readFileSync(path.join(root, 'components/PresetDemoPage.tsx'), 'utf8')
for (const text of [
  '增加一个卧室','增加一个卫生间','同时增加卧室 + 卫生间','生成方案','BOM 清单',
  '在这张图的基础上，整体户型变成升级成二室一厅二卫一厨的格局。',
  '在这张图的基础上，整体户型变成升级成一室一厅二卫一厨的格局。',
  '方案 01 · 储物间改客卫 + 卧室水平分隔','方案 02 · 卫生间拆分双卫 + 卧室隔出次卧','方案 03 · 压缩厨房隔出客卫 + 卧室竖向分隔'
]) {
  if (!component.includes(text)) { console.error('UI marker missing:', text); failed = true }
}
if (component.includes('/api/')) { console.error('Static preset demo should not call API routes'); failed = true }

if (failed) process.exit(1)
console.log('PASS: original two-bedroom preset retained')
console.log('PASS: one-bedroom preset 01 (add bedroom) integrated with 3 plans + 3 renders + 3 BOMs')
console.log('PASS: one-bedroom preset 02 (add bathroom) retained')
console.log('PASS: one-bedroom original image kept for comparison')
console.log('PASS: no external API dependency')
