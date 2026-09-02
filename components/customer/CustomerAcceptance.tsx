'use client'
import { useState } from 'react'
import PascalViewer from '@/components/shared/PascalViewer'
import { getApprovedDesign } from '@/lib/order-store'
import type { Order } from '@/lib/types'
export default function CustomerAcceptance({order,onAccept}:{order:Order;onAccept:()=>void}){
  const design=getApprovedDesign(order),ready=['acceptance','completed'].includes(order.status)
  const[walkthroughMode,setWalkthroughMode]=useState(false)
  const rows=[['墙体布局',ready],['门窗位置',ready],['家具与空间功能',ready],['施工完成度',order.constructionProgress>=100]] as const
  return <div className="acceptance-grid"><section className="card acceptance-model"><div className="card-title viewer-titlebar"><span>设计模型</span><button className={`open-walkthrough-control ${walkthroughMode?'active':''}`} onClick={()=>setWalkthroughMode(v=>!v)}>{walkthroughMode?'退出漫游':'进入漫游'}</button></div><PascalViewer scene={design.scene} revision={design.version} walkthroughMode={walkthroughMode} onExitWalkthrough={()=>setWalkthroughMode(false)}/></section><section className="card acceptance-result"><div className="card-title">验收结果</div>{rows.map(([name,ok])=><div className="acceptance-row" key={name}><span>{name}</span><strong>{ok?'✓ 通过':'待检查'}</strong></div>)}<button className="accept-btn" disabled={!ready||order.accepted} onClick={onAccept}>{order.accepted?'已确认验收':'确认验收'}</button></section></div>
}
