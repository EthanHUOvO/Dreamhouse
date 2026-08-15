import type { BomRow, ConstructionTask, InventoryRow, SceneGraph } from './types'

export function generateBom(scene:SceneGraph):BomRow[]{
  const walls=Object.values(scene.nodes).filter(n=>n.type==='wall').length
  const furniture=Object.values(scene.nodes).filter(n=>n.type==='item').length

  return [
    {id:'BOM-FLOOR',order:1,category:'floor',label:'地板',quantity:1,method:'3D打印',status:'待生产'},
    {id:'BOM-WALL',order:2,category:'wall',label:'墙体',quantity:walls,method:'3D打印',status:'待生产'},
    {id:'BOM-FURN',order:3,category:'furniture',label:'家具',quantity:furniture,method:'采购',status:'待生产'}
  ]
}

export function generateInventory(bom:BomRow[]):InventoryRow[]{
  return bom.map(row=>({
    id:`INV-${row.id}`,
    label:row.label,
    quantity:row.quantity,
    status:'待入库'
  }))
}

export function generateConstruction():ConstructionTask[]{
  return [
    {id:'C-01',label:'地板定位',method:'机械臂',status:'待施工'},
    {id:'C-02',label:'墙体安装',method:'机械臂',status:'待施工'},
    {id:'C-03',label:'门窗及接口复检',method:'人工',status:'待施工'},
    {id:'C-04',label:'家具摆放',method:'机械臂',status:'待施工'},
    {id:'C-05',label:'现场人工收尾',method:'人工',status:'待施工'}
  ]
}
