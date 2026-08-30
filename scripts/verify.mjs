import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'app/page.tsx',
  'app/globals.css',
  'components/PresetDemoPage.tsx',
  'public/preset/initial-two-bedroom.png',
  'public/preset/generated-plan-01.png',
  'public/preset/generated-plan-02.png',
  'public/preset/generated-render.png',
  'public/data/pc-bom.json',
  'public/data/whole-house-bom.json',
  'public/bom/pc-components-bom-52sqm.xlsx',
  'public/bom/whole-house-bom-budget-52sqm.xlsx'
]

let failed = false
for (const file of required) {
  const full = path.join(root, file)
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    console.error('MISSING', file)
    failed = true
  }
}

const pc = JSON.parse(fs.readFileSync(path.join(root, 'public/data/pc-bom.json'), 'utf8'))
const whole = JSON.parse(fs.readFileSync(path.join(root, 'public/data/whole-house-bom.json'), 'utf8'))
if (!Array.isArray(pc.pcComponents) || pc.pcComponents.length !== 41) { console.error('PC BOM row count unexpected'); failed = true }
if (!Array.isArray(pc.connectors) || pc.connectors.length !== 12) { console.error('Connector BOM row count unexpected'); failed = true }
if (!Array.isArray(pc.summary) || pc.summary.length !== 17) { console.error('PC summary row count unexpected'); failed = true }
if (!Array.isArray(whole.details) || whole.details.length !== 42) { console.error('Whole-house BOM row count unexpected'); failed = true }
if (!Array.isArray(whole.budget) || whole.budget.length !== 7) { console.error('Budget row count unexpected'); failed = true }

const component = fs.readFileSync(path.join(root, 'components/PresetDemoPage.tsx'), 'utf8')
for (const text of ['增加一个卧室','主卧增加一个卫生间','生成方案','BOM 清单与预算','三室一厅一卫一厨']) {
  if (!component.includes(text)) { console.error('UI marker missing:', text); failed = true }
}
if (component.includes('/api/')) { console.error('Static preset demo should not call API routes'); failed = true }

if (failed) process.exit(1)
console.log('PASS: preset assets')
console.log('PASS: imported BOM JSON rows 41 / 12 / 17 / 42 / 7')
console.log('PASS: preset buttons and prompt workflow')
console.log('PASS: no external API dependency')
