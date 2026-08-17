import { createScenarioScene } from './scenarios'
import type { BomItem, DesignVersion, Order, ScenarioType, TaskItem } from './types'

function design(version:number,scenario:ScenarioType,status:'draft'|'approved'|'superseded',label:string):DesignVersion{
  return {id:`design-${version}-${scenario}`,version,label,status,scenario,scene:createScenarioScene(scenario),createdAt:new Date(2026,7,10+version).toISOString()}
}
function bom(walls:number,furniture:number,states:['已完成'|'生产中'|'待处理','已完成'|'生产中'|'待处理','已完成'|'生产中'|'待处理']):BomItem[]{
  return [
    {id:'floor',order:1,category:'floor',label:'地板',quantity:1,source:'3D打印',status:states[0]},
    {id:'walls',order:2,category:'wall',label:'墙体',quantity:walls,source:'3D打印',status:states[1]},
    {id:'furniture',order:3,category:'furniture',label:'家具',quantity:furniture,source:'采购',status:states[2]}
  ]
}
function tasks(){
  const manual:TaskItem[]=[
    {id:'m1',label:'门窗及接口复检',method:'人工',status:'待施工'},
    {id:'m2',label:'现场人工收尾',method:'人工',status:'待施工'}
  ]
  const robot:TaskItem[]=[
    {id:'r1',label:'地板定位',method:'机械臂',status:'待施工'},
    {id:'r2',label:'墙体安装',method:'机械臂',status:'待施工'},
    {id:'r3',label:'家具摆放',method:'机械臂',status:'待施工'}
  ]
  return {manual,robot}
}

export function createDemoOrders():Order[]{
  const a=tasks(),b=tasks(),c=tasks(),d=tasks()
  return [
    {
      id:'DH-2026-001',customer:'王先生',projectName:'育儿家庭改造',houseId:'HOUSE_001',status:'construction',approvedVersion:2,
      designVersions:[design(1,'single','superseded','单人居住初始方案'),design(2,'child','approved','育儿家庭方案')],
      bom:bom(10,23,['已完成','已完成','已完成']),
      manualTasks:a.manual.map((x,i)=>({...x,status:(i===0?'已完成':'待施工') as TaskItem['status']})),
      robotTasks:a.robot.map((x,i)=>({...x,status:(i<2?'已完成':'施工中') as TaskItem['status']})),
      printer:{name:'Printer-01',status:'完成',task:'墙体 / 地板',progress:100},
      robot:{name:'Robot-01',status:'运行中',task:'家具摆放',progress:66},
      productionProgress:100,constructionProgress:72,acceptanceProgress:0,accepted:false
    },
    {
      id:'DH-2026-002',customer:'李女士',projectName:'双人居住改造',houseId:'HOUSE_002',status:'production',approvedVersion:1,
      designVersions:[design(1,'couple','approved','两人共同居住方案')],bom:bom(9,21,['已完成','生产中','待处理']),manualTasks:b.manual,robotTasks:b.robot,
      printer:{name:'Printer-02',status:'运行中',task:'墙体',progress:48},robot:{name:'Robot-02',status:'待机',task:'等待生产完成',progress:0},
      productionProgress:58,constructionProgress:0,acceptanceProgress:0,accepted:false
    },
    {
      id:'DH-2026-003',customer:'张女士',projectName:'保姆房育儿改造',houseId:'HOUSE_003',status:'construction',approvedVersion:1,
      designVersions:[design(1,'nanny','approved','育儿 + 保姆方案')],bom:bom(10,22,['已完成','已完成','已完成']),
      manualTasks:c.manual.map(x=>({...x,status:'已完成'})),robotTasks:c.robot.map((x,i)=>({...x,status:(i<2?'已完成':'施工中') as TaskItem['status']})),
      printer:{name:'Printer-03',status:'完成',task:'全部打印',progress:100},robot:{name:'Robot-03',status:'运行中',task:'家具摆放',progress:84},
      productionProgress:100,constructionProgress:84,acceptanceProgress:0,accepted:false
    },
    {
      id:'DH-2026-004',customer:'赵先生',projectName:'单人空间改造',houseId:'HOUSE_004',status:'completed',approvedVersion:1,
      designVersions:[design(1,'single','approved','单人居住方案')],bom:bom(9,20,['已完成','已完成','已完成']),
      manualTasks:d.manual.map(x=>({...x,status:'已完成'})),robotTasks:d.robot.map(x=>({...x,status:'已完成'})),
      printer:{name:'Printer-04',status:'完成',task:'全部打印',progress:100},robot:{name:'Robot-04',status:'完成',task:'全部装配',progress:100},
      productionProgress:100,constructionProgress:100,acceptanceProgress:100,accepted:true
    }
  ]
}
