import fs from 'node:fs'
import path from 'node:path'

const required = [
  'components/WhiteboardApp.tsx',
  'components/DesignStage.tsx',
  'components/ProductionStage.tsx',
  'components/InventoryStage.tsx',
  'components/ConstructionStage.tsx',
  'components/AcceptanceStage.tsx',
  'components/PascalViewer.tsx',
  'components/Floorplan2D.tsx',
  'lib/house-scene.ts',
  'lib/scenarios.ts',
  'lib/bom.ts'
]

for (const file of required) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) throw new Error(`Missing: ${file}`)
}

const app = fs.readFileSync('components/WhiteboardApp.tsx', 'utf8')
for (const stage of ['设计','生产','库存运输','现场施工','验收']) {
  if (!app.includes(stage)) throw new Error(`Missing stage: ${stage}`)
}

const design = fs.readFileSync('components/DesignStage.tsx', 'utf8')
for (const block of ['对话式交互','2D图纸','3D展示']) {
  if (!design.includes(block)) throw new Error(`Missing design block: ${block}`)
}

const production = fs.readFileSync('components/ProductionStage.tsx', 'utf8')
for (const block of ['BOM清单及排序展示','墙体','家具','状态信息（打印机）','视频']) {
  if (!production.includes(block)) throw new Error(`Missing production block: ${block}`)
}

const construction = fs.readFileSync('components/ConstructionStage.tsx', 'utf8')
for (const block of ['人工','机械臂','状态信息（机械臂）','视频']) {
  if (!construction.includes(block)) throw new Error(`Missing construction block: ${block}`)
}

console.log('Whiteboard strict structure: OK')
