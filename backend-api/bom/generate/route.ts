import { NextRequest,NextResponse } from 'next/server'
import { generateDetailedBom } from '@/lib/bom/service'
import type { DesignVersion,DrawingSource,UserProfile } from '@/lib/types'
export const runtime='nodejs'
export async function POST(req:NextRequest){
  try{
    const body=await req.json() as {design?:DesignVersion;profile?:UserProfile;drawing?:DrawingSource}
    if(!body.design?.scene)return NextResponse.json({error:'design.scene is required'},{status:400})
    const bom=await generateDetailedBom({design:body.design,profile:body.profile,drawing:body.drawing})
    return NextResponse.json({bom})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500})}
}
