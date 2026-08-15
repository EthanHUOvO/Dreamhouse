'use client'

import { useState } from 'react'
import { useScene } from '@pascal-app/editor'
import PascalWorkspace from './PascalWorkspace'
import SceneSummary from './SceneSummary'
import FabricationPanel from './FabricationPanel'
import DesignControls from './DesignControls'
import { createInitialHouseScene } from '@/lib/house-scene'
import { createScenarioScene, planFromPrompt } from '@/lib/scene-utils'
import { saveScene, saveVersion } from '@/lib/client-store'
import type { RenovationPlan } from '@/lib/types'

const prompts={
  single:'现在是一个人居住，保留主卧、电竞房和书房。',
  couple:'我要结婚了，变成两个人居住，把电竞房改成衣帽间，把书房改成双人书房。',
  child:'家里有孩子了，把电竞房改成儿童房，并把卫生间切成主卫和公卫。',
  nanny:'家里有孩子了，还需要一个保姆房，并把卫生间切成主卫和公卫。'
}

export default function IdealHomeShell(){
  const[tab,setTab]=useState<'design'|'fabrication'>('design')
  const[prompt,setPrompt]=useState(prompts.child)
  const[plan,setPlan]=useState<RenovationPlan|null>(null)
  const[revision,setRevision]=useState(0)
  const[message,setMessage]=useState('READY · Pascal-native HOUSE_001 已加载')
  const nodes=useScene(s=>s.nodes) as Record<string,any>
  const scenario=nodes.building_house?.metadata?.scenario??'single'

  function generate(){const p=planFromPrompt(prompt);setPlan(p);setMessage(`PLAN READY · ${p.title}`)}
  function apply(){if(!plan||plan.type==='custom')return;const scene=createScenarioScene(plan.type);saveVersion(scene,plan.title,plan.type);setRevision(x=>x+1);setMessage(`APPLIED · ${plan.title} · 门窗/墙体/家具/语义已同步更新`);setPlan(null)}
  function reset(){const scene=createInitialHouseScene();saveScene(scene);saveVersion(scene,'恢复初始住宅','single');setRevision(x=>x+1);setPlan(null);setMessage('RESET · 已恢复单人居住初始住宅')}
  function saveManual(){const current={nodes:useScene.getState().nodes as any,rootNodeIds:useScene.getState().rootNodeIds as any};saveVersion(current as any,'Pascal 手动编辑版本');setMessage('SAVED · 当前 Pascal 手动编辑已保存到浏览器版本历史')}

  return <main className="app-shell">
    <header className="topbar"><div><div className="brand">IDEAL HOME <b>理想家</b></div><div className="subtitle">PASCAL-NATIVE LIFECYCLE RESIDENTIAL RECONFIGURATION</div></div><div className="top-actions"><span className="status"><i/>HOUSE_001 · {String(scenario).toUpperCase()}</span><button onClick={saveManual}>保存当前版本</button></div></header>
    <section className="workspace">
      <aside className="left-panel panel">
        <div className="eyebrow">INTERACTION</div><h2>生活变化，住宅持续重构</h2><p className="muted">这次中间不再是手写 Three.js 房子，而是真正的 Pascal Editor Scene。门窗作为墙体子节点，并由 Pascal 自动切洞。</p>
        <label>家庭生命周期</label><div className="life-grid"><button onClick={()=>setPrompt(prompts.single)}>01 单人</button><button onClick={()=>setPrompt(prompts.couple)}>02 两人</button><button onClick={()=>setPrompt(prompts.child)}>03 育儿</button><button onClick={()=>setPrompt(prompts.nanny)}>04 育儿+保姆</button></div>
        <label>空间改造指令</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={7}/><button className="primary" onClick={generate}>生成改造方案</button>
        {plan&&<div className="plan-card"><div className="plan-title">{plan.title}</div><p>{plan.summary}</p><div className="change-list">{plan.changes.map((x,i)=><span key={i}>{i+1}. {x}</span>)}</div>{plan.warning&&<div className="warning">{plan.warning}</div>}<div className="patch">预计改造操作：{plan.patchCount}</div>{plan.type!=='custom'&&<button className="primary" onClick={apply}>确认并应用到 Pascal</button>}</div>}
        <button className="secondary" onClick={reset}>恢复初始住宅</button><div className="message">{message}</div>
      </aside>
      <section className="center-panel panel"><div className="center-head"><div><div className="eyebrow">PASCAL EDITOR</div><strong>真实墙体 · 门窗开洞 · 家具 · Room Zone</strong></div><DesignControls/></div><div className="editor-host"><PascalWorkspace revision={revision}/></div></section>
      <aside className="right-panel panel"><div className="tabs"><button className={tab==='design'?'active':''} onClick={()=>setTab('design')}>DESIGN</button><button className={tab==='fabrication'?'active':''} onClick={()=>setTab('fabrication')}>FABRICATION</button></div>{tab==='design'?<div><div className="eyebrow">SEMANTIC BUILDING MODEL</div><h2>住宅构件与语义</h2><SceneSummary/><div className="timeline"><strong>LIFE TIMELINE</strong><span>单人</span><i/><span>两人</span><i/><span>育儿</span><i/><span>自定义</span></div></div>:<FabricationPanel/>}</aside>
    </section>
  </main>
}
