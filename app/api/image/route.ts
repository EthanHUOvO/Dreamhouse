import { NextRequest, NextResponse } from 'next/server'
import { getMockImages } from '@/lib/demo-data'
import { callQwenImage, hasQwenConfig } from '@/lib/qwen'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const layout = body?.layout
    if (!layout) {
      return NextResponse.json({ error: 'layout_required' }, { status: 400 })
    }

    if (hasQwenConfig()) {
      try {
        const overall = await callQwenImage(`请根据以下户型改造说明生成一个整体室内俯视渲染图：${layout.title}；${layout.summary}`)
        const roomNames: string[] = Array.isArray(layout.rooms) ? layout.rooms.slice(0, 3) : ['客餐厅', '主卧', '卫生间']
        const roomRenders = await Promise.all(
          roomNames.map(async room => {
            const img = await callQwenImage(`请生成“${room}”的室内效果图，风格简洁、可落地，与以下户型方案一致：${layout.title}；${layout.summary}`)
            return { name: room, image: img.url, desc: `${room} 的单独渲染图` }
          }),
        )

        return NextResponse.json({ source: 'qwen', images: { overallRender: overall.url, roomRenders } })
      } catch (error) {
        console.error('Qwen image generation failed, fallback to mock:', error)
      }
    }

    return NextResponse.json({ source: 'mock', images: getMockImages(layout) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'image_generation_failed' }, { status: 500 })
  }
}
