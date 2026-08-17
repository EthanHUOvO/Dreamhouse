'use client'
import type { Order } from '@/lib/types'
function Video({src}:{src?:string}){return <div className="customer-video">{src?<video src={src} controls muted loop playsInline/>:<div><b>现场实时视频</b><span>MP4 / HLS / WebRTC</span></div>}</div>}
export default function CustomerConstruction({order}:{order:Order}){
  const milestones=[['设计完成',true],['构件生产完成',order.productionProgress>=100],['构件运输到场',['construction','acceptance','completed'].includes(order.status)],['墙体 / 家具装配',order.constructionProgress>=100],['进入验收',['acceptance','completed'].includes(order.status)]] as const
  return <div className="customer-construction"><div className="customer-progress-card"><div className="big-progress"><strong>{order.constructionProgress}%</strong><span>整体施工进度</span></div><div className="bar"><i style={{width:`${order.constructionProgress}%`}}/></div><div className="milestones">{milestones.map(([name,done],i)=><div key={name} className={done?'done':''}><b>{done?'✓':i+1}</b><span>{name}</span></div>)}</div></div><Video src={process.env.NEXT_PUBLIC_CONSTRUCTION_VIDEO}/></div>
}
