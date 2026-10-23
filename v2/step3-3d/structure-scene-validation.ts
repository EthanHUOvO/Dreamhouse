import {sceneToFloorplanBlueprint} from '../floorplans/blueprint';
import {isWalkthroughPositionBlocked,doorWorldXZ} from '../walkthrough-runtime';
import {pointInPolygon,polygonArea,type svgToStructure,type Point} from './svg-geometry';
import {roomsBeside} from './svg-edit-geometry';
import type {SceneGraph,SceneNode} from '../types';

type Structure=ReturnType<typeof svgToStructure>;
export type StructureTransaction={operations?:unknown[];affectedRoomIds?:string[];newRoomIds?:string[];removedRoomIds?:string[];roomIdMap?:Record<string,string|null>;[key:string]:unknown};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const fail=(message:string):never=>{throw new Error(`STRUCTURE_SCENE_INVALID：${message}，已保留原方案。`);};
const near=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-5;
const point=(a:number[],b:number[])=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>near(v,b[i]));
const polygon=(a:Point[],b:Point[])=>a.length===b.length&&a.every((p,i)=>point(p,b[i]));
function segmentDistance(p:Point,a:Point,b:Point){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
const contains=(p:Point,poly:Point[])=>pointInPolygon(p,poly)||poly.some((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])<=1e-5);
function adjacency(st:Structure,o:Structure['doors'][number]){
 const wall=st.walls.find(w=>w.id===o.wallId);if(!wall)fail(`开口 ${o.id} 缺少宿主墙`);
 const length=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),dx=(wall.end[0]-wall.start[0])/length,dy=(wall.end[1]-wall.start[1])/length;
 return roomsBeside(st,[wall.start[0]+dx*(o.distance-.2),wall.start[1]+dy*(o.distance-.2)],[wall.start[0]+dx*(o.distance+.2),wall.start[1]+dy*(o.distance+.2)]);
}
/** Compare the actual MCP SceneGraph with the visible, reparsed SVG. */
export function assertStructureSceneMatches(scene:SceneGraph,expected:Structure){
 const bp=sceneToFloorplanBlueprint(scene);
 if(!polygon(bp.outerPolygon,expected.outerPolygon)||bp.rooms.length!==expected.rooms.length||bp.walls.length!==expected.walls.length||bp.doors.length!==expected.doors.length||bp.windows.length!==expected.windows.length)fail('二维与三维的外轮廓或结构数量不一致');
 for(const room of expected.rooms){const r=bp.rooms.find(r=>r.id===room.id);if(!r||r.name!==room.name||r.semantic!==room.semantic||!polygon(r.polygon,room.polygon))fail(`房间 ${room.name} 的二维与三维不一致`);}
 for(const wall of expected.walls){const w=bp.walls.find(w=>w.id===wall.id);if(!w||!point(w.start,wall.start)||!point(w.end,wall.end)||w.structural!==wall.structural)fail(`墙体 ${wall.id} 的二维与三维不一致`);}
 for(const key of ['doors','windows'] as const)for(const opening of expected[key]){
  const actual=bp[key].find(o=>o.id===opening.id),node=scene.nodes[opening.id],height=Number(('height'in opening?opening.height:undefined)??(key==='doors'?2.1:1.4));
  if(!actual||!node||actual.hostWallId!==opening.wallId||!near(actual.width,opening.width)||!near(actual.offset+actual.width/2,opening.distance)||!near(actual.height,height))fail(`门窗 ${opening.id} 的宿主、尺寸或位置不一致`);
  const bottom=key==='doors'?0:Number(('sillHeight'in opening?opening.sillHeight:undefined)??1);
  if(!point(node.position,[opening.distance,bottom+height/2,0]))fail(`门窗 ${opening.id} 的三维高度或实际变换错误`);
  if(key==='doors'&&(actual as typeof bp.doors[number]).doorType!==(opening.doorType??'hinged'))fail(`门 ${opening.id} 类型不一致`);
 }
 return bp;
}
function footprint(item:SceneNode):Point[]{
 const d=item.asset?.dimensions,s=item.scale,p=item.position,r=item.rotation;
 if(!Array.isArray(d)||d.length!==3||!d.every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(s)||s.length!==3||!s.every(v=>Number.isFinite(v)&&v!==0)||!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||!Array.isArray(r)||r.length!==3||!r.every(Number.isFinite)||Math.abs(r[0])>1e-6||Math.abs(r[2])>1e-6)fail(`家具 ${item.name||item.id} 的尺寸或变换无法校验`);
 const w=d[0]*Math.abs(s[0]),depth=d[2]*Math.abs(s[2]),c=Math.cos(r[1]),sin=Math.sin(r[1]);
 return [[-w/2,-depth/2],[w/2,-depth/2],[w/2,depth/2],[-w/2,depth/2]].map(([x,z])=>[p[0]+x*c+z*sin,p[2]-x*sin+z*c] as Point);
}
function entirelyInside(points:Point[],poly:Point[]){
 for(let x=0;x<=12;x++)for(let y=0;y<=12;y++){const p:Point=[points[0][0]+(points[1][0]-points[0][0])*x/12+(points[3][0]-points[0][0])*y/12,points[0][1]+(points[1][1]-points[0][1])*x/12+(points[3][1]-points[0][1])*y/12];if(!contains(p,poly))return false;}
 return true;
}
function overlaps(a:Point[],b:Point[]){for(const poly of [a,b])for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],axis:Point=[p[1]-q[1],q[0]-p[0]],aa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),bb=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);if(Math.max(...aa)<=Math.min(...bb)+1e-6||Math.max(...bb)<=Math.min(...aa)+1e-6)return false;}return true;}
/** Source parsers may renumber or split unchanged walls. Subtract exact prior
 * physical coverage and inspect every remaining span, independent of IDs.
 * The tolerance is only serialization precision; raster shifts stay changes. */
export function changedStructureWallSpans(before:Structure,after:Structure){
 const tolerance=1e-5,spans:Array<Structure['walls'][number]>=[];
 for(const wall of after.walls){
  const axis= Math.abs(wall.end[0]-wall.start[0])>=Math.abs(wall.end[1]-wall.start[1])?0:1,cross=1-axis;
  const lo=Math.min(wall.start[axis],wall.end[axis]),hi=Math.max(wall.start[axis],wall.end[axis]);
  if(hi-lo<=tolerance)continue;
  if(Math.abs(wall.end[cross]-wall.start[cross])>tolerance){spans.push(wall);continue;}
  const covered=before.walls.flatMap(old=>{
   if(Math.abs(old.end[cross]-old.start[cross])>tolerance||Math.abs(old.start[cross]-wall.start[cross])>tolerance||Math.abs(old.end[cross]-wall.end[cross])>tolerance)return[];
   const start=Math.max(lo,Math.min(old.start[axis],old.end[axis])),end=Math.min(hi,Math.max(old.start[axis],old.end[axis]));
   return end-start>tolerance?[[start,end]]:[];
  }).sort((a,b)=>a[0]-b[0]);
  const at=(value:number):Point=>{const t=(value-wall.start[axis])/(wall.end[axis]-wall.start[axis]);return[wall.start[0]+(wall.end[0]-wall.start[0])*t,wall.start[1]+(wall.end[1]-wall.start[1])*t];};
  const add=(start:number,end:number)=>{if(end-start>tolerance)spans.push({...wall,start:at(start),end:at(end)});};
  let cursor=lo;
  for(const[start,end]of covered){if(start>cursor+tolerance)add(cursor,start);cursor=Math.max(cursor,end);}
  add(cursor,hi);
 }
 return spans;
}
/** Inherit only an exact-bound source selected by the caller. A merge may
 * change room ownership; it never moves, deletes, or replaces a saved item. */
export function preserveStructureSourceFurniture(candidate:SceneGraph,source:SceneGraph|null,before:Structure,after:Structure,transaction:StructureTransaction){
 const result=clone(candidate),oldRooms=new Set(before.rooms.map(r=>r.id)),map=transaction.roomIdMap||{};
 if(!source)return result;
 assertStructureSceneMatches(source,before);
 // SVG carries geometry, not manual locks or door hardware. Do not silently
 // replace a protected edit with the reconstruction defaults.
 for(const old of before.walls){
  const prior=source.nodes[old.id],next=result.nodes[old.id],wall=after.walls.find(w=>w.id===old.id);
  const changed=!wall||!point(old.start,wall.start)||!point(old.end,wall.end);
  if(changed&&(prior.locked===true||prior.metadata?.locked===true||prior.metadata?.editable===false||prior.metadata?.structural_type==='load_bearing'||prior.metadata?.load_bearing===true))fail(`墙体 ${old.id} 已锁定或不可编辑`);
  if(next){
   for(const key of ['thickness','height','elevation','rotation','position'])if(JSON.stringify(prior[key])!==JSON.stringify(next[key]))fail(`墙体 ${old.id} 的手动厚度、高度或变换未编码到二维基准`);
   next.metadata={...next.metadata,...Object.fromEntries(['locked','editable','load_bearing','structural_type'].filter(k=>prior.metadata&&k in prior.metadata).map(k=>[k,prior.metadata[k]]))};
   if('locked' in prior)next.locked=prior.locked;
  }
 }
 for(const old of [...before.doors,...before.windows]){
  const prior=source.nodes[old.id],next=result.nodes[old.id];
  const priorHost=source.nodes[String(prior.hostWallId||prior.wallId||prior.parentId)],nextHost=next&&result.nodes[String(next.hostWallId||next.wallId||next.parentId)];
  const hostMoved=!priorHost||!nextHost||!point(priorHost.start,nextHost.start)||!point(priorHost.end,nextHost.end)||['position','rotation','elevation'].some(k=>JSON.stringify(priorHost[k])!==JSON.stringify(nextHost[k]));
  if((!next||hostMoved||prior.parentId!==next.parentId||!point(prior.position,next.position))&&(prior.locked===true||prior.metadata?.locked===true||prior.metadata?.editable===false))fail(`门窗 ${old.id} 已锁定，不能移动或删除`);
  if(next)for(const key of ['height','rotation','hingesSide','hingeSide','swingDirection','swingAngle','windowType','sillHeight','openingShape'])if(JSON.stringify(prior[key])!==JSON.stringify(next[key]))fail(`门窗 ${old.id} 的手动开启方式或尺寸未编码到二维基准`);
 }
 if([source,result].some(s=>Object.values(s.nodes).some(n=>n.type==='block')))fail('旧家具节点尚不支持可靠保留');
 for(const old of [...before.doors,...before.windows]){const prior=source.nodes[old.id],next=result.nodes[old.id];if(!next)continue;next.metadata={...next.metadata,...Object.fromEntries(['locked','editable','load_bearing'].filter(k=>prior.metadata&&k in prior.metadata).map(k=>[k,prior.metadata[k]]))};if('locked' in prior)next.locked=prior.locked;}
 const items=Object.values(source.nodes).filter(n=>n.type==='item');
 const replacedRooms=new Set(before.rooms.map(r=>map[r.id]||r.id));
 const remove=new Set(Object.values(result.nodes).filter(n=>n.type==='item'&&replacedRooms.has(n.metadata?.room_id)).map(n=>n.id));
 for(const id of remove)delete result.nodes[id];
 for(const n of Object.values(result.nodes))if(n.children)n.children=n.children.filter(id=>!remove.has(id));
 result.rootNodeIds=result.rootNodeIds.filter(id=>!remove.has(id));
 for(const item of items){
  const oldRoom=item.metadata?.room_id,newRoom=map[oldRoom]||oldRoom;
  if(!oldRooms.has(oldRoom)||!after.rooms.some(r=>r.id===newRoom)||item.children?.length||!item.parentId||result.nodes[item.id])fail(`原家具 ${item.name||item.id} 无法完整保留`);
  const parent=result.nodes[item.parentId],prior=source.nodes[item.parentId];
  if(!parent||!prior||parent.type!==prior.type||['position','rotation','scale','elevation'].some(k=>JSON.stringify(parent[k])!==JSON.stringify(prior[k])))fail(`家具 ${item.name||item.id} 的父坐标系不一致`);
  const retained=clone(item);retained.metadata={...retained.metadata,room_id:newRoom};result.nodes[item.id]=retained;parent.children=[...(parent.children||[]),item.id];
 }
 const metadata=result.nodes.building_house.metadata||={};metadata.floorplanBlueprint.furniture=sceneToFloorplanBlueprint(result).furniture;
 metadata.structureFurniturePreservation={sourceCount:items.length,retainedItemIds:items.map(i=>i.id),roomIdMap:map,moved:false};
 return result;
}
function reachableRooms(st:Structure){
 const graph=new Map<string,Set<string>>(st.rooms.map(r=>[r.id,new Set<string>()]as[string,Set<string>])),entries: {id:string;roomId:string}[]=[];
 for(const door of st.doors){const adjacent=adjacency(st,door),ids=adjacent.filter((x):x is string=>!!x);if(adjacent.includes(null)&&ids.length)entries.push({id:door.id,roomId:ids[0]});if(ids.length===2&&ids[0]!==ids[1]){graph.get(ids[0])?.add(ids[1]);graph.get(ids[1])?.add(ids[0]);}}
 const reached=new Set(entries.map(e=>e.roomId)),queue=[...reached];for(let i=0;i<queue.length;i++)for(const id of graph.get(queue[i])||[])if(!reached.has(id)){reached.add(id);queue.push(id);}
 return{reached,entries};
}
/** Both source and candidate use exactly the same player, grid and opening
 * rules. A baseline defect is recorded; it does not license a new blockage. */
function physicalWalkthroughGrid(scene:SceneGraph,st:Structure){
 const bp=sceneToFloorplanBlueprint(scene),openDoors=new Set(bp.doors.map(d=>d.id)),step=.1,radius=.22,outer=st.outerPolygon,x0=Math.min(...outer.map(p=>p[0])),x1=Math.max(...outer.map(p=>p[0])),y0=Math.min(...outer.map(p=>p[1])),y1=Math.max(...outer.map(p=>p[1])),nx=Math.ceil((x1-x0)/step)+1,ny=Math.ceil((y1-y0)/step)+1;
 if(nx*ny>120000)fail('场景超过通行检查范围');
 const pos=(i:number):Point=>[x0+(i%nx)*step,y0+Math.floor(i/nx)*step];
 const free=Array.from({length:nx*ny},(_,i)=>{const p=pos(i);return pointInPolygon(p,outer)&&!isWalkthroughPositionBlocked(scene,p[0],p[1],openDoors,radius);});
 return{step,radius,fromEntry(entryDoorId:string,entryRoomId:string){
  const node=scene.nodes[entryDoorId],center=node&&doorWorldXZ(scene,node),room=st.rooms.find(r=>r.id===entryRoomId);let start=-1,best=.65;
  if(center&&room)for(let i=0;i<free.length;i++){if(!free[i])continue;const p=pos(i),d=Math.hypot(p[0]-center.x,p[1]-center.z);if(d<best&&pointInPolygon(p,room.polygon)){start=i;best=d;}}
  if(start<0)return{entryDoorId,entryRoomId,startFound:false,reachableRoomIds:[] as string[],doorApproaches:[] as {doorId:string;roomId:string}[],visitedCells:0};
  const seen=new Uint8Array(free.length),queue=[start];seen[start]=1;
  for(let c=0;c<queue.length;c++){const i=queue[c],x=i%nx,y=Math.floor(i/nx);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*nx+xx;if(xx<0||xx>=nx||yy<0||yy>=ny||seen[j]||!free[j])continue;seen[j]=1;queue.push(j);}}
  const reachableRoomIds=st.rooms.filter(r=>queue.some(i=>pointInPolygon(pos(i),r.polygon))).map(r=>r.id),doorApproaches:{doorId:string;roomId:string}[]=[];
  for(const door of st.doors){const openingCenter=doorWorldXZ(scene,scene.nodes[door.id]);if(!openingCenter)continue;for(const roomId of adjacency(st,door).filter((id):id is string=>!!id)){const target=st.rooms.find(r=>r.id===roomId)!;if(queue.some(i=>{const p=pos(i);return Math.hypot(p[0]-openingCenter.x,p[1]-openingCenter.z)<.65&&pointInPolygon(p,target.polygon);}))doorApproaches.push({doorId:door.id,roomId});}}
  return{entryDoorId,entryRoomId,startFound:true,reachableRoomIds,doorApproaches,visitedCells:queue.length};
 }};
}
/** Final guard for split / merge / boundary moves on the actual furnished MCP
 * result. Existing unrelated furniture defects are reported, never moved. */
export function assertStructureSceneUsable(scene:SceneGraph,before:Structure,after:Structure,transaction:StructureTransaction,sourceScene?:SceneGraph){
 const bp=assertStructureSceneMatches(scene,after),map=transaction.roomIdMap||{},warnings:string[]=[];
 const changedRooms=after.rooms.filter(r=>{const old=before.rooms.find(o=>o.id===r.id);return !old||old.name!==r.name||old.semantic!==r.semantic||!polygon(old.polygon,r.polygon);});
 const changedWalls=changedStructureWallSpans(before,after);
 const items=Object.values(scene.nodes).filter(n=>n.type==='item'&&n.visible!==false);
 if(Object.values(scene.nodes).some(n=>n.type==='block'&&n.metadata?.furnitureId))fail('旧家具没有可靠的实际尺寸');
 const footprints=items.map(item=>({item,polygon:footprint(item)}));
 for(const {item,polygon:fp} of footprints){const room=after.rooms.find(r=>r.id===item.metadata?.room_id);if(!room)fail(`家具 ${item.name||item.id} 的所属房间已丢失`);if(!entirelyInside(fp,room.polygon)){if(changedRooms.some(r=>r.id===room.id))fail(`家具 ${item.name||item.id} 与新房间边界冲突，请在 Step3 手动调整后重试`);warnings.push(`原有家具 ${item.name||item.id} 超出未修改房间，保持原样，需手动检查。`);}}
 for(const wall of changedWalls){const len=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),half=Number(scene.nodes[wall.id]?.thickness||.12)/2,nx=-(wall.end[1]-wall.start[1])/len*half,ny=(wall.end[0]-wall.start[0])/len*half,wp:Point[]=[[wall.start[0]+nx,wall.start[1]+ny],[wall.end[0]+nx,wall.end[1]+ny],[wall.end[0]-nx,wall.end[1]-ny],[wall.start[0]-nx,wall.start[1]-ny]];for(const f of footprints)if(overlaps(wp,f.polygon))fail(`调整后的隔墙与家具 ${f.item.name||f.item.id} 碰撞，请在 Step3 手动调整后重试`);}
 const prior=reachableRooms(before),next=reachableRooms(after);
 if(!prior.entries.length)fail('无法确定原入户门');
 for(const id of prior.reached)if(!next.reached.has(map[id]||id))fail('改造中断了原有房间的门通行关系');
 for(const r of changedRooms)if(!next.reached.has(r.id))fail(`改造后的 ${r.name} 缺少入户可达路径`);
 const candidateGrid=physicalWalkthroughGrid(scene,after);
 if(sourceScene)assertStructureSceneMatches(sourceScene,before);
 const sourceGrid=sourceScene?physicalWalkthroughGrid(sourceScene,before):undefined;
 const paths:{entryDoorId:string;reachableChangedRoomIds:string[]}[]=[];
 const baselineAccess:any[]=[];
 for(const entry of prior.entries){
  if(!scene.nodes[entry.id])fail('原入户门被删除');
  const actual=candidateGrid.fromEntry(entry.id,map[entry.roomId]||entry.roomId);
  if(!actual.startFound)fail('原入户门内侧被墙体或家具阻挡');
  const reached=changedRooms.filter(r=>actual.reachableRoomIds.includes(r.id));
  if(reached.length!==changedRooms.length)fail('改造后的房间被实际墙体或家具阻断，无法从入户门到达');
  paths.push({entryDoorId:entry.id,reachableChangedRoomIds:reached.map(r=>r.id)});
  if(sourceGrid){
   const baseline=sourceGrid.fromEntry(entry.id,entry.roomId),preservedRoomIds=[...new Set(baseline.reachableRoomIds.map(id=>map[id]||id))];
   for(const roomId of preservedRoomIds)if(!actual.reachableRoomIds.includes(roomId))fail(`改造阻断了原本物理可达的房间 ${roomId}`);
   const preservedApproaches=baseline.doorApproaches.filter(a=>after.doors.some(d=>d.id===a.doorId)).map(a=>({doorId:a.doorId,roomId:map[a.roomId]||a.roomId}));
   for(const approach of preservedApproaches)if(!actual.doorApproaches.some(a=>a.doorId===approach.doorId&&a.roomId===approach.roomId))fail(`改造阻断了原门 ${approach.doorId} 在房间 ${approach.roomId} 内的通行接近区`);
   const originallyUnreachable=before.rooms.filter(r=>!baseline.reachableRoomIds.includes(r.id)).map(r=>r.id);
   if(originallyUnreachable.length)warnings.push(`原场景从入户门 ${entry.id} 无法物理到达 ${originallyUnreachable.join('、')}，记录为原有问题，家具保持原样。`);
   baselineAccess.push({entryDoorId:entry.id,sourceEntryReachable:baseline.startFound,sourceReachableRoomIds:baseline.reachableRoomIds,preservedRoomIds,preservedDoorApproaches:preservedApproaches,originallyUnreachableRoomIds:originallyUnreachable});
  }
 }
 return{valid:true as const,changedRoomIds:changedRooms.map(r=>r.id),checkedWallIds:[...new Set(changedWalls.map(w=>w.id))],checkedWallSpans:changedWalls.map(w=>({id:w.id,start:w.start,end:w.end})),wallCoverageToleranceM:1e-5,checkedFurniture:items.length,playerRadiusM:candidateGrid.radius,gridStepM:candidateGrid.step,paths,baselineAccess,warnings,furnitureMoved:false,areas:changedRooms.map(r=>({roomId:r.id,name:r.name,areaM2:polygonArea(r.polygon)}))};
}
