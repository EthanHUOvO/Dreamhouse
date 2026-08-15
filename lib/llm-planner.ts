import type { RenovationPlan, SceneGraph } from './types'
const strip=(s:string)=>s.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()

export async function planWithLLM(prompt:string, scene:SceneGraph): Promise<RenovationPlan> {
  const baseUrl=process.env.LLM_BASE_URL?.replace(/\/$/,''); const apiKey=process.env.LLM_API_KEY; const model=process.env.LLM_MODEL
  if (!baseUrl || !model) throw new Error('PLANNER_MODE=llm 时必须配置 LLM_BASE_URL 和 LLM_MODEL')
  const rooms=Object.values(scene.nodes).filter(n=>n.type==='zone').map(n=>({id:n.id,name:n.name,semantic:n.metadata?.semantic_type,polygon:n.polygon}))
  const system=`你是住宅生命周期空间改造规划器。只把用户意图转换为受限 JSON，不直接输出 Pascal 底层 patch。承重结构由后端保护。
只允许 operation：
1 resemanticize_room: {"type":"resemanticize_room","roomId":"已有id","newName":"名称","newSemantic":"custom"}
2 split_room: {"type":"split_room","roomId":"已有id","axis":"x","ratio":0.5,"rooms":[{"id":"新id","name":"名称","semantic":"custom"},{"id":"新id","name":"名称","semantic":"custom"}]}
3 remove_all_partitions: {"type":"remove_all_partitions"}
4 add_partition: {"type":"add_partition","start":[x,z],"end":[x,z],"name":"可选"}
严格输出 {"title":"...","summary":"...","operations":[],"warnings":[]}，不要 Markdown。
当前房间=${JSON.stringify(rooms)}`
  const res=await fetch(`${baseUrl}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,temperature:.2,messages:[{role:'system',content:system},{role:'user',content:prompt}]})})
  if(!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`)
  const data=await res.json(); const content=data?.choices?.[0]?.message?.content
  if(typeof content!=='string') throw new Error('LLM 未返回 message.content')
  const parsed=JSON.parse(strip(content)); if(!Array.isArray(parsed.operations)) throw new Error('LLM JSON 格式不正确')
  return {title:String(parsed.title??'空间改造方案'),summary:String(parsed.summary??''),operations:parsed.operations,warnings:Array.isArray(parsed.warnings)?parsed.warnings.map(String):[]} as RenovationPlan
}
