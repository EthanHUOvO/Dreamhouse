import { NextResponse } from 'next/server'
import { getAiConfig } from '@/lib/ai/config'
import { existsSync } from 'node:fs'

export const runtime='nodejs'
export async function GET(){
  const c=getAiConfig()
  const imageModel=process.env.QWEN_INTERIOR_IMAGE_MODEL||c.imageModel
  const probe=async(url:string)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});const body=await response.text();let details:Record<string,unknown>={};try{details=JSON.parse(body)}catch{}return{healthy:response.ok,status:response.status,message:response.ok?undefined:body.slice(0,160),details}}catch(error:any){return{healthy:false,message:String(error?.message||error).slice(0,160)}}finally{clearTimeout(timer)}}
  const [text,image,mcp]=await Promise.all([
    probe(`${c.compatBaseUrl.replace(/\/v1$/,'')}/health`),
    probe(`${c.nativeBaseUrl}/health`),
    probe(c.mcpUrl.replace(/\/mcp$/,'/health')),
  ])
  const visionProjector=process.env.LOCAL_VISION_PROJECTOR||'mmproj-F16.gguf'
  const vision={healthy:text.healthy,projector:visionProjector,message:text.healthy?undefined:'vision projector depends on the text service'}
  const rocmDeviceVisible=existsSync('/dev/kfd')
  const rocm={healthy:rocmDeviceVisible&&text.healthy&&image.healthy,device:'/dev/kfd',message:rocmDeviceVisible?undefined:'ROCm KFD device is not visible to the web container'}
  return NextResponse.json({
    mode:c.mode,
    localOnly:c.mode==='local',
    ready:text.healthy&&vision.healthy&&image.healthy&&mcp.healthy&&rocm.healthy,
    models:{layout:c.layoutModel,image:imageModel,bom:c.bomModel},
    services:{text,vision,image,mcp,rocm},
    endpoints:{text:c.compatBaseUrl,image:c.nativeBaseUrl,mcp:c.mcpUrl},
    acceleration:{text:'llama.cpp-hip',image:'pytorch-rocm',expectedVramBytes:103079215104},
    persistence:{generatedImageDirectory:process.env.GENERATED_IMAGE_DIR||'/data/generated',imageUrlsMayExpire:false},
    license:{qwenImage21:'research-use-until-commercial-license-confirmed'},
  })
}
