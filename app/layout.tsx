import './globals.css'
import type { Metadata } from 'next'
export const metadata:Metadata={title:'理想家双门户平台',description:'住户端与施工方端共享订单与设计版本'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
