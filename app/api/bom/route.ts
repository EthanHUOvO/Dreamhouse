import { NextRequest, NextResponse } from 'next/server'
import { getMockBom } from '@/lib/demo-data'
import { callQwenText, hasQwenConfig } from '@/lib/qwen'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const layout = body?.layout
    if (!layout) {
      return NextResponse.json({ error: 'layout_required' }, { status: 400 })
    }

    if (hasQwenConfig()) {
      try {
        const result = await callQwenText(
          JSON.stringify(layout),
          '你是装修BOM估算助手。请根据输入户型 JSON 输出 JSON：{"items":[{"category":"","name":"","spec":"","unit":"","quantity":0,"note":""}],"printSheets":[""],"projectName":""}，不要输出额外文本。',
        ) as { items?: unknown[]; printSheets?: string[]; projectName?: string }

        const fallback = getMockBom(layout)
        return NextResponse.json({
          source: 'qwen',
          bom: {
            ...fallback,
            projectName: result.projectName || fallback.projectName,
            printSheets: result.printSheets?.length ? result.printSheets : fallback.printSheets,
            items: Array.isArray(result.items) && result.items.length ? result.items : fallback.items,
          },
        })
      } catch (error) {
        console.error('Qwen BOM generation failed, fallback to mock:', error)
      }
    }

    return NextResponse.json({ source: 'mock', bom: getMockBom(layout) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'bom_generation_failed' }, { status: 500 })
  }
}
