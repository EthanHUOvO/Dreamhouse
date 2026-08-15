'use client'

import { useEffect,useRef } from 'react'
import type { BomRow,PipelineState } from '@/lib/types'

function VideoBox({src,label}:{src?:string;label:string}){
  return <div className="video-box">
    {src
      ? <video src={src} controls muted loop playsInline/>
      : <div className="video-placeholder"><span>{label}</span><small>MP4 / HLS / WebRTC</small></div>
    }
  </div>
}

export default function ProductionStage({
  state,
  setState
}:{
  state:PipelineState
  setState:(fn:(s:PipelineState)=>PipelineState)=>void
}){
  const timer=useRef<any>(null)

  useEffect(()=>()=>clearInterval(timer.current),[])

  function startProduction(){
    clearInterval(timer.current)
    setState(s=>({
      ...s,
      bom:s.bom.map((b,i)=>i===0?{...b,status:'生产中'}:b),
      printerProgress:0
    }))

    timer.current=setInterval(()=>{
      setState(s=>{
        const next=Math.min(100,s.printerProgress+4)
        if(next>=100){
          clearInterval(timer.current)
          return {
            ...s,
            printerProgress:100,
            bom:s.bom.map(b=>({...b,status:'已完成'}))
          }
        }
        return {...s,printerProgress:next}
      })
    },220)
  }

  const wall=state.bom.find(x=>x.category==='wall')
  const furniture=state.bom.find(x=>x.category==='furniture')

  return <div className="production-layout">
    <section className="whiteboard-block bom-block">
      <div className="block-title">BOM清单及排序展示</div>
      <div className="bom-table">
        <div className="bom-head"><span>顺序</span><span>构件</span><span>数量</span><span>方式</span><span>状态</span></div>
        {state.bom.sort((a,b)=>a.order-b.order).map(row=>
          <div className="bom-row" key={row.id}>
            <span>{String(row.order).padStart(2,'0')}</span>
            <strong>{row.label}</strong>
            <span>{row.quantity}</span>
            <span>{row.method}</span>
            <span>{row.status}</span>
          </div>
        )}
      </div>
    </section>

    <section className="whiteboard-block split-card">
      <div className="split-half">
        <div className="block-title small">墙体</div>
        <div className="component-visual wall-visual">
          <div/><div/><div/>
        </div>
        <strong>{wall?.quantity??0} 件</strong>
        <span>3D打印模型</span>
      </div>
      <div className="split-half">
        <div className="block-title small">家具</div>
        <div className="component-visual furniture-visual">
          <div/><div/><div/>
        </div>
        <strong>{furniture?.quantity??0} 件</strong>
        <span>采购 / 分类清单</span>
      </div>
    </section>

    <section className="whiteboard-block printer-status">
      <div className="block-title">状态信息（打印机）</div>
      <div className="status-grid">
        <div><span>设备</span><strong>Printer-01</strong></div>
        <div><span>当前任务</span><strong>墙体 / 地板</strong></div>
        <div><span>进度</span><strong>{state.printerProgress}%</strong></div>
        <div><span>状态</span><strong>{state.printerProgress===100?'完成':state.printerProgress>0?'打印中':'待机'}</strong></div>
      </div>
      <div className="progress"><i style={{width:`${state.printerProgress}%`}}/></div>
      <button className="primary production-btn" onClick={startProduction}>开始生产模拟</button>
    </section>

    <section className="whiteboard-block production-video">
      <div className="block-title">视频</div>
      <VideoBox src={process.env.NEXT_PUBLIC_PRINTER_VIDEO} label="打印机实时画面"/>
    </section>
  </div>
}
