import { getAiConfig } from './config'

export class QwenRequestError extends Error{
  status?:number
  stage:string
  model:string
  constructor(input:{message:string;status?:number;stage:string;model:string}){super(input.message);this.name='QwenRequestError';this.status=input.status;this.stage=input.stage;this.model=input.model}
}

type QwenOptions={model?:string;stage?:string;maxTokens?:number;temperature?:number;signal?:AbortSignal;timeoutMs?:number}

// fetch resolves at headers; the deadline must also cover the response body.
async function requestJson(url:string,init:RequestInit,timeoutMs:number,stage:string,model:string,signal?:AbortSignal){
  const controller=new AbortController()
  const abort=()=>controller.abort(signal?.reason)
  signal?.addEventListener('abort',abort,{once:true})
  if(signal?.aborted)abort()
  let timedOut=false
  const timer=setTimeout(()=>{timedOut=true;controller.abort()},timeoutMs)
  try{
    const res=await fetch(url,{...init,signal:controller.signal})
    if(!res.ok){const text=await res.text();throw new QwenRequestError({message:`Qwen ${stage === "svg-edit" ? "api" : stage} failed: HTTP ${res.status} ${text.slice(0,1200)}`,status:res.status,stage,model})}
    return await res.json()
  }catch(error:any){
    if(signal?.aborted)throw signal.reason||new DOMException('Request cancelled','AbortError')
    if(timedOut)throw new QwenRequestError({message:`Qwen ${stage} timed out after ${timeoutMs}ms`,stage,model})
    throw error
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}

export function qwenBaseUrl(){return getAiConfig().compatBaseUrl}
export function qwenModel(){return getAiConfig().layoutModel}
export function qwenConfigured(){const c=getAiConfig();return c.mode==='local'?Boolean(c.compatBaseUrl):Boolean(c.apiKey)}

export async function qwenChatCompletion(body:Record<string,any>,options?:QwenOptions){
  const c=getAiConfig(),model=options?.model||c.layoutModel,stage=options?.stage||'text'
  if(c.mode!=='local'&&!c.apiKey)throw new QwenRequestError({message:'QWEN_API_KEY is not configured',stage,model})
  const headers:Record<string,string>={'content-type':'application/json'}
  if(c.apiKey)headers.authorization=`Bearer ${c.apiKey}`
  return await requestJson(`${c.compatBaseUrl}/chat/completions`,{
    method:'POST',headers,
    body:JSON.stringify({model,enable_thinking:false,chat_template_kwargs:{enable_thinking:false},...(options?.maxTokens?{max_tokens:options.maxTokens}:{}),...(options?.temperature!==undefined?{temperature:options.temperature}:{}),...body})
  },options?.timeoutMs||c.textTimeoutMs,stage,model,options?.signal)
}

export async function qwenChatJson(messages:any[],options?:QwenOptions){
  const c=getAiConfig()
  const data:any=await qwenChatCompletion({messages,...(c.mode==='local'?{}:{response_format:{type:'json_object'}}),temperature:.15},options)
  const raw=String(data.choices?.[0]?.message?.content||'{}')
  const text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim()
  try{return JSON.parse(text)}catch{
    const fenced=String(text).match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
    const object=String(text).match(/\{[\s\S]*\}/)?.[0]
    try{return JSON.parse(fenced||object||'')}catch{throw new QwenRequestError({message:`Qwen returned non-JSON content: ${String(text).slice(0,480)}`,stage:options?.stage||'json',model:options?.model||getAiConfig().layoutModel})}
  }
}
