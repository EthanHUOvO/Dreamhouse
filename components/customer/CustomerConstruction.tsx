'use client'
import type { Order } from '@/lib/types'
function Video({src}:{src?:string}){return <div className="customer-video">{src?<video src={src} controls muted loop playsInline/>:<div><b>现场实时视频</b><span>MP4 / HLS / WebRTC</span></div>}</div>}

export default function CustomerConstruction({
  order,
  onRedesign,
  onContinueDraft,
  onWithdrawAndEdit,
}:{
  order:Order
  onRedesign:()=>void
  onContinueDraft:()=>void
  onWithdrawAndEdit:()=>void
}){
  const inProduction=['production','transport'].includes(order.status)
  const activeProgress=inProduction?order.productionProgress:order.constructionProgress
  const activeLabel=order.status==='production'?'构件生产进度':order.status==='transport'?'构件生产完成 / 等待到场':'现场施工进度'
  const draft=order.draftVersionId?order.designVersions.find(v=>v.id===order.draftVersionId):undefined
  const changeStatus=order.changeRequest?.status
  const milestones=[
    ['设计版本已确认',true],
    ['BOM 已同步',Boolean(order.downstreamVersion||order.approvedVersion)],
    ['构件生产完成',order.productionProgress>=100],
    ['构件运输到场',['construction','acceptance','completed'].includes(order.status)],
    ['墙体 / 家具装配',order.constructionProgress>=100],
    ['进入验收',['acceptance','completed'].includes(order.status)]
  ] as const

  return <div className="customer-construction">
    <div className="customer-progress-card">
      <div className="flow-sync-chip">Design V{order.downstreamVersion??order.approvedVersion} 已同步至后续流程</div>
      <div className="construction-design-actions">
        <div>
          <strong>需要继续修改户型或家具？</strong>
          {!draft&&<span>从当前批准的 Design V{order.approvedVersion} 创建新的设计版本，不会覆盖正在使用的施工版本。</span>}
          {draft&&changeStatus==='draft'&&<span>Design V{draft.version} Draft 仍在保存，可以继续回到设计页修改。</span>}
          {draft&&changeStatus==='submitted'&&<span>Design V{draft.version} 已提交但尚未被施工方接受，可以先撤回，再继续修改。</span>}
        </div>
        {!draft&&<button className="redesign-return-btn" onClick={onRedesign}>重新设计</button>}
        {draft&&changeStatus==='draft'&&<button className="redesign-return-btn" onClick={onContinueDraft}>继续修改 Design V{draft.version}</button>}
        {draft&&changeStatus==='submitted'&&<button className="redesign-return-btn warning" onClick={onWithdrawAndEdit}>撤回并继续修改</button>}
      </div>
      <div className="big-progress"><strong>{activeProgress}%</strong><span>{activeLabel}</span></div>
      <div className="bar"><i style={{width:`${activeProgress}%`}}/></div>
      <div className="stage-progress-grid">
        <div><span>生产</span><b>{order.productionProgress}%</b></div>
        <div><span>施工</span><b>{order.constructionProgress}%</b></div>
      </div>
      <div className="milestones">{milestones.map(([name,done],i)=><div key={name} className={done?'done':''}><b>{done?'✓':i+1}</b><span>{name}</span></div>)}</div>
    </div>
    <Video src={process.env.NEXT_PUBLIC_CONSTRUCTION_VIDEO}/>
  </div>
}
