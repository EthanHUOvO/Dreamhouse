import { createScenarioScene } from './scenarios'
import { captureFurnitureOverrides } from './furniture-overrides'
import type { DesignVersion, Order, ScenarioType, TaskItem } from './types'

function design(version:number,scenario:ScenarioType,status:DesignVersion['status'],label:string):DesignVersion{
  const scene=createScenarioScene(scenario)
  return{id:`design-demo-${version}-${scenario}`,version,label,status,scenario,scene,furnitureOverrides:captureFurnitureOverrides(scene),createdAt:new Date(2026,7,10+version).toISOString()}
}
function tasks(){const manual:TaskItem[]=[{id:'m1',label:'门窗及接口复检',method:'人工',status:'待施工'},{id:'m2',label:'现场人工收尾',method:'人工',status:'待施工'}];const robot:TaskItem[]=[{id:'r1',label:'地板定位',method:'机械臂',status:'待施工'},{id:'r2',label:'墙体安装',method:'机械臂',status:'待施工'},{id:'r3',label:'家具摆放',method:'机械臂',status:'待施工'}];return{manual,robot}}
export function createDemoOrders():Order[]{
  const t=tasks()
  return[
    {id:'DH-2026-001',customer:'王先生',projectName:'育儿家庭改造',houseId:'HOUSE_001',status:'construction',approvedVersion:1,designVersions:[design(1,'child','approved','育儿家庭方案')],aiProposals:[],visualConcepts:[],videoConcepts:[],artifacts:[{id:'BOM-V1',type:'BOM',label:'Design V1 BOM',status:'ready',sourceDesignVersion:1}],bom:[{id:'floor',order:1,category:'floor',label:'地板',quantity:1,source:'3D打印',status:'已完成'},{id:'walls',order:2,category:'wall',label:'墙体',quantity:10,source:'3D打印',status:'已完成'},{id:'furniture',order:3,category:'furniture',label:'家具',quantity:23,source:'采购',status:'已完成'}],manualTasks:t.manual,robotTasks:t.robot,printer:{name:'Printer-01',status:'完成',task:'全部打印',progress:100},robot:{name:'Robot-01',status:'运行中',task:'家具摆放',progress:68},productionProgress:100,transportProgress:100,constructionProgress:72,acceptanceProgress:0,accepted:false,downstreamVersion:1},
    {id:'DH-2026-002',customer:'李女士',projectName:'双人居住改造',houseId:'HOUSE_001',status:'production',approvedVersion:1,designVersions:[design(1,'couple','approved','双人世界方案')],aiProposals:[],visualConcepts:[],videoConcepts:[],artifacts:[],bom:[{id:'floor',order:1,category:'floor',label:'地板',quantity:1,source:'3D打印',status:'已完成'},{id:'walls',order:2,category:'wall',label:'墙体',quantity:9,source:'3D打印',status:'生产中'},{id:'furniture',order:3,category:'furniture',label:'家具',quantity:21,source:'采购',status:'待处理'}],manualTasks:t.manual,robotTasks:t.robot,printer:{name:'Printer-02',status:'运行中',task:'墙体',progress:48},robot:{name:'Robot-02',status:'待机',task:'等待生产完成',progress:0},productionProgress:58,transportProgress:0,constructionProgress:0,acceptanceProgress:0,accepted:false,downstreamVersion:1}
  ]
}
