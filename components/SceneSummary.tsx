'use client'
import { useScene } from '@pascal-app/editor'

export default function SceneSummary(){
  const nodes=useScene(s=>s.nodes) as Record<string,any>
  const rooms=Object.values(nodes).filter((n:any)=>n.type==='zone') as any[]
  const doors=Object.values(nodes).filter((n:any)=>n.type==='door') as any[]
  const windows=Object.values(nodes).filter((n:any)=>n.type==='window') as any[]
  const walls=Object.values(nodes).filter((n:any)=>n.type==='wall') as any[]
  const items=Object.values(nodes).filter((n:any)=>n.type==='item') as any[]
  const load=walls.filter(n=>n.metadata?.structural_type==='load_bearing').length
  const partitions=walls.filter(n=>n.metadata?.structural_type==='partition').length

  return <>
    <div className="metrics five"><div><b>{rooms.length}</b><span>Rooms</span></div><div><b>{doors.length}</b><span>Doors</span></div><div><b>{windows.length}</b><span>Windows</span></div><div><b>{items.length}</b><span>Furniture</span></div><div><b>{partitions}</b><span>Partitions</span></div></div>
    <div className="room-list">{rooms.map(r=><div className="room-row" key={r.id}><strong>{r.name??r.id}</strong><span>{r.metadata?.semantic_type??'room'}</span></div>)}</div>
    <div className="constraint-box"><strong>STRUCTURAL GUARD</strong><p>承重墙：{load} · LOCKED</p><p>非承重墙：{partitions} · EDITABLE</p><p>门 / 窗：Pascal wall child + CSG opening</p></div>
  </>
}
