const [maj,min] = process.versions.node.split('.').map(Number)
console.log(`Node: ${process.versions.node}`)
if (maj < 22 || (maj === 22 && min < 13)) {
  console.error('建议 Node.js >= 22.13，以匹配 Pascal 当前文档要求。')
  process.exitCode = 1
} else console.log('Node version: OK')
console.log(`Planner mode: ${process.env.PLANNER_MODE ?? 'rules (default)'}`)
console.log('Pascal packages pinned: 1.0.0-beta.4')
