'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Floorplan2D from '@/components/shared/Floorplan2D'
import { createScenarioScene } from '@/lib/scenarios'
import type { DrawingImportRecord, DrawingImportRequest } from '@/lib/types'
import styles from './CustomerDrawingImport.module.css'

type Mode='empty'|'ready'|'parsing'|'done'

type SelectedDrawing={
  source:'upload'|'sample'
  fileName:string
  fileType:string
  fileSize:number
  file?:File
}

const PARSE_STEPS=[
  '读取图纸文件',
  '识别主要墙体',
  '识别门窗位置',
  '划分房间区域',
  '建立空间语义',
  '生成 Pascal 3D 场景',
]

const ACCEPTED_MIME=new Set(['image/png','image/jpeg','application/pdf'])
const ACCEPTED_EXT=/\.(png|jpe?g|pdf)$/i
const MAX_FILE_SIZE=15*1024*1024

function prettyBytes(size:number){
  if(size<1024)return `${size} B`
  if(size<1024*1024)return `${(size/1024).toFixed(1)} KB`
  return `${(size/1024/1024).toFixed(1)} MB`
}

function sleep(ms:number){return new Promise(resolve=>window.setTimeout(resolve,ms))}

export default function CustomerDrawingImport({
  currentDrawing,
  onParsed,
  onCancel,
}:{
  currentDrawing?:DrawingImportRecord
  onParsed:(request:DrawingImportRequest)=>void
  onCancel?:()=>void
}){
  const inputRef=useRef<HTMLInputElement|null>(null)
  const mountedRef=useRef(true)
  const[selected,setSelected]=useState<SelectedDrawing|null>(null)
  const[mode,setMode]=useState<Mode>('empty')
  const[parseStep,setParseStep]=useState(-1)
  const[error,setError]=useState('')
  const[previewUrl,setPreviewUrl]=useState('')
  const sampleScene=useMemo(()=>createScenarioScene('single'),[])

  useEffect(()=>()=>{mountedRef.current=false},[])
  useEffect(()=>{
    if(!selected?.file){setPreviewUrl('');return}
    const url=URL.createObjectURL(selected.file)
    setPreviewUrl(url)
    return()=>URL.revokeObjectURL(url)
  },[selected])

  function validateFile(file:File){
    const validType=ACCEPTED_MIME.has(file.type)||ACCEPTED_EXT.test(file.name)
    if(!validType)return '当前演示支持 PNG / JPG / PDF 图纸。'
    if(file.size>MAX_FILE_SIZE)return '文件不能超过 15 MB。'
    return ''
  }

  function chooseFile(file:File){
    const message=validateFile(file)
    if(message){setError(message);return}
    setError('')
    setSelected({source:'upload',fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size,file})
    setParseStep(-1)
    setMode('ready')
  }

  function useSample(){
    setError('')
    setSelected({source:'sample',fileName:'HOUSE_001_示例户型图.pdf',fileType:'application/pdf',fileSize:428000})
    setParseStep(-1)
    setMode('ready')
  }

  async function startParsing(){
    if(!selected||mode==='parsing')return
    setMode('parsing')
    setParseStep(-1)
    for(let index=0;index<PARSE_STEPS.length;index+=1){
      await sleep(index===0?300:430)
      if(!mountedRef.current)return
      setParseStep(index)
    }
    await sleep(450)
    if(!mountedRef.current)return
    setMode('done')
    await sleep(650)
    if(!mountedRef.current)return
    onParsed({
      source:selected.source,
      fileName:selected.fileName,
      fileType:selected.fileType,
      fileSize:selected.fileSize,
    })
  }

  function resetSelection(){
    setSelected(null)
    setPreviewUrl('')
    setMode('empty')
    setParseStep(-1)
    setError('')
  }

  const isImage=selected?.fileType.startsWith('image/')
  const isPdf=selected?.fileType==='application/pdf'||Boolean(selected&&/\.pdf$/i.test(selected.fileName))

  return <div className={styles.shell}>
    <section className={styles.headerCard}>
      <div>
        <span className={styles.eyebrow}>STEP 01 · INPUT</span>
        <h2>导入住宅图纸</h2>
        <p>先导入住宅原始图纸，再进入居住需求、家具调整和第一人称漫游。</p>
      </div>
      <div className={styles.stageLine}>
        <span className={styles.active}>1 图纸导入</span><i/> <span>2 居住需求</span><i/> <span>3 方案设计</span><i/> <span>4 确认施工</span>
      </div>
    </section>

    {mode==='empty'&&<section className={styles.importGrid}>
      <button
        className={styles.dropZone}
        onClick={()=>inputRef.current?.click()}
        onDragOver={event=>{event.preventDefault();event.currentTarget.dataset.drag='true'}}
        onDragLeave={event=>{delete event.currentTarget.dataset.drag}}
        onDrop={event=>{
          event.preventDefault();delete event.currentTarget.dataset.drag
          const file=event.dataTransfer.files?.[0]
          if(file)chooseFile(file)
        }}
      >
        <span className={styles.uploadIcon}>＋</span>
        <strong>拖拽住宅图纸到这里</strong>
        <span>或点击选择图纸</span>
        <small>PNG / JPG / PDF · 最大 15 MB</small>
      </button>
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        onChange={event=>{const file=event.target.files?.[0];if(file)chooseFile(file);event.currentTarget.value=''}}
      />

      <div className={styles.sampleCard}>
        <div className={styles.samplePreview}><Floorplan2D scene={sampleScene}/></div>
        <div>
          <span className={styles.eyebrow}>DEMO</span>
          <h3>没有现场图纸？</h3>
          <p>可以直接使用当前唯一的 HOUSE_001 示例图纸，完整体验后续流程。</p>
          <button onClick={useSample}>使用示例图纸</button>
        </div>
      </div>
      {error&&<div className={styles.error}>{error}</div>}
      {currentDrawing&&onCancel&&<button className={styles.cancelLink} onClick={onCancel}>取消重新导入，返回当前设计</button>}
    </section>}

    {(mode==='ready'||mode==='parsing'||mode==='done')&&selected&&<section className={styles.workspace}>
      <div className={styles.previewCard}>
        <div className={styles.cardTitle}>图纸预览</div>
        <div className={styles.previewArea}>
          {selected.source==='sample'?<Floorplan2D scene={sampleScene}/>:isImage&&previewUrl?<img src={previewUrl} alt="用户上传的住宅图纸"/>:isPdf&&previewUrl?<object data={previewUrl} type="application/pdf"><div className={styles.pdfFallback}>PDF 图纸已载入<br/>{selected.fileName}</div></object>:<div className={styles.pdfFallback}>图纸文件已载入<br/>{selected.fileName}</div>}
        </div>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.cardTitle}>导入信息</div>
        <dl className={styles.metaList}>
          <div><dt>文件</dt><dd>{selected.fileName}</dd></div>
          <div><dt>来源</dt><dd>{selected.source==='sample'?'系统示例':'用户上传'}</dd></div>
          <div><dt>类型</dt><dd>{selected.fileType||'未知'}</dd></div>
          <div><dt>大小</dt><dd>{prettyBytes(selected.fileSize)}</dd></div>
        </dl>

        {mode==='ready'&&<>
          <div className={styles.readyNote}>图纸已经载入。确认无误后开始解析。</div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={resetSelection}>重新选择</button>
            <button className={styles.primary} onClick={startParsing}>开始解析图纸</button>
          </div>
        </>}

        {(mode==='parsing'||mode==='done')&&<div className={styles.parseBox}>
          <div className={styles.parseHead}><strong>{mode==='done'?'图纸解析完成':'正在解析住宅图纸'}</strong><span>{mode==='done'?'100%':`${Math.max(0,Math.round(((parseStep+1)/PARSE_STEPS.length)*100))}%`}</span></div>
          <div className={styles.progress}><i style={{width:mode==='done'?'100%':`${Math.max(4,((parseStep+1)/PARSE_STEPS.length)*100)}%`}}/></div>
          <div className={styles.parseSteps}>
            {PARSE_STEPS.map((step,index)=><div key={step} className={index<=parseStep||mode==='done'?styles.stepDone:index===parseStep+1?styles.stepActive:''}>
              <span>{index<=parseStep||mode==='done'?'✓':index===parseStep+1?'●':'○'}</span>{step}
            </div>)}
          </div>
        </div>}

        {mode==='done'&&<div className={styles.completeBox}>
          <b>正在进入住宅设计…</b>
          <span>接下来可以选择居住人数、生成方案、调整家具并进入第一人称漫游。</span>
        </div>}
      </div>
    </section>}

    <div className={styles.demoNotice}>
      当前为 Demo 解析模式：上传与预览流程真实可用，解析结果暂时映射到预配置 HOUSE_001 Pascal 场景；未来接入真实 CAD / BIM / CV 解析服务时无需重做后续设计流程。
    </div>
  </div>
}
