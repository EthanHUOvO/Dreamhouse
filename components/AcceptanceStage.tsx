'use client'

import type { PipelineState } from '@/lib/types'

export default function AcceptanceStage({
  state,
  setState
}:{
  state:PipelineState
  setState:(fn:(s:PipelineState)=>PipelineState)=>void
}){
  const productionOk=state.bom.length>0&&state.bom.every(x=>x.status==='已完成')
  const transportOk=state.inventory.length>0&&state.inventory.every(x=>x.status==='已到场')
  const constructionOk=state.construction.length>0&&state.construction.every(x=>x.status==='已完成')
  const canAccept=state.approved&&productionOk&&transportOk&&constructionOk

  return <div className="acceptance-layout">
    <section className="whiteboard-block acceptance-card">
      <div className="block-title">验收</div>
      <div className="accept-row"><span>设计确认</span><strong>{state.approved?'通过':'未完成'}</strong></div>
      <div className="accept-row"><span>生产完成</span><strong>{productionOk?'通过':'未完成'}</strong></div>
      <div className="accept-row"><span>运输到场</span><strong>{transportOk?'通过':'未完成'}</strong></div>
      <div className="accept-row"><span>现场施工</span><strong>{constructionOk?'通过':'未完成'}</strong></div>
      <button
        className="approve final-approve"
        disabled={!canAccept}
        onClick={()=>setState(s=>({...s,accepted:true}))}
      >
        完成验收
      </button>
      {state.accepted&&<div className="accept-result">HOUSE_001 · 验收完成</div>}
    </section>
  </div>
}
