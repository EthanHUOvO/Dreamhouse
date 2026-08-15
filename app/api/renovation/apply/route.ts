import { NextResponse } from 'next/server'
import { loadCurrentScene, saveCurrentScene } from '@/lib/house-store'
import { compileAndGuard } from '@/lib/constraint-guard'
import { applyPatches } from '@/lib/apply-patches'
import type { RenovationPlan } from '@/lib/types'
export async function POST(request:Request){try{const {plan}=await request.json() as {plan:RenovationPlan};const scene=await loadCurrentScene();const guard=compileAndGuard(scene,plan);if(guard.blocked.length&&!guard.patches.length)return NextResponse.json({ok:false,guard},{status:400});const next=applyPatches(scene,guard.patches);const versionId=await saveCurrentScene(next,'renovation');return NextResponse.json({ok:true,versionId,scene:next,guard})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:500})}}
