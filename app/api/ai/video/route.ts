import { NextRequest,NextResponse } from 'next/server'
import { getAiProvider } from '@/lib/ai/provider'
export async function POST(req:NextRequest){try{const body=await req.json();const concept=await getAiProvider().generateVideo(body);return NextResponse.json({concept})}catch(error:any){return NextResponse.json({error:error?.message||'AI video failed'},{status:500})}}
