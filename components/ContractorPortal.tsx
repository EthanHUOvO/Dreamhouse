'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { GeneratedBom, GeneratedImages, GeneratedLayout, ResidenceType } from '@/lib/demo-data'

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

export default function ContractorPortal() {
  const [orders, setOrders] = useState<ProjectOrder[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    const raw = window.localStorage.getItem('dreamhouse-orders')
    const list = raw ? JSON.parse(raw) : []
    setOrders(list)
    if (list[0]?.id) setSelectedId(list[0].id)
  }, [])

  const current = useMemo(() => orders.find(item => item.id === selectedId) || orders[0], [orders, selectedId])

  return (
    <main className="portal-page contractor-page">
      <header className="portal-topbar">
        <div>
          <p className="eyebrow">IDEAL HOME · 理想家</p>
          <h1>施工入口 · 订单联动面板</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/">返回首页</Link>
          <Link href="/customer">前往住户端</Link>
        </div>
      </header>

      <div className="contractor-shell">
        <aside className="order-sidebar panel">
          <div className="panel-title">订单管理</div>
          <p className="small-muted">施工端会自动读取住户端提交的订单，支持多订单切换回看。</p>
          <div className="order-list">
            {orders.length === 0 ? <div className="empty-box">当前还没有住户提交的订单。请先到住户端生成并提交。</div> : null}
            {orders.map(order => (
              <button key={order.id} className={`order-card ${selectedId === order.id ? 'active' : ''}`} onClick={() => setSelectedId(order.id)}>
                <b>{order.id}</b>
                <span>{order.layout.title}</span>
                <small>{new Date(order.createdAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="contractor-main">
          <div className="panel overview-panel">
            <div className="panel-title">订单总览</div>
            {current ? (
              <div className="overview-grid">
                <div>
                  <h2>{current.id}</h2>
                  <p>{current.layout.title}</p>
                  <div className="chip-row">
                    <span className="chip">设计已完成</span>
                    <span className="chip">待施工</span>
                    <span className="chip">可打印 BOM</span>
                  </div>
                </div>
                <div className="overview-stages">
                  <div className="stage done">1 设计完成</div>
                  <div className="stage active">2 BOM/生产准备</div>
                  <div className="stage">3 现场施工</div>
                  <div className="stage">4 验收</div>
                </div>
              </div>
            ) : <div className="empty-box">请选择订单。</div>}
          </div>

          {current ? (
            <>
              <div className="contractor-grid">
                <div className="panel">
                  <div className="panel-title">最终平面图</div>
                  <img className="panel-image fit-contain" src={current.layout.generatedPlan} alt="平面图" />
                </div>
                <div className="panel">
                  <div className="panel-title">渲染效果</div>
                  <img className="panel-image fit-contain" src={current.images.overallRender} alt="渲染图" />
                </div>
              </div>

              <div className="contractor-grid">
                <div className="panel bom-panel">
                  <div className="panel-title">BOM 清单</div>
                  <table className="bom-table compact">
                    <thead>
                      <tr>
                        <th>类别</th><th>名称</th><th>规格</th><th>单位</th><th>数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.bom.items.map((item, idx) => (
                        <tr key={`${item.name}-${idx}`}>
                          <td>{item.category}</td>
                          <td>{item.name}</td>
                          <td>{item.spec}</td>
                          <td>{item.unit}</td>
                          <td>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="download-list">
                    {current.bom.sampleDownloads.map(file => (
                      <a key={file.href} href={file.href} target="_blank" rel="noreferrer">下载：{file.label}</a>
                    ))}
                    <button className="nav-btn secondary" onClick={() => window.print()}>打印 BOM / 页面</button>
                  </div>
                </div>

                <div className="panel live-panel">
                  <div className="panel-title">现场摄像头 / 机械臂联动</div>
                  <div className="camera-placeholder">
                    <div>
                      <b>Live Camera Placeholder</b>
                      <p>这里预留接入现场摄像头、机械臂施工画面或预录视频的位置。可在后续替换为 HLS / WebRTC 源。</p>
                    </div>
                  </div>
                  <div className="status-list">
                    <div><span>当前任务</span><b>墙体定位与安装</b></div>
                    <div><span>3D打印</span><b>运行中</b></div>
                    <div><span>机械臂状态</span><b>待接入现场联动</b></div>
                    <div><span>验收阶段</span><b>未开始</b></div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  )
}
