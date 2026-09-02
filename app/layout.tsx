import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'DreamHouse TouchFlow v13',
  description: '触摸屏翻页式 DreamHouse 演示系统：住户入口 + 施工入口 + Qwen API 占位接口',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}