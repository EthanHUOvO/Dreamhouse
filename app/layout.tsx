import './globals.css'
import GlobalBackground from '@/components/layout/GlobalBackground'
export const metadata={title:'DreamHouse v11',description:'Generative residential design and digital construction platform'}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><head><link rel="preload" as="image" href="/branding/beijing-construction/global-page-background.png" /></head><body><div className="app-shell"><GlobalBackground /><div className="app-content">{children}</div></div></body></html>}
