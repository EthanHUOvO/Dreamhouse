import type { BomItem, DesignVersion, DeviceState, Order, SceneGraph, TaskItem } from './types'

function countNodes(scene: SceneGraph, type: string) {
  return Object.values(scene.nodes).filter((node) => node.type === type).length
}

export function buildDownstreamFromScene(scene: SceneGraph, version: number) {
  const wallCount = Math.max(1, countNodes(scene, 'wall'))
  const furnitureCount = Math.max(0, countNodes(scene, 'item'))
  const floorCount = Math.max(1, countNodes(scene, 'slab'))

  const bom: BomItem[] = [
    { id: `floor-v${version}`, order: 1, category: 'floor', label: '地板', quantity: floorCount, source: '3D打印', status: '待处理' },
    { id: `walls-v${version}`, order: 2, category: 'wall', label: '墙体', quantity: wallCount, source: '3D打印', status: '待处理' },
    { id: `furniture-v${version}`, order: 3, category: 'furniture', label: '家具', quantity: furnitureCount, source: '采购', status: '待处理' },
  ]

  const manualTasks: TaskItem[] = [
    { id: `m-check-v${version}`, label: '门窗及接口复检', method: '人工', status: '待施工' },
    { id: `m-finish-v${version}`, label: '现场人工收尾', method: '人工', status: '待施工' },
  ]
  const robotTasks: TaskItem[] = [
    { id: `r-floor-v${version}`, label: '地板定位', method: '机械臂', status: '待施工' },
    { id: `r-wall-v${version}`, label: '墙体安装', method: '机械臂', status: '待施工' },
    { id: `r-furniture-v${version}`, label: '家具摆放', method: '机械臂', status: '待施工' },
  ]

  const printer: DeviceState = {
    name: 'Printer-01',
    status: '待机',
    task: `等待 Design V${version} 生产任务`,
    progress: 0,
  }
  const robot: DeviceState = {
    name: 'Robot-01',
    status: '待机',
    task: `等待 Design V${version} 构件到场`,
    progress: 0,
  }

  return { bom, manualTasks, robotTasks, printer, robot }
}

export function syncOrderDownstream(order: Order, design: DesignVersion): Order {
  const generated = buildDownstreamFromScene(design.scene, design.version)
  return {
    ...order,
    ...generated,
    status: 'production',
    productionProgress: 0,
    constructionProgress: 0,
    acceptanceProgress: 0,
    accepted: false,
    downstreamVersion: design.version,
    lastDesignSyncAt: new Date().toISOString(),
  }
}
