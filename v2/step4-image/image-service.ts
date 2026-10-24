import { fallbackAllowed,getAiConfig,getAiMode,qwenConfigured } from './config'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { qwenGenerateImage,localImageTarget,resolveLocalImageSteps } from './qwen-image-client'
import { readGeneratedImage,imageResultKey,measureImageChange,readImageResult,reserveImageResult,writeImageResult } from './image-result-cache'
import { prepareFloorPlanForAI, prepareImageForInteriorEdit, restoreFloorPlanFromAI, restoreInteriorFromAI, type PreparedFloorPlanImage, type PreparedInteriorImage } from './server-image'
import { buildRoomTypePrompt, inferRoomType, roomTypeNegativePrompt, type RoomType } from '@/config/roomTypes'
import { BASE_EDIT_PROMPT, FINAL_RESULT_CONSTRAINT, LAYOUT_OPTIMIZATION_PROMPT } from '@/config/interiorStyles'

export type ImageMode='floorplan-edit'|'walkthrough-render'
export type FloorplanEditImageInput={
  mode:'floorplan-edit'
  /** The image selected in Step 1. This is the only image input for this mode. */
  originalFloorplan:string
  userPrompt:string
  residenceType?:'one'|'two'|'three'
}
export type WalkthroughRenderImageInput={
  mode:'walkthrough-render'
  /** A capture of the live Pascal/Three canvas. This is the only image input for this mode. */
  pascalScreenshot:string
  roomName?:string
  stylePrompt:string
  roomType?:RoomType
  imageModel?:string
  /** Keep interactive renovation renders within a predictable size/time budget. */
  size?:string
}
export type ImageGenerationInput=FloorplanEditImageInput|WalkthroughRenderImageInput

export const BASE_FLOOR_PLAN_EDIT_PROMPT = `编辑参考图 <image1> 的二维户型，只执行以下明确修改：

修改要求：
{modificationRequest}

约束：
建筑外轮廓及图中明确标示的承重结构保持原样。
不得绘制或新增任何文字、数字、尺寸标注、房间名称或面积数值；所有文字与尺寸由系统在生成后精确回填，切勿模仿或重绘任何文字。
需要新增或拆分房间时，只调整指定的非承重隔墙，保留合理门洞和通行路线。
保持二维正俯视、相同比例和线条风格。不要旋转、裁切、改成透视图或全图重绘。
不要凭空填写新尺寸或面积。只输出修改后的户型图。`

export function buildFloorPlanEditPrompt(modificationRequest:string){
  return BASE_FLOOR_PLAN_EDIT_PROMPT.replace("{modificationRequest}", modificationRequest.trim())
}

function fallbackImage(input:ImageGenerationInput){
  // Keep fallback output bound to this request. A fixed preset would make
  // option-02..08 appear to reuse option-01 when the online model is down.
  return input.mode==='floorplan-edit'?input.originalFloorplan:input.pascalScreenshot
}

async function normalizeLocalGeneratedImage(url:string, width?:number, height?:number, floorplan?:PreparedFloorPlanImage,interior?:PreparedInteriorImage){
  if(!width || !height || !url.startsWith('/api/generated-images/')) return
  const name=path.basename(url)
  if(!/^[a-f0-9-]+\.(?:png|jpg|jpeg|webp)$/i.test(name)) return
  const directory=process.env.GENERATED_IMAGE_DIR || path.join(process.cwd(),'data','generated')
  const outputPath=path.join(directory,name)
  try{
    const source=await readFile(outputPath)
    const metadata=await sharp(source).metadata()
    if(!floorplan&&!interior&&metadata.width===width&&metadata.height===height)return
    const outputWidth=width,outputHeight=height
    const normalized=floorplan
      ? await restoreFloorPlanFromAI(source,floorplan)
      : interior?await restoreInteriorFromAI(source,interior)
      : await sharp(source).resize(outputWidth,outputHeight,{fit:'fill'}).png().toBuffer()
    await writeFile(outputPath,normalized)
    console.info('[DreamHouse][image][normalize]',{url,width:outputWidth,height:outputHeight,sourceWidth:metadata.width,sourceHeight:metadata.height,bytes:normalized.byteLength})
    return{width:outputWidth,height:outputHeight}
  }catch(error){
    console.warn('[DreamHouse][image][normalize-failed]',{url,width,height,message:(error as Error)?.message})
    if(floorplan||interior)throw Object.assign(new Error('图像服务输出无法还原到原始画幅。'),{status:502,cause:error})
  }
}

function promptFor(input:ImageGenerationInput){
  if(input.mode==='floorplan-edit')return buildFloorPlanEditPrompt(input.userPrompt)
  const roomType = input.roomType || inferRoomType(input.roomName)
  // The installed four-step backend uses CFG=1: its negative prompt cannot
  // suppress unwanted concepts. Keep local instructions short and positive,
  // without demanding furniture outside this camera's visible area.
  if(getAiMode()==='local')return `Edit reference image <image1> into a photorealistic material renovation of this existing ${roomType.replace(/_/g,' ')}.
Style: ${input.stylePrompt||'Light natural wood, warm white surfaces and soft lighting.'}
Keep exactly the same camera, perspective, room boundaries, ceiling height and visible scene. Preserve every visible object, its position, size and type. Keep all original architectural edges and openings in place: doors remain doors and windows remain windows. Keep the existing furniture in its original positions. Apply the style only to surface finishes, colors, fabrics and lighting. Add no new objects or openings. Output exactly this same view with realistic materials.`
  return [BASE_EDIT_PROMPT, LAYOUT_OPTIMIZATION_PROMPT, `ROOM TYPE (${roomType}):\n${buildRoomTypePrompt(roomType, input.roomName)}`, `DESIGN STYLE (style language only; do not infer function or structure):\n${input.stylePrompt||'现代简约，原木+白色+浅灰'}`, FINAL_RESULT_CONSTRAINT].join("\n\n")
}

function validateImageInput(input: ImageGenerationInput) {
  const raw=input as unknown as Record<string,unknown>
  if (input.mode === 'floorplan-edit') {
    const forbidden=['sourceImage','originalImage','geometryGuide','pascalScreenshot','sceneToPng','walkthroughScreenshot','rendererCanvas','sceneSnapshot','pascalScene','layoutPlan','operations','sourceIsFinal']
    if(forbidden.some(key=>Object.prototype.hasOwnProperty.call(raw,key)))
      throw new Error('Floorplan edit must use the original selected floorplan only.')
    if (!input.originalFloorplan || !String(input.userPrompt||'').trim())
      throw new Error('floorplan-edit requires originalFloorplan')
  } else if (input.mode === 'walkthrough-render') {
    if(['originalFloorplan','originalImage','geometryGuide','sceneSnapshot','pascalScene','sourceIsFinal'].some(key=>Object.prototype.hasOwnProperty.call(raw,key)))
      throw new Error('Walkthrough render must use the Pascal screenshot only.')
    if (!input.pascalScreenshot || !String(input.stylePrompt||'').trim())
      throw new Error('walkthrough-render requires pascalScreenshot and stylePrompt')
  }
}

export async function generateDreamHouseImage(input:ImageGenerationInput, options?:{signal?:AbortSignal;fresh?:boolean}){
  options?.signal?.throwIfAborted()
  validateImageInput(input)
  const c=getAiConfig(),mode=getAiMode()
  if(mode==='mock')return{provider:'mock' as const,model:'local-preset',url:fallbackImage(input),ephemeral:false,fallback:false,prompt:promptFor(input)}
  if(!qwenConfigured()){
    if(fallbackAllowed())return{provider:'mock' as const,model:'local-preset',url:fallbackImage(input),ephemeral:false,fallback:true,fallbackReason:'QWEN_API_KEY is not configured',prompt:promptFor(input)}
    throw new Error('QWEN_API_KEY is not configured')
  }
  let release:(()=>void)|undefined
  try{
    const source = input.mode === 'floorplan-edit'
      ? input.originalFloorplan
      : input.pascalScreenshot
    const sources=[source].filter(Boolean) as string[]
    if(!sources.length)throw new Error('originalImage or sourceImage is required')
    const prepared = input.mode === 'walkthrough-render'
      ? await prepareImageForInteriorEdit(sources[0])
      : await prepareFloorPlanForAI(sources[0])
    const images=[prepared.dataUrl]
    const outputSize = input.mode === 'walkthrough-render'
      ? (input.size || prepared.size)
      : prepared.size
    const finalPrompt=promptFor(input)
    const target=c.mode==='local'?localImageTarget(input.mode,c,input.mode==='walkthrough-render'?input.imageModel:undefined):null
    const cacheKey=target?imageResultKey({mode:input.mode,source:sources[0],prompt:finalPrompt,size:outputSize,model:target.model,backend:target.baseUrl,steps:resolveLocalImageSteps(target.model,input.mode),...(input.mode==='walkthrough-render'?{frameVersion:'capture-padded/v1'}:{})}):null
    if(cacheKey&&!options?.fresh){const cached=await readImageResult(cacheKey);options?.signal?.throwIfAborted();if(cached)return cached}
    if(cacheKey)release=reserveImageResult(cacheKey)
    if(input.mode==='floorplan-edit'){
      console.info('[FLOOR PLAN I2I REQUEST]', {
        model:target?.model||c.imageModel,
        imageCount:1,
        textCount:1,
        sourceImageWidth:prepared.width,
        sourceImageHeight:prepared.height,
        sourceAspectRatio:prepared.width&&prepared.height?Number((prepared.width/prepared.height).toFixed(4)):undefined,
        sourceImageBytes:'bytes' in prepared?prepared.bytes:undefined,
        promptLength:finalPrompt.length,
        prompt_extend:false,
        prompt_extend_mode:'not sent',
        enable_thinking:'not sent',
        outputSize,
        negativePromptLength:0,
        n:1,
      })
    }else{
      console.info('[Qwen Interior Edit]', {
        mode:'image-to-image',
        roomType:input.roomType || inferRoomType(input.roomName),
        roomName:input.roomName,
        hasImage:Boolean(prepared.dataUrl),
        sourceImageType:prepared.dataUrl.slice(0,prepared.dataUrl.indexOf(',')),
        sourceWidth:prepared.width,
        sourceHeight:prepared.height,
        outputSize,
        model:target?.model||input.imageModel||c.imageModel,
      })
    }
    const result=await qwenGenerateImage({
      mode:input.mode,
      images,
      prompt:finalPrompt,
      // STEP 4 already sends a complete style/geometry prompt. Prompt
      // rewriting adds substantial latency for image-to-image requests and
      // can make the interactive route hit its timeout, so keep it disabled.
      promptExtend:false,
      negativePrompt:input.mode==='walkthrough-render'
        ? `different room, different viewpoint, changed camera, changed perspective, moved walls, relocated doors, relocated windows, new architectural layout, extra rooms, missing rooms, ${roomTypeNegativePrompt(input.roomType || inferRoomType(input.roomName))}`
        : undefined,
      model:input.mode==='walkthrough-render'?input.imageModel:undefined,
      // The provider's automatic size selection can choose a large output and
      // exceed the interactive request timeout. Keep the size configurable,
      // with a bounded default for walkthrough renders.
      size:outputSize,
      signal:options?.signal,
    })
    const normalizedFrame=await normalizeLocalGeneratedImage(result.url,prepared.originalWidth || prepared.width,prepared.originalHeight || prepared.height,input.mode==='floorplan-edit'?prepared as PreparedFloorPlanImage:undefined,input.mode==='walkthrough-render'?prepared:undefined)
    options?.signal?.throwIfAborted()
    let change:Awaited<ReturnType<typeof measureImageChange>>|undefined
    const generatedBytes=c.mode==='local'?await readGeneratedImage(result.url):undefined
    options?.signal?.throwIfAborted()
    if(generatedBytes&&sources[0].startsWith('data:image/')){
      change=await measureImageChange(Buffer.from(sources[0].slice(sources[0].indexOf(',')+1),'base64'),generatedBytes)
      options?.signal?.throwIfAborted()
      if(!change.changed)throw Object.assign(new Error('生成结果与原图几乎相同，未标记为编辑成功。请更换要求或重新采样。'),{status:422})
    }
    const output={provider:'qwen' as const,model:result.model,url:result.url,ephemeral:result.ephemeral,fallback:false,requestId:result.requestId,inputImageCount:images.length,prompt:finalPrompt,generation:{...result.generation,cacheHit:false,...change,...(input.mode==='walkthrough-render'&&normalizedFrame?{...normalizedFrame,frameVersion:'capture-padded/v1'}:{})}}
    options?.signal?.throwIfAborted()
    if(cacheKey)await writeImageResult(cacheKey,output,undefined,options?.signal).catch(error=>{options?.signal?.throwIfAborted();console.warn('[DreamHouse][image][cache]',{message:error.message})})
    options?.signal?.throwIfAborted()
    return output
  }catch(error:any){
    if(options?.signal?.aborted)throw options.signal.reason||error
    console.error('[DreamHouse][image][qwen]',{model:c.imageModel,mode:input.mode,status:error?.status,message:error?.message})
    if(fallbackAllowed())return{provider:'mock' as const,model:'local-preset',url:fallbackImage(input),ephemeral:false,fallback:true,fallbackReason:error?.message||'Qwen image failed',prompt:promptFor(input)}
    throw error
  }finally{release?.()}
}

export async function persistGeneratedImage(url:string){
  // Hook point for OSS. Qwen Image result URLs are temporary; the official API currently keeps them for about 24h.
  // Serverless deployments should upload the remote image to OSS/S3 rather than trying to write into /public at runtime.
  return{url,persisted:false,reason:process.env.ALIYUN_OSS_BUCKET?'OSS variables are present but uploader is intentionally left as an adapter hook':'OSS is not configured'}
}
