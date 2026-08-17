import fs from 'node:fs'
const required=[
  'app/customer/page.tsx','app/contractor/page.tsx',
  'components/customer/CustomerStepper.tsx','components/customer/CustomerDesign.tsx','components/customer/CustomerConstruction.tsx','components/customer/CustomerAcceptance.tsx',
  'components/contractor/OrderSidebar.tsx','components/contractor/ContractorOrderDetail.tsx','lib/demo-orders.ts','lib/order-store.ts'
]
for(const f of required){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}
const customer=fs.readFileSync('components/customer/CustomerStepper.tsx','utf8')
for(const x of ['设计','施工','验收'])if(!customer.includes(x))throw new Error(`Customer stage missing: ${x}`)
const contractor=fs.readFileSync('components/contractor/ContractorOrderDetail.tsx','utf8')
for(const x of ['生产','BOM清单及排序展示','墙体','家具','状态信息（3D打印机）','人工','机械臂','状态信息（机械臂）','视频'])if(!contractor.includes(x))throw new Error(`Contractor block missing: ${x}`)
const orders=fs.readFileSync('lib/demo-orders.ts','utf8')
for(const id of ['DH-2026-001','DH-2026-002','DH-2026-003','DH-2026-004'])if(!orders.includes(id))throw new Error(`Order missing: ${id}`)
console.log('Dual portal structure: OK')
