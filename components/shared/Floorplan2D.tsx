'use client'
import type { SceneGraph } from '@/lib/types'

function pt(x:number,z:number){return [24+(x+6)/12*552,24+(z+4.5)/9*402]}
function openingPoint(scene:SceneGraph,node:any){
  const wall=scene.nodes[node.wallId];if(!wall)return null
  const[sx,sz]=wall.start,[ex,ez]=wall.end,dx=ex-sx,dz=ez-sz,len=Math.hypot(dx,dz)||1,d=node.position?.[0]??0
  return [sx+dx/len*d,sz+dz/len*d] as [number,number]
}
export default function Floorplan2D({scene}:{scene:SceneGraph}){
  const zones=Object.values(scene.nodes).filter(n=>n.type==='zone'),walls=Object.values(scene.nodes).filter(n=>n.type==='wall'),doors=Object.values(scene.nodes).filter(n=>n.type==='door'),windows=Object.values(scene.nodes).filter(n=>n.type==='window')
  return <svg viewBox="0 0 600 450" className="floorplan"><rect width="600" height="450" rx="16" fill="#f8f7f3"/>
    {zones.map((z:any)=>{const points=(z.polygon??[]).map(([x,zz]:[number,number])=>pt(x,zz).join(',')).join(' ');const poly=z.polygon??[],n=poly.length||1,c=poly.reduce((a:[number,number],p:[number,number])=>[a[0]+p[0],a[1]+p[1]],[0,0]);const[cx,cy]=pt(c[0]/n,c[1]/n);return <g key={z.id}><polygon points={points} fill={`${z.color??'#7c8'}28`}/><text x={cx} y={cy} textAnchor="middle" className="fp-label">{z.name}</text></g>})}
    {walls.map((w:any)=>{const[x1,y1]=pt(w.start[0],w.start[1]),[x2,y2]=pt(w.end[0],w.end[1]),load=w.metadata?.structural_type==='load_bearing';return <line key={w.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={load?'#2f3137':'#6d7076'} strokeWidth={load?8:4}/>})}
    {windows.map((n:any)=>{const p=openingPoint(scene,n);if(!p)return null;const[x,y]=pt(p[0],p[1]);return <circle key={n.id} cx={x} cy={y} r="5" fill="#48a7cf" stroke="white" strokeWidth="2"/>})}
    {doors.map((n:any)=>{const p=openingPoint(scene,n);if(!p)return null;const[x,y]=pt(p[0],p[1]);return <rect key={n.id} x={x-5} y={y-5} width="10" height="10" rx="2" fill="#dc914d" stroke="white" strokeWidth="2"/>})}
  </svg>
}
