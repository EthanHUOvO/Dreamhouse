import type { SceneGraph } from './types'

export function sceneToPngDataUrl(scene:SceneGraph,options:number|{size?:number;debugLabel?:boolean}=1200){
  const size=typeof options==='number'?options:options.size||1200,debugLabel=typeof options==='number'?true:options.debugLabel!==false
  if(typeof document==='undefined')throw new Error('sceneToPngDataUrl must run in the browser')
  const points:[number,number][]=[]
  for(const node of Object.values(scene.nodes)){
    if(node.type==='wall'&&Array.isArray(node.start)&&Array.isArray(node.end)){points.push([Number(node.start[0]),Number(node.start[1])],[Number(node.end[0]),Number(node.end[1])])}
    if(node.type==='zone'&&Array.isArray(node.polygon))for(const p of node.polygon)if(Array.isArray(p))points.push([Number(p[0]),Number(p[1])])
  }
  if(!points.length)throw new Error('Scene has no 2D geometry')
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs)
  const spanX=Math.max(1,maxX-minX),spanZ=Math.max(1,maxZ-minZ),pad=size*.08,scale=Math.min((size-2*pad)/spanX,(size-2*pad)/spanZ)
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable')
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size)
  const tx=(x:number)=>pad+(x-minX)*scale,ty=(z:number)=>size-(pad+(z-minZ)*scale)
  const zones=Object.values(scene.nodes).filter(n=>n.type==='zone'&&Array.isArray(n.polygon))
  for(const zone of zones){
    const poly=zone.polygon as [number,number][];if(poly.length<3)continue
    ctx.beginPath();poly.forEach((p,i)=>{const x=tx(Number(p[0])),y=ty(Number(p[1]));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle=String(zone.color||'#f1eee5');ctx.globalAlpha=.38;ctx.fill();ctx.globalAlpha=1
    const cx=poly.reduce((s,p)=>s+Number(p[0]),0)/poly.length,cz=poly.reduce((s,p)=>s+Number(p[1]),0)/poly.length
    ctx.fillStyle='#17242d';ctx.font=`700 ${Math.max(14,Math.round(size/55))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(zone.name||''),tx(cx),ty(cz))
  }
  const walls=Object.values(scene.nodes).filter(n=>n.type==='wall'&&Array.isArray(n.start)&&Array.isArray(n.end))
  ctx.strokeStyle='#111';ctx.lineCap='square'
  for(const wall of walls){const a=wall.start as [number,number],b=wall.end as [number,number];ctx.lineWidth=Math.max(5,Number(wall.thickness||.12)*scale);ctx.beginPath();ctx.moveTo(tx(a[0]),ty(a[1]));ctx.lineTo(tx(b[0]),ty(b[1]));ctx.stroke()}
  if(debugLabel){ctx.fillStyle='#53656e';ctx.font=`${Math.max(12,Math.round(size/70))}px Arial`;ctx.textAlign='left';ctx.fillText('DreamHouse · Pascal Geometry Preview',pad,size-pad/2)}
  return canvas.toDataURL('image/png')
}
