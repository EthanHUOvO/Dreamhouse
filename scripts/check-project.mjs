import fs from 'node:fs'

const required=[
  'app/customer/page.tsx','app/contractor/page.tsx',
  'components/customer/CustomerStepper.tsx','components/customer/CustomerDesign.tsx','components/customer/CustomerConstruction.tsx','components/customer/CustomerAcceptance.tsx',
  'components/contractor/OrderSidebar.tsx','components/contractor/ContractorOrderDetail.tsx','components/shared/PascalViewer.tsx',
  'lib/demo-orders.ts','lib/order-store.ts','lib/house-scene.ts'
]
for(const f of required){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}

const customer=fs.readFileSync('components/customer/CustomerStepper.tsx','utf8')
for(const x of ['设计','施工','验收'])if(!customer.includes(x))throw new Error(`Customer stage missing: ${x}`)

const contractor=fs.readFileSync('components/contractor/ContractorOrderDetail.tsx','utf8')
for(const x of ['生产','BOM清单及排序展示','墙体','家具','状态信息（3D打印机）','人工','机械臂','状态信息（机械臂）','视频'])if(!contractor.includes(x))throw new Error(`Contractor block missing: ${x}`)

const orders=fs.readFileSync('lib/demo-orders.ts','utf8')
for(const id of ['DH-2026-001','DH-2026-002','DH-2026-003','DH-2026-004'])if(!orders.includes(id))throw new Error(`Order missing: ${id}`)

const design=fs.readFileSync('components/customer/CustomerDesign.tsx','utf8')
for(const x of ['3D展示','调整家具','前','后','左','右','左转','右转','ROTATE_STEP_DEG','controlOpen','onSaveScene(next)']){
  if(!design.includes(x))throw new Error(`Furniture popup feature missing: ${x}`)
}
if(design.includes('3D展示 · 家具傻瓜式移动'))throw new Error('Old visible furniture mover title still present')
if(design.includes('type="number"'))throw new Error('Numeric furniture editor still present')

const css=fs.readFileSync('app/globals.css','utf8')
for(const x of ['.furniture-modal-backdrop','.furniture-modal','.open-furniture-control','.rotation-control']){
  if(!css.includes(x))throw new Error(`Popup CSS missing: ${x}`)
}

const store=fs.readFileSync('lib/order-store.ts','utf8')
if(!store.includes("dreamhouse.pascal.furniturepopup.orders.v2"))throw new Error('New storage key missing')

const house=fs.readFileSync('lib/house-scene.ts','utf8')
if(!house.includes("item_bath_shower','zone_bath','shower',[-1.15,0,3.78]")){
  throw new Error('Bathroom shower is not at the requested lower-left position')
}

console.log('Dual portal structure: OK')
console.log('Pascal furniture popup controls: OK')
