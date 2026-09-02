import { NextRequest, NextResponse } from 'next/server'
import { getMockLayout, type ResidenceType } from '@/lib/demo-data'
import { callQwenText, hasQwenConfig } from '@/lib/qwen'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const residenceType = (body?.residenceType || 'one') as ResidenceType
    const prompt = String(body?.prompt || '')

    if (hasQwenConfig()) {
      try {
        const result = await callQwenText(
          prompt,
          '你是户型改造助手。请根据用户输入输出 JSON：{"title":"","summary":"","rooms":[""],"designNotes":[""]}，不要输出额外文本。',
        ) as { title?: string; summary?: string; rooms?: string[]; designNotes?: string[] }

        const fallback = getMockLayout(residenceType, prompt)
        return NextResponse.json({
          source: 'qwen',
          layout: {
            ...fallback,
            title: result.title || fallback.title,
            summary: result.summary || fallback.summary,
            rooms: result.rooms?.length ? result.rooms : fallback.rooms,
          },
          designNotes: result.designNotes || [],
        })
      } catch (error) {
        console.error('Qwen layout generation failed, fallback to mock:', error)
      }
    }

    return NextResponse.json({ source: 'mock', layout: getMockLayout(residenceType, prompt), designNotes: [] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'layout_generation_failed' }, { status: 500 })
  }
}
