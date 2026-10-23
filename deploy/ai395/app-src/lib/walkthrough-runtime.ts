import type { SceneGraph, SceneNode } from './types'
// Pascal floorplans use metres. Keep the eye height and movement speed at
// human scale so a 150 m2 home takes materially longer to cross than a 50 m2
// home instead of normalising both experiences to the viewport.
export const WALKTHROUGH_EYE_HEIGHT=1.65,WALKTHROUGH_PLAYER_RADIUS=.22,WALKTHROUGH_WALK_SPEED=1.35,WALKTHROUGH_RUN_SPEED=2.7,WALKTHROUGH_DOOR_DISTANCE=2.35
type XZ={x:number;z:number}
function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function pointInPolygon(x:number,z:number,p:[number,number][]){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[xi,zi]=p[i],[xj,zj]=p[j];const hit=((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi);if(hit)inside=!inside}return inside}
function segmentProjection(x:number,z:number,start:[number,number],end:[number,number]){const vx=end[0]-start[0],vz=end[1]-start[1],len2=vx*vx+vz*vz;if(len2<1e-9)return{distance:Math.hypot(x-start[0],z-start[1]),t:0,length:0};const length=Math.sqrt(len2),t=clamp(((x-start[0])*vx+(z-start[1])*vz)/len2,0,1),px=start[0]+vx*t,pz=start[1]+vz*t;return{distance:Math.hypot(x-px,z-pz),t,length}}
function floorPolygon(scene:SceneGraph){const slab:any=Object.values(scene.nodes).find((n:any)=>n.type==='slab'&&Array.isArray(n.polygon)&&n.polygon.length>=3);return slab?.polygon??null}
export function getWalkthroughScaleMetrics(scene:SceneGraph){
  const polygon=floorPolygon(scene) as [number,number][]|null;
  if(!polygon)return{areaM2:0,widthM:0,depthM:0,longestSpanM:0};
  const xs=polygon.map(p=>Number(p[0])),zs=polygon.map(p=>Number(p[1]));
  const area=Math.abs(polygon.reduce((sum,p,index)=>{const next=polygon[(index+1)%polygon.length];return sum+p[0]*next[1]-next[0]*p[1]},0)/2);
  const width=Math.max(...xs)-Math.min(...xs),depth=Math.max(...zs)-Math.min(...zs);
  return{areaM2:Number(area.toFixed(1)),widthM:Number(width.toFixed(1)),depthM:Number(depth.toFixed(1)),longestSpanM:Number(Math.max(width,depth).toFixed(1))};
}
function doorGap(scene:SceneGraph,wall:any,along:number,open:Set<string>,radius:number){for(const id of wall.children??[]){const d:any=scene.nodes[id];if(d?.type!=='door'||d.openingKind==='opening')continue;const center=Number(d.position?.[0]??0),width=Number(d.width??.86),clearance=Math.max(.16,width/2-radius*.55);if(Math.abs(along-center)<=clearance&&open.has(d.id))return true}return false}
function itemBlocks(scene:SceneGraph,x:number,z:number,radius:number){for(const n of Object.values(scene.nodes) as any[]){if(n.type!=='item'||n.visible===false)continue;const p=n.position??[0,0,0],dims=n.asset?.dimensions??[.7,1,.7],scale=n.scale??[1,1,1],w=Math.max(.15,Number(dims[0]) * Math.abs(Number(scale[0]??1))),d=Math.max(.15,Number(dims[2])*Math.abs(Number(scale[2]??1))),yaw=Number(n.rotation?.[1]??0),dx=x-Number(p[0]??0),dz=z-Number(p[2]??0),c=Math.cos(-yaw),s=Math.sin(-yaw),lx=dx*c-dz*s,lz=dx*s+dz*c;if(Math.abs(lx)<=w/2+radius&&Math.abs(lz)<=d/2+radius)return true}return false}
export function isWalkthroughPositionBlocked(scene:SceneGraph,x:number,z:number,open:Set<string>=new Set(),radius=WALKTHROUGH_PLAYER_RADIUS){const floor=floorPolygon(scene);if(floor&&!pointInPolygon(x,z,floor))return true;for(const w of Object.values(scene.nodes) as any[]){if(w.type!=='wall'||w.visible===false||!Array.isArray(w.start)||!Array.isArray(w.end))continue;const p=segmentProjection(x,z,w.start,w.end),th=Math.max(.06,Number(w.thickness??.12));if(p.distance>radius+th/2)continue;if(doorGap(scene,w,p.t*p.length,open,radius))continue;return true}return itemBlocks(scene,x,z,radius)}
export function resolveWalkthroughMove(scene:SceneGraph,current:XZ,desired:XZ,open:Set<string>=new Set(),radius=WALKTHROUGH_PLAYER_RADIUS):XZ{const dx=desired.x-current.x,dz=desired.z-current.z,d=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(d/.065)),sx=dx/steps,sz=dz/steps;let x=current.x,z=current.z;for(let i=0;i<steps;i++){const nx=x+sx;if(!isWalkthroughPositionBlocked(scene,nx,z,open,radius))x=nx;const nz=z+sz;if(!isWalkthroughPositionBlocked(scene,x,nz,open,radius))z=nz}return{x,z}}
function resolveClearestYaw(scene:SceneGraph,x:number,z:number,fallback:number){
  let best={yaw:fallback,clearance:-1};
  for(let index=0;index<16;index++){
    const candidateYaw=index*Math.PI/8;
    const fx=-Math.sin(candidateYaw),fz=-Math.cos(candidateYaw);
    let clearance=0;
    for(let distance=.25;distance<=6;distance+=.25){
      if(isWalkthroughPositionBlocked(scene,x+fx*distance,z+fz*distance,new Set(),.08))break;
      clearance=distance;
    }
    if(clearance>best.clearance)best={yaw:candidateYaw,clearance};
  }
  return best.yaw;
}
export function resolveWalkthroughSpawn(scene:SceneGraph){
  const spawn:any=Object.values(scene.nodes).find((n:any)=>n.type==='spawn'&&n.visible!==true)??Object.values(scene.nodes).find((n:any)=>n.type==='spawn');
  if(spawn){
    const candidate={x:Number(spawn.position?.[0]??0),z:Number(spawn.position?.[2]??0)};
    if(!isWalkthroughPositionBlocked(scene,candidate.x,candidate.z,new Set(),WALKTHROUGH_PLAYER_RADIUS)) return {...candidate,eyeY:Number(spawn.position?.[1]??0)+WALKTHROUGH_EYE_HEIGHT,yaw:resolveClearestYaw(scene,candidate.x,candidate.z,Number(spawn.rotation??0))};
  }
  const rooms=Object.values(scene.nodes).filter((n:any)=>n.type==='zone'&&Array.isArray(n.polygon)&&n.polygon.length>2) as any[];
  for(const room of rooms){
    const xs=room.polygon.map((v:any)=>Number(v[0])), zs=room.polygon.map((v:any)=>Number(v[1]));
    const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
    const center=room.polygon.reduce((s:any,v:any)=>[s[0]+Number(v[0]),s[1]+Number(v[1])],[0,0]);
    const candidates:any[]=[{x:center[0]/room.polygon.length,z:center[1]/room.polygon.length}];
    // Sample a small grid so furniture in the room center cannot trap the player.
    for(const fx of [.25,.4,.6,.75]) for(const fz of [.25,.4,.6,.75]) candidates.push({x:minX+(maxX-minX)*fx,z:minZ+(maxZ-minZ)*fz});
    for(const candidate of candidates){
      if(pointInPolygon(candidate.x,candidate.z,room.polygon)&&!isWalkthroughPositionBlocked(scene,candidate.x,candidate.z,new Set(),WALKTHROUGH_PLAYER_RADIUS)) return {...candidate,eyeY:WALKTHROUGH_EYE_HEIGHT,yaw:resolveClearestYaw(scene,candidate.x,candidate.z,Math.PI)};
    }
  }
  return {x:0,z:.6,eyeY:WALKTHROUGH_EYE_HEIGHT,yaw:Math.PI/2};
}
export function doorWorldXZ(scene:SceneGraph,door:SceneNode):XZ|null{const wall:any=door.parentId?scene.nodes[door.parentId]:null;if(wall?.type!=='wall'||!Array.isArray(wall.start)||!Array.isArray(wall.end))return null;const vx=wall.end[0]-wall.start[0],vz=wall.end[1]-wall.start[1],length=Math.hypot(vx,vz);if(length<1e-9)return null;const distance=Number(door.position?.[0]??0);return{x:wall.start[0]+vx/length*distance,z:wall.start[1]+vz/length*distance}}
export function findWalkthroughDoorTarget(scene:SceneGraph,position:XZ,yaw:number,maxDistance=WALKTHROUGH_DOOR_DISTANCE){const f={x:-Math.sin(yaw),z:-Math.cos(yaw)};let best:{id:string;distance:number}|null=null;for(const n of Object.values(scene.nodes) as SceneNode[]){if(n.type!=='door'||n.visible===false||n.openingKind==='opening')continue;const c=doorWorldXZ(scene,n);if(!c)continue;const dx=c.x-position.x,dz=c.z-position.z,d=Math.hypot(dx,dz);if(d<.05||d>maxDistance)continue;const dot=(dx/d)*f.x+(dz/d)*f.z;if(dot<.78)continue;const lateral=Math.abs(dx*f.z-dz*f.x);if(lateral>.9)continue;if(!best||d<best.distance)best={id:n.id,distance:d}}return best?.id??null}
