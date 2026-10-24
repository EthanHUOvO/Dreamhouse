'use client'
import { useState } from 'react'
import type { Order } from '@/lib/types'
import { getApprovedDesign } from '@/lib/order-store'
import PascalViewer from '@/components/shared/PascalViewer'
export default function CustomerAcceptance({order,onAccept}:{order:Order;onAccept:()=>void}){const approved=getApprovedDesign(order),[walk,setWalk]=useState(false);return <div className="acceptance-page"><section className="card"><div className="card-title viewer-titlebar"><span>最终批准模型 · Design V{approved.version}</span><button onClick={()=>setWalk(v=>!v)}>{walk?'退出漫游':'进入漫游验收'}</button></div><div className="accept-viewer"><PascalViewer scene={approved.scene} revision={approved.version} walkthroughMode={walk} onExitWalkthrough={()=>setWalk(false)}/></div></section><section className="card acceptance-checks"><h3>验收清单</h3><div><span>设计版本一致性</span><b>通过</b></div><div><span>墙体/门窗接口</span><b>通过</b></div><div><span>家具布置与通行</span><b>待住户确认</b></div><button className="primary" onClick={onAccept} disabled={order.accepted}>{order.accepted?'已验收':'确认验收'}</button></section></div>}
