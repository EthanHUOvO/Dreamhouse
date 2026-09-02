import Link from 'next/link'

export default function PortalHome() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <div className="landing-header">
          <div>
            <p className="eyebrow">IDEAL HOME · 理想家</p>
            <h1>可变空间智能建造平台</h1>
            <p className="landing-desc">
              入口保持为住户端与施工端。住户端采用触摸屏翻页式交互，依次完成户型选择、Qwen 平面改造、Qwen-Image 渲染、BOM 输出；施工端自动承接前端订单、BOM 和施工进度。
            </p>
          </div>
        </div>

        <div className="entry-grid">
          <Link className="entry-card" href="/customer">
            <div className="entry-index">01</div>
            <div>
              <h2>住户入口</h2>
              <p>触摸翻页式交互 · 户型选择 · AI 改造 · 渲染 · BOM</p>
            </div>
          </Link>
          <Link className="entry-card" href="/contractor">
            <div className="entry-index warm">02</div>
            <div>
              <h2>施工入口</h2>
              <p>订单联动 · BOM 打印 · 施工进度 · 摄像头联动</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
