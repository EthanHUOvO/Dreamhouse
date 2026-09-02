import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'app/page.tsx',
  'app/customer/page.tsx',
  'app/contractor/page.tsx',
  'app/api/layout/route.ts',
  'app/api/image/route.ts',
  'app/api/bom/route.ts',
  'components/CustomerPortal.tsx',
  'components/ContractorPortal.tsx',
  'components/PortalHome.tsx',
  'lib/demo-data.ts',
  'lib/qwen.ts',
]

const missing = required.filter(file => !fs.existsSync(path.join(root, file)))
if (missing.length) {
  console.error('Missing files:', missing)
  process.exit(1)
}

console.log('DreamHouse TouchFlow v13 verification passed.')
