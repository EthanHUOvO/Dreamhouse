'use client'
type Stage='design'|'construction'|'acceptance'
export default function CustomerStepper({current,projectStage,onSelect}:{current:Stage;projectStage:Stage;onSelect:(s:Stage)=>void}){
  const stages:{id:Stage;name:string}[]=[{id:'design',name:'设计'},{id:'construction',name:'施工'},{id:'acceptance',name:'验收'}]
  const order={design:0,construction:1,acceptance:2},progress=order[projectStage]
  return <aside className="customer-stepper"><div className="stepper-title">项目阶段</div>{stages.map((s,i)=>{const done=i<progress,active=i===progress;return <button key={s.id} className={`step ${current===s.id?'viewing':''}`} onClick={()=>onSelect(s.id)}><span className={`step-dot ${done?'done':active?'active':'future'}`}>{done?'✓':i+1}</span><span className="step-name">{s.name}</span><small>{done?'已完成':active?'当前阶段':'尚未开始'}</small></button>})}<div className="step-help">可随时点击任一步骤查看。回到“设计”不会自动覆盖当前施工版本。</div></aside>
}
