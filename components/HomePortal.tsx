import Link from 'next/link'
export default function HomePortal(){
  return <main className="home"><div className="home-logo">IDEAL HOME <b>理想家</b></div><h1>可变空间智能建造平台</h1><p>住户与施工方使用同一套订单、设计版本与施工进度数据。</p><div className="portal-choices"><Link href="/customer/" className="portal-choice"><span>01</span><div><b>住户入口</b><small>设计 · 施工 · 验收</small></div></Link><Link href="/contractor/" className="portal-choice contractor-choice"><span>02</span><div><b>施工方入口</b><small>订单管理 · 生产 · 施工</small></div></Link></div></main>
}
