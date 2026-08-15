'use client'

import { useEffect,useRef } from 'react'
import type { PipelineState } from '@/lib/types'

function VideoBox({src}:{src?:string}){
  return <div className="video-box">
    {src?<video src={src} controls muted loop playsInline/>:<div className="video-placeholder"><span>机械臂实时画面</span><small>MP4 / HLS / WebRTC</small></div>}
  </div>
}

export default function ConstructionStage({
  state,
  setState
}:{
  state:PipelineState
  setState:(fn:(s:PipelineState)=>PipelineState)=>void
}){
  const timer=useRef<any>(null)
  useEffect(()=>()=>clearInterval(timer.current),[])

  function runRobot(){
    clearInterval(timer.current)
    setState(s=>({
      ...s,
      robotProgress:0,
      construction:s.construction.map(t=>t.method==='机械臂'?{...t,status:'施工中'}:t)
    }))
    timer.current=setInterval(()=>{
      setState(s=>{
        const next=Math.min(100,s.robotProgress+5)
        if(next>=100){
          clearInterval(timer.current)
          return {
            ...s,
            robotProgress:100,
            construction:s.construction.map(t=>t.method==='机械臂'?{...t,status:'已完成'}:t)
          }
        }
        return {...s,robotProgress:next}
      })
    },220)
  }

  function finishManual(){
    setState(s=>({
      ...s,
      construction:s.construction.map(t=>t.method==='人工'?{...t,status:'已完成'}:t)
    }))
  }

  return <div className="construction-layout">
    <section className="whiteboard-block manual-block">
      <div className="block-title">人工</div>
      {state.construction.filter(x=>x.method==='人工').map(t=>
        <div className="task-line" key={t.id}><strong>{t.label}</strong><span>{t.status}</span></div>
      )}
      <button className="secondary" onClick={finishManual}>完成人工施工</button>
    </section>

    <section className="whiteboard-block robot-block">
      <div className="block-title">机械臂</div>
      {state.construction.filter(x=>x.method==='机械臂').map(t=>
        <div className="task-line" key={t.id}><strong>{t.label}</strong><span>{t.status}</span></div>
      )}
      <button className="primary" onClick={runRobot}>执行机械臂施工</button>
    </section>

    <section className="whiteboard-block robot-status-block">
      <div className="block-title">状态信息（机械臂）</div>
      <div className="status-grid">
        <div><span>设备</span><strong>Robot-01</strong></div>
        <div><span>当前动作</span><strong>抓取 / 定位 / 装配</strong></div>
        <div><span>进度</span><strong>{state.robotProgress}%</strong></div>
        <div><span>状态</span><strong>{state.robotProgress===100?'完成':state.robotProgress>0?'执行中':'待机'}</strong></div>
      </div>
      <div className="progress"><i style={{width:`${state.robotProgress}%`}}/></div>
    </section>

    <section className="whiteboard-block robot-video-block">
      <div className="block-title">视频</div>
      <VideoBox src={process.env.NEXT_PUBLIC_ROBOT_VIDEO}/>
    </section>
  </div>
}
