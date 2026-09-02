import { NextRequest,NextResponse } from 'next/server'
import { getAiProvider } from '@/lib/ai/provider'

export const runtime='nodejs'

export async function POST(req:NextRequest){
  try{
    const body=await req.json()
    if(!body?.design?.scene||!String(body?.prompt||'').trim())return NextResponse.json({error:'design.scene and prompt are required'},{status:400})
    const run=await getAiProvider().generateLayout({...body,prompt:String(body.prompt).trim()})
    return NextResponse.json({run})
  }catch(error:any){
    return NextResponse.json({error:error?.message||'AI layout generation failed'},{status:500})
  }
}
