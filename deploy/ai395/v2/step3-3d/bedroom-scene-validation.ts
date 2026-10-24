import {sceneToFloorplanBlueprint,createFloorplanBlueprint,compileBlueprintToPascal} from '../floorplans/blueprint';
import {isWalkthroughPositionBlocked, doorWorldXZ} from '../walkthrough-runtime';
import {pointInPolygon, type svgToStructure} from './svg-geometry';
import type {SceneGraph} from '../types';

type Structure = ReturnType<typeof svgToStructure>;
type Point = [number,number];
const PLAYER_RADIUS=.22;
const GRID_STEP=.08;
const reject=(code:string,message:string):never=>{throw new Error(`${code}：${message}，已保留原方案。`);};
function segmentDistance(p:Point,a:Point,b:Point) {
 const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
 const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(length2||1)));
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
}
function contains(p:Point,polygon:Point[]) {
 return pointInPolygon(p,polygon)||polygon.some((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length])<=.01);
}
function overlaps(a:Point[],b:Point[]) {
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++) {
  const p=polygon[i],q=polygon[(i+1)%polygon.length],axis:Point=[p[1]-q[1],q[0]-p[0]];
  const pa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),pb=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);
  if(Math.max(...pa)<=Math.min(...pb)+1e-6||Math.max(...pb)<=Math.min(...pa)+1e-6)return false;
 }
 return true;
}

/** Final host-side check on the actual furnished Pascal result. The source SVG
 * itself has no furniture. Never fix this check by deleting or moving an item.
 * A returned report proves the current walkthrough can reach the new bedroom;
 * it is not a building-code/accessibility certification. */
export function assertBedroomSceneUsable(scene:SceneGraph,original:Structure,targetRoomId:string,newRoomId:string,originalScene?:SceneGraph, kind:"bedroom"|"bathroom"="bedroom") {
 const fail=(code:string,message:string):never=>reject(kind==='bathroom'?code.replace('BEDROOM_','BATHROOM_'):code,kind==='bathroom'?message.replaceAll('卧室','卫生间').replaceAll('客餐厅','主卧').replaceAll('入户门','主卧原门'):message);
 const blueprint=sceneToFloorplanBlueprint(scene);
 const living=blueprint.rooms.find(r=>r.id===targetRoomId),bedroom=blueprint.rooms.find(r=>r.id===newRoomId);
 if(!living||living.semantic!==(kind==='bedroom'?'living_room':'master_bedroom')||!original.rooms.some(r=>r.id===targetRoomId&&r.semantic===(kind==='bedroom'?'living_room':'master_bedroom'))||!bedroom||bedroom.semantic!==kind)fail('BEDROOM_SCENE_ROOMS_INVALID','新增卧室或原客餐厅与结构方案不一致');
 const doors=blueprint.doors.filter(d=>!original.doors.some(o=>o.id===d.id));
 if(doors.length!==1||!doors[0].connects.includes(targetRoomId)||!doors[0].connects.includes(newRoomId))fail('BEDROOM_SCENE_DOOR_INVALID','新增卧室的门未正确连接客餐厅');
 const newDoor=doors[0];
 for(const door of blueprint.doors) {
  const node=scene.nodes[door.id];
  if(!node||!Array.isArray(node.position)||!Number.isFinite(node.position[1])||!Number.isFinite(node.height)||node.height<=0||node.position[1]-node.height/2<-.001)fail('BEDROOM_SCENE_DOOR_BELOW_FLOOR','门的位置低于地板或门变换缺失');
 }
 const newWalls=blueprint.walls.filter(w=>Array.from({length:11},(_,i)=>[w.start[0]+(w.end[0]-w.start[0])*i/10,w.start[1]+(w.end[1]-w.start[1])*i/10] as Point).some(p=>original.walls.every(o=>segmentDistance(p,o.start,o.end)>.05)));
 if(!newWalls.length)fail('BEDROOM_SCENE_PARTITION_MISSING','三维场景缺少新增隔墙');
 const items=Object.values(scene.nodes).filter(n=>n.type==='item'&&n.visible!==false);
 if(Object.values(scene.nodes).some(n=>n.type==='block'&&n.metadata?.furnitureId))fail('BEDROOM_SCENE_FURNITURE_UNKNOWN','当前场景包含尚未适配碰撞检测的旧家具，无法安全提交改造');
 const footprints=items.map(item=>{
  const dimensions=item.asset?.dimensions,scale=item.scale,position=item.position;
  if(!Array.isArray(dimensions)||dimensions.length!==3||!dimensions.every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(scale)||scale.length!==3||!scale.every(v=>Number.isFinite(v)&&v!==0)||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))fail('BEDROOM_SCENE_FURNITURE_UNKNOWN',`无法确认家具 ${item.name||item.id} 的真实尺寸`);
  const width=dimensions[0]*Math.abs(scale[0]),depth=dimensions[2]*Math.abs(scale[2]),yaw=Number(item.rotation?.[1]||0),c=Math.cos(yaw),s=Math.sin(yaw);
  const polygon=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,z])=>[position[0]+x*c+z*s,position[2]-x*s+z*c] as Point);
  return{item,polygon};
 });
 for(const wall of newWalls) {
  const length=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),half=Number(scene.nodes[wall.id]?.thickness||.12)/2,nx=-(wall.end[1]-wall.start[1])/length*half,nz=(wall.end[0]-wall.start[0])/length*half;
  const polygon:Point[]=[[wall.start[0]+nx,wall.start[1]+nz],[wall.end[0]+nx,wall.end[1]+nz],[wall.end[0]-nx,wall.end[1]-nz],[wall.start[0]-nx,wall.start[1]-nz]];
  for(const footprint of footprints)if(overlaps(polygon,footprint.polygon))fail('BEDROOM_SCENE_FURNITURE_COLLISION',`新增隔墙与家具 ${footprint.item.name||footprint.item.id} 重叠，请在 Step3 手动调整家具后重试`);
 }
 for(const footprint of footprints.filter(f=>f.item.metadata?.room_id===newRoomId))if(!footprint.polygon.every(p=>contains(p,bedroom.polygon)))fail('BEDROOM_SCENE_FURNITURE_OUTSIDE','新增卧室的默认家具超出房间边界');
 const openDoors=new Set(blueprint.doors.map(d=>d.id)),doorCenter=doorWorldXZ(scene,scene.nodes[newDoor.id]);
 if(!doorCenter||isWalkthroughPositionBlocked(scene,doorCenter.x,doorCenter.z,openDoors,PLAYER_RADIUS))fail('BEDROOM_SCENE_DOOR_BLOCKED','新增卧室门洞被墙体或家具阻挡');
 const points=[...living.polygon,...bedroom.polygon],x0=Math.min(...points.map(p=>p[0])),x1=Math.max(...points.map(p=>p[0])),z0=Math.min(...points.map(p=>p[1])),z1=Math.max(...points.map(p=>p[1]));
 const nx=Math.ceil((x1-x0)/GRID_STEP)+1,nz=Math.ceil((z1-z0)/GRID_STEP)+1;
 if(nx*nz>100000)fail('BEDROOM_SCENE_SCALE_UNSUPPORTED','当前场景尺寸超过可达性检查范围');
 const point=(i:number):Point=>[x0+i%nx*GRID_STEP,z0+Math.floor(i/nx)*GRID_STEP];
 const free=Array.from({length:nx*nz},(_,i)=>{const p=point(i);return(pointInPolygon(p,living.polygon)||pointInPolygon(p,bedroom.polygon)||Math.hypot(p[0]-doorCenter.x,p[1]-doorCenter.z)<.4)&&!isWalkthroughPositionBlocked(scene,p[0],p[1],openDoors,PLAYER_RADIUS);});
 const nearest=(p:Point,polygon:Point[])=>{let best=-1,distance=.45;for(let i=0;i<free.length;i++){if(!free[i])continue;const q=point(i),d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<distance&&pointInPolygon(q,polygon)){distance=d;best=i;}}return best;};
 const end=nearest([doorCenter.x,doorCenter.z],bedroom.polygon);
 if(end<0)fail('BEDROOM_SCENE_DOOR_APPROACH_BLOCKED','新增卧室门内侧没有可站立空间');
 const entries=blueprint.doors.filter(d=>original.doors.some(o=>o.id===d.id)&&d.connects.includes(targetRoomId)&&(kind==='bathroom'||d.connects.includes(null)));
 if(!entries.length)fail('BEDROOM_SCENE_ENTRANCE_UNKNOWN','无法从当前结构确定原入户门，拒绝提交改造');
 const paths:{entryDoorId:string;path:Point[]}[]=[];
 const warnings:string[]=[],originalRoutesChecked:string[]=[];
 const baseline=originalScene??compileBlueprintToPascal(createFloorplanBlueprint({id:'bedroom-access-baseline',name:'原户型通行基准',factory:'PascalMCP/SVG-deterministic/v1',sourceImage:'',...original}));
 const baselineOpen=new Set(Object.values(baseline.nodes).filter(n=>n.type==='door').map(n=>n.id));
 const crossings=(graph:SceneGraph,door:typeof blueprint.doors[number],open:Set<string>)=>{
  const node=graph.nodes[door.id],center=doorWorldXZ(graph,node),wall=graph.nodes[node?.hostWallId||node?.wallId||node?.parentId||''];if(!center||!wall?.start||!wall?.end)return[];
  const length=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),dx=(wall.end[0]-wall.start[0])/length,dz=(wall.end[1]-wall.start[1])/length,span=Math.max(0,door.width/2-PLAYER_RADIUS-.02);
  return[-span,-span/2,0,span/2,span].map(offset=>({x:center.x+dx*offset,z:center.z+dz*offset})).filter(p=>!isWalkthroughPositionBlocked(graph,p.x,p.z,open,PLAYER_RADIUS));
 };
 for(const entry of entries) {
  const center=doorWorldXZ(scene,scene.nodes[entry.id]);if(!center)fail('BEDROOM_SCENE_ENTRANCE_UNKNOWN','原入户门缺少有效宿主墙');
  const start=nearest([center.x,center.z],living.polygon);if(start<0)fail('BEDROOM_SCENE_ENTRY_APPROACH_BLOCKED','原入户门内侧被墙体或家具阻挡');
  const previous=new Int32Array(free.length).fill(-2),queue=[start];previous[start]=-1;
  for(let cursor=0;cursor<queue.length;cursor++) {
   const current=queue[cursor],x=current%nx,z=Math.floor(current/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {const xx=x+dx,zz=z+dz,next=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[next]||previous[next]!==-2)continue;previous[next]=current;queue.push(next);}
  }
  if(previous[end]===-2)fail('BEDROOM_SCENE_ENTRANCE_PATH_BLOCKED','新增卧室在当前家具布局下无法从入户门到达，请在 Step3 手动调整家具后重试');
  // A route to the new room alone is insufficient: retain access to every
  // original doorway on the living side (bedrooms, kitchen, bathroom, balcony).
  for(const door of blueprint.doors.filter(d=>original.doors.some(o=>o.id===d.id)&&d.connects.includes(targetRoomId))){
   const center=doorWorldXZ(scene,scene.nodes[door.id]);
   if(!crossings(baseline,door,baselineOpen).length){
    warnings.push(`原场景门 ${door.id} 已被阻挡；不计为新增改造通过的通行项，需手动检查`);continue;
   }
   const available=crossings(scene,door,openDoors);
   if(!center||!available.length)fail('BEDROOM_SCENE_ORIGINAL_DOOR_BLOCKED',`原有门 ${door.name||door.id} 被墙体或家具阻挡`);
   if(!available.some(p=>{const approach=nearest([p.x,p.z],living.polygon);return approach>=0&&previous[approach]!==-2;}))fail('BEDROOM_SCENE_ORIGINAL_ROUTE_BLOCKED',`原有门 ${door.name||door.id} 无法从入户门到达`);
   originalRoutesChecked.push(door.id);
  }
  const path:Point[]=[];for(let i=end;i>=0;i=previous[i])path.push(point(i));path.reverse();paths.push({entryDoorId:entry.id,path});
 }
 return{valid:true as const,newDoorId:newDoor.id,newRoomId,targetRoomId,checkedFurniture:items.length,checkedNewWalls:newWalls.length,playerRadiusM:PLAYER_RADIUS,gridStepM:GRID_STEP,paths,originalRoutesChecked:[...new Set(originalRoutesChecked)],warnings:[...new Set(warnings)],furnitureMoved:false};
}
