'use client'

import { useState } from 'react'
import PascalViewer from './PascalViewer'
import Floorplan2D from './Floorplan2D'
import { createScenarioScene,planFromPrompt } from '@/lib/scenarios'
import { saveScene } from '@/lib/client-store'
import type { RenovationPlan,SceneGraph } from '@/lib/types'

export default function DesignStage({
  scene,
  setScene,
  revision,
  setRevision,
  onApprove
}:{
  scene:SceneGraph
  setScene:(scene:SceneGraph)=>void
  revision:number
  setRevision:(fn:(x:number)=>number)=>void
  onApprove:()=>void
}){
  const[prompt,setPrompt]=useState('家里有孩子了，把电竞房改成儿童房，并把卫生间切成主卫和公卫。')
  const[plan,setPlan]=useState<RenovationPlan|null>(null)

  function generate(){
    setPlan(planFromPrompt(prompt))
  }

  function apply(){
    if(!plan)return
    const next=createScenarioScene(plan.type)
    saveScene(next)
    setScene(next)
    setRevision(x=>x+1)
  }

  return <div className="design-grid">
    <section className="whiteboard-block interaction-block">
      <div className="block-title">对话式交互</div>
      <div className="subline">无语音版</div>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <button className="primary" onClick={generate}>生成空间方案</button>

      <div className="confirm-area">
        <div className="confirm-title">确认的需求（设计）</div>
        {plan
          ? <>
              <strong>{plan.title}</strong>
              <p>{plan.summary}</p>
              {plan.changes.map((x,i)=><div className="change" key={i}>{i+1}. {x}</div>)}
              <button className="secondary" onClick={apply}>应用到设计</button>
            </>
          : <span>等待生成方案</span>
        }
      </div>

      <button className="approve" onClick={onApprove}>确认当前设计</button>
    </section>

    <section className="whiteboard-block">
      <div className="block-title">2D图纸</div>
      <div className="subline">渲染效果</div>
      <div className="fill">
        <Floorplan2D scene={scene}/>
      </div>
    </section>

    <section className="whiteboard-block">
      <div className="block-title">3D展示</div>
      <div className="subline">Pascal 展示 · 门窗 · 家具 · 房间</div>
      <div className="fill viewer-fill">
        <PascalViewer revision={revision}/>
      </div>
    </section>
  </div>
}
