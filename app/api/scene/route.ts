import { NextResponse } from 'next/server'
import { loadCurrentScene, saveCurrentScene } from '@/lib/house-store'
export async function GET(){return NextResponse.json(await loadCurrentScene())}
export async function POST(request:Request){const scene=await request.json();const versionId=await saveCurrentScene(scene,'pascal_manual');return NextResponse.json({ok:true,versionId})}
