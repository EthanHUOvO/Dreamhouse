'use client'
import { useViewer } from '@pascal-app/editor'

function VideoCard({title,src,meta}:{title:string;src?:string;meta:string}){
  return <div className="video-card"><div className="video-head"><strong>{title}</strong><span>READY</span></div>{src?<video controls muted loop playsInline src={src}/>:<div className="video-placeholder"><i/><span>{meta}</span><small>可替换为 MP4 / HLS / WebRTC 画面</small></div>}<div className="progress"><i/></div></div>
}

export default function FabricationPanel(){
  const exportScene=useViewer(s=>s.exportScene)
  return <div className="fab">
    <div className="export-grid"><button onClick={()=>exportScene?.('stl')} disabled={!exportScene}>导出 STL</button><button onClick={()=>exportScene?.('obj')} disabled={!exportScene}>导出 OBJ</button><button onClick={()=>exportScene?.('glb')} disabled={!exportScene}>导出 GLB</button></div>
    <div className="pipeline"><span>Pascal Scene</span><b>→</b><span>Simulation</span><b>→</b><span>Slice</span><b>→</b><span>Print</span><b>→</b><span>Robot</span></div>
    <VideoCard title="Simulation" src={process.env.NEXT_PUBLIC_SIMULATION_VIDEO} meta="仿真软件画面"/>
    <VideoCard title="3D Printer" src={process.env.NEXT_PUBLIC_PRINTER_VIDEO} meta="打印机实时画面"/>
    <VideoCard title="Robot Assembly" src={process.env.NEXT_PUBLIC_ROBOT_VIDEO} meta="机械臂装配画面"/>
    <div className="constraint-box"><strong>制造说明</strong><p>当前按钮使用 Pascal 原生全场景 STL/OBJ/GLB 导出。</p><p>正式打印再增加 Floor / Walls / Furniture 分类导出、布尔合并、模型修复和切片。</p></div>
  </div>
}
