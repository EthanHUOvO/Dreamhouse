import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ideal Home · 理想家',
  description: 'Pascal-native lifecycle-driven residential reconfiguration'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
