import { executeLayoutTool, LAYOUT_TOOL_SCHEMAS, validateLayout } from '../layout-tools'
import type { AiLayoutRun } from '../types'
import type { LayoutRequest } from './provider'
import { qwenChatCompletion, qwenModel } from './qwen-client'

function compactContext(input:LayoutRequest){
  return{
    profile:input.profile?{
      displayName:input.profile.displayName,household:input.profile.household,adults:input.profile.adults,children:input.profile.children,nanny:input.profile.nanny,workFromHome:input.profile.workFromHome,storagePriority:input.profile.storagePriority,preferredStyle:input.profile.preferredStyle
    }:undefined,
    design:{version:input.design.version,label:input.design.label,scenario:input.design.scenario},
    drawing:input.drawing?{fileName:input.drawing.fileName,fileType:input.drawing.fileType,templateId:input.drawing.templateId,detected:input.drawing.detected}:undefined,
    userRequest:input.prompt
  }
}

export async function runQwenLayoutAgent(input:LayoutRequest):Promise<AiLayoutRun>{
  let working:AiLayoutRun['scene']=JSON.parse(JSON.stringify(input.design.scene))
  const operations:AiLayoutRun['operations']=[],toolLog:AiLayoutRun['toolLog']=[]
  const system=`你是 DreamHouse 的住宅空间设计 Agent。你的任务不是写方案说明，而是通过提供的工具真实修改当前 Pascal SceneGraph 的临时副本。\n\n强制规则：\n1. 首先调用 get_house_constraints，读取房间位置、承重墙和可编辑隔墙。\n2. 外墙、承重墙、入户门绝对不可修改。工具本身也会再次拦截。\n3. 用户说“左上/右上/左下/右下”时，依据 get_house_constraints 返回的 region 选择 zoneId，不要自己猜坐标。\n4. 优先使用 assign_room_function 完成房间功能搬移；确实需要拓扑变化时才使用 merge_rooms / split_room / move_partition_wall。\n5. 房间功能改变后通常应保留 regenerateFurniture=true，让系统按新功能生成初始家具。\n6. 如果拆分房间，需要结合现有门关系判断是否需要 add_door。\n7. 不要直接输出或修改 Pascal 原始坐标；使用工具参数中的 ratio / zoneId / wallId。\n8. 完成所有修改后必须调用 validate_layout。若校验失败，根据 issues 修正，再次 validate_layout。\n9. 只有在 validate_layout valid=true 后才结束。最终用中文简要说明你实际执行了哪些空间调整，不要输出代码。`
  const context=compactContext(input)
  const userContent:any=input.drawing?.previewDataUrl&&input.drawing.fileType.startsWith('image/')
    ?[{type:'image_url',image_url:{url:input.drawing.previewDataUrl}},{type:'text',text:JSON.stringify(context)}]
    :JSON.stringify(context)
  const messages:any[]=[{role:'system',content:system},{role:'user',content:userContent}]
  let summary='',validated=false

  for(let round=0;round<12;round++){
    const data:any=await qwenChatCompletion({messages,tools:LAYOUT_TOOL_SCHEMAS,tool_choice:round===0?'required':'auto',temperature:.15})
    const msg:any=data.choices?.[0]?.message||{}
    const calls:any[]=Array.isArray(msg.tool_calls)?msg.tool_calls:[]
    messages.push({role:'assistant',content:msg.content||'',...(calls.length?{tool_calls:calls}: {})})
    if(!calls.length){summary=String(msg.content||'').trim();break}

    for(const call of calls){
      const name=String(call?.function?.name||'')
      let args:Record<string,any>={}
      try{args=JSON.parse(call?.function?.arguments||'{}')}catch{}
      const result=executeLayoutTool(working,name,args)
      if(result.ok)working=result.scene
      if(result.operation&&result.ok){operations.push(result.operation);validated=false}
      const validationData=name==='validate_layout'?result.data:undefined
      if(name==='validate_layout'&&result.ok&&validationData?.valid)validated=true
      toolLog.push({index:toolLog.length+1,tool:name,args,ok:result.ok,message:result.message})
      const payload={ok:result.ok,message:result.message,data:result.data}
      messages.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(payload)})
    }
    if(validated){
      // Give the model one final turn to summarize, without forcing another tool call.
      const final:any=await qwenChatCompletion({messages,temperature:.15})
      summary=String(final.choices?.[0]?.message?.content||'').trim()
      break
    }
  }

  const validation=validateLayout(working)
  if(!summary)summary=operations.length?operations.map(x=>x.description).join('；'):'模型未执行空间修改。'
  if(!operations.length)validation.warnings=[...validation.warnings,'本次请求没有产生可执行的空间修改。']
  return{
    id:`LAYOUT-QWEN-${Date.now()}`,provider:'qwen',model:qwenModel(),prompt:input.prompt,summary,scene:working,operations,toolLog,validation,createdAt:new Date().toISOString()
  }
}
