'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './InitialSetupPage.module.css'
import { createOrderFromInitialSetup, loadOrders, saveOrders } from '@/lib/order-store'
import {
  createUserProfile,
  scenarioFromPreferences,
  setActiveCustomerOrderId,
} from '@/lib/user-profile-store'
import type {
  DrawingImportRequest,
  FamilyPlan,
  HouseholdChoice,
  SingleGender,
} from '@/lib/types'

type SourceDraft = DrawingImportRequest & { previewUrl?: string }
const ACCEPTED=['image/png','image/jpeg','application/pdf']
const MAX_SIZE=15*1024*1024

function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms))}

export default function InitialSetupPage(){
  const router=useRouter()
  const inputRef=useRef<HTMLInputElement|null>(null)
  const[displayName,setDisplayName]=useState('')
  const[household,setHousehold]=useState<HouseholdChoice>('single')
  const[singleGender,setSingleGender]=useState<SingleGender>('male')
  const[familyPlan,setFamilyPlan]=useState<FamilyPlan>('child')
  const[drawing,setDrawing]=useState<SourceDraft|null>(null)
  const[dragging,setDragging]=useState(false)
  const[error,setError]=useState('')
  const[parsing,setParsing]=useState(false)
  const[parseStep,setParseStep]=useState(-1)

  const scenario=useMemo(()=>scenarioFromPreferences(household,singleGender,familyPlan),[household,singleGender,familyPlan])
  const scenarioLabel=useMemo(()=>{
    if(scenario==='single')return '单身男性 · 电竞房方案'
    if(scenario==='single_female')return '单身女性 · 衣帽间方案'
    if(scenario==='couple')return '双人世界方案'
    if(scenario==='nanny')return '三口之家 · 育儿 + 保姆方案'
    return '三口之家 · 育儿家庭方案'
  },[scenario])

  useEffect(()=>()=>{
    if(drawing?.previewUrl)URL.revokeObjectURL(drawing.previewUrl)
  },[drawing?.previewUrl])

  function setFile(file:File){
    setError('')
    if(!ACCEPTED.includes(file.type)){
      setError('当前演示支持 PNG、JPG/JPEG 和 PDF 图纸。')
      return
    }
    if(file.size>MAX_SIZE){
      setError('文件不能超过 15MB。')
      return
    }
    const previewUrl=URL.createObjectURL(file)
    setDrawing({source:'upload',fileName:file.name,fileType:file.type,fileSize:file.size,previewUrl})
  }

  function useSample(){
    setError('')
    setDrawing({source:'sample',fileName:'HOUSE_001_80sqm_demo.png',fileType:'image/png',fileSize:0})
  }

  async function createProject(){
    if(parsing)return
    if(!drawing){setError('请先载入一张二维住宅图纸，或使用当前示例图纸。');return}
    if(!displayName.trim()){setError('请填写一个住户姓名或称呼。');return}
    setError('')
    setParsing(true)
    const steps=5
    for(let i=0;i<steps;i++){
      setParseStep(i)
      await sleep(i===0?300:420)
    }

    const profile=createUserProfile({
      displayName,
      household,
      singleGender:household==='single'?singleGender:undefined,
      familyPlan:household==='family3'?familyPlan:undefined,
    })
    const request:DrawingImportRequest={
      source:drawing.source,
      fileName:drawing.fileName,
      fileType:drawing.fileType,
      fileSize:drawing.fileSize,
    }
    const order=createOrderFromInitialSetup(profile,request)
    const existing=loadOrders().filter(item=>item.id!==order.id)
    saveOrders([order,...existing])
    setActiveCustomerOrderId(order.id)
    setParseStep(5)
    await sleep(350)
    router.push('/customer/')
  }

  const parseLabels=['读取二维图纸','识别墙体与门窗','建立房间拓扑','建立居住需求画像','生成 Pascal 初始住宅','项目创建完成']

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>IDEAL HOME <b>理想家</b></Link>
      <div className={styles.headerRight}><span>住宅项目初始设置</span><Link href="/customer/">已有项目</Link></div>
    </header>

    <section className={styles.hero}>
      <div><span className={styles.kicker}>INITIAL SETUP</span><h1>先建立住宅项目，再进入个性化设计</h1><p>二维图纸定义住宅基线，居住信息形成用户画像。后续方案、家具调整、第一人称漫游和施工版本都从这份初始数据继续。</p></div>
      <div className={styles.flow}><span>01 图纸</span><i>→</i><span>02 用户画像</span><i>→</i><span>03 Pascal 设计</span></div>
    </section>

    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.cardHead}><span>01</span><div><b>载入二维图纸</b><small>当前 Demo 将任意已选图纸映射到 HOUSE_001；接口已为后续真实解析保留。</small></div></div>
        <div
          className={`${styles.dropzone} ${dragging?styles.dragging:''}`}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);const file=e.dataTransfer.files?.[0];if(file)setFile(file)}}
          onClick={()=>inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" hidden onChange={e=>{const file=e.target.files?.[0];if(file)setFile(file)}}/>
          {!drawing&&<><strong>拖拽图纸到这里</strong><span>或点击选择 PNG / JPG / PDF</span></>}
          {drawing&&<div className={styles.filePicked}><b>{drawing.fileName}</b><span>{drawing.source==='sample'?'示例图纸':`${(drawing.fileSize/1024/1024).toFixed(2)} MB`}</span><em>点击可重新选择</em></div>}
        </div>
        <div className={styles.preview}>
          {!drawing&&<div className={styles.previewEmpty}>等待载入二维住宅图纸</div>}
          {drawing?.source==='sample'&&<div className={styles.samplePlan}><div/><div/><div/><div/><span>HOUSE_001 · 80㎡ DEMO</span></div>}
          {drawing?.previewUrl&&drawing.fileType.startsWith('image/')&&<img src={drawing.previewUrl} alt="二维住宅图纸预览"/>}
          {drawing?.previewUrl&&drawing.fileType==='application/pdf'&&<iframe src={drawing.previewUrl} title="PDF图纸预览"/>}
        </div>
        <button className={styles.sampleButton} onClick={useSample} type="button">使用当前 HOUSE_001 示例图纸</button>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><span>02</span><div><b>建立住户画像</b><small>这些字段与后续“居住需求引导”保持一致，并写入用户信息库。</small></div></div>
        <label className={styles.field}><span>姓名 / 称呼</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="例如：王先生"/></label>

        <div className={styles.question}><b>居住人数</b><div className={styles.choice3}>
          <button className={household==='single'?styles.selected:''} onClick={()=>setHousehold('single')} type="button"><strong>单身贵族</strong><span>1 人</span></button>
          <button className={household==='couple'?styles.selected:''} onClick={()=>setHousehold('couple')} type="button"><strong>双人世界</strong><span>2 人</span></button>
          <button className={household==='family3'?styles.selected:''} onClick={()=>setHousehold('family3')} type="button"><strong>三口之家</strong><span>家庭</span></button>
        </div></div>

        {household==='single'&&<div className={styles.question}><b>单人居住偏好</b><div className={styles.choice2}>
          <button className={singleGender==='male'?styles.selected:''} onClick={()=>setSingleGender('male')} type="button"><strong>男士</strong><span>电竞房 + 单人书房</span></button>
          <button className={singleGender==='female'?styles.selected:''} onClick={()=>setSingleGender('female')} type="button"><strong>女士</strong><span>衣帽间 + 单人书房</span></button>
        </div></div>}

        {household==='couple'&&<div className={styles.recommend}><span>系统初始推荐</span><b>双人世界方案</b><p>衣帽间 + 双人书房。</p></div>}

        {household==='family3'&&<div className={styles.question}><b>三口之家方案</b><div className={styles.choice2}>
          <button className={familyPlan==='child'?styles.selected:''} onClick={()=>setFamilyPlan('child')} type="button"><strong>育儿家庭</strong><span>儿童房 + 主卫 / 公卫</span></button>
          <button className={familyPlan==='nanny'?styles.selected:''} onClick={()=>setFamilyPlan('nanny')} type="button"><strong>育儿 + 保姆</strong><span>儿童房 + 保姆房</span></button>
        </div></div>}

        <div className={styles.result}><span>进入设计时的初始方案</span><b>{scenarioLabel}</b><p>进入后仍可继续切换方案、移动/旋转家具和创建新的 Design Version。</p></div>
      </section>
    </div>

    {error&&<div className={styles.error}>{error}</div>}
    {parsing&&<section className={styles.progress}>{parseLabels.map((label,index)=><div key={label} className={index<=parseStep?styles.done:''}><i>{index<parseStep?'✓':index===parseStep?'●':'○'}</i><span>{label}</span></div>)}</section>}

    <footer className={styles.footer}>
      <div><b>Demo 数据层</b><span>用户档案、图纸元数据、订单和 Design Version 当前保存在浏览器数据仓库；正式部署时可把同一 Repository 接口替换为数据库/API。</span></div>
      <button onClick={createProject} disabled={parsing}>{parsing?'正在建立项目…':'创建住宅项目并进入设计'}</button>
    </footer>
  </main>
}
