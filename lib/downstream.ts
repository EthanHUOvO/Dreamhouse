import type { DesignVersion, MesStage, Order, TaskItem } from './types'

export function syncOrderDownstream(order:Order,design:DesignVersion):Order{
  const nodes=Object.values(design.scene.nodes)
  const walls=nodes.filter(n=>n.type==='wall').length
  const furniture=nodes.filter(n=>n.type==='item').length
  const manual:TaskItem[]=[{id:'manual-check',label:'门窗及接口复检',method:'人工',status:'待施工'},{id:'manual-finish',label:'现场人工收尾',method:'人工',status:'待施工'}]
  const robot:TaskItem[]=[{id:'robot-floor',label:'地板定位',method:'机械臂',status:'待施工'},{id:'robot-wall',label:'墙体安装',method:'机械臂',status:'待施工'},{id:'robot-furniture',label:'家具摆放',method:'机械臂',status:'待施工'}]
  return{
    ...order,status:'production',downstreamVersion:design.version,lastDesignSyncAt:new Date().toISOString(),
    bom:[
      {id:'floor',order:1,category:'floor',label:'地板',quantity:1,source:'3D打印',status:'待处理'},
      {id:'walls',order:2,category:'wall',label:'墙体',quantity:walls,source:'3D打印',status:'待处理'},
      {id:'furniture',order:3,category:'furniture',label:'家具',quantity:furniture,source:'采购',status:'待处理'}
    ],
    artifacts:[{id:`BOM-V${design.version}`,type:'BOM',label:`Design V${design.version} BOM`,status:'ready',sourceDesignVersion:design.version},{id:`STL-V${design.version}`,type:'STL',label:'墙体/地板制造文件（接口占位）',status:'pending',sourceDesignVersion:design.version},{id:`GLB-V${design.version}`,type:'GLB',label:'装配/仿真模型（Pascal导出接口）',status:'pending',sourceDesignVersion:design.version}],
    manualTasks:manual,robotTasks:robot,
    printer:{name:'Printer-01',status:'待机',task:'等待排产',progress:0},robot:{name:'Robot-01',status:'待机',task:'等待生产完成',progress:0},
    productionProgress:0,transportProgress:0,constructionProgress:0,acceptanceProgress:0,accepted:false
  }
}

export function getMesStages(order:Order):MesStage[]{
  const rank:Record<string,number>={design:0,production:3,transport:4,construction:5,acceptance:7,completed:8}
  const current=rank[order.status]??0
  const defs:[MesStage['id'],string,number][]=[['design','设计确认',0],['bom','BOM/工艺',1],['schedule','排产',2],['production','生产',3],['transport','运输',4],['installation','现场装配',5],['qc','质量复检',6],['acceptance','验收归档',7]]
  return defs.map(([id,label,r])=>({id,label,status:r<current?'done':r===current?'active':'pending'}))
}
