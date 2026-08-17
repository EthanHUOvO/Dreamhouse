'use client'
import type { Order } from '@/lib/types'
function VideoBox({src,label}:{src?:string;label:string}){return <div className="contractor-video">{src?<video src={src} controls muted loop playsInline/>:<div><b>{label}</b><span>MP4 / HLS / WebRTC</span></div>}</div>}
export default function ContractorOrderDetail({order,onAdvancePrinter,onAdvanceRobot,onCompleteManual,onAcceptChange}:{order:Order;onAdvancePrinter:()=>void;onAdvanceRobot:()=>void;onCompleteManual:()=>void;onAcceptChange:()=>void}){
  return <section className="contractor-detail"><div className="order-detail-head"><div><b>{order.id}</b><span>{order.customer} · {order.projectName}</span></div><div className="detail-status">Design V{order.approvedVersion}</div></div>
    {order.changeRequest&&order.changeRequest.status==='submitted'&&<div className="change-alert"><div><strong>收到设计变更</strong><span>V{order.changeRequest.fromVersion} → V{order.changeRequest.toVersion} · {order.changeRequest.summary}</span></div><button onClick={onAcceptChange}>接受变更</button></div>}
    <div className="contractor-board">
      <section className="production-side"><div className="board-title">生产</div><div className="bom-section"><h3>BOM清单及排序展示</h3><div className="bom-head"><span>顺序</span><span>构件</span><span>数量</span><span>来源</span><span>状态</span></div>{order.bom.map(x=><div className="bom-line" key={x.id}><span>{String(x.order).padStart(2,'0')}</span><strong>{x.label}</strong><span>{x.quantity}</span><span>{x.source}</span><span>{x.status}</span></div>)}</div>
        <div className="component-split"><div><h3>墙体</h3><div className="wall-mini"><i/><i/><i/></div><b>{order.bom.find(x=>x.category==='wall')?.quantity??0} 件</b></div><div><h3>家具</h3><div className="furn-mini"><i/><i/><i/></div><b>{order.bom.find(x=>x.category==='furniture')?.quantity??0} 件</b></div></div>
        <div className="device-panel"><h3>状态信息（3D打印机）</h3><div className="device-grid"><span>设备 <b>{order.printer.name}</b></span><span>任务 <b>{order.printer.task}</b></span><span>状态 <b>{order.printer.status}</b></span><span>进度 <b>{order.printer.progress}%</b></span></div><div className="device-progress"><i style={{width:`${order.printer.progress}%`}}/></div><button onClick={onAdvancePrinter}>推进打印进度</button></div>
        <div className="video-section"><h3>视频</h3><VideoBox src={process.env.NEXT_PUBLIC_PRINTER_VIDEO} label="3D打印机实时画面"/></div>
      </section>
      <section className="construction-side"><div className="board-title">施工</div><div className="task-split"><div><h3>人工</h3>{order.manualTasks.map(t=><div className="task-row" key={t.id}><span>{t.label}</span><b>{t.status}</b></div>)}<button onClick={onCompleteManual}>完成人工任务</button></div><div><h3>机械臂</h3>{order.robotTasks.map(t=><div className="task-row" key={t.id}><span>{t.label}</span><b>{t.status}</b></div>)}</div></div>
        <div className="device-panel robot-device"><h3>状态信息（机械臂）</h3><div className="device-grid"><span>设备 <b>{order.robot.name}</b></span><span>任务 <b>{order.robot.task}</b></span><span>状态 <b>{order.robot.status}</b></span><span>进度 <b>{order.robot.progress}%</b></span></div><div className="device-progress"><i style={{width:`${order.robot.progress}%`}}/></div><button onClick={onAdvanceRobot}>推进机械臂进度</button></div>
        <div className="video-section"><h3>视频</h3><VideoBox src={process.env.NEXT_PUBLIC_ROBOT_VIDEO} label="机械臂实时画面"/></div>
      </section>
    </div>
  </section>
}
