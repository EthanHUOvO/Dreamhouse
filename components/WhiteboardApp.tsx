'use client'

import { useEffect,useState } from 'react'
import DesignStage from './DesignStage'
import ProductionStage from './ProductionStage'
import InventoryStage from './InventoryStage'
import ConstructionStage from './ConstructionStage'
import AcceptanceStage from './AcceptanceStage'
import { createInitialHouseScene } from '@/lib/house-scene'
import { generateBom,generateConstruction,generateInventory } from '@/lib/bom'
import { initialPipeline,loadPipeline,loadScene,resetAll,savePipeline,saveScene } from '@/lib/client-store'
import type { PipelineState,SceneGraph } from '@/lib/types'

const stages=['设计','生产','库存运输','现场施工','验收'] as const

export default function WhiteboardApp(){
  const[stage,setStage]=useState(0)
  const[scene,setScene]=useState<SceneGraph>(createInitialHouseScene())
  const[pipeline,setPipelineRaw]=useState<PipelineState>(initialPipeline)
  const[revision,setRevision]=useState(0)
  const[hydrated,setHydrated]=useState(false)

  useEffect(()=>{
    setScene(loadScene())
    setPipelineRaw(loadPipeline())
    setHydrated(true)
  },[])

  function setPipeline(fn:(s:PipelineState)=>PipelineState){
    setPipelineRaw(prev=>{
      const next=fn(prev)
      savePipeline(next)
      return next
    })
  }

  function approveDesign(){
    const bom=generateBom(scene)
    const inventory=generateInventory(bom)
    const construction=generateConstruction()
    const version=`V${String(Date.now()).slice(-4)}`
    setPipeline(()=>({
      approved:true,
      approvedVersion:version,
      bom,
      inventory,
      construction,
      printerProgress:0,
      robotProgress:0,
      accepted:false
    }))
    saveScene(scene)
    setStage(1)
  }

  function resetProject(){
    resetAll()
    const fresh=createInitialHouseScene()
    saveScene(fresh)
    setScene(fresh)
    setPipelineRaw(initialPipeline)
    savePipeline(initialPipeline)
    setRevision(x=>x+1)
    setStage(0)
  }

  if(!hydrated)return <div className="boot">正在加载项目…</div>

  return <main className="app">
    <header className="titlebar">
      <div>
        <div className="project-title">基于AI的理想家可变空间智能建造解决方案</div>
        <div className="project-id">HOUSE_001 · 白板严格执行版</div>
      </div>
      <button className="reset-project" onClick={resetProject}>重置项目</button>
    </header>

    <nav className="stage-nav">
      {stages.map((name,i)=>
        <button key={name} className={stage===i?'active':''} onClick={()=>setStage(i)}>
          <b>{i+1}</b><span>{name}</span>
        </button>
      )}
    </nav>

    <section className="stage-body">
      {stage===0&&<DesignStage
        scene={scene}
        setScene={setScene}
        revision={revision}
        setRevision={setRevision}
        onApprove={approveDesign}
      />}
      {stage===1&&<ProductionStage state={pipeline} setState={setPipeline}/>}
      {stage===2&&<InventoryStage state={pipeline} setState={setPipeline}/>}
      {stage===3&&<ConstructionStage state={pipeline} setState={setPipeline}/>}
      {stage===4&&<AcceptanceStage state={pipeline} setState={setPipeline}/>}
    </section>

    <footer className="flow-footer">
      <span>1 设计</span><i>→</i><span>2 生产</span><i>→</i><span>3 库存运输</span><i>→</i><span>4 现场施工</span><i>→</i><span>5 验收</span>
      {pipeline.approved&&<em>设计版本：{pipeline.approvedVersion}</em>}
    </footer>
  </main>
}
