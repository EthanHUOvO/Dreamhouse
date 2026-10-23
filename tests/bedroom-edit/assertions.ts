import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {svgToStructure, parseSvg, pointInPolygon, polygonArea} from '/app/lib/ai/svg-geometry';
import * as mcp from '/app/services/pascal-mcp/session-store';
import {sceneToFloorplanBlueprint, sceneToBoundVariantBlueprint, compileBlueprintToPascal, validateVariantBlueprint, blueprintWallCoordinateError} from '/app/lib/floorplans/blueprint';
import {saveVariantDesign, loadSavedVariantDesign, createDefaultCalibration} from '/app/lib/floorplans/variant-persistence';
import {floorplanModelBinding, restoreBoundModelSession} from '/app/lib/ai/model3d-binding';
import {packModelSession, unpackModelSession} from '/app/lib/ai/inline-image-persistence';
import {selectedSvgSource} from '/app/lib/ai/svg-version';
import {assertPascalSceneIntegrity} from '/app/lib/pascal/scene-integrity';
import {DoorNode} from '/app/node_modules/@pascal-app/core/dist/schema/nodes/door.js';
import {isWalkthroughPositionBlocked,doorWorldXZ} from '/app/lib/walkthrough-runtime';

export const clone = (value:any) => JSON.parse(JSON.stringify(value));
export const hash = (text:string) => createHash('sha256').update(text).digest('hex');
type Point = [number,number];
type Structure = ReturnType<typeof svgToStructure>;
const near = (a:number,b:number,tolerance=1e-6) => Math.abs(a-b)<=tolerance;
function segmentDistance(p:Point,a:Point,b:Point) {
 const dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
 const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length2||1)));
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function insideOrBoundary(p:Point,polygon:Point[],tolerance=.04) {
 return pointInPolygon(p,polygon)||polygon.some((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length])<=tolerance);
}
function openingWorld(st:Structure,opening:any) {
 const wall=st.walls.find(w=>w.id===opening.wallId)!;assert.ok(wall,opening.id+': host missing');
 const length=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]);
 assert.ok(opening.width>0&&opening.distance>=opening.width/2-.001&&opening.distance+opening.width/2<=length+.001,opening.id+': invalid span');
 return {center:wall.start.map((v,i)=>v+(wall.end[i]-v)*opening.distance/length) as Point,width:opening.width,doorType:opening.doorType};
}
function verifySourceExterior(originalSvg:string,outputSvg:string,before:Structure,after:Structure) {
 const nodes=parseSvg(originalSvg),sourceWalls=nodes.find(n=>n.attrs.id==='walls');
 assert.ok(sourceWalls,'source wall group missing');
 assert.ok(outputSvg.includes(originalSvg.slice(sourceWalls.start,sourceWalls.end)),'source wall drawing bytes changed');
 const gridM=before.coordinates.gridUnit*Math.max(before.coordinates.metersPerUnitX,before.coordinates.metersPerUnitY),maxDelta=.12/2+gridM;
 const boundaryDistance=(p:Point,poly:Point[])=>Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])));
 if(JSON.stringify(before.outerPolygon)===JSON.stringify(after.outerPolygon))return{sourceWallBytesPreserved:true,exactDerivedOutline:true,maxAllowedLocalDeltaM:maxDelta,symmetricDifferenceM2:0};
 // SVG flood-fill/Voronoi extraction can shift the centre-line polygon at a
 // new T junction. Accept only cells at independently located new junctions;
 // unchanged source exterior bytes and all unrelated rooms remain mandatory.
 const newWalls=after.walls.filter(w=>Array.from({length:11},(_,i)=>[w.start[0]+(w.end[0]-w.start[0])*i/10,w.start[1]+(w.end[1]-w.start[1])*i/10] as Point).some(p=>before.walls.every(old=>segmentDistance(p,old.start,old.end)>.05)));
 const joints=newWalls.flatMap(w=>[w.start,w.end]).filter(p=>boundaryDistance(p,before.outerPolygon)<=maxDelta);
 assert.ok(joints.length,'changed exterior without a new T junction');
 const xs=[...new Set([...before.outerPolygon,...after.outerPolygon].map(p=>p[0]))].sort((a,b)=>a-b),zs=[...new Set([...before.outerPolygon,...after.outerPolygon].map(p=>p[1]))].sort((a,b)=>a-b);
 let difference=0,maxObservedDelta=0;
 for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++) {
  const p:Point=[(xs[i-1]+xs[i])/2,(zs[j-1]+zs[j])/2];
  if(pointInPolygon(p,before.outerPolygon)===pointInPolygon(p,after.outerPolygon))continue;
  assert.ok(joints.some(q=>Math.abs(p[0]-q[0])<=.12+gridM&&Math.abs(p[1]-q[1])<=.12+gridM),'exterior difference outside a new T-junction neighbourhood');
  difference+=(xs[i]-xs[i-1])*(zs[j]-zs[j-1]);
 }
 for(const [a,b] of [[before.outerPolygon,after.outerPolygon],[after.outerPolygon,before.outerPolygon]])for(const p of a) {
  const d=boundaryDistance(p,b);maxObservedDelta=Math.max(maxObservedDelta,d);assert.ok(d<=maxDelta+1e-6,'exterior delta exceeds half partition thickness plus one source grid');
 }
 assert.ok(difference<=joints.length*(.12+2*gridM)*maxDelta,'exterior area difference exceeds local junction envelope');
 return{sourceWallBytesPreserved:true,exactDerivedOutline:false,maxAllowedLocalDeltaM:maxDelta,maxObservedDeltaM:maxObservedDelta,symmetricDifferenceM2:difference,newTJunctions:joints};
}

/** Independent geometric assertions, reusable on the SVG returned by a real AI call.
 * No expected image, candidate snapshot or model response is used as the oracle. */
export function verifyBedroomStructure(originalSvg:string,outputSvg:string,targetRoomId?:string) {
 const before=svgToStructure(originalSvg),after=svgToStructure(outputSvg);
 const target=before.rooms.find(r=>r.id===targetRoomId)||before.rooms.find(r=>r.semantic==='living_room');
 assert.ok(target,'source living room missing');
 const added=after.rooms.filter(r=>!before.rooms.some(o=>o.id===r.id));
 assert.equal(added.length,1,'exactly one new room');
 assert.equal(after.rooms.length,before.rooms.length+1);
 const bedroom=added[0];assert.equal(bedroom.semantic,'bedroom','new room must have bedroom semantics');
 assert.match(bedroom.name,/卧室/);
 const remaining=after.rooms.find(r=>r.id===target.id)!;assert.ok(remaining);
 assert.equal(remaining.semantic,'living_room');
 assert.ok(near(Number(bedroom.sourceArea),polygonArea(bedroom.polygon),.006),'new bedroom printed area must match measured area');
 assert.ok(near(Number(remaining.sourceArea),polygonArea(remaining.polygon),.006),'remaining living printed area must match measured area');
 assert.ok(polygonArea(bedroom.polygon)>=6-.03,'new bedroom area below configured design minimum');
 assert.ok(polygonArea(remaining.polygon)>4,'remaining living room vanished');
 // Verify the whole polygon and edge samples are inside the original concave room.
 for(let i=0;i<bedroom.polygon.length;i++) {
  const a=bedroom.polygon[i],b=bedroom.polygon[(i+1)%bedroom.polygon.length];
  for(let k=0;k<=20;k++)assert.ok(insideOrBoundary([a[0]+(b[0]-a[0])*k/20,a[1]+(b[1]-a[1])*k/20],target.polygon),'bedroom outside source living polygon');
 }
 const yMid=(Math.min(...bedroom.polygon.map(p=>p[1]))+Math.max(...bedroom.polygon.map(p=>p[1])))/2;
 const originalMid=(Math.min(...target.polygon.map(p=>p[1]))+Math.max(...target.polygon.map(p=>p[1])))/2;
 assert.ok(yMid<originalMid,'new bedroom must be in the upper living region');
 const exterior=verifySourceExterior(originalSvg,outputSvg,before,after);
 const unchanged=[];
 for(const room of before.rooms.filter(r=>r.id!==target.id)) {
  const next=after.rooms.find(r=>r.id===room.id)!;assert.ok(next,room.id+' missing');
  assert.equal(next.name,room.name);assert.equal(next.semantic,room.semantic);
  assert.equal(next.sourceArea,room.sourceArea,'unrelated printed area changed: '+room.name);
  assert.deepEqual(next.polygon,room.polygon,'unrelated room boundary changed: '+room.name);
  unchanged.push(room.name);
 }
 assert.equal(after.doors.length,before.doors.length+1);
 assert.equal(after.windows.length,before.windows.length);
 for(const [field,openings] of [['doors',before.doors],['windows',before.windows]] as const) {
  for(const opening of openings) {
   const next=after[field].find(o=>o.sourceGlyph===opening.sourceGlyph)!;assert.ok(next,opening.sourceGlyph+' disappeared');
   const oldWorld=openingWorld(before,opening),newWorld=openingWorld(after,next);
   assert.ok(oldWorld.center.every((v,i)=>near(v,newWorld.center[i],.025)),opening.id+': world center changed');
   assert.ok(near(oldWorld.width,newWorld.width),opening.id+': width changed');
   assert.equal(oldWorld.doorType,newWorld.doorType);
  }
 }
 // Existing wall centre lines may be split/merged by SVG extraction; their
 // physical coverage must remain. Compare geometry, never generated wall IDs.
 for(const wall of before.walls)for(let k=0;k<=30;k++) {
  const p:Point=[wall.start[0]+(wall.end[0]-wall.start[0])*k/30,wall.start[1]+(wall.end[1]-wall.start[1])*k/30];
  assert.ok(after.walls.some(w=>segmentDistance(p,w.start,w.end)<=.045),'original wall coverage lost: '+wall.id);
 }
 return {before,after,target,bedroom,remaining,summary:{targetRoomId:target.id,newRoomId:bedroom.id,newAreaM2:polygonArea(bedroom.polygon),remainingAreaM2:polygonArea(remaining.polygon),unchangedRooms:unchanged,originalOpeningsPreserved:true,originalWallCoveragePreserved:true,exterior}};
}

let serial=0;
export function buildSceneFromSvg(svg:string,variantId:string,label:string) {
 const structure=svgToStructure(svg),sessionId=`bedroom-${variantId}-${label}-${++serial}`,sourceImageHash=hash(svg);
 let state=mcp.beginFloorplanScene({sessionId,sourceImageHash,sourceImage:`/${variantId}-${label}.svg`});
 const identity=()=>({sessionId,sourceImageHash,revision:state.revision});
 state=mcp.setFloorStructure({...identity(),...structure,sourceSvg:svg,geometrySource:'svg-deterministic/v1',scaleMethod:'drawing-dimensions'});
 state=mcp.setOpenings({...identity(),doors:structure.doors,windows:structure.windows});
 state=mcp.populateBasicFurniture(identity());state=mcp.validateScene(identity());
 assert.equal(state.validation.valid,true,JSON.stringify(state.validation));
 state=mcp.commitScene(identity());
 const scene=state.scene!,verified=verifySceneMatchesSvg(svg,scene);
 return {state,scene,bp:verified.bp,structure};
}

/** Validate an existing scene without reconstructing or replacing it. */
export function verifySceneMatchesSvg(svg:string,scene:any) {
 const structure=svgToStructure(svg),bp=sceneToFloorplanBlueprint(scene);
 assert.equal(assertPascalSceneIntegrity(scene).valid,true);
 assert.equal(validateVariantBlueprint(bp).valid,true);
 assert.deepEqual(bp.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.polygon})),structure.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.polygon})),'2D/3D rooms differ');
 assert.deepEqual(bp.walls,structure.walls,'2D/3D walls differ');
 assert.equal(blueprintWallCoordinateError(scene,bp),0);
 for(const field of ['doors','windows'] as const)for(const opening of structure[field]) {
  const stored=bp[field].find(o=>o.id===opening.id)!;assert.ok(stored);
  assert.equal(stored.hostWallId,opening.wallId);assert.equal(stored.width,opening.width);
  assert.ok(near(stored.offset+stored.width/2,opening.distance));
 }
 for(const node of Object.values(scene.nodes) as any[])if(node.type==='door') {
  assert.ok(node.position[1]-node.height/2>=-.001,node.id+': door below floor');
  assert.equal(DoorNode.safeParse(node).success,true,node.id+': Pascal door schema');
 }
 assert.deepEqual(bp.outerPolygon,structure.outerPolygon,'2D/3D external outline differs');
 return {scene,bp,structure};
}

/** Compare actual door adjacency produced by the Pascal compiler. */
export function verifyDoorGraph(before:any,after:any,targetRoomId:string,newRoomId:string) {
 for(const door of before.doors) {
  const next=after.doors.find((d:any)=>d.id===door.id);assert.ok(next);
  assert.deepEqual([...next.connects].sort(),[...door.connects].sort(),'original door adjacency changed: '+door.id);
 }
 const added=after.doors.filter((d:any)=>!before.doors.some((o:any)=>o.id===d.id));
 assert.equal(added.length,1);
 assert.deepEqual([...added[0].connects].sort(),[targetRoomId,newRoomId].sort(),'new door must join bedroom directly to living room');
 const reachable=(bp:any)=>{
  const seen=new Set<string>([targetRoomId]);let changed=true;
  while(changed){changed=false;for(const door of bp.doors){const ids=door.connects.filter(Boolean);if(ids.some((id:string)=>seen.has(id)))for(const id of ids)if(!seen.has(id)){seen.add(id);changed=true;}}}
  return seen;
 };
 const oldReachable=reachable(before),nextReachable=reachable(after);
 for(const room of oldReachable)assert.ok(nextReachable.has(room),'room disconnected: '+room);
 assert.ok(nextReachable.has(newRoomId));
 const external=before.doors.filter((d:any)=>d.connects.includes(targetRoomId)&&d.connects.includes(null));
 // An external living opening is the source-derived entrance; don't invent an
 // entry for a drawing whose entrance semantics cannot be established.
 return {newDoorId:added[0].id,newDoorRooms:added[0].connects,reachableRooms:[...nextReachable],sourceReachableRooms:[...oldReachable],externalLivingOpeningIds:external.map((d:any)=>d.id)};
}

/** Check the actual Pascal assets' transformed dimensions, then use the live
 * walkthrough collision function to find an entrance-to-bedroom walking path. */
export function verifyFurnishedAccess(beforeScene:any,scene:any,bp:any,beforeStructure:Structure,targetRoomId:string,newRoomId:string,newDoorId:string) {
 const items=Object.values(scene.nodes).filter((n:any)=>n.type==='item') as any[];
 const footprints=items.map(item=>{
  assert.ok(item.asset?.dimensions?.length===3&&item.scale?.length===3,item.id+': furniture footprint UNKNOWN');
  const width=item.asset.dimensions[0]*Math.abs(item.scale[0]),depth=item.asset.dimensions[2]*Math.abs(item.scale[2]),yaw=item.rotation?.[1]||0,c=Math.cos(yaw),s=Math.sin(yaw);
  const polygon=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,z])=>[item.position[0]+x*c+z*s,item.position[2]-x*s+z*c] as Point);
  return {item,polygon,width,depth};
 });
 const overlaps=(a:Point[],b:Point[])=>{
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++) {
   const p=polygon[i],q=polygon[(i+1)%polygon.length],axis:Point=[-(q[1]-p[1]),q[0]-p[0]],pa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),pb=b.map(p=>p[0]*axis[0]+p[1]*axis[1]);
   if(Math.max(...pa)<=Math.min(...pb)+1e-6||Math.max(...pb)<=Math.min(...pa)+1e-6)return false;
  }
  return true;
 };
 const newWalls=bp.walls.filter((wall:any)=>{
  const center:Point=[(wall.start[0]+wall.end[0])/2,(wall.start[1]+wall.end[1])/2];
  return !beforeStructure.walls.some(w=>segmentDistance(center,w.start,w.end)<.05);
 });
 assert.ok(newWalls.length>0,'no new Pascal partition wall');
 for(const wall of newWalls) {
  const length=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]),half=Number(wall.thickness||.12)/2,nx=-(wall.end[1]-wall.start[1])/length*half,nz=(wall.end[0]-wall.start[0])/length*half;
  const polygon:Point[]=[[wall.start[0]+nx,wall.start[1]+nz],[wall.end[0]+nx,wall.end[1]+nz],[wall.end[0]-nx,wall.end[1]-nz],[wall.start[0]-nx,wall.start[1]-nz]];
  for(const {item,polygon:footprint} of footprints)assert.ok(!overlaps(polygon,footprint),'default furniture crosses new wall: '+item.id+' / '+wall.id);
 }
 for(const {item,polygon} of footprints.filter(({item})=>item.metadata?.room_id===newRoomId)) {
  const room=bp.rooms.find((r:any)=>r.id===newRoomId);assert.ok(polygon.every(p=>insideOrBoundary(p,room.polygon,.01)),item.id+': bedroom furniture outside room');
 }
 const protectedFurniture=items.filter(item=>![targetRoomId,newRoomId].includes(item.metadata?.room_id));
 for(const item of protectedFurniture) {
  const before=beforeScene.nodes[item.id];assert.ok(before,item.id+': unrelated furniture identity changed');
  assert.deepEqual(item.position,before.position,item.id+': unrelated furniture moved');
  assert.deepEqual(item.rotation,before.rotation);assert.deepEqual(item.scale,before.scale);
 }
 const living=bp.rooms.find((r:any)=>r.id===targetRoomId),bedroom=bp.rooms.find((r:any)=>r.id===newRoomId),openDoors=new Set<string>(bp.doors.map((d:any)=>d.id));
 const x0=Math.min(...living.polygon.map((p:Point)=>p[0]),...bedroom.polygon.map((p:Point)=>p[0])),x1=Math.max(...living.polygon.map((p:Point)=>p[0]),...bedroom.polygon.map((p:Point)=>p[0]));
 const z0=Math.min(...living.polygon.map((p:Point)=>p[1]),...bedroom.polygon.map((p:Point)=>p[1])),z1=Math.max(...living.polygon.map((p:Point)=>p[1]),...bedroom.polygon.map((p:Point)=>p[1]));
 const step=.08,nx=Math.ceil((x1-x0)/step)+1,nz=Math.ceil((z1-z0)/step)+1,point=(i:number):Point=>[x0+i%nx*step,z0+Math.floor(i/nx)*step];
 const free=Array.from({length:nx*nz},(_,i)=>{const p=point(i);return(pointInPolygon(p,living.polygon)||pointInPolygon(p,bedroom.polygon)||bp.doors.some((d:any)=>{if(!d.connects.includes(targetRoomId)||!d.connects.includes(newRoomId))return false;const center=doorWorldXZ(scene,scene.nodes[d.id]);return center&&Math.hypot(p[0]-center.x,p[1]-center.z)<.4;}))&&!isWalkthroughPositionBlocked(scene,p[0],p[1],openDoors,.22);});
 const nearIndex=(p:Point,room:any)=>{
  let best=-1,dist=.45;
  for(let i=0;i<free.length;i++){if(!free[i])continue;const q=point(i),d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<dist&&pointInPolygon(q,room.polygon)){dist=d;best=i;}}
  return best;
 };
 const newDoorCenter=doorWorldXZ(scene,scene.nodes[newDoorId])!;assert.ok(newDoorCenter);
 const end=nearIndex([newDoorCenter.x,newDoorCenter.z],bedroom);assert.ok(end>=0,'bedroom door approach blocked by default furniture');
 const entrances=bp.doors.filter((d:any)=>d.connects.includes(targetRoomId)&&d.connects.includes(null));
 assert.ok(entrances.length,'entry opening UNKNOWN: no source external living opening');
 const paths=[];
 for(const entry of entrances) {
  const center=doorWorldXZ(scene,scene.nodes[entry.id])!,start=nearIndex([center.x,center.z],living);assert.ok(start>=0,'entry approach blocked: '+entry.id);
  const previous=new Int32Array(free.length).fill(-2),queue=[start];previous[start]=-1;
  for(let cursor=0;cursor<queue.length&&previous[end]===-2;cursor++) {
   const current=queue[cursor],x=current%nx,z=Math.floor(current/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const xx=x+dx,zz=z+dz,next=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!free[next]||previous[next]!==-2)continue;
    previous[next]=current;queue.push(next);
   }
  }
  assert.notEqual(previous[end],-2,'furnished walk from entry to bedroom blocked: '+entry.id+' '+JSON.stringify({start:point(start),end:point(end),visited:queue.length,closest:queue.map(point).sort((a,b)=>Math.hypot(a[0]-point(end)[0],a[1]-point(end)[1])-Math.hypot(b[0]-point(end)[0],b[1]-point(end)[1]))[0]}));
  const path:Point[]=[];for(let i=end;i>=0;i=previous[i])path.push(point(i));path.reverse();
  paths.push({entryId:entry.id,pathMeters:path,walkRadiusM:.22,gridStepM:step});
 }
 return {newWallCount:newWalls.length,furnitureFootprints:footprints.map(({item,width,depth})=>({id:item.id,roomId:item.metadata.room_id,widthM:width,depthM:depth})),noFurnitureNewWallCollision:true,unrelatedDefaultFurnitureUnchanged:protectedFurniture.length,paths};
}

/** Exercises the actual session serializer and strict variant storage. */
export function verifySaveRestore(variantId:string,originalSvg:string,modifiedSvg:string,beforeScene:any,afterScene:any) {
 const versions=[originalSvg,modifiedSvg].map((svg,i)=>({id:`v${i+1}`,sourceVariantId:variantId,sourceImageHash:hash(svg),svgSource:svg,submittedRequirement:i?'在客餐厅上侧新增一个卧室':'原始户型',result:{provider:'qwen',model:'svg-edit',url:`/${variantId}-v${i+1}.png`,sourceVariantId:variantId,sourceImageHash:hash(svg),userPrompt:i?'在客餐厅上侧新增一个卧室':'原始户型',geometryVerified:true}}));
 const scenes=[clone(beforeScene),clone(afterScene)],snapshots:any[]=[],results=[];
 const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}};
 for(let i=0;i<versions.length;i++) {
  const version=versions[i],scene=scenes[i],binding=floorplanModelBinding(variantId,version.result,version.id)!;
  Object.assign(scene.nodes.building_house.metadata,{variantId,modelBinding:binding,sourceDrawing:binding.canonicalImageUrl});
  const bp=sceneToBoundVariantBlueprint(scene,binding),calibration=createDefaultCalibration(variantId,bp,true),namespace=`bedroom-${variantId}-${version.id}`;
  saveVariantDesign(variantId,bp,calibration,storage,namespace);
  const record=loadSavedVariantDesign(variantId,storage,namespace)!;assert.ok(record);
  const compiled=compileBlueprintToPascal(record.blueprint),round=sceneToFloorplanBlueprint(compiled);
  for(const field of ['walls','rooms','doors','windows','furniture'])assert.deepEqual(round[field],bp[field],version.id+':'+field);
  const saved={selectedVariant:{variantId,imageUrl:`/preset/${variantId}.svg`},floorplanVersions:versions,selectedFloorplanVersionId:version.id,generatedFloorplan:version.result,currentPascalScene:scene,floorPlanConfirmed:true,model3DLoaded:true,modelGenerationPhase:'completed',confirmedBinding:binding,modelBinding:binding,customRequirement:version.submittedRequirement,editDraft:'一个不可行的未提交新要求',currentStep:3,sceneRevision:i+1};
  const persisted=unpackModelSession(JSON.parse(JSON.stringify(packModelSession(saved))));
  const restored=restoreBoundModelSession(persisted);
  assert.equal(restored.modelLoaded,true);assert.deepEqual(restored.scene,scene);
  assert.equal(persisted.editDraft,saved.editDraft,'unsubmitted draft must survive without invalidating committed scene');
  assert.equal(selectedSvgSource(persisted.floorplanVersions,version.id,variantId,originalSvg),version.svgSource);
  snapshots.push(saved);results.push({version:version.id,rooms:bp.rooms.length,exactSceneRestored:true,exactSvgRestored:true});
 }
 for(let i=0;i<2;i++) {
  const wrong=restoreBoundModelSession({...snapshots[i],currentPascalScene:scenes[1-i]});assert.equal(wrong.modelLoaded,false,'wrong V1/V2 scene accepted');
 }
 assert.throws(()=>selectedSvgSource([{...versions[1],svgSource:undefined}],'v2',variantId,originalSvg),'missing V2 SVG must not silently use V1');
 // Invalid saves must leave the last valid persisted scene unchanged.
 const namespace=`bedroom-${variantId}-v2`,beforeMemory=JSON.stringify([...memory]),bad=sceneToBoundVariantBlueprint(scenes[1],snapshots[1].modelBinding);
 bad.doors.at(-1)!.width=0;
 assert.throws(()=>saveVariantDesign(variantId,bad,createDefaultCalibration(variantId,bad,true),storage,namespace));
 assert.equal(JSON.stringify([...memory]),beforeMemory);
 return {versions:results,wrongVersionRejected:true,missingVersionSvgRejected:true,invalidSavePreservedPrevious:true,unsubmittedDraftPreservedCommittedScene:true};
}
