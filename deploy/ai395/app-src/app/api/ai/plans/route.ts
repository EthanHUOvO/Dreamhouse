import { NextRequest,NextResponse } from 'next/server'
import { getAiProvider } from '@/lib/ai/provider'
export async function POST(req:NextRequest){try{const body=await req.json();const proposals=await getAiProvider().generatePlans(body);return NextResponse.json({proposals})}catch(error:any){return NextResponse.json({error:error?.message||'AI plan generation failed'},{status:500})}}
