import Link from 'next/link'
import PortalHeader from '@/components/shared/PortalHeader'

function HomeIcon({ type }: { type: "home" | "build" }) {
  return <svg className="home-entry-icon" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{type === "home" ? <><path d="m10 31 22-18 22 18" /><path d="M16 28v24h32V28" /><path d="M26 52V38h12v14" /></> : <><path d="M10 51h44M16 51V25h15v26M37 51V14h11v37" /><path d="M20 31h6m-6 8h6m15-17h3m-3 8h3m-3 8h3" /></>}</g></svg>
}

export default function HomePortal() {
  return (
    <main className="home">
      <PortalHeader title="" subtitle="" />
      <section className="home-hero" aria-label="理想家平台主视觉">
        <div className="home-hero-copy">
          <span className="home-kicker">数字建造 · 理想人居</span>
          <div className="home-logo">IDEAL HOME <b>理想家</b></div>
          <h1>可变空间智能建造平台</h1>
          <p>从一张户型图开始，把家的想法变成看得见、住得好的空间。</p>
        </div>
      </section>
      <section className="home-entry-section">
        <div className="home-section-heading">
          <div><span>平台入口</span><h2>选择您的工作台</h2></div>
          <p>设计与施工共享同一套空间数据</p>
        </div>
        <div className="portal-choices">
          <Link href="/customer?new=1" className="portal-choice">
            <div className="portal-choice-top"><span>01</span><HomeIcon type="home" /></div>
            <div><b>自助设计</b><small>户型选择 · AI调整 · 三维空间 · 装修方案 · 预算</small></div>
            <em>进入自助设计 →</em>
          </Link>
          <Link href="/contractor/" className="portal-choice contractor-choice">
            <div className="portal-choice-top"><span>02</span><HomeIcon type="build" /></div>
            <div><b>远程监工</b><small>任务管理 · 设备监控 · 模型制造 · 机械臂 · 施工记录</small></div>
            <em>进入远程监工 →</em>
          </Link>
        </div>
      </section>
      <footer className="home-footer"><span>IDEAL HOME · 数字建造平台</span><span>让建筑更美好，让空间更懂生活</span></footer>
    </main>
  );
}
