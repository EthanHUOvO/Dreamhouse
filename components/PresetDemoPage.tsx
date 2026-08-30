'use client'

import { useEffect, useMemo, useState } from 'react'

type PresetKey = 'add-bedroom' | 'add-bathroom' | 'both'
type BomBundle = {
  pcComponents: unknown[][]
  connectors: unknown[][]
  summary: unknown[][]
}
type WholeBomBundle = {
  details: unknown[][]
  budget: unknown[][]
}
type BomTabKey = 'pc' | 'connector' | 'summary' | 'whole' | 'budget'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''
const asset = (path: string) => `${BASE}${path}`

const PRESETS: Record<PresetKey, { title: string; kicker: string; prompt: string; ready: boolean }> = {
  'add-bedroom': {
    title: '增加一个卧室',
    kicker: 'Preset 01',
    prompt:
      '在这张图的基础上，整体户型升级成三室一厅一卫一厨的格局。保留原有建筑外轮廓、入户位置、厨房与卫生间的基础位置，在右侧现有主卧空间内增加一道非承重隔墙，将该区域拆分为两个独立卧室；新增房间应具备独立出入口，保证客餐厅主要动线不被阻断，并为三个卧室布置基础床具、收纳与必要家具。',
    ready: true,
  },
  'add-bathroom': {
    title: '主卧增加一个卫生间',
    kicker: 'Preset 02',
    prompt:
      '在这张图的基础上，为主卧增加一个独立卫生间。优先利用主卧邻近空间，在不改变建筑外轮廓、入户位置和主要结构边界的前提下增加卫浴空间，并保持客餐厅、厨房、其他卧室与主要交通动线顺畅。',
    ready: false,
  },
  both: {
    title: '同时增加卧室 + 主卫',
    kicker: 'Preset 03',
    prompt:
      '在当前户型基础上，同时完成两项升级：1）整体格局升级为三室；2）为主卧增加一个独立卫生间。保留建筑外轮廓与主要结构边界，重新组织室内非承重隔墙、房门及家具，使房间使用和交通动线保持合理。',
    ready: false,
  },
}

const BOM_TABS: Array<{ key: BomTabKey; label: string }> = [
  { key: 'pc', label: 'PC构件BOM' },
  { key: 'connector', label: '连接材料及辅材' },
  { key: 'summary', label: '构件汇总' },
  { key: 'whole', label: '全屋BOM明细' },
  { key: 'budget', label: '预算汇总' },
]

function GuideSketch({ rooms }: { rooms: 1 | 2 | 3 }) {
  const cells = rooms === 1 ? 3 : rooms === 2 ? 5 : 6
  return (
    <div className={`guide-sketch rooms-${rooms}`} aria-hidden="true">
      {Array.from({ length: cells }, (_, index) => <i key={index} />)}
    </div>
  )
}

function BomTable({ rows, headerIndex }: { rows: unknown[][]; headerIndex: number }) {
  if (!rows?.length) return <div className="bom-loading">正在载入表格…</div>
  const title = String(rows[0]?.[0] ?? '')
  const metaRows = rows.slice(1, headerIndex).filter(row => row?.some(cell => cell !== null && cell !== ''))
  const headers = (rows[headerIndex] || []).map(cell => String(cell ?? ''))
  const body = rows.slice(headerIndex + 1)

  return (
    <div className="bom-table-wrap">
      <div className="bom-table-title">
        <div>
          <b>{title}</b>
          {metaRows.map((row, i) => <span key={i}>{String(row[0] ?? '')}</span>)}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {body.map((row, r) => {
              const nonEmpty = row.filter(cell => cell !== null && cell !== '').length
              const section = nonEmpty === 1 && row[0]
              if (section) {
                return <tr className="section-row" key={r}><td colSpan={Math.max(1, headers.length)}>{String(row[0])}</td></tr>
              }
              if (nonEmpty === 0) return null
              return (
                <tr key={r}>
                  {headers.map((_, c) => {
                    const value = row[c]
                    const numeric = typeof value === 'number'
                    return <td className={numeric ? 'number' : ''} key={c}>{value === null || value === undefined ? '—' : String(value)}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PresetDemoPage() {
  const [preset, setPreset] = useState<PresetKey>('add-bedroom')
  const [prompt, setPrompt] = useState(PRESETS['add-bedroom'].prompt)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [resultIndex, setResultIndex] = useState<0 | 1>(0)
  const [bomTab, setBomTab] = useState<BomTabKey>('pc')
  const [pcBom, setPcBom] = useState<BomBundle | null>(null)
  const [wholeBom, setWholeBom] = useState<WholeBomBundle | null>(null)
  const [activeGuide, setActiveGuide] = useState<1 | 2 | 3>(2)

  useEffect(() => {
    Promise.all([
      fetch(asset('/data/pc-bom.json')).then(r => r.json()),
      fetch(asset('/data/whole-house-bom.json')).then(r => r.json()),
    ]).then(([pc, whole]) => {
      setPcBom(pc)
      setWholeBom(whole)
    }).catch(() => {})
  }, [])

  const selected = PRESETS[preset]

  function choosePreset(key: PresetKey) {
    setPreset(key)
    setPrompt(PRESETS[key].prompt)
    setGenerated(false)
    setGenerating(false)
    setResultIndex(0)
  }

  function runPreset() {
    if (!selected.ready || generating) return
    setGenerating(true)
    setGenerated(false)
    window.setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
      setResultIndex(0)
      requestAnimationFrame(() => document.getElementById('generated-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }, 950)
  }

  const bomRows = useMemo(() => {
    if (bomTab === 'pc') return { rows: pcBom?.pcComponents || [], header: 2 }
    if (bomTab === 'connector') return { rows: pcBom?.connectors || [], header: 1 }
    if (bomTab === 'summary') return { rows: pcBom?.summary || [], header: 1 }
    if (bomTab === 'whole') return { rows: wholeBom?.details || [], header: 1 }
    return { rows: wholeBom?.budget || [], header: 1 }
  }, [bomTab, pcBom, wholeBom])

  return (
    <main className="preset-page">
      <header className="portal-header preset-header">
        <a className="brand" href="#top">IDEAL HOME <b>理想家</b><small>DreamHouse · Preset Reconfiguration Demo</small></a>
        <div className="header-right"><span>V10 STYLE</span><strong>两居 → 三居预设升级</strong></div>
      </header>

      <div className="preset-wrap" id="top">
        <section className="intro-row">
          <div>
            <span className="eyebrow">PRESET RESIDENTIAL RECONFIGURATION</span>
            <h1>户型升级预设演示</h1>
            <p>先用确定的样板把“需求描述 → 生成结果 → 渲染图 → BOM”完整串起来。本版本不调用外部 API，后续只需要替换生成动作即可。</p>
          </div>
          <div className="intro-status"><i /><div><b>Preset Mode</b><span>当前使用本地预设资源</span></div></div>
        </section>

        <section className="guide-section card">
          <div className="section-heading"><div><span>01</span><div><b>户型导览</b><small>一居 / 两居 / 三居</small></div></div><em>当前案例：两居升级三居</em></div>
          <div className="guide-grid">
            <button className={`guide-card ${activeGuide === 1 ? 'active' : ''}`} onClick={() => setActiveGuide(1)}>
              <GuideSketch rooms={1} />
              <div><span>1 BEDROOM</span><b>一居</b><small>单人 / 紧凑型居住</small></div>
            </button>
            <button className={`guide-card ${activeGuide === 2 ? 'active' : ''}`} onClick={() => setActiveGuide(2)}>
              <img src={asset('/preset/initial-two-bedroom.png')} alt="两居初始户型" />
              <div><span>2 BEDROOM</span><b>两居</b><small>当前原始户型</small></div>
            </button>
            <button className={`guide-card ${activeGuide === 3 ? 'active' : ''}`} onClick={() => setActiveGuide(3)}>
              <img src={asset('/preset/generated-plan-01.png')} alt="三居升级户型" />
              <div><span>3 BEDROOM</span><b>三居</b><small>按键 1 目标格局</small></div>
            </button>
          </div>
        </section>

        {activeGuide === 1 && <section className="one-bedroom-view card">
          <div className="section-heading"><div><span>ONE</span><div><b>一居室住宅案例</b><small>紧凑型单人居住空间 · 户型与全屋配置展示</small></div></div><em>1室1厅1卫1厨</em></div>
          <div className="one-bedroom-meta"><div><span>户型</span><b>1室1厅1卫1厨</b></div><div><span>类型</span><b>一居室</b></div><div><span>使用场景</span><b>单人居住 / 青年住宅</b></div></div>
          <div className="one-bedroom-images"><figure><img src={asset('/preset/one-bedroom/floorplan.png')} alt="一居室户型图" /><figcaption>一居室户型图</figcaption></figure><figure><img src={asset('/preset/one-bedroom/render.png')} alt="一居室三维渲染图" /><figcaption>一居室三维渲染图</figcaption></figure></div>
          <div className="one-bedroom-bom"><div className="section-heading compact"><div><span>BOM</span><div><b>一居室 BOM 清单</b><small>本地静态 Excel 资源</small></div></div><a href={asset('/preset/one-bedroom/bom.xlsx')} download>下载 BOM</a></div><div className="bom-note">数据源：一居室 BOM 工作簿（原始数值保留）</div></div>
        </section>}

        <section className="workspace-grid">
          <article className="card prompt-card">
            <div className="section-heading compact"><div><span>02</span><div><b>需求样板</b><small>点击按键载入 Prompt 示例</small></div></div></div>
            <div className="preset-buttons">
              {(Object.keys(PRESETS) as PresetKey[]).map((key, index) => (
                <button key={key} className={preset === key ? 'selected' : ''} onClick={() => choosePreset(key)}>
                  <i>0{index + 1}</i><div><small>{PRESETS[key].kicker}</small><b>{PRESETS[key].title}</b></div>{!PRESETS[key].ready && <em>{key === 'both' ? '预留' : '待结果素材'}</em>}
                </button>
              ))}
            </div>
            <label className="prompt-label">
              <span>Prompt 示例</span>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={11} />
            </label>
            <div className="prompt-tip"><b>描述样板</b><span>用户后续可按这个结构描述：目标格局 + 保留条件 + 可调整位置 + 动线 / 家具要求。</span></div>
            <button className="generate-button" disabled={!selected.ready || generating} onClick={runPreset}>
              {generating ? '正在生成预设方案…' : selected.ready ? '生成方案' : '当前结果素材暂未配置'}
            </button>
            {generating && <div className="generation-steps"><span className="done">读取初始户型</span><span className="done">套用三居样板</span><span>生成二维结果</span><span>载入渲染与 BOM</span></div>}
          </article>

          <article className="card original-card">
            <div className="section-heading compact"><div><span>03</span><div><b>原始户型</b><small>52㎡ · 两居基线</small></div></div></div>
            <div className="plan-stage original-stage"><img src={asset('/preset/initial-two-bedroom.png')} alt="初始两居户型图" /></div>
            <div className="plan-note"><b>现状</b><span>2 室 · 1 厅 · 1 卫 · 1 厨 · 阳台</span></div>
          </article>

          <article className={`card result-card ${generated ? 'has-result' : ''}`} id="generated-output">
            <div className="section-heading compact"><div><span>04</span><div><b>生成结果</b><small>按键 1 · 三室一厅一卫一厨</small></div></div></div>
            {!generated ? (
              <div className="empty-result"><div className="empty-icon">↗</div><b>等待生成</b><span>选择“增加一个卧室”，确认 Prompt 后点击“生成方案”。</span></div>
            ) : (
              <>
                <div className="result-switch"><button className={resultIndex === 0 ? 'active' : ''} onClick={() => setResultIndex(0)}>二维结果 01</button><button className={resultIndex === 1 ? 'active' : ''} onClick={() => setResultIndex(1)}>二维结果 02</button></div>
                <div className="plan-stage generated-stage"><img src={asset(resultIndex === 0 ? '/preset/generated-plan-01.png' : '/preset/generated-plan-02.png')} alt={`三居改造二维结果 ${resultIndex + 1}`} /></div>
                <div className="plan-note success"><b>目标完成</b><span>3 室 · 1 厅 · 1 卫 · 1 厨</span></div>
              </>
            )}
          </article>
        </section>

        <section className={`render-section card ${generated ? 'visible' : ''}`}>
          <div className="section-heading"><div><span>05</span><div><b>方案渲染图</b><small>对应按键 1 的三居预设方案</small></div></div><em>{generated ? '已生成' : '等待二维方案生成'}</em></div>
          {generated ? <div className="render-grid"><img src={asset('/preset/generated-render.png')} alt="三居户型三维渲染图" /><div className="render-copy"><span>RENDER PREVIEW</span><h2>三居空间可视化</h2><p>渲染图作为当前预设结果的视觉确认页。后续接入真实图像模型时，这个位置保持不变，只替换生成来源。</p><div><b>空间目标</b><small>增加独立卧室 · 保留公共空间主轴 · 基础家具布置</small></div><div><b>结果来源</b><small>本地预设图像</small></div></div></div> : <div className="render-placeholder">生成按键 1 后显示对应渲染图</div>}
        </section>

        <section className={`bom-section-main card ${generated ? 'visible' : ''}`}>
          <div className="section-heading"><div><span>06</span><div><b>BOM 清单与预算</b><small>直接导入你提供的两份 Excel 内容</small></div></div><div className="download-row"><a href={asset('/bom/pc-components-bom-52sqm.xlsx')} download>下载 PC BOM</a><a href={asset('/bom/whole-house-bom-budget-52sqm.xlsx')} download>下载全屋 BOM</a></div></div>
          {generated ? (
            <>
              <div className="bom-metrics"><div><span>建筑面积</span><b>52㎡</b></div><div><span>目标户型</span><b>3室1厅1卫1厨</b></div><div><span>预算估算</span><b>¥100,040</b></div><div><span>数据来源</span><b>2 份 Excel</b></div></div>
              <div className="bom-tabs">{BOM_TABS.map(tab => <button key={tab.key} className={bomTab === tab.key ? 'active' : ''} onClick={() => setBomTab(tab.key)}>{tab.label}</button>)}</div>
              <BomTable rows={bomRows.rows} headerIndex={bomRows.header} />
            </>
          ) : <div className="bom-placeholder">完成预设生成后自动展开对应 BOM 清单。</div>}
        </section>
      </div>
    </main>
  )
}
