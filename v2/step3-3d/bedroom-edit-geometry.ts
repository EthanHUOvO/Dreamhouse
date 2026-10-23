/** Natural-language bedroom editing executes only geometry-verified proposals.
 * SVG source coordinates and room IDs are authoritative; the model selects an
 * opaque candidate ID and never supplies geometry. All writes are pure strings.
 */
import { svgToStructure, parseSvg, pointInPolygon, polygonArea, type Point } from './svg-geometry';
import { appendSvgAdditions, roomsBeside, type Addition } from './svg-edit-geometry';

type Structure = ReturnType<typeof svgToStructure>;
type Room = Structure['rooms'][number];
export type BedroomRegion = 'upper'|'lower'|'left'|'right';
export type BedroomConstraints = {targetRoomId?:string;region?:BedroomRegion|'any';protectedRoomIds?:string[];preserveEntrance?:true;minAreaM2?:number};
export type BedroomCandidate = {id:string;targetRoomId:string;position:BedroomRegion;newAreaM2:number;remainingAreaM2:number;minClearWidthM:number;entranceClearanceM:number;notes:string[]};
const POLICY = {minAreaM2:6,minClearWidthM:2,minRemainingAreaM2:7,minPassageWidthM:.9,doorWidthM:.8,wallThicknessM:.12,areaBasis:'parsed-room-centreline-polygon',scope:'concept-layout-not-construction-compliance'} as const;
const fail=(s:string):never=>{throw new Error(s);};
const round=(n:number)=>Math.round(n*10000)/10000;
function distance(p:Point,a:Point,b:Point){const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);}
const boundaryDistance=(p:Point,poly:Point[])=>Math.min(...poly.map((a,i)=>distance(p,a,poly[(i+1)%poly.length])));
const contains=(p:Point,poly:Point[],tol=.035)=>pointInPolygon(p,poly)||boundaryDistance(p,poly)<=tol;
const bounds=(p:Point[])=>({left:Math.min(...p.map(p=>p[0])),right:Math.max(...p.map(p=>p[0])),top:Math.min(...p.map(p=>p[1])),bottom:Math.max(...p.map(p=>p[1]))});
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(36);}
function openingSegment(st:Structure,o:Structure['doors'][number]):[Point,Point]{const w=st.walls.find(w=>w.id===o.wallId)||fail('BEDROOM_OPENING_HOST_MISSING'),l=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]),v:Point=[(w.end[0]-w.start[0])/l,(w.end[1]-w.start[1])/l];return[-1,1].map(s=>[w.start[0]+v[0]*(o.distance+s*o.width/2),w.start[1]+v[1]*(o.distance+s*o.width/2)] as Point) as [Point,Point];}
function context(svg:string,c:BedroomConstraints={}){
  if(c.region!==undefined&&!['upper','lower','left','right','any'].includes(c.region))fail('BEDROOM_REGION_UNSUPPORTED');
  if(c.preserveEntrance!==undefined&&c.preserveEntrance!==true)fail('BEDROOM_ENTRANCE_MUST_BE_PRESERVED');
  if(c.minAreaM2!==undefined&&(!Number.isFinite(c.minAreaM2)||c.minAreaM2<=0))fail('BEDROOM_MIN_AREA_INVALID');
  const st=svgToStructure(svg),targets=st.rooms.filter(r=>r.semantic==='living_room'),target=c.targetRoomId?targets.find(r=>r.id===c.targetRoomId):targets.length===1?targets[0]:undefined;
  if(!target)fail('BEDROOM_TARGET_LIVING_ROOM_NOT_FOUND_OR_AMBIGUOUS');
  if(c.protectedRoomIds?.some(id=>!st.rooms.some(r=>r.id===id)||id===target.id))fail('BEDROOM_PROTECTED_ROOM_INVALID');
  return{st,target,minArea:Math.max(POLICY.minAreaM2,c.minAreaM2??0)};
}
export function bedroomEditContext(svg:string){
  const st=svgToStructure(svg);
  return{unit:'meter',axes:'x向右，y向下；upper/lower/left/right分别指图上/下/左/右，any由宿主搜索四向靠墙角方案',rooms:st.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.polygon,areaM2:round(polygonArea(r.polygon))})),policy:POLICY,furniture:{present:false,source:'source SVG contains architectural symbols, no furniture nodes; Step3 furniture is not edited here'},warnings:['新增卧室的采光、通风、承重及施工合规未经验证。',...st.warnings]};
}

type Proposal={id:string;position:BedroomRegion;box:{left:number;right:number;top:number;bottom:number};additions:Addition[]};
function upperProposals(svg:string,st:Structure,target:Room,minArea:number):Proposal[]{
  const p=target.polygon,b=bounds(p),out:Proposal[]=[],seen=new Set<string>();
  // Existing horizontal and vertical wall segments provide actual anchors.
  // A rectangle anchored to two source boundaries needs two new partitions.
  const tops=st.walls.filter(w=>w.start[1]===w.end[1]&&w.end[0]-w.start[0]>=1.2&&w.start[1]<(b.top+b.bottom)/2);
  const sides=st.walls.filter(w=>w.start[0]===w.end[0]&&w.end[1]-w.start[1]>=2);
  for(const top of tops)for(const side of sides)for(const sign of [1,-1]){
    const x=side.start[0],y=top.start[1];
    if(x<top.start[0]-.08||x>top.end[0]+.08||y<side.start[1]-.08||y>side.end[1]+.08)continue;
    if(!pointInPolygon([x+sign*.18,y+.18],p))continue;
    const supportedWidth=sign>0?top.end[0]-x:x-top.start[0], maxW=sign>0?b.right-x:x-b.left;
    // A top boundary may continue at a concave neck: candidate width can extend
    // beyond the top source wall only when the closed rectangle is supported.
    const widths=[2.16,2.3,2.5,2.7,3,3.3,maxW];
    for(const width of widths)for(const depth of [2.16,2.3,2.5,2.8,3,3.2,3.4,3.6]){
      if(width<2.12||width>maxW+.04||width*depth<minArea||y+depth>(b.top+b.bottom)/2+1.5)continue;
      const box={left:sign>0?x:x-width,right:sign>0?x+width:x,top:y,bottom:y+depth};
      if((box.top+box.bottom)/2>(b.top+b.bottom)/2)continue;
      const k=Object.values(box).map(round).join(':');if(seen.has(k))continue;seen.add(k);
      let inside=true;
      // Proposal filtering samples free interior, not wall-centre T-junction
      // raster corners. Exact output containment is still checked by execute.
      for(let ix=0;ix<13&&inside;ix++)for(let iy=0;iy<13;iy++)if(!contains([box.left+(box.right-box.left)*(ix+.5)/13,box.top+(box.bottom-box.top)*(iy+.5)/13],p)){inside=false;break;}
      if(!inside)continue;
      const q:Point=[sign>0?box.right:box.left,box.bottom],a:Point=[q[0],box.top],z:Point=[sign>0?box.left+.12:box.right-.12,box.bottom];
      // The existing boundary must support both anchored sides, not just their corner.
      if(!Array.from({length:21},(_,i)=>[x,y+.2+(depth-.4)*i/20] as Point).every(v=>boundaryDistance(v,p)<.085))continue;
      if(!Array.from({length:21},(_,i)=>[x+sign*(.2+(Math.min(width,supportedWidth)-.4)*i/20),y] as Point).every(v=>boundaryDistance(v,p)<.085))continue;
      // Both new partitions can host the door. Actual furniture and access
      // checks decide feasibility; a single sofa-specific door position must
      // not exclude an otherwise usable corner on another layout.
      for(const doorAt of ['side','bottom'] as const){
       const length=doorAt==='side'?depth:width;
       for(const inset of [doorAt==='side'?.75:length/2]){
        // Keep a quarter metre jamb clear of partition junctions.
        const centre=doorAt==='bottom'?[box.left+inset,box.bottom]:[q[0],box.bottom-inset];
        const d1:Point=doorAt==='bottom'?[centre[0]-.4,centre[1]]:[centre[0],centre[1]-.4],d2:Point=doorAt==='bottom'?[centre[0]+.4,centre[1]]:[centre[0],centre[1]+.4];
        const additions:Addition[]=[{type:'wall',x1:a[0],y1:a[1],x2:q[0],y2:q[1]},{type:'wall',x1:q[0],y1:q[1],x2:z[0],y2:z[1]},{type:'door',x1:d1[0],y1:d1[1],x2:d2[0],y2:d2[1]},{type:'label',x:(box.left+box.right)/2,y:(box.top+box.bottom)/2,text:'卧室'}];
        if(width>supportedWidth+.02)additions.unshift({type:'wall',x1:x+sign*(supportedWidth+.03),y1:y,x2:x+sign*width,y2:y});
        out.push({id:`bedroom-${hash(svg)}-${hash(k+doorAt+(inset===.75?'':String(inset)))}`,position:'upper',box,additions});
       }
      }
    }
  }
  return out.sort((a,b)=>(a.box.top+a.box.bottom)-(b.box.top+b.box.bottom)||Math.abs((a.box.right-a.box.left)*(a.box.bottom-a.box.top)-7)-Math.abs((b.box.right-b.box.left)*(b.box.bottom-b.box.top)-7));
}
/** Rotate only the search coordinate frame. Source SVG, wall geometry and
 * labels are never rotated or redrawn. Every candidate is executed against
 * the original SVG and must pass the same strict preservation checks. */
function proposals(svg:string,st:Structure,target:Room,minArea:number,region:BedroomConstraints['region']='any'):Proposal[]{
  if(polygonArea(target.polygon)<minArea+POLICY.minRemainingAreaM2)return [];
  const directions:BedroomRegion[]=region==='any'?['upper','left','right','lower']:[region];
  const result:Proposal[]=[],seen=new Set<string>();
  for(const direction of directions){
    const forward=(p:Point):Point=>direction==='upper'?[...p]:direction==='lower'?[-p[0],-p[1]]:direction==='left'?[-p[1],p[0]]:[p[1],-p[0]];
    const inverse=(p:Point):Point=>direction==='upper'?[...p]:direction==='lower'?[-p[0],-p[1]]:direction==='left'?[p[1],-p[0]]:[-p[1],p[0]];
    const framed={...st,walls:st.walls.map(w=>{let a=forward(w.start),b=forward(w.end);if(a[0]>b[0]||a[1]>b[1])[a,b]=[b,a];return{...w,start:a,end:b};})};
    const room={...target,polygon:target.polygon.map(forward)};
    for(const proposal of upperProposals(svg,framed,room,minArea)){
      const b=proposal.box,corners=([[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]] as Point[]).map(inverse),box=bounds(corners);
      const additions=proposal.additions.map(a=>{
        if(a.type==='label'){const p=inverse([a.x!,a.y!]);return{...a,x:p[0],y:p[1]};}
        let p=inverse([a.x1!,a.y1!]),q=inverse([a.x2!,a.y2!]);
        // The existing SVG door glyph parser expects a positive axis segment.
        if(p[0]>q[0]||p[1]>q[1])[p,q]=[q,p];
        return{...a,x1:p[0],y1:p[1],x2:q[0],y2:q[1]};
      });
      const key=JSON.stringify(additions);if(seen.has(key))continue;seen.add(key);
      const id=direction==='upper'?proposal.id:`bedroom-${hash(svg)}-${direction}-${hash(key)}`;
      result.push({id,position:direction,box,additions});
    }
  }
  // Interleave directions so bounded search cannot spend all work on one side.
  const groups=directions.map(d=>result.filter(p=>p.position===d)),ordered:Proposal[]=[];
  for(let i=0;i<Math.max(0,...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])ordered.push(group[i]);
  // Capturing an existing opening changes its adjacent room and is forbidden
  // by preservedOpenings. Reject such proposals before expensive SVG parsing.
  const openings=[...st.doors,...st.windows].map(o=>{const[a,b]=openingSegment(st,o);return[(a[0]+b[0])/2,(a[1]+b[1])/2] as Point;});
  return ordered.filter(p=>{
    if(openings.some(q=>q[0]>=p.box.left-.03&&q[0]<=p.box.right+.03&&q[1]>=p.box.top-.03&&q[1]<=p.box.bottom+.03))return false;
    const door=p.additions.find(a=>a.type==='door')!,dx=door.x2!-door.x1!,dy=door.y2!-door.y1!,len=Math.hypot(dx,dy),mid:Point=[(door.x1!+door.x2!)/2,(door.y1!+door.y2!)/2];
    // A door on an anchored existing wall cannot connect both new spaces.
    return[-1,1].every(sign=>pointInPolygon([mid[0]-dy/len*.16*sign,mid[1]+dx/len*.16*sign],target.polygon));
  });
}
function labelPoint(poly:Point[]):Point{
  const b=bounds(poly);let best:Point|undefined,clear=0;
  for(let x=b.left+.2;x<b.right-.2;x+=.12)for(let y=b.top+.2;y<b.bottom-.2;y+=.12){const q:Point=[x,y];if(!pointInPolygon(q,poly))continue;const d=boundaryDistance(q,poly);if(d>clear){best=q;clear=d;}}
  return best??fail('BEDROOM_REMAINING_LABEL_HAS_NO_SPACE');
}
/** Update the target label only, preserving all original dimension groups and
 * every other room's label byte-for-byte. Area is measured from the new polygon. */
function updateLabel(svg:string,room:Room,p:Point,co:Structure['coordinates'],area?:number){
  const nodes=parseSvg(svg),name=nodes.find(n=>n.start===room.sourceLabel.start),group=name?.parent;
  if(!name||!group)fail('BEDROOM_TARGET_LABEL_MISSING');
  const sx=p[0]/co.metersPerUnitX+co.minX,sy=p[1]/co.metersPerUnitY+co.minY;
  const replacement=(source:string,x:number,y:number)=>source.replace(/\bx=("[^"]*"|'[^']*')/,`x="${round(x)}"`).replace(/\by=("[^"]*"|'[^']*')/,`y="${round(y)}"`);
  const edits:{start:number;end:number;text:string}[]=[{start:name.start,end:name.end,text:replacement(svg.slice(name.start,name.end),sx,sy)}];
  const areaNode=group.children.slice(group.children.indexOf(name)+1).find(n=>n.tag==='text'&&/(?:m²|㎡)\s*$/.test(n.text));
  if(areaNode){let text=replacement(svg.slice(areaNode.start,areaNode.end),sx,sy+16);if(area!==undefined)text=text.replace(/>[^<]*<\/text>/,`>${area.toFixed(2)} m²</text>`);edits.push({start:areaNode.start,end:areaNode.end,text});}
  let result=svg;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
  // data-seed coordinates, when supplied by a source, must follow its moved text.
  const oldOpen=svg.slice(group.start,svg.indexOf('>',group.start)+1);
  if(/data-seed-[xy]=/.test(oldOpen)){const changed=oldOpen.replace(/data-seed-x="[^"]*"/,`data-seed-x="${round(sx)}"`).replace(/data-seed-y="[^"]*"/,`data-seed-y="${round(sy)}"`);result=result.slice(0,group.start)+changed+result.slice(group.start+oldOpen.length);}
  return result;
}
function preservedOpenings(st:Structure,next:Structure,target:Room,newId:string){
  const adjacent=(s:Structure,o:Structure['doors'][number])=>{const[a,b]=openingSegment(s,o);return roomsBeside(s,a,b).map(x=>x??'outside').sort();};
  for(const key of ['doors','windows'] as const)for(const o of st[key]){
    const n=next[key].find(n=>n.id===o.id)||fail(`BEDROOM_ORIGINAL_OPENING_LOST:${o.id}`),a=openingSegment(st,o),b=openingSegment(next,n);
    if(Math.abs(o.width-n.width)>1e-8||a.some((p,i)=>Math.hypot(p[0]-b[i][0],p[1]-b[i][1])>.035))fail(`BEDROOM_ORIGINAL_OPENING_MOVED:${o.id}`);
    if(JSON.stringify(adjacent(st,o))!==JSON.stringify(adjacent(next,n)))fail(`BEDROOM_ORIGINAL_OPENING_ADJACENCY_CHANGED:${o.id}`);
  }
  const nd=next.doors.find(d=>!st.doors.some(o=>o.id===d.id))||fail('BEDROOM_NEW_DOOR_MISSING');
  if(JSON.stringify(adjacent(next,nd))!==JSON.stringify([target.id,newId].sort()))fail('BEDROOM_NEW_DOOR_NOT_CONNECTED_TO_LIVING');
  return nd;
}
/** A 0.9 m wide path is required inside the retained living space. Doorways
 * retain their original width; only the free circulation area is eroded. */
function circulation(st:Structure,next:Structure,target:Room){
  const retained=next.rooms.find(r=>r.id===target.id)!,p=retained.polygon,b=bounds(p),radius=POLICY.minPassageWidthM/2+POLICY.wallThicknessM/2,step=.08;
  const w=Math.ceil((b.right-b.left)/step)+1,h=Math.ceil((b.bottom-b.top)/step)+1;
  if(w*h>200_000)fail('BEDROOM_CIRCULATION_GRID_LIMIT');
  const points:Point[]=[],index=new Int32Array(w*h).fill(-1);
  for(let iy=0;iy<h;iy++)for(let ix=0;ix<w;ix++){const q:Point=[b.left+ix*step,b.top+iy*step];if(pointInPolygon(q,p)&&boundaryDistance(q,p)>=radius){index[iy*w+ix]=points.length;points.push(q);}}
  if(!points.length)fail('BEDROOM_REMAINING_PASSAGE_TOO_NARROW');
  const terminals=next.doors.flatMap(d=>{const[a,z]=openingSegment(next,d),ids=roomsBeside(next,a,z);if(!ids.includes(target.id))return[];const len=Math.hypot(z[0]-a[0],z[1]-a[1]),mid:Point=[(a[0]+z[0])/2,(a[1]+z[1])/2];const norm:Point=[-(z[1]-a[1])/len,(z[0]-a[0])/len];const sign=ids[0]===target.id?1:-1;const point:Point=[mid[0]+sign*norm[0]*.65,mid[1]+sign*norm[1]*.65];return[{id:d.id,exterior:ids.includes(null),point,mid}];});
  if(!terminals.length)fail('BEDROOM_ORIGINAL_LIVING_ACCESS_UNKNOWN');
  const nearest=(q:Point)=>{let ix=-1,best=Infinity;points.forEach((p,i)=>{const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<best){best=d;ix=i;}});return{ix,d:best};};
  const chosen=terminals.map(t=>({...t,...nearest(t.point)}));
  if(chosen.some(t=>t.d>.6))fail('BEDROOM_DOOR_APPROACH_BLOCKED');
  const reverse=new Map<number,number>();for(let i=0;i<index.length;i++)if(index[i]>=0)reverse.set(index[i],i);
  const start=chosen[0].ix,visited=new Set<number>([start]),queue=[start],parents=new Map<number,number>();
  for(let qi=0;qi<queue.length;qi++){const cur=queue[qi],at=reverse.get(cur)!;for(const d of [-w,w,-1,1]){const to=at+d;if(to<0||to>=index.length||(Math.abs(d)===1&&Math.floor(to/w)!==Math.floor(at/w)))continue;const ni=index[to];if(ni>=0&&!visited.has(ni)){visited.add(ni);parents.set(ni,cur);queue.push(ni);}}}
  if(chosen.some(t=>!visited.has(t.ix)))fail('BEDROOM_ENTRANCE_CORRIDOR_DISCONNECTED');
  const path=(i:number)=>{const out:Point[]=[];for(let j=i;;j=parents.get(j)!){out.push(points[j]);if(j===start)break;}return out.reverse();};
  return {minPassageWidthM:POLICY.minPassageWidthM,entranceDoorIds:chosen.filter(t=>t.exterior).map(t=>t.id),doorRoutes:chosen.map(t=>({doorId:t.id,approach:t.point,path:path(t.ix)}))};
}
/** The parser grows free regions through wall pixels with Manhattan-distance
 * Voronoi cells. A new T joint locally changes that derived centreline even
 * when the complete source exterior wall path is byte-identical. Accept only
 * that joint-local discretisation, never a shifted exterior edge elsewhere. */
function exteriorRasterDelta(st:Structure,next:Structure,proposal:Proposal){
  const grid=Math.max(st.coordinates.metersPerUnitX,st.coordinates.metersPerUnitY)*st.coordinates.gridUnit;
  const limit=POLICY.wallThicknessM/2+grid, b=proposal.box;
  const joints=([[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]] as Point[]).filter(p=>boundaryDistance(p,st.outerPolygon)<=grid);
  const changed=[...next.outerPolygon.filter(p=>boundaryDistance(p,st.outerPolygon)>1e-8),...st.outerPolygon.filter(p=>boundaryDistance(p,next.outerPolygon)>1e-8)];
  if(changed.some(p=>!joints.some(q=>Math.abs(p[0]-q[0])<=limit&&Math.abs(p[1]-q[1])<=limit)))fail('BEDROOM_OUTER_BOUNDARY_CHANGED_OUTSIDE_PARTITION_JOINT');
  const maxDisplacement=Math.max(0,...next.outerPolygon.map(p=>boundaryDistance(p,st.outerPolygon)),...st.outerPolygon.map(p=>boundaryDistance(p,next.outerPolygon)));
  const areaDelta=polygonArea(next.outerPolygon)-polygonArea(st.outerPolygon),areaBound=joints.length*4*limit*limit;
  if(maxDisplacement>limit+1e-8||Math.abs(areaDelta)>areaBound+1e-8)fail('BEDROOM_OUTER_BOUNDARY_RASTER_DELTA_EXCEEDED');
  return{sourceExteriorWallBytesUnchanged:true,gridM:grid,allowedJointRadiusM:limit,joints,maxDisplacementM:maxDisplacement,areaDeltaM2:areaDelta,changedVertices:changed.length};
}
function execute(svg:string,st:Structure,target:Room,minArea:number,proposal:Proposal){
  const b=proposal.box;
  // Find a safe retained label seed before the flood-fill splits this room.
  const remainingPoints:Point[]=[];const oldBounds=bounds(target.polygon);
  for(let x=oldBounds.left+.25;x<oldBounds.right-.25;x+=.16)for(let y=oldBounds.top+.25;y<oldBounds.bottom-.25;y+=.16){const p:Point=[x,y];if(pointInPolygon(p,target.polygon)&&boundaryDistance(p,target.polygon)>.25&&(x<b.left-.25||x>b.right+.25||y<b.top-.25||y>b.bottom+.25))remainingPoints.push(p);}
  remainingPoints.sort((a,z)=>boundaryDistance(z,target.polygon)-boundaryDistance(a,target.polygon));
  if(!remainingPoints.length)fail('BEDROOM_NO_RETAINED_LIVING_LABEL');
  let output=appendSvgAdditions(updateLabel(svg,target,remainingPoints[0],st.coordinates),proposal.additions,proposal.id);
  let next=svgToStructure(output),bedroom=next.rooms.find(r=>!st.rooms.some(o=>o.id===r.id)),retained=next.rooms.find(r=>r.id===target.id);
  if(next.rooms.length!==st.rooms.length+1||!bedroom||bedroom.semantic!=='bedroom'||!retained||retained.semantic!=='living_room')fail('BEDROOM_ROOM_TOPOLOGY_INVALID');
  if(next.doors.length!==st.doors.length+1||next.windows.length!==st.windows.length)fail('BEDROOM_OPENING_COUNT_INVALID');
  const area=polygonArea(bedroom.polygon),remaining=polygonArea(retained.polygon),bb=bounds(bedroom.polygon),clear=Math.min(bb.right-bb.left,bb.bottom-bb.top)-POLICY.wallThicknessM;
  if(area<minArea||clear<POLICY.minClearWidthM||remaining<POLICY.minRemainingAreaM2)fail('BEDROOM_INSUFFICIENT_ROOM_DIMENSIONS');
  const raster=Math.max(st.coordinates.metersPerUnitX,st.coordinates.metersPerUnitY)*st.coordinates.gridUnit,tolerance=POLICY.wallThicknessM/2+raster,inset=POLICY.wallThicknessM+raster;
  if(bedroom.polygon.some(p=>p[0]<b.left-tolerance||p[0]>b.right+tolerance||p[1]<b.top-tolerance||p[1]>b.bottom+tolerance))fail('BEDROOM_RECTANGLE_HAS_EXTRA_BRANCH');
  // A rectangular bounding box alone would accept an L-shaped room. Verify
  // the actual interior rectangle, leaving only the existing wall/raster band.
  for(let ix=0;ix<=16;ix++)for(let iy=0;iy<=16;iy++)if(!pointInPolygon([b.left+inset+(b.right-b.left-2*inset)*ix/16,b.top+inset+(b.bottom-b.top-2*inset)*iy/16],bedroom.polygon))fail('BEDROOM_RECTANGLE_INTERIOR_NOT_ENCLOSED');
  const outerRasterDelta=exteriorRasterDelta(st,next,proposal);
  const cellArea=st.coordinates.metersPerUnitX*st.coordinates.metersPerUnitY*st.coordinates.gridUnit**2;
  if(Math.abs(area+remaining-polygonArea(target.polygon)-outerRasterDelta.areaDeltaM2)>cellArea*2)fail('BEDROOM_TARGET_AREA_NOT_CONSERVED');
  if(bedroom.polygon.some(p=>!contains(p,target.polygon,.035)))fail('BEDROOM_OUTSIDE_TARGET_POLYGON');
  for(const old of st.rooms.filter(r=>r.id!==target.id)){const n=next.rooms.find(r=>r.id===old.id);if(!n||n.name!==old.name||Math.abs(polygonArea(n.polygon)-polygonArea(old.polygon))>.000001||JSON.stringify(n.polygon)!==JSON.stringify(old.polygon))fail(`BEDROOM_UNRELATED_ROOM_CHANGED:${old.id}`);}
  const door=preservedOpenings(st,next,target,bedroom.id),paths=circulation(st,next,target);
  // Publish calculated areas for both changed spaces. Source printed figures
  // for untouched rooms remain unchanged and retain their source provenance.
  output=updateLabel(output,retained,labelPoint(retained.polygon),next.coordinates,remaining);
  next=svgToStructure(output);bedroom=next.rooms.find(r=>r.id===bedroom!.id)!;
  const label=parseSvg(output).find(n=>n.start===bedroom!.sourceLabel.start)!;
  const source=bedroom.sourceLabel.point;
  output=output.slice(0,label.end)+`<text x="${round(source[0])}" y="${round(source[1]+16)}" font-size="11.5" fill="#666" text-anchor="middle">${area.toFixed(2)} m²</text>`+output.slice(label.end);
  next=svgToStructure(output);
  const candidate:BedroomCandidate={id:proposal.id,targetRoomId:target.id,position:proposal.position,newAreaM2:round(area),remainingAreaM2:round(remaining),minClearWidthM:round(clear),entranceClearanceM:POLICY.minPassageWidthM,notes:['保留全部原门窗及其相邻房间；保留厨卫和其他房间原始几何。','新增卧室无新开外窗；采光、通风及施工合规未验证。','家具不属于此次 SVG 结构编辑。']};
  return{svg:output,structure:next,additions:proposal.additions,candidate,validation:{valid:true,unit:'meter',targetRoomId:target.id,newRoomId:bedroom.id,newDoorId:door.id,outerRasterDelta,checks:['target-polygon','requested-position','corner-rectangle','room-area','minimum-clear-width','preserved-room-polygons','original-opening-position-and-adjacency','new-door-reachable','entrance-circulation','source-label-measured-area'],...paths,furniture:{sourceCount:0,editedCount:0,status:'SOURCE_SVG_HAS_NO_FURNITURE'},warnings:[...next.warnings,...candidate.notes]}};
}
/** Diagnostics are computed with the same strict transaction as execution. */
export function bedroomPartitionAnalysis(svg:string,constraints:BedroomConstraints={},validateCandidate?:(result:ReturnType<typeof execute>,original:Structure)=>void){
  const {st,target,minArea}=context(svg,constraints),raw=proposals(svg,st,target,minArea,constraints.region),candidates:BedroomCandidate[]=[],rejected:Record<string,number>={};
  let attempted=0;
  const started=Date.now();let searchLimited=false;
  for(const p of raw){
    if(attempted>=96||Date.now()-started>12000){searchLimited=true;break;}
    attempted++;try{const result=execute(svg,st,target,minArea,p);validateCandidate?.(result,st);candidates.push(result.candidate);if(candidates.length>=6)break;}catch(e){const reason=e instanceof Error?e.message:String(e);rejected[reason]=(rejected[reason]||0)+1;}
  }
  return{candidates,diagnostics:{targetRoomId:target.id,attempted,considered:raw.length,searchLimited,rejected,noSolutionReason:candidates.length?null:searchLimited?'BEDROOM_SEARCH_LIMIT_REACHED':polygonArea(target.polygon)<minArea+POLICY.minRemainingAreaM2?'BEDROOM_INSUFFICIENT_TOTAL_AREA':raw.length?'BEDROOM_NO_FEASIBLE_PARTITION':'BEDROOM_NO_SUPPORTED_CORNER',policy:{...POLICY,minAreaM2:minArea}}};
}
export const bedroomPartitionCandidates=(svg:string,constraints:BedroomConstraints={})=>bedroomPartitionAnalysis(svg,constraints).candidates;
export function applyBedroomPartition(svg:string,candidateId:string,constraints:BedroomConstraints={}){
  const {st,target,minArea}=context(svg,constraints),p=proposals(svg,st,target,minArea,constraints.region).find(p=>p.id===candidateId);
  if(!p)fail('BEDROOM_CANDIDATE_INVALID');
  return execute(svg,st,target,minArea,p);
}
