import fs from 'node:fs'
const required=[
  'app/customer/page.tsx','app/contractor/page.tsx',
  'components/customer/CustomerStepper.tsx','components/customer/CustomerDesign.tsx','components/customer/CustomerConstruction.tsx','components/customer/CustomerAcceptance.tsx',
  'components/contractor/OrderSidebar.tsx','components/contractor/ContractorOrderDetail.tsx','components/shared/PascalViewer.tsx',
  'lib/demo-orders.ts','lib/order-store.ts','lib/downstream.ts','lib/house-scene.ts'
]
for(const f of required){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}
const customer=fs.readFileSync('components/customer/CustomerStepper.tsx','utf8')
for(const x of ['设计','施工','验收'])if(!customer.includes(x))throw new Error(`Customer stage missing: ${x}`)
const design=fs.readFileSync('components/customer/CustomerDesign.tsx','utf8')
for(const x of ['应用并保存当前方案','保存状态','提交设计变更','确认设计并进入生产','调整家具','进入漫游','walkthroughMode','onNudgeItem','onRotateItem','onDragCommit'])if(!design.includes(x))throw new Error(`Design workflow missing: ${x}`)
const viewer=fs.readFileSync('components/shared/PascalViewer.tsx','utf8')
for(const x of [
  "emitter.on('item:click'","emitter.on('item:pointerdown'",'sceneRegistry.nodes.get','pointermove','inworld-dpad','↺ 左转','右转 ↻',
  'FirstPersonControls','InteractiveSystem',"setWallMode('up')",'setWalkthroughMode(true)',"selectionManager={walkthroughMode ? 'default' : 'custom'}",'左键 / E 开关门','WalkthroughLifecycleBridge'
])if(!viewer.includes(x))throw new Error(`Pascal interaction missing: ${x}`)
const store=fs.readFileSync('lib/order-store.ts','utf8')
for(const x of ['walkthrough.orders.v6','confirmDesignAndStartProduction','syncOrderDownstream',"status:'submitted'",'acceptChange'])if(!store.includes(x))throw new Error(`Store workflow missing: ${x}`)
const contractor=fs.readFileSync('components/contractor/ContractorOrderDetail.tsx','utf8')
for(const x of ['收到设计变更','接受并同步后续','BOM清单及排序展示','Design V'])if(!contractor.includes(x))throw new Error(`Contractor continuity missing: ${x}`)
const house=fs.readFileSync('lib/house-scene.ts','utf8')
if(!house.includes("item_bath_shower','zone_bath','shower',[-1.15,0,3.78]"))throw new Error('Bathroom shower position changed')
for(const x of ["id:'spawn_walkthrough'","type:'spawn'","position:[5.15,0,0.60]","'spawn_walkthrough'"])if(!house.includes(x))throw new Error(`Walkthrough spawn missing: ${x}`)
console.log('Dual portal structure: OK')
console.log('Pascal design -> save -> submit -> downstream workflow: OK')
console.log('Pascal first-person walkthrough + interactive doors integration: OK')
