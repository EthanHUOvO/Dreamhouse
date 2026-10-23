/** Deterministic axis-aligned room splitting. The model selects an opaque,
 * source-bound candidate; it never supplies polygon vertices or door offsets.
 * This is a concept-layout tool, not a construction/compliance assessment. */
import { svgToStructure, pointInPolygon, polygonArea, type Point } from './svg-geometry';
import { canonicalFromSpec, renderStructureSvg, validateCanonicalStructure, orthogonalUnion } from './structure-svg';
import { createFloorplanBlueprint, compileBlueprintToPascal, sceneToFloorplanBlueprint, blueprintToFloorplanSpec, validateVariantBlueprint } from '../floorplans/blueprint';
import { addPartitionWall } from '../floorplans/wall-edit';
import { addDoor } from '../floorplans/door-edit';
import type { FloorplanSpec } from '../floorplans/types';

type Structure = ReturnType<typeof svgToStructure>;
type Room = Structure['rooms'][number];
export type SplitDirection = 'upper'|'lower'|'left'|'right'|'any';
export type RoomSplitOperation = {
  id?: string; type?: 'split_room'; targetRoomId: string;
  newRoomName: string; newRoomSemantic: 'bedroom'|'study'|'storage';
  direction?: SplitDirection; minAreaM2?: number|null; entryFromRoomId?: string;
};
export type RoomSplitCandidate = {
  id: string; type: 'split_room'; targetRoomId: string; newRoomId: string;
  direction: Exclude<SplitDirection,'any'>; newRoomName: string; newRoomSemantic: string;
  newAreaM2: number; remainingAreaM2: number; minClearWidthM: number;
  doorWidthM: number; entranceClearanceM: number; notes: string[];
};
const EPS=1e-7, WALL=.12, DOOR=.8, PASSAGE=.9;
const SEARCH_WORK_LIMIT=25_000_000, SEARCH_TIME_LIMIT_MS=3500;
type SearchBudget={work:number;deadline:number;step:(cost?:number)=>void};
function createSearchBudget():SearchBudget{
  const budget:SearchBudget={work:0,deadline:Date.now()+SEARCH_TIME_LIMIT_MS,step(cost=1){budget.work+=cost;if(budget.work>SEARCH_WORK_LIMIT||Date.now()>budget.deadline)throw new Error('SPLIT_SEARCH_BUDGET_EXCEEDED');}};
  return budget;
}
const propagateBudget=(error:unknown)=>{if(error instanceof Error&&error.message==='SPLIT_SEARCH_BUDGET_EXCEEDED')throw error;};
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const round=(v:number)=>Math.round(v*1e6)/1e6;
const fail=(code:string):never=>{throw new Error(code);};
const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(36);};
function dist(p:Point,a:Point,b:Point){const x=b[0]-a[0],y=b[1]-a[1],l=x*x+y*y,t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(l||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);}
const boundary=(p:Point,poly:Point[])=>Math.min(...poly.map((a,i)=>dist(p,a,poly[(i+1)%poly.length])));
const inside=(p:Point,poly:Point[])=>pointInPolygon(p,poly)||boundary(p,poly)<EPS;
const bounds=(p:Point[])=>({minX:Math.min(...p.map(p=>p[0])),maxX:Math.max(...p.map(p=>p[0])),minY:Math.min(...p.map(p=>p[1])),maxY:Math.max(...p.map(p=>p[1]))});
function clean(poly:Point[]):Point[]{
  const out=poly.filter((p,i)=>Math.hypot(p[0]-poly[(i+poly.length-1)%poly.length][0],p[1]-poly[(i+poly.length-1)%poly.length][1])>EPS);
  return out.filter((p,i)=>{const a=out[(i+out.length-1)%out.length],b=out[(i+1)%out.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>EPS;});
}
/** A single half-plane clip retains all original concave vertices. Callers
 * additionally require exactly one interior cut interval, preventing a false
 * polygon bridge between disconnected components of a U/S-shaped room. */
export function clipRoomPolygon(poly:Point[],axis:0|1,value:number,keepLess:boolean):Point[]{
  const output:Point[]=[],keep=(p:Point)=>keepLess?p[axis]<=value+EPS:p[axis]>=value-EPS;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],ka=keep(a),kb=keep(b);
    if(ka)output.push(clone(a));
    if(ka!==kb){const t=(value-a[axis])/(b[axis]-a[axis]);const p:Point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];p[axis]=value;output.push(p);}
  }
  return clean(output);
}
function cutSpan(poly:Point[],axis:0|1,value:number):[Point,Point]{
  const cross=1-axis,hits:number[]=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    // Never place a partition on an existing polygon edge or corner.
    if(Math.abs(a[axis]-value)<.025||Math.abs(b[axis]-value)<.025)fail('SPLIT_CUT_NEAR_EXISTING_CORNER');
    if((a[axis]<value)!==(b[axis]<value))hits.push(a[cross]+(b[cross]-a[cross])*(value-a[axis])/(b[axis]-a[axis]));
  }
  const sorted=[...new Set(hits)].sort((a,b)=>a-b),intervals:[number,number][]=[];
  for(let i=0;i<sorted.length-1;i++){const p:Point=[0,0];p[axis]=value;p[cross]=(sorted[i]+sorted[i+1])/2;if(pointInPolygon(p,poly))intervals.push([sorted[i],sorted[i+1]]);}
  if(intervals.length!==1)fail('SPLIT_CUT_DISCONNECTS_MULTIPLE_COMPONENTS');
  const [lo,hi]=intervals[0],a:Point=[0,0],b:Point=[0,0];a[axis]=b[axis]=value;a[cross]=lo;b[cross]=hi;
  if(hi-lo<DOOR+.24)fail('SPLIT_PARTITION_TOO_SHORT_FOR_DOOR');
  return[a,b];
}
function openingCentre(st:Structure,o:Structure['doors'][number]):Point{
  const w=st.walls.find(w=>w.id===o.wallId)||fail('SPLIT_OPENING_HOST_MISSING'),l=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]);
  return[w.start[0]+(w.end[0]-w.start[0])*o.distance/l,w.start[1]+(w.end[1]-w.start[1])*o.distance/l];
}
function adjacent(st:Structure,o:Structure['doors'][number]):(string|null)[]{
  const w=st.walls.find(w=>w.id===o.wallId)||fail('SPLIT_OPENING_HOST_MISSING'),p=openingCentre(st,o),l=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]);
  return[1,-1].map(sign=>{for(const d of [.08,.14,.2]){const q:Point=[p[0]-(w.end[1]-w.start[1])/l*d*sign,p[1]+(w.end[0]-w.start[0])/l*d*sign];const r=st.rooms.find(r=>pointInPolygon(q,r.polygon));if(r)return r.id;}return null;});
}
function preserveOpeningJambs(st:Structure,partitions:[Point,Point][]){
  for(const o of[...st.doors,...st.windows]){
    const w=st.walls.find(w=>w.id===o.wallId)||fail('SPLIT_OPENING_HOST_MISSING'),c=openingCentre(st,o),l=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]),v:Point=[(w.end[0]-w.start[0])/l,(w.end[1]-w.start[1])/l],a:Point=[c[0]-v[0]*o.width/2,c[1]-v[1]*o.width/2],b:Point=[c[0]+v[0]*o.width/2,c[1]+v[1]*o.width/2];
    for(const[p,q]of partitions)if(Math.min(dist(a,p,q),dist(b,p,q),dist(p,a,b),dist(q,a,b))<WALL/2+.01)fail('SPLIT_PARTITION_TOUCHES_EXISTING_OPENING');
  }
}
function context(svg:string,op:RoomSplitOperation){
  if(!op||typeof op.targetRoomId!=='string')fail('SPLIT_TARGET_REQUIRED');
  if(!['bedroom','study','storage'].includes(op.newRoomSemantic)||!op.newRoomName?.trim()||op.newRoomName.length>20)fail('SPLIT_NEW_ROOM_INVALID');
  if(op.direction!==undefined&&!['upper','lower','left','right','any'].includes(op.direction))fail('SPLIT_DIRECTION_INVALID');
  if(op.minAreaM2!=null&&(!Number.isFinite(op.minAreaM2)||op.minAreaM2<=0))fail('SPLIT_MIN_AREA_INVALID');
  if(op.entryFromRoomId&&op.entryFromRoomId!==op.targetRoomId)fail('SPLIT_ENTRY_MUST_BE_ORIGINAL_ROOM');
  const st=svgToStructure(svg),target=st.rooms.find(r=>r.id===op.targetRoomId)||fail('SPLIT_TARGET_NOT_FOUND');
  if(!['living_room','bedroom','master_bedroom','dining_room','study','storage'].includes(target.semantic))fail('SPLIT_TARGET_IS_PROTECTED_OR_UNSUPPORTED');
  if(target.polygon.some((p,i)=>{const q=target.polygon[(i+1)%target.polygon.length];return Math.abs(p[0]-q[0])>EPS&&Math.abs(p[1]-q[1])>EPS;}))fail('SPLIT_REQUIRES_ORTHOGONAL_ROOM');
  const defaults={bedroom:{area:6,width:2},study:{area:4,width:1.8},storage:{area:2,width:1.2}}[op.newRoomSemantic];
  const remaining=target.semantic==='living_room'?7:['master_bedroom','bedroom'].includes(target.semantic)?6:target.semantic==='dining_room'?4:2;
  return{st,target,minArea:Math.max(defaults.area,op.minAreaM2??0),minWidth:defaults.width,minRemaining:remaining};
}
type Proposal={id:string;direction:Exclude<SplitDirection,'any'>;axis:0|1;value:number;created:Point[];retained:Point[];start:Point;end:Point;partitions:[Point,Point][];doorWallIndex:number;doorOffset:number;newRoomId:string;wallId:string;doorId:string;clearWidth:number};
/** Sufficient rectangular usable footprint, tested inside the real polygon.
 * Bounding-box width alone would wrongly accept thin L-shaped remnants. */
function usableRectangle(poly:Point[],minWidth:number,minArea:number,budget:SearchBudget):number{
  const b=bounds(poly),xs=[b.minX,b.maxX,...poly.map(p=>p[0])],ys=[b.minY,b.maxY,...poly.map(p=>p[1])];
  const uniq=(n:number[])=>[...new Set(n)].sort((a,b)=>a-b);
  let best=0;
  for(const [ix,x]of uniq(xs).entries())for(const x2 of uniq(xs).slice(ix+1)){
    budget.step();
    if(x2-x-WALL<minWidth-EPS)continue;
    for(const [iy,y]of uniq(ys).entries())for(const y2 of uniq(ys).slice(iy+1)){
      budget.step();
      if(y2-y-WALL<minWidth-EPS||(x2-x-WALL)*(y2-y-WALL)<minArea*.72)continue;
      // Exact for an orthogonal simple polygon: rectangle corners are inside,
      // and no source boundary crosses the open rectangle. A fixed sampling
      // grid could miss a narrow concave notch and is deliberately not used.
      budget.step(poly.length*5);
      let ok=([[x,y],[x2,y],[x2,y2],[x,y2]]as Point[]).every(p=>inside(p,poly));
      for(let i=0;i<poly.length&&ok;i++){const a=poly[i],b=poly[(i+1)%poly.length];
        if(Math.abs(a[1]-b[1])<EPS&&a[1]>y+EPS&&a[1]<y2-EPS&&Math.min(Math.max(a[0],b[0]),x2)-Math.max(Math.min(a[0],b[0]),x)>EPS)ok=false;
        if(Math.abs(a[0]-b[0])<EPS&&a[0]>x+EPS&&a[0]<x2-EPS&&Math.min(Math.max(a[1],b[1]),y2)-Math.max(Math.min(a[1],b[1]),y)>EPS)ok=false;
      }
      // A sufficient rectangle proves the policy. Do not exhaustively solve
      // the maximum rectangle for every raster stair-step coordinate.
      if(ok)return Math.min(x2-x,y2-y)-WALL;
    }
  }
  return best;
}
function doorApproachRoutes(st:Structure,target:Room,created:Point[],retained:Point[],start:Point,end:Point,offset:number,axis:0|1){
  const cross=1-axis,mid:Point=[...start],len=Math.hypot(end[0]-start[0],end[1]-start[1]);mid[cross]+=offset+DOOR/2;
  const newSide=created.some(p=>p[axis]<mid[axis]-EPS)?-1:1;
  const createdApproach:Point=[...mid],retainedApproach:Point=[...mid];createdApproach[axis]+=newSide*.6;retainedApproach[axis]-=newSide*.6;
  if(!pointInPolygon(createdApproach,created)||boundary(createdApproach,created)<PASSAGE/2||!pointInPolygon(retainedApproach,retained)||boundary(retainedApproach,retained)<PASSAGE/2)fail('SPLIT_NEW_DOOR_APPROACH_TOO_NARROW');
  const oldDoors=st.doors.filter(d=>adjacent(st,d).includes(target.id));
  if(!oldDoors.length)fail('SPLIT_ORIGINAL_ACCESS_UNKNOWN');
  const entrances:Point[]=[];
  for(const d of oldDoors){
    const ids=adjacent(st,d),other=ids.find(id=>id!==target.id),q=openingCentre(st,d),wall=st.walls.find(w=>w.id===d.wallId)!,wl=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]);
    const n:Point=[-(wall.end[1]-wall.start[1])/wl,(wall.end[0]-wall.start[0])/wl];
    const targetSign=ids[0]===target.id?1:-1,approach:Point=[q[0]+n[0]*targetSign*.62,q[1]+n[1]*targetSign*.62];
    const balcony=st.rooms.find(r=>r.id===other)?.semantic==='balcony';
    // Only existing balcony access may transfer to the new room. Original
    // entry and all kitchen/bathroom/bedroom doors remain on the retained side.
    if(!balcony&&(!pointInPolygon(approach,retained)||[.04,.08,.12,.2,.4,.62].some(d=>{const p:Point=[q[0]+n[0]*targetSign*d,q[1]+n[1]*targetSign*d];return pointInPolygon(p,target.polygon)&&!pointInPolygon(p,retained);})))fail('SPLIT_ORIGINAL_ENTRANCE_CAPTURED');
    if(!balcony)entrances.push(approach);
  }
  if(!entrances.length)fail('SPLIT_RETAINED_ENTRY_UNKNOWN');
  const b=bounds(retained),step=.08,radius=PASSAGE/2+WALL/2,w=Math.ceil((b.maxX-b.minX)/step)+1,h=Math.ceil((b.maxY-b.minY)/step)+1;
  if(w*h>200000)fail('SPLIT_CIRCULATION_GRID_LIMIT');
  const pass=new Uint8Array(w*h);
  for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++){const p:Point=[b.minX+ix*step,b.minY+iy*step];if(pointInPolygon(p,retained)&&boundary(p,retained)>=radius)pass[iy*w+ix]=1;}
  const nearest=(q:Point)=>{let result=-1,best=Infinity;for(let i=0;i<pass.length;i++)if(pass[i]){const distance=Math.hypot(b.minX+(i%w)*step-q[0],b.minY+Math.floor(i/w)*step-q[1]);if(distance<best){best=distance;result=i;}}if(best>.65)fail('SPLIT_EXISTING_DOOR_APPROACH_BLOCKED');
    const at:Point=[b.minX+(result%w)*step,b.minY+Math.floor(result/w)*step];for(let t=0;t<=16;t++){const p:Point=[q[0]+(at[0]-q[0])*t/16,q[1]+(at[1]-q[1])*t/16];if(!pointInPolygon(p,retained)||boundary(p,retained)<PASSAGE/2-EPS)fail('SPLIT_APPROACH_CANNOT_REACH_CLEAR_PATH');}return result;};
  const terminals=[...entrances,retainedApproach].map(nearest),seen=new Set<number>([terminals[0]]),queue=[terminals[0]];
  for(let i=0;i<queue.length;i++)for(const delta of[-w,w,-1,1]){const n=queue[i]+delta;if(n<0||n>=pass.length||Math.abs(delta)===1&&Math.floor(n/w)!==Math.floor(queue[i]/w)||!pass[n]||seen.has(n))continue;seen.add(n);queue.push(n);}
  if(terminals.some(i=>!seen.has(i)))fail('SPLIT_ENTRANCE_CIRCULATION_DISCONNECTED');
  return{newDoorCreatedApproach:createdApproach,newDoorRetainedApproach:retainedApproach,originalEntryApproaches:entrances,passageWidthM:PASSAGE,doorSpanM:len};
}
function rectanglePartition(poly:Point[],left:number,right:number,top:number,bottom:number){
  const middle=clipRoomPolygon(clipRoomPolygon(poly,0,left,false),0,right,true),created=clipRoomPolygon(clipRoomPolygon(middle,1,top,false),1,bottom,true);
  if(created.length<4)fail('SPLIT_RECTANGLE_HAS_NO_INTERIOR');
  const outside=[clipRoomPolygon(poly,0,left,true),clipRoomPolygon(poly,0,right,false),clipRoomPolygon(middle,1,top,true),clipRoomPolygon(middle,1,bottom,false)].filter(p=>p.length>=4&&polygonArea(p)>EPS),retained=orthogonalUnion(outside),pieces:[Point,Point][]=[];
  // Subdivide a clipped edge at original boundary vertices before deciding
  // which part is genuinely new. Collinear cleanup may otherwise join a new
  // partition to an existing wall and incorrectly mark that wall as added.
  for(let i=0;i<created.length;i++){
    const a=created[i],z=created[(i+1)%created.length],axis:0|1=Math.abs(a[0]-z[0])<EPS?1:0;
    const points=[a,z,...poly.filter(p=>dist(p,a,z)<EPS)].sort((p,q)=>p[axis]-q[axis]);
    for(let j=0;j<points.length-1;j++){const p=points[j],q=points[j+1],mid:Point=[(p[0]+q[0])/2,(p[1]+q[1])/2];if(Math.hypot(q[0]-p[0],q[1]-p[1])>EPS&&boundary(mid,poly)>EPS){const previous=pieces[pieces.length-1];if(previous&&Math.hypot(previous[1][0]-p[0],previous[1][1]-p[1])<EPS&&Math.abs(previous[0][1-axis]-p[1-axis])<EPS)previous[1]=q;else pieces.push([p,q]);}}
  }
  if(!pieces.length||pieces.length>4||pieces.some(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])<.1-EPS))fail('SPLIT_RECTANGLE_PARTITION_TOPOLOGY_UNSUPPORTED');
  return{created,retained,partitions:pieces};
}
function sourceAnchors(st:Structure,target:Room,west:boolean,north:boolean):Point[]{
  const b=bounds(target.polygon),out:Point[]=[],seen=new Set<string>(),sx=west?1:-1,sy=north?1:-1;
  const add=(p:Point)=>{const key=`${Math.round(p[0]/.12)}:${Math.round(p[1]/.12)}`;if(seen.has(key)||p[0]<b.minX-.08||p[0]>b.maxX+.08||p[1]<b.minY-.08||p[1]>b.maxY+.08||boundary(p,target.polygon)>.14||!pointInPolygon([p[0]+sx*.18,p[1]+sy*.18],target.polygon))return;
    // An anchor must be near two actual perpendicular room boundaries.
    if(boundary([p[0]+sx*.25,p[1]],target.polygon)>.14||boundary([p[0],p[1]+sy*.25],target.polygon)>.14)return;seen.add(key);out.push(p);};
  for(const h of st.walls.filter(w=>w.start[1]===w.end[1]))for(const v of st.walls.filter(w=>w.start[0]===w.end[0])){
    const p:Point=[v.start[0],h.start[1]];if(p[0]>=Math.min(h.start[0],h.end[0])-.14&&p[0]<=Math.max(h.start[0],h.end[0])+.14&&p[1]>=Math.min(v.start[1],v.end[1])-.14&&p[1]<=Math.max(v.start[1],v.end[1])+.14)add(p);
  }
  for(const p of target.polygon)add(p);
  return out.slice(0,12);
}
function rawProposals(svg:string,op:RoomSplitOperation,budget=createSearchBudget()){
  const c=context(svg,op),{st,target,minArea,minWidth,minRemaining}=c,b=bounds(target.polygon),proposals:Proposal[]=[],rejected:Record<string,number>={};
  budget.step();
  if(polygonArea(target.polygon)<minArea+minRemaining-EPS)return{...c,budget,proposals,rejected:{SPLIT_TOTAL_AREA_INSUFFICIENT:1}};
  const directions:Exclude<SplitDirection,'any'>[]=!op.direction||op.direction==='any'?['upper','lower','left','right']:[op.direction];
  for(const direction of directions){const axis:0|1=direction==='left'||direction==='right'?0:1,low=axis===0?b.minX:b.minY,high=axis===0?b.maxX:b.maxY,less=direction==='left'||direction==='upper';
    const cuts=[.24,.3,.36,.42,.48,.5,.54,.6,.66,.72,.78].map(t=>round(low+(high-low)*t));
    for(const value of cuts){try{
      budget.step();
      const[start,end]=cutSpan(target.polygon,axis,value),created=clipRoomPolygon(target.polygon,axis,value,less),retained=clipRoomPolygon(target.polygon,axis,value,!less);preserveOpeningJambs(st,[[start,end]]);
      if(created.length<4||retained.length<4||polygonArea(created)<minArea||polygonArea(retained)<minRemaining)fail('SPLIT_INSUFFICIENT_ROOM_AREA');
      if(Math.abs(polygonArea(created)+polygonArea(retained)-polygonArea(target.polygon))>EPS)fail('SPLIT_TARGET_AREA_NOT_CONSERVED');
      const clearWidth=usableRectangle(created,minWidth,minArea,budget);if(clearWidth<minWidth-EPS)fail('SPLIT_INSUFFICIENT_USABLE_WIDTH');
      if(usableRectangle(retained,target.semantic==='living_room'?1.8:Math.min(1.8,minWidth),minRemaining,budget)<Math.min(1.8,minWidth))fail('SPLIT_RETAINED_ROOM_TOO_NARROW');
      const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
      for(const fraction of[.5,.24,.76]){try{const doorOffset=round(Math.max(.12,Math.min(length-DOOR-.12,length*fraction-DOOR/2)));doorApproachRoutes(st,target,created,retained,start,end,doorOffset,axis);
        const id=`split-${hash(svg)}-${hash(JSON.stringify({target:target.id,direction,value,doorOffset,type:op.newRoomSemantic,minArea}))}`,suffix=hash(id);
        proposals.push({id,direction,axis,value,created,retained,start,end,partitions:[[start,end]],doorWallIndex:0,doorOffset,newRoomId:`room_split_${suffix}`,wallId:`wall_split_${suffix}`,doorId:`door_split_${suffix}`,clearWidth});
      }catch(e){propagateBudget(e);const code=e instanceof Error?e.message:String(e);rejected[code]=(rejected[code]||0)+1;}}
    }catch(e){propagateBudget(e);const code=e instanceof Error?e.message:String(e);rejected[code]=(rejected[code]||0)+1;}}
  }
  // Corner subdivisions keep an L-shaped retained room when a full-width cut
  // would capture kitchen/entry circulation. Every new clipped edge becomes a
  // real partition; no concave source boundary is replaced by a rectangle.
  for(const direction of directions)for(const west of[true,false])for(const north of[true,false]){
    if(direction==='upper'&&!north||direction==='lower'&&north||direction==='left'&&!west||direction==='right'&&west)continue;
    const xSign=west?1:-1,ySign=north?1:-1;
    const spans=[b.maxX-b.minX,b.maxY-b.minY],widths=[minWidth+WALL,minWidth+WALL+.08,.28*spans[0],.36*spans[0],.44*spans[0],.52*spans[0],.6*spans[0]],depths=[minWidth+WALL,minWidth+WALL+.08,.28*spans[1],.36*spans[1],.44*spans[1],.52*spans[1],.6*spans[1]];
    for(const[x,y]of sourceAnchors(st,target,west,north))for(const width of[...new Set(widths.map(round))])for(const depth of[...new Set(depths.map(round))]){try{
      budget.step();
      if(proposals.length>=96)continue;
      if(width*depth<minArea-EPS)continue;
      if(width-WALL<minWidth-EPS||depth-WALL<minWidth-EPS||width>=spans[0]-.9||depth>=spans[1]-.9)continue;
      const cutX=x+xSign*width,cutY=y+ySign*depth,left=Math.min(x,cutX),right=Math.max(x,cutX),top=Math.min(y,cutY),bottom=Math.max(y,cutY);
      if(left<b.minX-.08||right>b.maxX+.08||top<b.minY-.08||bottom>b.maxY+.08)continue;
      const centre:Point=[(left+right)/2,(top+bottom)/2];if(direction==='upper'&&centre[1]>(b.minY+b.maxY)/2||direction==='lower'&&centre[1]<(b.minY+b.maxY)/2||direction==='left'&&centre[0]>(b.minX+b.maxX)/2||direction==='right'&&centre[0]<(b.minX+b.maxX)/2)continue;
      const{created,retained,partitions}=rectanglePartition(target.polygon,left,right,top,bottom);if(polygonArea(created)<minArea)fail('SPLIT_CORNER_NOT_FULLY_INSIDE_REAL_ROOM');
      if(polygonArea(retained)<minRemaining||Math.abs(polygonArea(created)+polygonArea(retained)-polygonArea(target.polygon))>EPS)fail('SPLIT_CORNER_AREA_NOT_CONSERVED');
      const clearWidth=usableRectangle(created,minWidth,minArea,budget);if(clearWidth<minWidth-EPS)fail('SPLIT_INSUFFICIENT_USABLE_WIDTH');
      if(usableRectangle(retained,target.semantic==='living_room'?1.8:Math.min(1.8,minWidth),minRemaining,budget)<Math.min(1.8,minWidth))fail('SPLIT_RETAINED_ROOM_TOO_NARROW');
      preserveOpeningJambs(st,partitions);
      for(let doorWallIndex=0;doorWallIndex<partitions.length;doorWallIndex++)for(const fraction of[.5,.24,.76]){try{
        const[start,end]=partitions[doorWallIndex],axis:0|1=Math.abs(start[0]-end[0])<EPS?0:1,length=Math.hypot(end[0]-start[0],end[1]-start[1]);if(length<DOOR+.24)continue;const doorOffset=round(Math.max(.12,Math.min(length-DOOR-.12,length*fraction-DOOR/2)));
        doorApproachRoutes(st,target,created,retained,start,end,doorOffset,axis);
        const id=`split-${hash(svg)}-${hash(JSON.stringify({target:target.id,direction,cutX,cutY,doorWallIndex,doorOffset,type:op.newRoomSemantic,minArea}))}`,suffix=hash(id);
        proposals.push({id,direction,axis,value:axis===0?cutX:cutY,created,retained,start,end,partitions,doorWallIndex,doorOffset,newRoomId:`room_split_${suffix}`,wallId:`wall_split_${suffix}`,doorId:`door_split_${suffix}`,clearWidth});
      }catch(e){propagateBudget(e);const code=e instanceof Error?e.message:String(e);rejected[code]=(rejected[code]||0)+1;}}
    }catch(e){propagateBudget(e);const code=e instanceof Error?e.message:String(e);rejected[code]=(rejected[code]||0)+1;}}
  }
  proposals.sort((a,b)=>polygonArea(a.created)-polygonArea(b.created)||a.partitions.length-b.partitions.length||a.id.localeCompare(b.id));
  budget.step();return{...c,budget,proposals,rejected};
}
function toSpec(st:Structure):FloorplanSpec{return{id:'structure-primitives',name:'概念户型结构',factory:'svg-structure-primitives',sourceImage:'',outerPolygon:clone(st.outerPolygon),walls:clone(st.walls),rooms:clone(st.rooms),doors:clone(st.doors),windows:clone(st.windows)};}
function execute(svg:string,op:RoomSplitOperation,p:Proposal,prepared?:ReturnType<typeof context>){
  const{st,target,minArea,minWidth,minRemaining}=prepared??context(svg,op),original=toSpec(st),sourceBp=createFloorplanBlueprint(original,[]);
  preserveOpeningJambs(st,p.partitions);
  let scene=compileBlueprintToPascal(sourceBp);
  const zone=scene.nodes[target.id]||fail('SPLIT_TARGET_ZONE_MISSING'),created=clone(zone),level=scene.nodes[String(zone.parentId)]||fail('SPLIT_LEVEL_MISSING');
  zone.polygon=clone(p.retained);zone.metadata={...zone.metadata,expected_area_m2:polygonArea(p.retained),modeledNetArea:polygonArea(p.retained)};
  created.id=p.newRoomId;created.name=op.newRoomName;created.polygon=clone(p.created);created.metadata={...created.metadata,roomId:p.newRoomId,semantic_type:op.newRoomSemantic,roomType:op.newRoomSemantic,expected_area_m2:polygonArea(p.created),modeledNetArea:polygonArea(p.created),source:'validated-room-split'};
  scene.nodes[p.newRoomId]=created;level.children=[...(level.children||[]),p.newRoomId];
  for(let i=0;i<p.partitions.length;i++)scene=addPartitionWall(scene,p.partitions[i][0],p.partitions[i][1],{id:i?`${p.wallId}_${i}`:p.wallId,thickness:WALL,height:2.8,snap:false}).scene;
  scene=addDoor(scene,{id:p.doorId,name:`${op.newRoomName}门`,hostWallId:p.doorWallIndex?`${p.wallId}_${p.doorWallIndex}`:p.wallId,offset:p.doorOffset,width:DOOR,height:2.1,doorType:'hinged',hingeSide:'left',swingDirection:'inward',swingAngle:0,connects:[target.id,p.newRoomId],locked:false}).scene;
  const edited=blueprintToFloorplanSpec(sceneToFloorplanBlueprint(scene));
  edited.rooms=edited.rooms.map(r=>{const old=st.rooms.find(o=>o.id===r.id);return old&&old.id!==target.id?{...clone(old),polygon:r.polygon,expectedArea:polygonArea(r.polygon)}:r;});
  // Refresh adjacency from geometry rather than trusting stored old connects.
  const bp=createFloorplanBlueprint(edited,[]),bpValidation=validateVariantBlueprint(bp);
  if(!bpValidation.valid)fail(`SPLIT_BLUEPRINT_INVALID:${bpValidation.issues.join('|')}`);
  const structure=canonicalFromSpec(edited),validation=validateCanonicalStructure(structure);
  if(validation&&typeof validation==='object'&&'valid'in validation&&!(validation as any).valid)fail('SPLIT_CANONICAL_STRUCTURE_INVALID');
  for(const old of st.rooms.filter(r=>r.id!==target.id)){const after=structure.rooms.find(r=>r.id===old.id);if(!after||JSON.stringify(after.polygon)!==JSON.stringify(old.polygon)||after.name!==old.name||after.semantic!==old.semantic)fail(`SPLIT_UNRELATED_ROOM_CHANGED:${old.id}`);}
  for(const key of['doors','windows']as const)for(const opening of st[key]){const after=structure[key].find(o=>o.id===opening.id);if(!after||after.wallId!==opening.wallId||Math.abs(after.distance-opening.distance)>EPS||Math.abs(after.width-opening.width)>EPS)fail(`SPLIT_ORIGINAL_OPENING_CHANGED:${opening.id}`);}
  const routes=doorApproachRoutes(st,target,p.created,p.retained,p.start,p.end,p.doorOffset,p.axis),candidate:RoomSplitCandidate={id:p.id,type:'split_room',targetRoomId:target.id,newRoomId:p.newRoomId,direction:p.direction,newRoomName:op.newRoomName,newRoomSemantic:op.newRoomSemantic,newAreaM2:round(polygonArea(p.created)),remainingAreaM2:round(polygonArea(p.retained)),minClearWidthM:round(p.clearWidth),doorWidthM:DOOR,entranceClearanceM:PASSAGE,notes:['家具不随自然语言结构操作移动；实际家具碰撞须在三维提交前检查。','采光、通风、承重及施工合规未验证；面积按解析房间中心线多边形计算。']};
  const output=renderStructureSvg(structure),parsed=svgToStructure(output);
  if(parsed.rooms.length!==st.rooms.length+1||parsed.doors.length!==st.doors.length+1||parsed.windows.length!==st.windows.length)fail('SPLIT_SVG_ROUNDTRIP_TOPOLOGY_INVALID');
  compileBlueprintToPascal(createFloorplanBlueprint(toSpec(parsed),[]));
  return{svg:output,structure:parsed,candidate,validation:{valid:true,unit:'meter',targetRoomId:target.id,newRoomId:p.newRoomId,newDoorId:p.doorId,checks:['exact-concave-partition','area-conservation','protected-room-polygons','original-openings','entrance-circulation','existing-wall-and-door-tools','blueprint','visible-svg-roundtrip'],...routes,policy:{minAreaM2:minArea,minClearWidthM:minWidth,minRemainingAreaM2:minRemaining},warnings:candidate.notes}};
}
function generateSpecifiedRoomSplitCandidates(svg:string,op:RoomSplitOperation,budget:SearchBudget){
  const prepared=rawProposals(svg,op,budget),{proposals,rejected,target}=prepared,candidates:RoomSplitCandidate[]=[];let attempted=0;
  // Limit expensive compile/round-trip checks to a small validated menu. All
  // candidates returned to the model have executed the same transaction.
  for(const p of proposals){prepared.budget.step();attempted++;try{candidates.push(execute(svg,op,p,prepared).candidate);prepared.budget.step();if(candidates.length>=8)break;}catch(e){propagateBudget(e);const code=e instanceof Error?e.message:String(e);rejected[code]=(rejected[code]||0)+1;}}
  return{candidates,diagnostics:{targetRoomId:target.id,considered:proposals.length,attempted,rejected,noSolutionReason:candidates.length?null:'SPLIT_NO_VERIFIED_SINGLE_PARTITION'}};
}
function firstFeasibleRoomSplitCandidates(svg:string,op:RoomSplitOperation,budget:SearchBudget){
  if(!op)fail('SPLIT_TARGET_REQUIRED');
  if(op.direction&&op.direction!=='any')return generateSpecifiedRoomSplitCandidates(svg,op,budget);
  const tried:{direction:string;reason:string|null}[]=[];
  let last:ReturnType<typeof generateSpecifiedRoomSplitCandidates>|undefined;
  // An unspecified position asks for a feasible proposal, not an exhaustive
  // search of every side. The ordering and IDs remain deterministic.
  for(const direction of['upper','lower','left','right']as const){
    budget.step();last=generateSpecifiedRoomSplitCandidates(svg,{...op,direction},budget);
    tried.push({direction,reason:last.diagnostics.noSolutionReason});
    if(last.candidates.length)return{...last,diagnostics:{...last.diagnostics,directionPolicy:'first-verified-direction',selectedDirection:direction,tried}};
  }
  return{...last!,diagnostics:{...last!.diagnostics,directionPolicy:'first-verified-direction',selectedDirection:null,tried}};
}
export function generateRoomSplitCandidates(svg:string,op:RoomSplitOperation){
  return firstFeasibleRoomSplitCandidates(svg,op,createSearchBudget());
}
export function applyRoomSplitCandidate(svg:string,candidateId:string,op:RoomSplitOperation){
  if(!op)fail('SPLIT_TARGET_REQUIRED');
  const budget=createSearchBudget();
  let selectedOperation=op,applyBudget=budget;
  if(!op.direction||op.direction==='any'){
    const menu=firstFeasibleRoomSplitCandidates(svg,op,budget),selected=menu.candidates.find(c=>c.id===candidateId)||fail('SPLIT_CANDIDATE_INVALID_OR_STALE');
    selectedOperation={...op,direction:selected.direction};
    // Re-execution has its own deterministic work allowance, while sharing
    // the original hard deadline with menu selection.
    applyBudget=createSearchBudget();applyBudget.deadline=budget.deadline;
  }
  const prepared=rawProposals(svg,selectedOperation,applyBudget),proposal=prepared.proposals.find(p=>p.id===candidateId)||fail('SPLIT_CANDIDATE_INVALID_OR_STALE');
  prepared.budget.step();const result=execute(svg,selectedOperation,proposal,prepared);prepared.budget.step();return result;
}
