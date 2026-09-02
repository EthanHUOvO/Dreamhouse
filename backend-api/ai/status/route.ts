import { NextResponse } from 'next/server'
import { qwenBaseUrl,qwenConfigured,qwenModel } from '@/lib/ai/qwen-client'

export const runtime='nodejs'

export async function GET(){
  const provider=(process.env.AI_PROVIDER||'mock').toLowerCase()==='qwen'?'qwen':'mock'
  return NextResponse.json({
    provider,
    configured:provider==='qwen'?qwenConfigured():true,
    model:provider==='qwen'?qwenModel():'DreamHouse Mock Tool Agent',
    baseUrl:provider==='qwen'?qwenBaseUrl().replace(/https?:\/\//,'').replace(/\/compatible-mode\/v1$/,''):undefined,
    bomAiEnabled:(process.env.BOM_AI_ENABLED||'true')!=='false',
    imageConfigured:Boolean(process.env.QWEN_IMAGE_ENDPOINT),
    videoConfigured:Boolean(process.env.WAN_VIDEO_ENDPOINT)
  })
}
