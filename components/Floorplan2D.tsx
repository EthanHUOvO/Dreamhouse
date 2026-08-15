'use client'

import type { SceneGraph } from '@/lib/types'

function worldToSvg(x:number,z:number){
  const sx=24+(x+6)/12*552
  const sy=24+(z+4.5)/9*402
  return [sx,sy]
}

function openingWorldPoint(scene:SceneGraph,node:any){
  const wall=scene.nodes[node.wallId]
  if(!wall)return null
  const [sx,sz]=wall.start
  const [ex,ez]=wall.end
  const dx=ex-sx
  const dz=ez-sz
  const len=Math.hypot(dx,dz)||1
  const d=node.position?.[0]??0
  return [sx+dx/len*d,sz+dz/len*d] as [number,number]
}

export default function Floorplan2D({scene}:{scene:SceneGraph}){
  const zones=Object.values(scene.nodes).filter(n=>n.type==='zone')
  const walls=Object.values(scene.nodes).filter(n=>n.type==='wall')
  const doors=Object.values(scene.nodes).filter(n=>n.type==='door')
  const windows=Object.values(scene.nodes).filter(n=>n.type==='window')

  return <svg viewBox="0 0 600 450" className="floorplan-svg">
    <rect x="0" y="0" width="600" height="450" rx="14" fill="#f7f5ef"/>

    {zones.map((z:any)=>{
      const points=(z.polygon??[]).map(([x,zz]:[number,number])=>worldToSvg(x,zz).join(',')).join(' ')
      const center=(z.polygon??[]).reduce((a:[number,number],p:[number,number])=>[a[0]+p[0],a[1]+p[1]],[0,0])
      const n=(z.polygon??[]).length||1
      const [cx,cy]=worldToSvg(center[0]/n,center[1]/n)
      return <g key={z.id}>
        <polygon points={points} fill={`${z.color??'#8aa'}35`} stroke="none"/>
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="room-label">{z.name}</text>
      </g>
    })}

    {walls.map((wall:any)=>{
      const [x1,y1]=worldToSvg(wall.start[0],wall.start[1])
      const [x2,y2]=worldToSvg(wall.end[0],wall.end[1])
      const structural=wall.metadata?.structural_type==='load_bearing'
      return <line
        key={wall.id}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={structural?'#322f35':'#67616b'}
        strokeWidth={structural?8:4}
        strokeLinecap="square"
      />
    })}

    {windows.map((node:any)=>{
      const p=openingWorldPoint(scene,node)
      if(!p)return null
      const [x,y]=worldToSvg(p[0],p[1])
      return <g key={node.id}>
        <circle cx={x} cy={y} r="5.5" fill="#4ca8cf" stroke="#fff" strokeWidth="2"/>
      </g>
    })}

    {doors.map((node:any)=>{
      const p=openingWorldPoint(scene,node)
      if(!p)return null
      const [x,y]=worldToSvg(p[0],p[1])
      return <g key={node.id}>
        <rect x={x-5} y={y-5} width="10" height="10" rx="2" fill="#db8f48" stroke="#fff" strokeWidth="2"/>
      </g>
    })}

    <g transform="translate(20,420)" className="legend2d">
      <rect x="0" y="-8" width="8" height="8" fill="#4ca8cf"/><text x="13" y="0">窗</text>
      <rect x="52" y="-8" width="8" height="8" fill="#db8f48"/><text x="65" y="0">门</text>
      <line x1="105" y1="-4" x2="125" y2="-4" stroke="#322f35" strokeWidth="7"/><text x="132" y="0">承重墙</text>
    </g>
  </svg>
}
