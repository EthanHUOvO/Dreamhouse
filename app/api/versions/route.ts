import { NextResponse } from 'next/server'
import { listVersions } from '@/lib/house-store'
export async function GET(){return NextResponse.json({versions:await listVersions()})}
