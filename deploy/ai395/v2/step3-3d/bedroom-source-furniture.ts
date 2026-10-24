import {sceneToFloorplanBlueprint} from '../floorplans/blueprint';
import {pointInPolygon,type svgToStructure,type Point} from './svg-geometry';
import {roomsBeside} from './svg-edit-geometry';
import type {SceneGraph,SceneNode} from '../types';

type Structure=ReturnType<typeof svgToStructure>;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const fail=(reason:string):never=>{throw new Error(`BEDROOM_SOURCE_FURNITURE_UNSAFE：${reason}；原方案未改动，请先在 Step3 保存并调整后重试。`);};
const near=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6;
const samePoint=(a:number[],b:number[])=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>near(v,b[i]));
const samePolygon=(a:Point[],b:Point[])=>a.length===b.length&&a.every((p,i)=>samePoint(p,b[i]));
function assertOriginalStructure(source:SceneGraph,original:Structure){
 const bp=sceneToFloorplanBlueprint(source);
 if(!samePolygon(bp.outerPolygon,original.outerPolygon))fail('已保存外轮廓与本次 SVG 基准不同，不能覆盖手动结构修改');
 if(bp.rooms.length!==original.rooms.length||bp.walls.length!==original.walls.length||bp.doors.length!==original.doors.length||bp.windows.length!==original.windows.length)fail('已保存房间或墙门窗数量与本次 SVG 基准不同');
 for(const r of original.rooms){const existing=bp.rooms.find(e=>e.id===r.id);if(!existing||existing.name!==r.name||existing.semantic!==r.semantic||!samePolygon(existing.polygon,r.polygon))fail(`已保存房间 ${r.name} 与本次 SVG 基准不同`);}
 for(const w of original.walls){const existing=bp.walls.find(e=>e.id===w.id);if(!existing||!samePoint(existing.start,w.start)||!samePoint(existing.end,w.end)||existing.structural!==w.structural)fail(`已保存墙体 ${w.id} 与本次 SVG 基准不同`);}
 for(const field of ['doors','windows'] as const)for(const o of original[field]){
  const existing=bp[field].find(e=>e.id===o.id),node=source.nodes[o.id];
  if(!existing||!node||existing.hostWallId!==o.wallId||!near(existing.width,o.width)||!near(existing.offset+existing.width/2,o.distance)||!near(existing.height,field==='doors'?2.1:1.4))fail(`已保存开口 ${o.id} 与本次 SVG 基准不同`);
  if(field==='doors'){
   const door=existing as typeof bp.doors[number];
   if(door.doorType!==o.doorType||door.hingeSide!=='left'||door.swingDirection!=='inward'||door.swingAngle!==0||node.hingesSide&&node.hingesSide!=='left')fail(`已保存门 ${o.id} 的类型或开启方式与 SVG 基准不同`);
   if(!samePoint(node.position,[o.distance,door.height/2,0]))fail(`已保存门 ${o.id} 的实际位置与 SVG 基准不同`);
   const wall=original.walls.find(w=>w.id===o.wallId)!,len=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),v:Point=[(wall.end[0]-wall.start[0])/len,(wall.end[1]-wall.start[1])/len];
   const ends=[-.5,.5].map(s=>[wall.start[0]+v[0]*(o.distance+s*o.width),wall.start[1]+v[1]*(o.distance+s*o.width)] as Point);
   if(JSON.stringify([...door.connects].sort())!==JSON.stringify(roomsBeside(original,ends[0],ends[1]).sort()))fail(`已保存门 ${o.id} 的连接关系与 SVG 基准不同`);
  }else{
   const window=existing as typeof bp.windows[number];
   if(!near(window.sillHeight,1)||!samePoint(node.position,[o.distance,window.sillHeight+window.height/2,0]))fail(`已保存窗 ${o.id} 的实际位置与 SVG 基准不同`);
  }
 }
}
function furnitureFootprint(item:SceneNode):Point[]{
 const dimensions=item.asset?.dimensions,scale=item.scale,position=item.position,rotation=item.rotation;
 if(!Array.isArray(dimensions)||dimensions.length!==3||!dimensions.every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(scale)||scale.length!==3||!scale.every(v=>Number.isFinite(v)&&v!==0)||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)||!Array.isArray(rotation)||rotation.length!==3||!rotation.every(Number.isFinite)||Math.abs(rotation[0])>1e-6||Math.abs(rotation[2])>1e-6)fail(`家具 ${item.name||item.id} 的尺寸或变换无法安全验证`);
 const w=dimensions[0]*Math.abs(scale[0]),d=dimensions[2]*Math.abs(scale[2]),c=Math.cos(rotation[1]),s=Math.sin(rotation[1]);
 return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[position[0]+x*c+z*s,position[2]-x*s+z*c] as Point);
}
function pointOnBoundary(p:Point,poly:Point[]){return poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=1e-6;});}
function assertItemInside(item:SceneNode,room:Structure['rooms'][number]){
 const p=furnitureFootprint(item);
 // Include every footprint segment and interior samples so concave rooms cannot
 // swallow a rectangle whose corners alone happen to be inside.
 for(let ix=0;ix<=12;ix++)for(let iz=0;iz<=12;iz++){
  const q:Point=[p[0][0]+(p[1][0]-p[0][0])*ix/12+(p[3][0]-p[0][0])*iz/12,p[0][1]+(p[1][1]-p[0][1])*ix/12+(p[3][1]-p[0][1])*iz/12];
  if(!pointInPolygon(q,room.polygon)&&!pointOnBoundary(q,room.polygon))fail(`原家具 ${item.name||item.id} 将超出原所属房间，请手动调整家具后再改造`);
 }
}

/** The caller must select source using the exact variant/version/image binding
 * and freeze it before inference. This function never guesses a source version,
 * moves an item, or recompiles materials/assets from a blueprint. */
export function preserveBedroomSourceFurniture(candidate:SceneGraph,source:SceneGraph|null,originalStructure:Structure):SceneGraph{
 const result=clone(candidate),metadata=result.nodes.building_house.metadata||={};
 for(const graph of source?[source,result]:[result])if(Object.values(graph.nodes).some(n=>n.type==='block'))fail('场景含未适配的旧 block 节点，不能可靠保留家具');
 if(!source){Object.assign(metadata, {bedroomFurniturePreservation:{source:'first-generation',sourceCount:0,moved:false}});return result;}
 assertOriginalStructure(source,originalStructure);
 const originalIds=new Set(originalStructure.rooms.map(r=>r.id)),newRooms=sceneToFloorplanBlueprint(result).rooms;
 const items=Object.values(source.nodes).filter(n=>n.type==='item');
 for(const item of items){
  const roomId=item.metadata?.room_id,room=newRooms.find(r=>r.id===roomId);
  if(!originalIds.has(roomId)||!room||!item.parentId||item.children?.length)fail(`家具 ${item.name||item.id} 的所属房间或父节点不明确`);
  const parent=result.nodes[item.parentId],oldParent=source.nodes[item.parentId];
  if(!parent||!oldParent||parent.type!==oldParent.type||['position','rotation','scale','elevation'].some(k=>JSON.stringify(parent[k])!==JSON.stringify(oldParent[k])))fail(`家具 ${item.name||item.id} 的父坐标系不一致`);
  assertItemInside(item,room as Structure['rooms'][number]);
 }
 const removed=new Set(Object.values(result.nodes).filter(n=>n.type==='item'&&originalIds.has(n.metadata?.room_id)).map(n=>n.id));
 for(const id of removed)delete result.nodes[id];
 for(const node of Object.values(result.nodes))if(node.children)node.children=node.children.filter(id=>!removed.has(id));
 result.rootNodeIds=result.rootNodeIds.filter(id=>!removed.has(id));
 for(const item of items){
  if(result.nodes[item.id])fail(`原家具 ID ${item.id} 与新房间节点冲突`);
  result.nodes[item.id]=clone(item);
  const parent=result.nodes[item.parentId!];parent.children=[...(parent.children||[]).filter(id=>id!==item.id),item.id];
 }
 // Refresh only the stored furniture list; scene materials, all item asset data,
 // new geometry and the candidate's provenance remain exactly as supplied.
 const actual=sceneToFloorplanBlueprint(result);
 metadata.floorplanBlueprint.furniture=clone(actual.furniture);
 Object.assign(metadata,{bedroomFurniturePreservation:{source:'bound-saved-scene',sourceCount:items.length,retainedItemIds:items.map(i=>i.id),newRoomItemIds:Object.values(result.nodes).filter(n=>n.type==='item'&&!originalIds.has(n.metadata?.room_id)).map(n=>n.id),moved:false}});
 return result;
}
