import { NextResponse } from 'next/server'
import { resetHouse } from '@/lib/house-store'
export async function POST(){return NextResponse.json(await resetHouse())}
