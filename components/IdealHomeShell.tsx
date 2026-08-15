'use client'
import { useState } from 'react'
import PascalWorkspace from './PascalWorkspace'
import SceneSummary from './SceneSummary'
import FabricationPanel from './FabricationPanel'

type PlanResponse={plan:any;guard:{patches:any[];blocked:string[];warnings:string[]}}
const stagePrompts:Record<string,string>={single:'现在是一个人居住，保留主卧、电竞房和书房。',couple:'我要结婚了，变成两个人居住，把电竞房改成衣帽间，把书房改成双人书房。',child:'家里有孩子了，把电竞房改成儿童房，并把卫生间切成主卫和公卫。',nanny:'家里有孩子了，还需要一个保姆房，并把卫生间切成主卫和公卫。'}

export default function IdealHomeShell(){
  const[tab,setTab]=useState<'design'|'fabrication'>('design');const[prompt,setPrompt]=useState('把电竞房改成衣帽间');const[planData,setPlanData]=useState<PlanResponse|null>(null);const[busy,setBusy]=useState(false);const[reloadKey,setReloadKey]=useState(0);const[message,setMessage]=useState('')
  async function plan(){setBusy(true);setMessage('');try{const r=await fetch('/api/renovation/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});const d=await r.json();if(!r.ok)throw new Error(d.error??'规划失败');setPlanData(d)}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
  async function apply(){if(!planData?.plan)return;setBusy(true);try{const r=await fetch('/api/renovation/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:planData.plan})});const d=await r.json();if(!r.ok)throw new Error(d.error??'应用失败');setMessage(`已保存新版本：${d.versionId}`);setPlanData(null);setReloadKey(k=>k+1)}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
  async function reset(){await fetch('/api/reset',{method:'POST'});setPlanData(null);setReloadKey(k=>k+1);setMessage('已恢复演示住宅初始版本。')}
  return <main className="shell"><header className="topbar"><div><div className="brand">IDEAL HOME <span>理想家</span></div><div className="sub">Lifecycle-driven Residential Reconfiguration</div></div><div className="house-chip">HOUSE_001 · 固定住宅骨架</div></header><section className="workspace">
    <aside className="interaction"><h2>智能交互</h2><p className="muted">不是重新生成房子，而是在同一住宅骨架上持续重构生活空间。</p><label>家庭生命周期</label><div className="stage-grid"><button onClick={()=>setPrompt(stagePrompts.single)}>单人</button><button onClick={()=>setPrompt(stagePrompts.couple)}>两人</button><button onClick={()=>setPrompt(stagePrompts.child)}>育儿</button><button onClick={()=>setPrompt(stagePrompts.nanny)}>育儿+保姆</button></div><label>空间改造指令</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={7}/><button className="primary" onClick={plan} disabled={busy}>{busy?'处理中…':'生成改造方案'}</button>
    {planData&&<div className="plan-card"><strong>{planData.plan.title}</strong><p>{planData.plan.summary}</p><div className="plan-count">{planData.guard.patches.length} 个 Pascal Patch</div>{planData.guard.blocked.map((x,i)=><div className="blocked" key={i}>阻止：{x}</div>)}{planData.guard.warnings.map((x,i)=><div className="warning" key={i}>{x}</div>)}<button className="primary" onClick={apply} disabled={busy}>确认并应用</button></div>}
    <button className="ghost" onClick={reset}>恢复初始住宅</button>{message&&<div className="message">{message}</div>}</aside>
    <section className="center-stage"><PascalWorkspace reloadKey={reloadKey}/></section>
    <aside className="right-panel"><div className="tabs"><button className={tab==='design'?'active':''} onClick={()=>setTab('design')}>DESIGN</button><button className={tab==='fabrication'?'active':''} onClick={()=>setTab('fabrication')}>FABRICATION</button></div>{tab==='design'?<div><h2>住宅语义与结构</h2><SceneSummary/><div className="constraint-card"><strong>结构约束</strong><p>承重墙 / 外轮廓：锁定</p><p>非承重墙 / Zone / 语义：可编辑</p></div><div className="timeline"><strong>Life Timeline</strong><span>单人</span><i/><span>两人</span><i/><span>育儿</span><i/><span>多代 / 自定义</span></div></div>:<FabricationPanel/>}</aside>
  </section></main>
}
