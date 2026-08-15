import './globals.css'
import type { Metadata } from 'next'

export const metadata:Metadata={
  title:'理想家可变空间智能建造解决方案',
  description:'严格按照白板流程实现的设计、生产、库存运输、现场施工、验收系统'
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="zh-CN"><body>{children}</body></html>
}
