import { executeLayoutTool, getHouseConstraints, validateLayout } from '../layout-tools'
import type { AiLayoutRun, RoomSemantic } from '../types'
import type { LayoutRequest } from './provider'
import { parseRequirementTarget, verifyRequirementTarget } from './requirement-target'

const FUNCTION_BY_TEXT:[RegExp,RoomSemantic][]=[
  [/主卧/,'master_bedroom'],[/儿童房/,'child_room'],[/保姆房/,'nanny_room'],[/衣帽间/,'dressing_room'],[/储物间|储藏室/,'storage'],[/双人书房/,'shared_study'],[/书房/,'study'],[/电竞房|游戏房/,'gaming_room'],[/客厅|客餐厅|公共空间/,'living_room'],[/卧室/,'bedroom'],[/卫生间|卫浴/,'bathroom']
]
function semanticFromText(text:string){for(const [r,s] of FUNCTION_BY_TEXT)if(r.test(text))return s;return undefined}
function zoneByRegion(scene:any,region:string){const c=getHouseConstraints(scene);return c.zones.find((z:any)=>z.region===region&&!['corridor','bathroom'].includes(z.semantic))}
function zoneByName(scene:any,text:string){const c=getHouseConstraints(scene);return c.zones.find((z:any)=>text.includes(z.name)||text.includes(z.id))}

export async function runMockLayoutAgent(input:LayoutRequest):Promise<AiLayoutRun>{
  let working=JSON.parse(JSON.stringify(input.design.scene)),operations:AiLayoutRun['operations']=[],toolLog:AiLayoutRun['toolLog']=[]
  const apply=(tool:string,args:Record<string,any>)=>{const r=executeLayoutTool(working,tool,args);if(r.ok)working=r.scene;if(r.operation&&r.ok)operations.push(r.operation);toolLog.push({index:toolLog.length+1,tool,args,ok:r.ok,message:r.message});return r}
  apply('get_house_constraints',{})
  const p=input.prompt.replace(/\s+/g,'')

  const regionMap:[RegExp,string][]=[[/右下|东南/,'右下'],[/左下|西南/,'左下'],[/右上|东北/,'右上'],[/左上|西北/,'左上']]
  let requestedRegion=''
  for(const [r,v] of regionMap)if(r.test(p)){requestedRegion=v;break}

  // Common natural-language relocation: "把主卧搬到右下角，原主卧改成书房".
  if(requestedRegion&&/(主卧|卧室)/.test(p)&&/(搬|移|放|改到|调整到)/.test(p)){
    const target=zoneByRegion(working,requestedRegion),current=getHouseConstraints(working).zones.find((z:any)=>z.semantic==='master_bedroom')
    if(target&&current&&target.id!==current.id){
      let oldFunction:RoomSemantic='study'
      const oldClause=(p.match(/原(来的)?主卧.{0,12}(改成|改为|变成)([^，。；]+)/)?.[3]||'')
      oldFunction=semanticFromText(oldClause)||oldFunction
      apply('assign_room_function',{zoneId:current.id,roomFunction:oldFunction,regenerateFurniture:true})
      apply('assign_room_function',{zoneId:target.id,roomFunction:'master_bedroom',regenerateFurniture:true})
    }
  }

  if(/(书房.*客厅.*合并|客厅.*书房.*合并|书房和客厅打通|客厅和书房打通)/.test(p)){
    const c=getHouseConstraints(working),study=c.zones.find((z:any)=>z.semantic==='study'||z.semantic==='shared_study'),living=c.zones.find((z:any)=>z.semantic==='living_room')
    if(study&&living)apply('merge_rooms',{zoneIds:[living.id,study.id],newFunction:'living_room',newName:'开放客餐厨空间'})
  }

  if(requestedRegion&&/(拆成|分成|一分为二)/.test(p)){
    const target=zoneByRegion(working,requestedRegion)
    const funcs:RoomSemantic[]=[]
    for(const [r,s] of FUNCTION_BY_TEXT)if(r.test(p)&&!funcs.includes(s))funcs.push(s)
    if(target&&funcs.length>=2){
      const oldMaster=getHouseConstraints(working).zones.find((z:any)=>z.semantic==='master_bedroom'&&z.id!==target.id)
      if(funcs.includes('master_bedroom')&&oldMaster)apply('assign_room_function',{zoneId:oldMaster.id,roomFunction:'study',regenerateFurniture:true})
      const split=apply('split_room',{zoneId:target.id,axis:'x',ratio:.62,firstFunction:funcs[0],secondFunction:funcs[1]})
      if(split.ok&&split.data?.wallId)apply('add_door',{wallId:split.data.wallId,positionRatio:.5,name:'空间连通门'})
    }
  }

  // Generic "A改成B" when no more specific operation handled it.
  const generic=p.match(/([^，。；]{1,10})(改成|改为|变成)([^，。；]{1,10})/)
  if(generic){
    const from=zoneByName(working,generic[1]),to=semanticFromText(generic[3])
    if(from&&to&&!(operations.some(o=>o.tool==='assign_room_function'&&o.args.zoneId===from.id)))apply('assign_room_function',{zoneId:from.id,roomFunction:to,regenerateFurniture:true})
  }

  const vr=apply('validate_layout',{})
  const validation=validateLayout(working)
  const summary=operations.length?operations.map(o=>o.description).join('；'):'Mock Agent 未识别到可执行的空间修改，请使用更明确的表达，例如“把主卧搬到右下角，原主卧改成书房”。'
  if(!operations.length)validation.warnings=[...validation.warnings,'Mock Agent仅用于无API时演示工具链，真实Qwen模式能理解更自由的自然语言。']
  const requirementTarget=parseRequirementTarget(input.prompt,working)
  return{id:`LAYOUT-MOCK-${Date.now()}`,provider:'mock',model:'DreamHouse Mock Tool Agent',prompt:input.prompt,summary,scene:working,operations,toolLog,validation:vr.data||validation,requirementTarget,goalVerification:verifyRequirementTarget(working,requirementTarget),createdAt:new Date().toISOString()}
}
