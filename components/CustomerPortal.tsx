'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { getMockBom, getMockImages, getMockLayout, promptExamples, residenceOptions, type GeneratedBom, type GeneratedImages, type GeneratedLayout, type ResidenceType } from '@/lib/demo-data'

type GenerationState = 'idle' | 'loading' | 'done' | 'error'

type ProjectOrder = {
  id: string
  portal: 'customer'
  createdAt: string
  residenceType: ResidenceType
  prompt: string
  layout: GeneratedLayout
  images: GeneratedImages
  bom: GeneratedBom
  stage: '设计完成待施工'
}

const slideTitles = ['居室选择', '改造需求', '平面方案', '空间渲染', 'BOM清单']

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export default function CustomerPortal() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [residenceType, setResidenceType] = useState<ResidenceType>('one')
  const [prompt, setPrompt] = useState(promptExamples.one[0])
  const [layoutState, setLayoutState] = useState<GenerationState>('idle')
  const [imageState, setImageState] = useState<GenerationState>('idle')
  const [bomState, setBomState] = useState<GenerationState>('idle')
  const [layout, setLayout] = useState<GeneratedLayout | null>(null)
  const [images, setImages] = useState<GeneratedImages | null>(null)
  const [bom, setBom] = useState<GeneratedBom | null>(null)
  const [layoutSource, setLayoutSource] = useState<'mock' | 'qwen'>('mock')
  const [imageSource, setImageSource] = useState<'mock' | 'qwen'>('mock')
  const [bomSource, setBomSource] = useState<'mock' | 'qwen'>('mock')
  const [submitMessage, setSubmitMessage] = useState('')

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const nextPrompt = promptExamples[residenceType][0]
    setPrompt(nextPrompt)
    const presetLayout = getMockLayout(residenceType, nextPrompt)
    setLayout(presetLayout)
    setImages(getMockImages(presetLayout))
    setBom(getMockBom(presetLayout))
  }, [residenceType])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const node = container.querySelector<HTMLElement>(`[data-slide="${activeSlide}"]`)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeSlide])

  const selectedResidence = useMemo(
    () => residenceOptions.find(item => item.key === residenceType) || residenceOptions[0],
    [residenceType],
  )

  async function generateLayout() {
    setLayoutState('loading')
    setSubmitMessage('')
    try {
      const res = await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residenceType, prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'layout_failed')
      setLayout(data.layout)
      setLayoutSource(data.source)
      setLayoutState('done')
      setImageState('idle')
      setBomState('idle')
      setActiveSlide(2)
    } catch (error) {
      console.error(error)
      setLayoutState('error')
    }
  }

  async function generateImages() {
    if (!layout) return
    setImageState('loading')
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'image_failed')
      setImages(data.images)
      setImageSource(data.source)
      setImageState('done')
      setActiveSlide(3)
    } catch (error) {
      console.error(error)
      setImageState('error')
    }
  }

  async function generateBom() {
    if (!layout) return
    setBomState('loading')
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'bom_failed')
      setBom(data.bom)
      setBomSource(data.source)
      setBomState('done')
      setActiveSlide(4)
    } catch (error) {
      console.error(error)
      setBomState('error')
    }
  }

  function saveToContractor() {
    if (!layout || !images || !bom) return
    const order: ProjectOrder = {
      id: `DH-${Date.now().toString().slice(-6)}`,
      portal: 'customer',
      createdAt: new Date().toISOString(),
      residenceType,
      prompt,
      layout,
      images,
      bom,
      stage: '设计完成待施工',
    }
    const prev = JSON.parse(window.localStorage.getItem('dreamhouse-orders') || '[]')
    prev.unshift(order)
    window.localStorage.setItem('dreamhouse-orders', JSON.stringify(prev.slice(0, 12)))
    setSubmitMessage(`订单 ${order.id} 已提交到施工端，可在施工入口查看。`)
  }

  return (
    <main className="portal-page">
      <header className="portal-topbar">
        <div>
          <p className="eyebrow">IDEAL HOME · 理想家</p>
          <h1>住户入口 · 触摸翻页交互</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/">返回首页</Link>
          <Link href="/contractor">前往施工端</Link>
        </div>
      </header>

      <div className="slides-shell">
        <aside className="slide-stepper">
          {slideTitles.map((title, index) => (
            <button key={title} className={classNames('step-dot', activeSlide === index && 'active')} onClick={() => setActiveSlide(index)}>
              <span>{index + 1}</span>
              <b>{title}</b>
            </button>
          ))}
        </aside>

        <div className="slides-viewport" ref={scrollRef}>
          <section className="slide-section" data-slide="0">
            <div className="slide-header">
              <div>
                <p className="slide-kicker">Step 1</p>
                <h2>选择居室框架</h2>
                <p>进入后先选择一居室、二居室、三居室。该选择将决定后续默认提示词、原始户型图和联动演示素材。</p>
              </div>
              <button className="nav-btn" onClick={() => setActiveSlide(1)}>下一页</button>
            </div>
            <div className="residence-grid">
              {residenceOptions.map(option => (
                <button
                  key={option.key}
                  className={classNames('residence-card', residenceType === option.key && 'selected')}
                  onClick={() => setResidenceType(option.key)}
                >
                  <img src={option.cover} alt={option.label} />
                  <div className="residence-body">
                    <h3>{option.label}</h3>
                    <p>{option.subtitle}</p>
                    <ul>
                      {option.quickActions.map(action => <li key={action}>{action}</li>)}
                    </ul>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="slide-section" data-slide="1">
            <div className="slide-header">
              <div>
                <p className="slide-kicker">Step 2</p>
                <h2>输入改造需求并调用 Qwen 户型改造</h2>
                <p>你可以使用预设提示词，也可以自行补充需求。点击生成后，将优先走 Qwen 文本模型；未配置 API 时自动使用本地模板结果。</p>
              </div>
              <div className="header-inline-actions">
                <button className="nav-btn secondary" onClick={() => setActiveSlide(0)}>上一页</button>
                <button className="nav-btn" onClick={generateLayout}>生成平面方案</button>
              </div>
            </div>

            <div className="two-col-layout">
              <div className="panel">
                <div className="panel-title">当前框架</div>
                <img className="panel-image" src={selectedResidence.cover} alt={selectedResidence.label} />
                <div className="chip-row">
                  <span className="chip">当前选择：{selectedResidence.label}</span>
                  <span className="chip muted">优先支持触摸滑动翻页</span>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">提示词输入</div>
                <div className="prompt-buttons">
                  {promptExamples[residenceType].map(example => (
                    <button key={example} className="prompt-pill" onClick={() => setPrompt(example)}>{example}</button>
                  ))}
                </div>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="prompt-editor" />
                <div className="status-bar">
                  <span>户型改造状态：{layoutState === 'loading' ? '生成中…' : layoutState === 'done' ? `已完成（${layoutSource}）` : layoutState === 'error' ? '失败' : '未开始'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="slide-section" data-slide="2">
            <div className="slide-header">
              <div>
                <p className="slide-kicker">Step 3</p>
                <h2>调整后平面图展示</h2>
                <p>这一页展示原始户型与 Qwen / 本地模板生成后的平面方案对比，并承接到后续渲染。</p>
              </div>
              <div className="header-inline-actions">
                <button className="nav-btn secondary" onClick={() => setActiveSlide(1)}>上一页</button>
                <button className="nav-btn" onClick={generateImages}>生成渲染图</button>
              </div>
            </div>

            <div className="compare-grid">
              <div className="panel">
                <div className="panel-title">原始户型图</div>
                <img className="panel-image fit-contain" src={layout?.originalPlan || selectedResidence.cover} alt="原始户型" />
              </div>
              <div className="panel">
                <div className="panel-title">调整后平面图</div>
                <img className="panel-image fit-contain" src={layout?.generatedPlan || selectedResidence.cover} alt="生成户型" />
                <div className="result-summary">
                  <h3>{layout?.title || '待生成'}</h3>
                  <p>{layout?.summary || '请先在上一页生成方案。'}</p>
                  {layout?.rooms?.length ? <div className="chip-row">{layout.rooms.map(room => <span key={room} className="chip">{room}</span>)}</div> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="slide-section" data-slide="3">
            <div className="slide-header">
              <div>
                <p className="slide-kicker">Step 4</p>
                <h2>Qwen-Image 渲染结果</h2>
                <p>先生成整体空间渲染，再为客餐厅、卧室、卫生间等房间分别生成局部效果图，满足逐房间展示需求。</p>
              </div>
              <div className="header-inline-actions">
                <button className="nav-btn secondary" onClick={() => setActiveSlide(2)}>上一页</button>
                <button className="nav-btn" onClick={generateBom}>生成 BOM</button>
              </div>
            </div>

            <div className="render-layout">
              <div className="panel large-panel">
                <div className="panel-title">整体空间渲染</div>
                <img className="panel-image fit-contain" src={images?.overallRender || '/preset/generated-render.png'} alt="整体渲染" />
                <div className="status-bar">
                  <span>渲染状态：{imageState === 'loading' ? '生成中…' : imageState === 'done' ? `已完成（${imageSource}）` : imageState === 'error' ? '失败' : '未开始'}</span>
                </div>
              </div>
              <div className="room-grid">
                {(images?.roomRenders || []).map(room => (
                  <div className="panel room-card" key={room.name}>
                    <div className="panel-title">{room.name}</div>
                    <img className="panel-image fit-contain" src={room.image} alt={room.name} />
                    <p>{room.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="slide-section" data-slide="4">
            <div className="slide-header">
              <div>
                <p className="slide-kicker">Step 5</p>
                <h2>BOM 清单与提交施工</h2>
                <p>根据最终平面与渲染结果生成联动 BOM；页面支持打印，并将订单推送到施工端页面。</p>
              </div>
              <div className="header-inline-actions">
                <button className="nav-btn secondary" onClick={() => setActiveSlide(3)}>上一页</button>
                <button className="nav-btn" onClick={saveToContractor}>提交到施工端</button>
              </div>
            </div>

            <div className="bom-header-card">
              <div>
                <h3>{bom?.projectName || '待生成 BOM'}</h3>
                <p>BOM 状态：{bomState === 'loading' ? '生成中…' : bomState === 'done' ? `已完成（${bomSource}）` : bomState === 'error' ? '失败' : '未开始'}</p>
                {bom?.printSheets?.length ? <div className="chip-row">{bom.printSheets.map(item => <span className="chip" key={item}>{item}</span>)}</div> : null}
              </div>
              <div className="header-inline-actions">
                <button className="nav-btn secondary" onClick={() => window.print()}>打印当前页面</button>
              </div>
            </div>

            <div className="panel bom-panel">
              <table className="bom-table">
                <thead>
                  <tr>
                    <th>类别</th>
                    <th>名称</th>
                    <th>规格</th>
                    <th>单位</th>
                    <th>数量</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {(bom?.items || []).map((item, idx) => (
                    <tr key={`${item.name}-${idx}`}>
                      <td>{item.category}</td>
                      <td>{item.name}</td>
                      <td>{item.spec}</td>
                      <td>{item.unit}</td>
                      <td>{item.quantity}</td>
                      <td>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="download-list">
                {(bom?.sampleDownloads || []).map(file => (
                  <a key={file.href} href={file.href} target="_blank" rel="noreferrer">下载：{file.label}</a>
                ))}
              </div>
            </div>
            {submitMessage ? <div className="success-banner">{submitMessage}</div> : null}
          </section>
        </div>
      </div>
    </main>
  )
}
