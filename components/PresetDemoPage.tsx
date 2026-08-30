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
type OneBom = {
  scheme: number
  title: string
  sheetName: string
  headers: string[]
  rows: unknown[][]
  itemCount: number
  sourceFile: string
  note: string
}
type PresetConfig = Record<PresetKey, { title: string; kicker: string; prompt: string; ready: boolean; badge?: string }>
type OneScheme = {
  title: string
  short: string
  summary: string
  plan: string
  render: string
  bom: string
  xlsx: string
}
type OneCaseMeta = {
  heading: string
  description: string
  from: string
  to: string
  promptTip: string
  resultNote: string
  renderTitle: string
  resultSmall: string
  bomSource: string
  schemes: readonly OneScheme[]
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''
const asset = (path: string) => `${BASE}${path}`

const TWO_PRESETS: PresetConfig = {
  'add-bedroom': {
    title: '增加一个卧室',
    kicker: 'Preset 01',
    prompt:
      '在这张图的基础上，整体户型升级成三室一厅一卫一厨的格局。保留原有建筑外轮廓、入户位置、厨房与卫生间的基础位置，在右侧现有主卧空间内增加一道非承重隔墙，将该区域拆分为两个独立卧室；新增房间应具备独立出入口，保证客餐厅主要动线不被阻断，并为三个卧室布置基础床具、收纳与必要家具。',
    ready: true,
  },
  'add-bathroom': {
    title: '增加一个卫生间',
    kicker: 'Preset 02',
    prompt:
      '在这张图的基础上，为主卧增加一个独立卫生间。优先利用主卧邻近空间，在不改变建筑外轮廓、入户位置和主要结构边界的前提下增加卫浴空间，并保持客餐厅、厨房、其他卧室与主要交通动线顺畅。',
    ready: false,
    badge: '待结果素材',
  },
  both: {
    title: '同时增加卧室 + 卫生间',
    kicker: 'Preset 03',
    prompt:
      '在当前户型基础上，同时完成两项升级：1）整体格局升级为三室；2）增加一个独立卫生间。保留建筑外轮廓与主要结构边界，重新组织室内非承重隔墙、房门及家具，使房间使用和交通动线保持合理。',
    ready: false,
    badge: '预留',
  },
}

const ONE_PRESETS: PresetConfig = {
  'add-bedroom': {
    title: '增加一个卧室',
    kicker: 'Preset 01',
    prompt: '在这张图的基础上，整体户型变成升级成二室一厅二卫一厨的格局。',
    ready: true,
  },
  'add-bathroom': {
    title: '增加一个卫生间',
    kicker: 'Preset 02',
    prompt: '在这张图的基础上，整体户型变成升级成一室一厅二卫一厨的格局。',
    ready: true,
  },
  both: {
    title: '同时增加卧室 + 卫生间',
    kicker: 'Preset 03',
    prompt: '该组合预设暂时保留，待你继续上传对应二维方案、渲染图与 BOM 后再接入。',
    ready: false,
    badge: '预留',
  },
}

const ONE_BEDROOM_ADD_BEDROOM_SCHEMES = [
  {
    title: '方案 01 · 储物间改客卫 + 卧室水平分隔',
    short: '储物间改客卫 / 卧室一分为二',
    summary: '将储物间改为第二卫生间，同时把原 19.1㎡ 卧室沿水平方向划分为主卧与次卧。',
    plan: '/preset/one-bedroom/add-bedroom/plan-01.png',
    render: '/preset/one-bedroom/add-bedroom/render-01.webp',
    bom: '/data/one-bedroom/add-bedroom-bom-plan-01.json',
    xlsx: '/bom/one-bedroom/add-bedroom/BOM-方案1.xlsx',
  },
  {
    title: '方案 02 · 卫生间拆分双卫 + 卧室隔出次卧',
    short: '原卫一分为二 / 卧室下部隔出次卧',
    summary: '将原 6.9㎡ 卫生间拆分为主卫与客卫，并在卧室下部隔出第二卧室，形成双卧双卫。',
    plan: '/preset/one-bedroom/add-bedroom/plan-02.png',
    render: '/preset/one-bedroom/add-bedroom/render-02.webp',
    bom: '/data/one-bedroom/add-bedroom-bom-plan-02.json',
    xlsx: '/bom/one-bedroom/add-bedroom/BOM-方案2.xlsx',
  },
  {
    title: '方案 03 · 压缩厨房隔出客卫 + 卧室竖向分隔',
    short: '厨房局部改客卫 / 卧室竖向分隔',
    summary: '压缩厨房下部空间形成第二卫生间，并将原卧室沿竖向分成主卧与次卧。',
    plan: '/preset/one-bedroom/add-bedroom/plan-03.png',
    render: '/preset/one-bedroom/add-bedroom/render-03.webp',
    bom: '/data/one-bedroom/add-bedroom-bom-plan-03.json',
    xlsx: '/bom/one-bedroom/add-bedroom/BOM-方案3.xlsx',
  },
] as const satisfies readonly OneScheme[]

const ONE_BEDROOM_ADD_BATHROOM_SCHEMES = [
  {
    title: '方案 01 · 储物间改第二卫生间',
    short: '储物间 → 第二卫生间',
    summary: '将右上角 3.2㎡ 储物间直接改为第二卫生间，其余主要空间位置保持不变。',
    plan: '/preset/one-bedroom/plan-01.png',
    render: '/preset/one-bedroom/render-01.webp',
    bom: '/data/one-bedroom/bom-plan-01.json',
    xlsx: '/bom/one-bedroom/BOM-方案1.xlsx',
  },
  {
    title: '方案 02 · 原卫生间拆分主卫 + 客卫',
    short: '原卫生间 → 主卫 + 客卫',
    summary: '在原 6.9㎡ 卫生间内部新增隔墙，划分为主卫与公共卫生间，储物间继续保留。',
    plan: '/preset/one-bedroom/plan-02.png',
    render: '/preset/one-bedroom/render-02.webp',
    bom: '/data/one-bedroom/bom-plan-02.json',
    xlsx: '/bom/one-bedroom/BOM-方案2.xlsx',
  },
  {
    title: '方案 03 · 压缩厨房隔出第二卫生间',
    short: '厨房局部 → 第二卫生间',
    summary: '压缩右侧厨房下部空间，用新增内隔墙形成第二卫生间，原卫生间与储物间保持。',
    plan: '/preset/one-bedroom/plan-03.png',
    render: '/preset/one-bedroom/render-03.webp',
    bom: '/data/one-bedroom/bom-plan-03.json',
    xlsx: '/bom/one-bedroom/BOM-方案3.xlsx',
  },
] as const satisfies readonly OneScheme[]

const ONE_CASES: Record<Exclude<PresetKey, 'both'>, OneCaseMeta> = {
  'add-bedroom': {
    heading: '一居室 · 增加一个卧室预设升级',
    description: '保持原始外轮廓不变，围绕“增加一个卧室”的需求预置 3 套结果方案，并联动展示二维户型、渲染图与 BOM。',
    from: '1室1厅1卫1厨',
    to: '2室1厅2卫1厨',
    promptTip: '按键 01：在原一居基础上增加一个卧室，当前预设结果同步形成双卫与完整居住功能布局。',
    resultNote: '2 室 · 1 厅 · 2 卫 · 1 厨',
    renderTitle: '一居增卧空间可视化',
    resultSmall: '按键 1 · 二室一厅二卫一厨',
    bomSource: '3 份 Excel',
    schemes: ONE_BEDROOM_ADD_BEDROOM_SCHEMES,
  },
  'add-bathroom': {
    heading: '一居室 · 增加卫生间预设升级',
    description: '保持一居主体结构，针对“增加一个卫生间”的需求预置 3 种空间改造路径。',
    from: '1室1厅1卫1厨',
    to: '1室1厅2卫1厨',
    promptTip: '按键 02：在原一居基础上增加一个卫生间，生成 3 种可选空间改造方案，并分别对应渲染图和 BOM。',
    resultNote: '1 室 · 1 厅 · 2 卫 · 1 厨',
    renderTitle: '一居双卫空间可视化',
    resultSmall: '按键 2 · 一室一厅二卫一厨',
    bomSource: '3 份 Excel',
    schemes: ONE_BEDROOM_ADD_BATHROOM_SCHEMES,
  },
}

const BOM_TABS: Array<{ key: BomTabKey; label: string }> = [
  { key: 'pc', label: 'PC构件BOM' },
  { key: 'connector', label: '连接材料及辅材' },
  { key: 'summary', label: '构件汇总' },
  { key: 'whole', label: '全屋BOM明细' },
  { key: 'budget', label: '预算汇总' },
]

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
              if (section) return <tr className="section-row" key={r}><td colSpan={Math.max(1, headers.length)}>{String(row[0])}</td></tr>
              if (nonEmpty === 0) return null
              return <tr key={r}>{headers.map((_, c) => {
                const value = row[c]
                const numeric = typeof value === 'number'
                return <td className={numeric ? 'number' : ''} key={c}>{value === null || value === undefined ? '—' : String(value)}</td>
              })}</tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OneBomTable({ data }: { data: OneBom | null }) {
  if (!data) return <div className="bom-loading">正在载入当前方案 BOM…</div>
  return (
    <div className="bom-table-wrap one-bom-table">
      <div className="bom-table-title"><div><b>{data.title}</b><span>{data.note}</span></div></div>
      <div className="table-scroll">
        <table>
          <thead><tr>{data.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {data.rows.map((row, r) => {
              const nonEmpty = row.filter(cell => cell !== null && cell !== '').length
              const section = nonEmpty === 1 && row[0]
              if (section) return <tr className="section-row" key={r}><td colSpan={Math.max(1, data.headers.length)}>{String(row[0])}</td></tr>
              if (nonEmpty === 0) return null
              return <tr key={r}>{data.headers.map((_, c) => {
                const value = row[c]
                const numeric = typeof value === 'number'
                return <td className={numeric ? 'number' : ''} key={c}>{value === null || value === undefined ? '—' : String(value)}</td>
              })}</tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PresetDemoPage() {
  const [activeGuide, setActiveGuide] = useState<1 | 2 | 3>(1)
  const [preset, setPreset] = useState<PresetKey>('add-bedroom')
  const [prompt, setPrompt] = useState(ONE_PRESETS['add-bedroom'].prompt)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [resultIndex, setResultIndex] = useState(0)
  const [bomTab, setBomTab] = useState<BomTabKey>('pc')
  const [pcBom, setPcBom] = useState<BomBundle | null>(null)
  const [wholeBom, setWholeBom] = useState<WholeBomBundle | null>(null)
  const [oneBedAddBedroomBoms, setOneBedAddBedroomBoms] = useState<Array<OneBom | null>>([null, null, null])
  const [oneBedAddBathroomBoms, setOneBedAddBathroomBoms] = useState<Array<OneBom | null>>([null, null, null])

  useEffect(() => {
    Promise.all([
      fetch(asset('/data/pc-bom.json')).then(r => r.json()),
      fetch(asset('/data/whole-house-bom.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/add-bedroom-bom-plan-01.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/add-bedroom-bom-plan-02.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/add-bedroom-bom-plan-03.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/bom-plan-01.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/bom-plan-02.json')).then(r => r.json()),
      fetch(asset('/data/one-bedroom/bom-plan-03.json')).then(r => r.json()),
    ]).then(([pc, whole, ab1, ab2, ab3, bath1, bath2, bath3]) => {
      setPcBom(pc)
      setWholeBom(whole)
      setOneBedAddBedroomBoms([ab1, ab2, ab3])
      setOneBedAddBathroomBoms([bath1, bath2, bath3])
    }).catch(() => {})
  }, [])

  const casePresets = activeGuide === 1 ? ONE_PRESETS : TWO_PRESETS
  const selected = casePresets[preset]

  const currentOneCase = activeGuide === 1 && preset !== 'both' ? ONE_CASES[preset as Exclude<PresetKey, 'both'>] : null
  const currentOneSchemes = currentOneCase?.schemes || []
  const currentOneScheme = currentOneSchemes[Math.min(resultIndex, Math.max(0, currentOneSchemes.length - 1))]
  const currentOneBoms = preset === 'add-bedroom' ? oneBedAddBedroomBoms : oneBedAddBathroomBoms
  const currentOneBom = currentOneBoms[Math.min(resultIndex, 2)]

  function selectGuide(guide: 1 | 2 | 3) {
    setActiveGuide(guide)
    setGenerating(false)
    setResultIndex(0)
    setBomTab('pc')
    if (guide === 1) {
      setPreset('add-bedroom')
      setPrompt(ONE_PRESETS['add-bedroom'].prompt)
      setGenerated(false)
    } else if (guide === 2) {
      setPreset('add-bedroom')
      setPrompt(TWO_PRESETS['add-bedroom'].prompt)
      setGenerated(false)
    } else {
      setPreset('add-bedroom')
      setPrompt(TWO_PRESETS['add-bedroom'].prompt)
      setGenerated(true)
    }
  }

  function choosePreset(key: PresetKey) {
    setPreset(key)
    setPrompt(casePresets[key].prompt)
    setGenerated(false)
    setGenerating(false)
    setResultIndex(0)
  }

  function runPreset() {
    if (!selected.ready || generating || activeGuide === 3) return
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

  const headerTitle = activeGuide === 1 ? '一居预设升级演示' : activeGuide === 2 ? '两居 → 三居预设升级' : '三居最终方案展示'
  const guideStatus = activeGuide === 1 ? '当前案例：一居扩展方案集' : activeGuide === 2 ? '当前案例：两居升级三居' : '当前案例：三居最终结果'

  return (
    <main className="preset-page">
      <header className="portal-header preset-header">
        <a className="brand" href="#top">IDEAL HOME <b>理想家</b><small>DreamHouse · Preset Reconfiguration Demo</small></a>
        <div className="header-right"><span>V10 STYLE</span><strong>{headerTitle}</strong></div>
      </header>

      <div className="preset-wrap" id="top">
        <section className="intro-row">
          <div>
            <span className="eyebrow">PRESET RESIDENTIAL RECONFIGURATION</span>
            <h1>户型升级预设演示</h1>
            <p>先用确定的样板把“需求描述 → 多方案结果 → 渲染图 → BOM”完整串起来。本版本不调用外部 API，后续只需要替换生成动作即可。</p>
          </div>
          <div className="intro-status"><i /><div><b>Preset Mode</b><span>当前使用本地预设资源</span></div></div>
        </section>

        <section className="guide-section card">
          <div className="section-heading"><div><span>01</span><div><b>户型导览</b><small>一居 / 两居 / 三居</small></div></div><em>{guideStatus}</em></div>
          <div className="guide-grid">
            <button className={`guide-card floorplan-guide ${activeGuide === 1 ? 'active' : ''}`} onClick={() => selectGuide(1)}>
              <img src={asset('/preset/one-bedroom/original.png')} alt="一居初始户型" />
              <div><span>1 BEDROOM</span><b>一居</b><small>1室1厅1卫1厨 · 已接入两套预设</small></div>
            </button>
            <button className={`guide-card floorplan-guide ${activeGuide === 2 ? 'active' : ''}`} onClick={() => selectGuide(2)}>
              <img src={asset('/preset/initial-two-bedroom.png')} alt="两居初始户型" />
              <div><span>2 BEDROOM</span><b>两居</b><small>当前原始户型 · 可升级三居</small></div>
            </button>
            <button className={`guide-card floorplan-guide ${activeGuide === 3 ? 'active' : ''}`} onClick={() => selectGuide(3)}>
              <img src={asset('/preset/generated-plan-01.png')} alt="三居升级户型" />
              <div><span>3 BEDROOM</span><b>三居</b><small>现有两居案例最终结果</small></div>
            </button>
          </div>
        </section>

        {activeGuide === 1 && (
          <>
            <section className="case-summary card one-case-summary">
              <div>
                <span>ONE BEDROOM CASE</span>
                <h2>{currentOneCase?.heading ?? '一居室预设升级'}</h2>
                <p>{currentOneCase?.description ?? '请选择左侧按键加载预设结果。'}</p>
              </div>
              <div className="summary-pills">
                <span><small>原始格局</small><b>{currentOneCase?.from ?? '1室1厅1卫1厨'}</b></span>
                <i>→</i>
                <span><small>目标格局</small><b>{currentOneCase?.to ?? '待配置'}</b></span>
                <span><small>结果方案</small><b>{currentOneCase ? `${currentOneCase.schemes.length} 套` : '—'}</b></span>
              </div>
            </section>

            <section className="workspace-grid one-workspace">
              <article className="card prompt-card">
                <div className="section-heading compact"><div><span>02</span><div><b>需求样板</b><small>按键 1 / 2 已配置 · 按键 3 预留</small></div></div></div>
                <div className="preset-buttons">
                  {(Object.keys(ONE_PRESETS) as PresetKey[]).map((key, index) => (
                    <button key={key} className={preset === key ? 'selected' : ''} onClick={() => choosePreset(key)}>
                      <i>0{index + 1}</i><div><small>{ONE_PRESETS[key].kicker}</small><b>{ONE_PRESETS[key].title}</b></div>{!ONE_PRESETS[key].ready && <em>{ONE_PRESETS[key].badge}</em>}
                    </button>
                  ))}
                </div>
                <label className="prompt-label"><span>Prompt 示例</span><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={10} /></label>
                <div className="prompt-tip"><b>当前预设目标</b><span>{currentOneCase?.promptTip ?? '当前按键暂未配置结果素材。'}</span></div>
                <button className="generate-button" disabled={!selected.ready || generating} onClick={runPreset}>{generating ? '正在生成 3 套预设方案…' : selected.ready ? '生成方案' : '当前结果素材暂未配置'}</button>
                {generating && <div className="generation-steps"><span className="done">读取一居初始户型</span><span className="done">套用当前需求样板</span><span>生成 3 套二维方案</span><span>载入渲染与 BOM</span></div>}
              </article>

              <article className="card original-card">
                <div className="section-heading compact"><div><span>03</span><div><b>原始户型</b><small>一居室基线 · 用于比对</small></div></div></div>
                <div className="plan-stage original-stage portrait-plan"><img src={asset('/preset/one-bedroom/original.png')} alt="原始一居户型图" /></div>
                <div className="plan-note"><b>现状</b><span>1 室 · 1 厅 · 1 卫 · 1 厨 · 阳台 · 储物间</span></div>
              </article>

              <article className={`card result-card ${generated ? 'has-result' : ''}`} id="generated-output">
                <div className="section-heading compact"><div><span>04</span><div><b>生成结果</b><small>{currentOneCase?.resultSmall ?? '等待预设配置'}</small></div></div></div>
                {!generated || !currentOneCase ? <div className="empty-result"><div className="empty-icon">↗</div><b>等待生成</b><span>选择对应预设，确认 Prompt 后点击“生成方案”。</span></div> : <>
                  <div className="result-switch three-switch">{currentOneSchemes.map((scheme, index) => <button key={scheme.title} className={resultIndex === index ? 'active' : ''} onClick={() => setResultIndex(index)}>方案 0{index + 1}</button>)}</div>
                  <div className="scheme-brief"><b>{currentOneScheme?.title}</b><span>{currentOneScheme?.summary}</span></div>
                  <div className="plan-stage generated-stage portrait-plan"><img src={asset(currentOneScheme?.plan || '/preset/one-bedroom/original.png')} alt={currentOneScheme?.title || '生成结果'} /></div>
                  <div className="plan-note success"><b>目标完成</b><span>{currentOneCase.resultNote} · 当前为方案 0{resultIndex + 1}</span></div>
                </>}
              </article>
            </section>

            <section className={`render-section card ${generated ? 'visible' : ''}`}>
              <div className="section-heading"><div><span>05</span><div><b>方案渲染图</b><small>与当前二维方案一一对应</small></div></div><em>{generated ? `方案 0${resultIndex + 1}` : '等待二维方案生成'}</em></div>
              {generated && currentOneCase && currentOneScheme ? <div className="render-grid one-render-grid"><img src={asset(currentOneScheme.render)} alt={`${currentOneScheme.title} 三维渲染`} /><div className="render-copy"><span>RENDER PREVIEW</span><h2>{currentOneCase.renderTitle}</h2><p>{currentOneScheme.summary}</p><div><b>当前方案</b><small>{currentOneScheme.short}</small></div><div><b>目标户型</b><small>{currentOneCase.to}</small></div><div><b>结果来源</b><small>本地预设图像 · 与当前方案联动切换</small></div></div></div> : <div className="render-placeholder">点击“生成方案”后显示 3 套改造方案对应的渲染图。</div>}
            </section>

            <section className={`bom-section-main card ${generated ? 'visible' : ''}`}>
              <div className="section-heading"><div><span>06</span><div><b>BOM 清单</b><small>当前方案对应的工程物料估算</small></div></div>{generated && currentOneScheme && <div className="download-row"><a href={asset(currentOneScheme.xlsx)} download>下载方案 0{resultIndex + 1} BOM</a></div>}</div>
              {generated && currentOneCase ? <>
                <div className="bom-metrics"><div><span>目标户型</span><b>{currentOneCase.to}</b></div><div><span>当前方案</span><b>方案 0{resultIndex + 1}</b></div><div><span>BOM 条目</span><b>{currentOneBom?.itemCount ?? '—'} 项</b></div><div><span>数据来源</span><b>{currentOneCase.bomSource}</b></div></div>
                <div className="one-bom-scheme-tabs">{currentOneSchemes.map((scheme, index) => <button key={scheme.title} className={resultIndex === index ? 'active' : ''} onClick={() => setResultIndex(index)}>BOM · 方案 0{index + 1}</button>)}</div>
                <OneBomTable data={currentOneBom} />
              </> : <div className="bom-placeholder">完成当前预设生成后，自动展开对应方案 BOM。</div>}
            </section>
          </>
        )}

        {activeGuide === 2 && (
          <>
            <section className="workspace-grid">
              <article className="card prompt-card">
                <div className="section-heading compact"><div><span>02</span><div><b>需求样板</b><small>点击按键载入 Prompt 示例</small></div></div></div>
                <div className="preset-buttons">{(Object.keys(TWO_PRESETS) as PresetKey[]).map((key, index) => <button key={key} className={preset === key ? 'selected' : ''} onClick={() => choosePreset(key)}><i>0{index + 1}</i><div><small>{TWO_PRESETS[key].kicker}</small><b>{TWO_PRESETS[key].title}</b></div>{!TWO_PRESETS[key].ready && <em>{TWO_PRESETS[key].badge}</em>}</button>)}</div>
                <label className="prompt-label"><span>Prompt 示例</span><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={11} /></label>
                <div className="prompt-tip"><b>描述样板</b><span>用户后续可按这个结构描述：目标格局 + 保留条件 + 可调整位置 + 动线 / 家具要求。</span></div>
                <button className="generate-button" disabled={!selected.ready || generating} onClick={runPreset}>{generating ? '正在生成预设方案…' : selected.ready ? '生成方案' : '当前结果素材暂未配置'}</button>
                {generating && <div className="generation-steps"><span className="done">读取初始户型</span><span className="done">套用三居样板</span><span>生成二维结果</span><span>载入渲染与 BOM</span></div>}
              </article>

              <article className="card original-card"><div className="section-heading compact"><div><span>03</span><div><b>原始户型</b><small>52㎡ · 两居基线</small></div></div></div><div className="plan-stage original-stage"><img src={asset('/preset/initial-two-bedroom.png')} alt="初始两居户型图" /></div><div className="plan-note"><b>现状</b><span>2 室 · 1 厅 · 1 卫 · 1 厨 · 阳台</span></div></article>

              <article className={`card result-card ${generated ? 'has-result' : ''}`} id="generated-output"><div className="section-heading compact"><div><span>04</span><div><b>生成结果</b><small>按键 1 · 三室一厅一卫一厨</small></div></div></div>{!generated ? <div className="empty-result"><div className="empty-icon">↗</div><b>等待生成</b><span>选择“增加一个卧室”，确认 Prompt 后点击“生成方案”。</span></div> : <><div className="result-switch"><button className={resultIndex === 0 ? 'active' : ''} onClick={() => setResultIndex(0)}>二维结果 01</button><button className={resultIndex === 1 ? 'active' : ''} onClick={() => setResultIndex(1)}>二维结果 02</button></div><div className="plan-stage generated-stage"><img src={asset(resultIndex === 0 ? '/preset/generated-plan-01.png' : '/preset/generated-plan-02.png')} alt={`三居改造二维结果 ${resultIndex + 1}`} /></div><div className="plan-note success"><b>目标完成</b><span>3 室 · 1 厅 · 1 卫 · 1 厨</span></div></>}</article>
            </section>

            <section className={`render-section card ${generated ? 'visible' : ''}`}><div className="section-heading"><div><span>05</span><div><b>方案渲染图</b><small>对应按键 1 的三居预设方案</small></div></div><em>{generated ? '已生成' : '等待二维方案生成'}</em></div>{generated ? <div className="render-grid"><img src={asset('/preset/generated-render.png')} alt="三居户型三维渲染图" /><div className="render-copy"><span>RENDER PREVIEW</span><h2>三居空间可视化</h2><p>渲染图作为当前预设结果的视觉确认页。后续接入真实图像模型时，这个位置保持不变，只替换生成来源。</p><div><b>空间目标</b><small>增加独立卧室 · 保留公共空间主轴 · 基础家具布置</small></div><div><b>结果来源</b><small>本地预设图像</small></div></div></div> : <div className="render-placeholder">生成按键 1 后显示对应渲染图</div>}</section>

            <section className={`bom-section-main card ${generated ? 'visible' : ''}`}><div className="section-heading"><div><span>06</span><div><b>BOM 清单与预算</b><small>直接导入你提供的两份 Excel 内容</small></div></div><div className="download-row"><a href={asset('/bom/pc-components-bom-52sqm.xlsx')} download>下载 PC BOM</a><a href={asset('/bom/whole-house-bom-budget-52sqm.xlsx')} download>下载全屋 BOM</a></div></div>{generated ? <><div className="bom-metrics"><div><span>建筑面积</span><b>52㎡</b></div><div><span>目标户型</span><b>3室1厅1卫1厨</b></div><div><span>预算估算</span><b>¥100,040</b></div><div><span>数据来源</span><b>2 份 Excel</b></div></div><div className="bom-tabs">{BOM_TABS.map(tab => <button key={tab.key} className={bomTab === tab.key ? 'active' : ''} onClick={() => setBomTab(tab.key)}>{tab.label}</button>)}</div><BomTable rows={bomRows.rows} headerIndex={bomRows.header} /></> : <div className="bom-placeholder">完成预设生成后自动展开对应 BOM 清单。</div>}</section>
          </>
        )}

        {activeGuide === 3 && (
          <>
            <section className="case-summary card"><div><span>THREE BEDROOM RESULT</span><h2>三居室最终方案</h2><p>直接查看现有“两居 → 三居”案例的最终二维结果、渲染图和 BOM。</p></div><div className="summary-pills"><span><small>户型</small><b>3室1厅1卫1厨</b></span><span><small>状态</small><b>已生成</b></span></div></section>
            <section className="final-showcase card"><div className="section-heading"><div><span>02</span><div><b>最终二维方案</b><small>现有三居预设结果</small></div></div></div><div className="final-media-grid"><img src={asset('/preset/generated-plan-01.png')} alt="三居最终二维户型" /><img src={asset('/preset/generated-render.png')} alt="三居最终渲染图" /></div></section>
            <section className="bom-section-main card visible"><div className="section-heading"><div><span>03</span><div><b>BOM 清单与预算</b><small>三居最终方案数据</small></div></div></div><div className="bom-tabs">{BOM_TABS.map(tab => <button key={tab.key} className={bomTab === tab.key ? 'active' : ''} onClick={() => setBomTab(tab.key)}>{tab.label}</button>)}</div><BomTable rows={bomRows.rows} headerIndex={bomRows.header} /></section>
          </>
        )}
      </div>
    </main>
  )
}
