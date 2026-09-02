function apiKey(){return process.env.QWEN_API_KEY||process.env.DASHSCOPE_API_KEY||''}
export function qwenBaseUrl(){return (process.env.QWEN_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/,'')}
export function qwenModel(){return process.env.QWEN_TEXT_MODEL||'qwen3.7-plus'}
export function qwenConfigured(){return Boolean(apiKey())}

export async function qwenChatCompletion(body:Record<string,any>){
  const key=apiKey();if(!key)throw new Error('QWEN_API_KEY / DASHSCOPE_API_KEY is not configured')
  const res=await fetch(`${qwenBaseUrl()}/chat/completions`,{
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${key}`},
    body:JSON.stringify({model:qwenModel(),enable_thinking:false,...body})
  })
  if(!res.ok)throw new Error(`Qwen request failed: ${res.status} ${await res.text()}`)
  return await res.json()
}

export async function qwenChatJson(messages:any[]){
  const data:any=await qwenChatCompletion({messages,response_format:{type:'json_object'},temperature:.2})
  const text=data.choices?.[0]?.message?.content||'{}'
  try{return JSON.parse(text)}catch{throw new Error(`Qwen returned non-JSON content: ${String(text).slice(0,320)}`)}
}
