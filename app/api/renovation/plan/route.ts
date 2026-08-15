import { NextResponse } from 'next/server'
import { loadCurrentScene } from '@/lib/house-store'
import { createRenovationPlan } from '@/lib/renovation-planner'
import { compileAndGuard } from '@/lib/constraint-guard'
export async function POST(request:Request){try{const body=await request.json();const prompt=String(body.prompt??'').trim();if(!prompt)return NextResponse.json({error:'prompt required'},{status:400});const scene=await loadCurrentScene();const plan=await createRenovationPlan(prompt,scene);const guard=compileAndGuard(scene,plan);return NextResponse.json({plan,guard})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500})}}
