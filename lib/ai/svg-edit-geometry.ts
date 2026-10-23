import { svgToStructure, pointInPolygon, polygonArea, type Point } from "./svg-geometry";
type Structure = ReturnType<typeof svgToStructure>;
export type Addition = {type:"wall"|"door"|"sliding-door"|"window"|"label";x1?:number;y1?:number;x2?:number;y2?:number;x?:number;y?:number;text?:string};
const distance = (p:Point,a:Point,b:Point) => {
  const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(l||1)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
};
const onBoundary = (p:Point,poly:Point[],tol=.025) => poly.some((a,i)=>distance(p,a,poly[(i+1)%poly.length])<=tol);
const contains = (p:Point,poly:Point[]) => pointInPolygon(p,poly)||onBoundary(p,poly);
const ends = (a:Addition):[Point,Point] => {
  if(![a.x1,a.y1,a.x2,a.y2].every(v=>typeof v==='number'&&Number.isFinite(v))) throw new Error("EDIT_COORDINATES_REQUIRE_FINITE_METRES");
  const p:Point=[a.x1!,a.y1!],q:Point=[a.x2!,a.y2!];
  if(Math.hypot(p[0]-q[0],p[1]-q[1])<.15||Math.min(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]))>1e-7) throw new Error("EDIT_SEGMENT_MUST_BE_ORTHOGONAL_AND_NONZERO");
  return [p,q];
};
export function roomsBeside(st:Structure,a:Point,b:Point) {
  const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),c:Point=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  return [1,-1].map(sign=>{
    for(const d of [.06,.10,.15,.20]) {const p:Point=[c[0]-dy/l*d*sign,c[1]+dx/l*d*sign];const r=st.rooms.find(r=>pointInPolygon(p,r.polygon));if(r)return r.id;}
    return null;
  });
}
export function svgEditContext(svg:string,instruction:string) {
  const st=svgToStructure(svg), partition=/主卧/.test(instruction)&&/卫生间/.test(instruction);
  if(!partition && !(/客厅|客餐厅/.test(instruction)&&/阳台/.test(instruction)&&/推拉门/.test(instruction)))throw new Error("EDIT_INSTRUCTION_NOT_SUPPORTED:当前实验支持主卧内新增卫生间，或客厅与阳台之间新增推拉门；其他操作尚未验收，原图未改动");
  const target=partition ? st.rooms.find(r=>r.semantic==='master_bedroom') : undefined;
  if(partition&&!target)throw new Error("EDIT_TARGET_MASTER_BEDROOM_NOT_FOUND");
  const shared=st.walls.flatMap(w=>{
    const axis=w.start[1]===w.end[1]?0:1,cross=1-axis, intervals:{start:Point;end:Point;rooms:(string|null)[]}[]=[];
    const len=w.end[axis]-w.start[axis];
    for(let from=0;from+.8<=len;from+=.1){
      const a=[...w.start] as Point,b=[...w.start] as Point;a[axis]+=from;b[axis]+=from+.8;
      const ids=roomsBeside(st,a,b),sems=ids.map(id=>st.rooms.find(r=>r.id===id)?.semantic);
      if(!sems.includes('living_room')||!sems.includes('balcony'))continue;
      if([...st.doors,...st.windows].some(o=>o.wallId===w.id && from<o.distance+o.width/2+.12&&from+.8>o.distance-o.width/2-.12))continue;
      if(intervals.length&&intervals.at(-1)!.end[axis]>=a[axis])intervals.at(-1)!.end[axis]=b[axis];else intervals.push({start:a,end:b,rooms:ids});
    }
    return intervals.map(i=>({wallId:w.id,...i}));
  });
  if(!partition&&!shared.length)throw new Error("EDIT_NO_FREE_LIVING_BALCONY_WALL:现有开口已占满共墙或两区域没有共墙，不能叠加重复门洞");
  return {st,partition,target,context:{unit:"meter",axes:"x向右，y向下；只能用下面的米坐标，不能使用 SVG 像素",targetRoomId:target?.id,rooms:st.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.id===target?.id?r.polygon:undefined})),walls:partition?st.walls.filter(w=>target!.polygon.some(p=>distance(p,w.start,w.end)<.25)):st.walls.filter(w=>shared.some(s=>s.wallId===w.id)),openings:[...st.doors,...st.windows],freeLivingBalconySpans:shared}};
}
const escape = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Shared SVG diff renderer; callers must validate the complete transaction. */
export function appendSvgAdditions(svg:string, additions:Addition[], id:string) {
  const st=svgToStructure(svg), co=st.coordinates;
  const segments=additions.filter(a=>a.type!=='label').map(a=>({a,...(()=>{const [p,q]=ends(a);return{p,q}})()}));
  const labels=additions.filter(a=>a.type==='label');
  const source=(p:Point):Point=>[p[0]/co.metersPerUnitX+co.minX,p[1]/co.metersPerUnitY+co.minY];
  const fmt=(v:number)=>String(Math.round(v*1000)/1000),parts:string[]=[];
  const thickX=.12/co.metersPerUnitX,thickY=.12/co.metersPerUnitY;
  for(let i=0;i<segments.length;i++){
    const {a,p,q}=segments[i],[x1,y1]=source(p),[x2,y2]=source(q),h=p[1]===q[1],w=Math.abs(x2-x1),height=Math.abs(y2-y1),tag=`${id}-${i}`;
    if(a.type==='wall')parts.push(`<rect id="${tag}" x="${fmt(Math.min(x1,x2)-(h?0:thickX/2))}" y="${fmt(Math.min(y1,y2)-(h?thickY/2:0))}" width="${fmt(h?w:thickX)}" height="${fmt(h?thickY:height)}" fill="#9a9a9a"/>`);
    else{
      parts.push(`<rect id="${tag}-clear" x="${fmt(Math.min(x1,x2)-(h?0:thickX))}" y="${fmt(Math.min(y1,y2)-(h?thickY:0))}" width="${fmt(h?w:thickX*2)}" height="${fmt(h?thickY*2:height)}" fill="white"/>`);
      if(a.type==='door'){const doorWidth=Math.hypot(p[0]-q[0],p[1]-q[1]);parts.push(`<path id="${tag}" d="M${fmt(x1)},${fmt(y1)} L${fmt(h?x1:x1-doorWidth/co.metersPerUnitX)},${fmt(h?y1+doorWidth/co.metersPerUnitY:y1)} A${fmt(doorWidth/co.metersPerUnitX)},${fmt(doorWidth/co.metersPerUnitY)} 0 0 0 ${fmt(x2)},${fmt(y2)} Z" stroke="#2e9e4f" fill="none" stroke-width="${fmt(.015/co.metersPerUnitX)}"/>`);}
      else if(a.type==='sliding-door')for(const sign of [-1,1])parts.push(`<line id="${tag}-${sign}" x1="${fmt(x1+(h?0:sign*.02/co.metersPerUnitX))}" y1="${fmt(y1+(h?sign*.02/co.metersPerUnitY:0))}" x2="${fmt(x2+(h?0:sign*.02/co.metersPerUnitX))}" y2="${fmt(y2+(h?sign*.02/co.metersPerUnitY:0))}" stroke="#d64545" stroke-width="1"/>`);
      else throw new Error("EDIT_TYPE_NOT_SUPPORTED_FOR_THIS_TRANSACTION");
    }
  }
  for(const l of labels){const[x,y]=source([l.x!,l.y!]);parts.push(`<g id="${id}-label" data-kind="room-labels"><g id="${id}-new-room"><text x="${fmt(x)}" y="${fmt(y)}" font-size="${fmt(.18/co.metersPerUnitY)}" text-anchor="middle">${escape(String(l.text))}</text></g></g>`);}
  return svg.replace(/<\/svg>\s*$/,`<g id="${escape(id)}">${parts.join('\n')}</g>\n</svg>`);
}

/** Validate a diff transaction completely before exposing a modified SVG. */
export function applySvgEdits(svg:string,instruction:string,additions:Addition[]) {
  const c=svgEditContext(svg,instruction),{st,target}=c,co=st.coordinates;
  if(!Array.isArray(additions)||!additions.length||additions.length>8)throw new Error("EDIT_ADDITIONS_INVALID");
  const walls=additions.filter(a=>a.type==='wall'),doors=additions.filter(a=>a.type==='door'),labels=additions.filter(a=>a.type==='label');
  const segments=additions.filter(a=>a.type!=='label').map(a=>({a,...(()=>{const [p,q]=ends(a);return{p,q}})()}));
  if(c.partition){
    if(walls.length!==2||doors.length!==1||labels.length!==1||additions.length!==4)throw new Error("EDIT_PARTITION_REQUIRES_2_WALLS_1_DOOR_1_LABEL");
    for(const w of walls) {const [a,b]=ends(w);for(let i=0;i<=100;i++)if(!contains([a[0]+(b[0]-a[0])*i/100,a[1]+(b[1]-a[1])*i/100],target!.polygon))throw new Error("EDIT_WALL_OUTSIDE_TARGET_ROOM");}
    const [p,q]=ends(doors[0]);
    if(Math.abs(Math.hypot(q[0]-p[0],q[1]-p[1])-.75)>.02)throw new Error("EDIT_DOOR_WIDTH_MUST_BE_0_75M");
    if(!walls.some(w=>{const[a,b]=ends(w);return distance(p,a,b)<.02&&distance(q,a,b)<.02;}))throw new Error("EDIT_DOOR_NOT_ON_NEW_WALL");
    const nl=labels[0];if(![nl.x,nl.y].every(v=>typeof v==='number'&&Number.isFinite(v))||!pointInPolygon([nl.x!,nl.y!],target!.polygon)||!String(nl.text).includes('卫生间'))throw new Error("EDIT_LABEL_OUTSIDE_TARGET_ROOM");
  }else{
    if(additions.length!==1||additions[0].type!=='sliding-door')throw new Error("EDIT_SLIDING_REQUIRES_EXACTLY_ONE_SLIDING_DOOR");
    const[a,b]=ends(additions[0]);
    if(!c.context.freeLivingBalconySpans.some(s=>distance(a,s.start,s.end)<.02&&distance(b,s.start,s.end)<.02))throw new Error("EDIT_SLIDING_OUTSIDE_FREE_SHARED_BOUNDARY");
  }
  let original=svg;
  if(c.partition){
    // Only the target room's label is migrated. Dimension text and other room
    // labels cannot be selected by this code, irrespective of their position.
    const poly=target!.polygon,nl:Point=[labels[0].x!,labels[0].y!],xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
    const candidates:Point[]=[];
    for(let ix=1;ix<20;ix++)for(let iy=1;iy<20;iy++){const p:Point=[Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*ix/20,Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*iy/20];if(!pointInPolygon(p,poly)||onBoundary(p,poly,.25)||walls.some(w=>{const[a,b]=ends(w);return distance(p,a,b)<.25;}))continue;candidates.push(p);}
    candidates.sort((a,b)=>Math.hypot(b[0]-nl[0],b[1]-nl[1])-Math.hypot(a[0]-nl[0],a[1]-nl[1]));
    if(!candidates.length)throw new Error("EDIT_NO_REMAINING_MASTER_LABEL_POSITION");
    const sourceLabel=target!.sourceLabel; // 用户要求：不移动原房间标签，保持原位
    // 不移动原房间标签
    // 不删除原面积文字（保持主卧面积标注原位）}
  }
  const output=appendSvgAdditions(original,additions,`edit-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
  const next=svgToStructure(output);
  if(next.rooms.length!==st.rooms.length+(c.partition?1:0)||next.doors.length!==st.doors.length+1||next.windows.length!==st.windows.length)throw new Error("EDIT_TOPOLOGY_COUNT_MISMATCH");
  const newRoom=c.partition?next.rooms.at(-1):undefined;
  if(newRoom){
    const remained=next.rooms.find(r=>r.id===target!.id);
    if(!remained||remained.semantic!=='master_bedroom'||polygonArea(newRoom.polygon)<1||polygonArea(remained.polygon)<4)throw new Error("EDIT_TARGET_PARTITION_AREA_OR_SEMANTIC_INVALID");
    if(newRoom.polygon.some(p=>!contains(p,target!.polygon)))throw new Error("EDIT_NEW_ROOM_OUTSIDE_ORIGINAL_TARGET");
    const [a,b]=ends(doors[0]),beside=roomsBeside(next,a,b);
    if(!beside.includes(newRoom.id)||!beside.includes(target!.id))throw new Error("EDIT_NEW_BATHROOM_DOOR_NOT_REACHABLE_FROM_MASTER");
    for(const o of st.doors){const wall=st.walls.find(w=>w.id===o.wallId)!;const dx=wall.end[0]-wall.start[0],dy=wall.end[1]-wall.start[1],len=Math.hypot(dx,dy),p:Point=[wall.start[0]+dx/len*o.distance,wall.start[1]+dy/len*o.distance];const adjacent=roomsBeside(st,[p[0]-dx/len*.2,p[1]-dy/len*.2],[p[0]+dx/len*.2,p[1]+dy/len*.2]);if(adjacent.includes(target!.id)&&roomsBeside(next,[p[0]-dx/len*.2,p[1]-dy/len*.2],[p[0]+dx/len*.2,p[1]+dy/len*.2]).includes(newRoom.id))throw new Error("EDIT_EXISTING_MASTER_ENTRY_CAPTURED_BY_NEW_BATHROOM");}
  }
  const tol=3*Math.max(co.metersPerUnitX,co.metersPerUnitY)*co.gridUnit;
  for(const r of st.rooms.filter(r=>r.id!==target?.id)){
    const n=next.rooms.find(n=>n.id===r.id);
    if(!n||n.name!==r.name||Math.abs(polygonArea(n.polygon)-polygonArea(r.polygon))>.03)throw new Error(`EDIT_UNRELATED_ROOM_CHANGED:${r.name}`);
    if(r.polygon.some(p=>!contains(p,n.polygon)&&!onBoundary(p,n.polygon,tol)))throw new Error(`EDIT_UNRELATED_BOUNDARY_CHANGED:${r.name}`);
  }
  return {svg:output,additions,structure:next,validation:{valid:true,unit:'meter',targetRoomId:target?.id,checks:['target-polygon','room-count','door-host','door-reachability','existing-entry','unrelated-rooms'],warnings:next.warnings}};
}

/** Geometry proposals, not applied edits. The real model selects a proposal
 * and emits its explicit diff; every returned diff is checked again. */
export function partitionCandidates(svg:string,instruction:string){
  const {target}=svgEditContext(svg,instruction);if(!target)return [];
  const p=target.polygon,xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),out:{id:string;additions:Addition[];newArea:number;remainingArea:number}[]=[];
  const ray=(q:Point,axis:number,sign:number):Point|null=>{
    const cross=1-axis,hits:number[]=[];
    for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(a[axis]!==b[axis])continue;if(q[cross]<Math.min(a[cross],b[cross])||q[cross]>Math.max(a[cross],b[cross]))continue;const delta=(a[axis]-q[axis])*sign;if(delta>0)hits.push(a[axis]);}
    hits.sort((a,b)=>Math.abs(a-q[axis])-Math.abs(b-q[axis]));if(!hits.length)return null;const point=[...q] as Point;point[axis]=hits[0];return point;
  };
  for(const [sx,sy]of [[1,-1],[-1,-1],[1,1],[-1,1]]){
    const q:Point=[sx>0?Math.max(...xs)-1.5:Math.min(...xs)+1.5,sy>0?Math.max(...ys)-1.5:Math.min(...ys)+1.5];
    if(!pointInPolygon(q,p))continue;
    const a=ray(q,1,sy),b=ray(q,0,sx);if(!a||!b||Math.abs(a[1]-q[1])<1.1||Math.abs(b[0]-q[0])<1.1)continue;
    const middle=(a[1]+q[1])/2;
    const additions:Addition[]=[{type:'wall',x1:a[0],y1:a[1],x2:q[0],y2:q[1]},{type:'wall',x1:q[0],y1:q[1],x2:b[0],y2:b[1]},{type:'door',x1:q[0],y1:middle-.375,x2:q[0],y2:middle+.375},{type:'label',x:(q[0]+b[0])/2,y:middle,text:'卫生间'}];
    try{const r=applySvgEdits(svg,instruction,additions);out.push({id:`corner-${sx>0?'east':'west'}-${sy>0?'south':'north'}`,additions,newArea:r.structure.rooms.at(-1)!.expectedArea,remainingArea:r.structure.rooms.find(r=>r.id===target.id)!.expectedArea});}catch{/* Not a feasible proposal; never weaken validation to include it. */}
  }
  return out;
}
