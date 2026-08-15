'use client'

import type { PipelineState,InventoryStatus } from '@/lib/types'

const sequence:InventoryStatus[]=['待入库','已入库','已出库','运输中','已到场']

export default function InventoryStage({
  state,
  setState
}:{
  state:PipelineState
  setState:(fn:(s:PipelineState)=>PipelineState)=>void
}){
  function advance(id:string){
    setState(s=>({
      ...s,
      inventory:s.inventory.map(row=>{
        if(row.id!==id)return row
        const index=sequence.indexOf(row.status)
        return {...row,status:sequence[Math.min(index+1,sequence.length-1)]}
      })
    }))
  }

  return <div className="inventory-layout">
    <section className="whiteboard-block inventory-column">
      <div className="block-title">入库</div>
      {state.inventory.map(row=>
        <button key={row.id} className="inventory-item" onClick={()=>advance(row.id)}>
          <strong>{row.label}</strong><span>{row.quantity} 件</span><em>{row.status}</em>
        </button>
      )}
    </section>

    <section className="whiteboard-block inventory-column">
      <div className="block-title">出库</div>
      {state.inventory.filter(x=>['已出库','运输中','已到场'].includes(x.status)).map(row=>
        <div className="inventory-static" key={row.id}><strong>{row.label}</strong><span>{row.status}</span></div>
      )}
      {!state.inventory.some(x=>['已出库','运输中','已到场'].includes(x.status))&&<div className="empty">暂无出库构件</div>}
    </section>

    <section className="whiteboard-block inventory-column">
      <div className="block-title">运输</div>
      <div className="truck">
        <div className="truck-body">HOUSE_001</div><div className="truck-head"/><i/><i/>
      </div>
      <p>按施工顺序将完成构件运输至现场。</p>
      <div className="transport-status">
        已到场：{state.inventory.filter(x=>x.status==='已到场').length} / {state.inventory.length}
      </div>
    </section>
  </div>
}
