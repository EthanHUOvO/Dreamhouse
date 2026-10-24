import { request as httpRequest } from 'node:http'
import { getAiConfig } from './config'
import { QwenRequestError } from './qwen-client'
import { generatedImageFile } from './image-result-cache'

export type QwenImageRequest={mode?:string;images?:string[];prompt:string;promptExtend?:boolean;negativePrompt?:string;size?:string;seed?:number;model?:string;steps?:number;signal?:AbortSignal}

export function localImageTarget(mode:string|undefined,config:ReturnType<typeof getAiConfig>,requestedModel?:string){
  const editing=mode==='floorplan-edit'||mode==='walkthrough-render'
  const baseUrl=editing?config.editImageBaseUrl:config.nativeBaseUrl
  const model=requestedModel||(editing?config.editImageModel:config.imageModel)
  if(editing&&/^z-image-turbo/i.test(model))
    throw new QwenRequestError({message:'当前后端是普通图生图预览，尚未配置指令编辑模型。',status:503,stage:'image',model})
  const configured=editing?config.editImageModel:config.imageModel
  if(requestedModel&&requestedModel!==configured)
    throw new QwenRequestError({message:'请求的图像模型与实际后端配置不一致。',status:400,stage:'image',model})
  return{baseUrl,model}
}

export function resolveLocalImageSteps(model:string,mode?:string,explicitSteps?:number,env:Record<string,string|undefined>=process.env){
  const baseQwen=/^qwen-image-2\.1/i.test(model)&&!/turbo|lightning|acc/i.test(model)
  const fourStepQwen=/^qwen-image-2\.1/i.test(model)&&/(?:acc.*4|4.*acc)/i.test(model)
  // Base Qwen and distilled Z-Image use different schedules. A legacy global
  // eight-step preview setting must not under-sample a floorplan edit.
  const configured=mode==='floorplan-edit'?env.QWEN_FLOORPLAN_STEPS:(env.QWEN_INTERIOR_STEPS||(!fourStepQwen?env.QWEN_IMAGE_STEPS:undefined))
  const requested=Number(explicitSteps)||Number(configured)||(fourStepQwen?4:baseQwen&&mode==='floorplan-edit'?40:8)
  return Math.max(1,Math.min(60,Math.round(requested)))
}

type LocalImageResponse={status:number;body:string;contentType:string}

function postLocalImage(urlString:string, body:string, timeoutMs:number,signal?:AbortSignal):Promise<LocalImageResponse>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason||new DOMException('Image request cancelled','AbortError'));return}
    const target=new URL(urlString)
    const req=httpRequest({
      protocol:target.protocol,
      hostname:target.hostname,
      port:target.port,
      path:`${target.pathname}${target.search}`,
      method:'POST',
      headers:{'content-type':'application/json','content-length':Buffer.byteLength(body),connection:'close'},
    },res=>{
      const chunks:Buffer[]=[]
      res.on('data',chunk=>chunks.push(Buffer.from(chunk)))
      res.on('end',()=>resolve({
        status:res.statusCode||502,
        body:Buffer.concat(chunks).toString('utf8'),
        contentType:String(res.headers['content-type']||'application/json'),
      }))
      res.on('error',reject)
    })
    req.setTimeout(timeoutMs,()=>req.destroy(new Error(`Local Qwen Image timed out after ${timeoutMs}ms`)))
    const abort=()=>req.destroy(signal?.reason||new DOMException('Image request cancelled','AbortError'))
    signal?.addEventListener('abort',abort,{once:true})
    req.on('close',()=>signal?.removeEventListener('abort',abort))
    req.on('error',reject)
    req.write(body)
    req.end()
  })
}

export async function qwenGenerateImage(input:QwenImageRequest){
  const c=getAiConfig(),target=c.mode==='local'?localImageTarget(input.mode,c,input.model):{baseUrl:c.nativeBaseUrl,model:input.model||c.imageModel},model=target.model
  if(c.mode!=='local'&&!c.apiKey)throw new QwenRequestError({message:'QWEN_API_KEY is not configured',stage:'image',model})
  const images=(input.images||[]).slice(0,3)
  const inputBytes=images.reduce((total,image)=>{
    if(!image.startsWith('data:'))return total
    const comma=image.indexOf(',')
    return total+(comma>=0?Math.ceil((image.length-comma-1)*3/4):0)
  },0)
  if(inputBytes>10*1024*1024)
    throw new QwenRequestError({message:'Image input exceeds Qwen Image 10MB limit',status:413,stage:'image',model})
  const content=[...images.map(image=>({image})),{text:input.prompt}]
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),c.imageTimeoutMs)
  const signal=input.signal?AbortSignal.any([controller.signal,input.signal]):controller.signal
  try{
    if(c.mode==='local'){
      const steps=resolveLocalImageSteps(model,input.mode,input.steps)
      const response=await postLocalImage(`${target.baseUrl}/v1/images/generations`,JSON.stringify({mode:input.mode,model,prompt:input.prompt,images,size:input.size,negativePrompt:input.negativePrompt,seed:input.seed,steps,guidanceScale:1}),c.imageTimeoutMs,signal)
      const responseText=response.body;let data:any={};try{data=JSON.parse(responseText)}catch{}
      if(response.status<200||response.status>=300)throw new QwenRequestError({message:`Local Qwen Image failed: HTTP ${response.status} ${responseText.slice(0,1200)}`,status:response.status,stage:'image',model})
      const url=data?.url||data?.data?.[0]?.url
      if(typeof url!=='string'||!generatedImageFile(url))throw new QwenRequestError({message:'本地图像服务未返回规范的生成图片地址。',status:502,stage:'image',model})
      if(data?.model!==model)throw new QwenRequestError({message:'图像服务返回的实际模型与请求配置不一致。',status:502,stage:'image',model})
      if(typeof data?.requestId!=='string'||!data.requestId.trim())throw new QwenRequestError({message:'本地图像服务返回结果缺少有效的请求标识。',status:502,stage:'image',model})
      return{url,requestId:data?.requestId||'',usage:data?.usage||null,model:data?.model||model,ephemeral:false,generation:{steps:data?.usage?.steps||steps,backend:data?.usage?.backend,width:data?.width,height:data?.height,elapsedMs:data?.elapsedMs,queueMs:data?.usage?.queueMs,processMs:data?.usage?.processMs}}
    }
    const res=await fetch(`${c.nativeBaseUrl}/services/aigc/multimodal-generation/generation`,{
      method:'POST',signal,
      headers:{'content-type':'application/json','authorization':`Bearer ${c.apiKey}`},
      body:JSON.stringify({
        model,
        input:{messages:[{role:'user',content}]},
        parameters:{prompt_extend:input.promptExtend??true,n:1,...(input.size?{size:input.size}:{}),...(input.negativePrompt?{negative_prompt:input.negativePrompt}:{}),...(Number.isInteger(input.seed)?{seed:input.seed}:{}),watermark:false}
      })
    })
    const responseText=await res.text()
    let data:any={}
    try{data=JSON.parse(responseText)}catch{}
    console.info('[Qwen Image API Response]',{
      status:res.status,
      model,
      inputImageCount:images.length,
      inputBytes,
      responseKeys:Object.keys(data||{}),
      requestId:data?.request_id||res.headers.get('x-request-id')||'',
      hasOutput:Boolean(data?.output),
      outputWidth:data?.usage?.output_width,
      outputHeight:data?.usage?.output_height,
    })
    if(!res.ok)throw new QwenRequestError({message:`Qwen image failed: HTTP ${res.status} ${responseText.slice(0,1200)}`,status:res.status,stage:'image',model})
    const contentOutput=data?.output?.choices?.[0]?.message?.content
    const url=(Array.isArray(contentOutput)?contentOutput.find((x:any)=>x?.image||x?.image_url)?.image||contentOutput.find((x:any)=>x?.image_url)?.image_url?.url:undefined)
      || data?.output?.images?.[0]?.url
      || data?.output?.results?.[0]?.url
    if(!url)throw new QwenRequestError({message:`Qwen image response did not include a supported image URL`,stage:'image',model})
    return{url,requestId:data?.request_id||'',usage:data?.usage||null,model,ephemeral:true,generation:undefined}
  }catch(error:any){
    if(input.signal?.aborted)throw input.signal.reason||new DOMException('Image request cancelled','AbortError')
    if(error?.name==='AbortError')throw new QwenRequestError({message:`Qwen image timed out after ${c.imageTimeoutMs}ms`,status:504,stage:'image',model})
    throw error
  }finally{clearTimeout(timer)}
}
