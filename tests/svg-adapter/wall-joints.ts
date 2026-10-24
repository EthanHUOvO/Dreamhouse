import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {sceneToFloorplanBlueprint,compileBlueprintToPascal,blueprintWallCoordinateError} from '/app/lib/floorplans/blueprint';
import * as session from '/app/services/pascal-mcp/session-store';
import {calculateLevelMiters} from '/app/node_modules/@pascal-app/core/dist/systems/wall/wall-mitering.js';
const root='/workspace',dir=`${root}/tests/svg-adapter/results/wall-joints-20261020`;
const fixture=JSON.parse(readFileSync(`${root}/tests/svg-adapter/wall-joints-baseline.json`,'utf8'));
type P=[number,number];type W={id:string;start:P;end:P};
const half=.06;
function bounds(w:W){return [0,1].map(i=>[Math.min(w.start[i],w.end[i])-(w.start[i]===w.end[i]?half:0),Math.max(w.start[i],w.end[i])+(w.start[i]===w.end[i]?half:0)]);}
function endCapGap(w:W,p:P,other:W){const axis=w.start[1]===w.end[1]?0:1,b=bounds(other);return Math.hypot(...[0,1].map(i=>Math.max(0,b[i][0]-p[i]-(i===axis?0:half),p[i]-(i===axis?0:half)-b[i][1])));}
function obstruction(o:any,walls:W[]){const w=walls.find(w=>w.id===o.wallId)!;const len=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]),d=w.end.map((v,i)=>(v-w.start[i])/len),c=w.start.map((v,i)=>v+d[i]*o.distance);return {centre:c,blocked:Array.from({length:19},(_,j)=>{const p=c.map((v,i)=>v+d[i]*o.width*((j+1)/20-.5));return walls.some(v=>v!==w&&bounds(v).every(([lo,hi],i)=>p[i]>=lo-1e-8&&p[i]<=hi+1e-8));})};}
function check(key:string,svg:string,baseline?:any){
 const st=svgToStructure(svg),unjoined:any[]=[],terminals:any[]=[];
 for(const w of st.walls)for(const p of [w.start,w.end]){
  const gap=Math.min(...st.walls.filter(v=>v!==w).map(v=>endCapGap(w,p,v)));
  const apertureTerminal=st.windows.some(o=>o.wallId===w.id&&Math.abs((p===w.start?o.distance-o.width/2:o.distance+o.width/2-Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1])))<1e-7);
  if(gap>1e-7)(apertureTerminal?terminals:unjoined).push({wall:w.id,point:p,gapM:gap});
 }
 assert.deepEqual(unjoined,[],`${key}: unfilled structural wall end caps`);
 const openingReport=[];
 if(baseline)for(const b of baseline.openings){
  const o=[...st.doors,...st.windows].find(o=>o.id===b.id)!;assert.ok(o,b.id);assert.equal(o.width,b.width,b.id);
  const now=obstruction(o,st.walls),movement=Math.hypot(...now.centre.map((v,i)=>v-b.centre[i]));
  assert.ok(movement<=Math.max(st.coordinates.metersPerUnitX,st.coordinates.metersPerUnitY)*3+1e-8,`${key}/${b.id}: opening moved ${movement}`);
  const introduced=now.blocked.flatMap((blocked,i)=>blocked&&!b.blockedSamples[i]?[i]:[]);
  // A physical corner post may now meet a bay window at right angles; its
  // glazing may span past the post. Doors retain every previously clear sample;
  // windows must retain at least their previous clear span, including removal
  // of the duplicate solid host behind the old virtual aperture.
  if(b.kind==='doors')assert.deepEqual(introduced,[],`${key}/${b.id}: newly blocked door samples`);
  else assert.ok(now.blocked.filter(Boolean).length<=b.blockedSamples.filter(Boolean).length,`${key}/${b.id}: reduced clear window span`);
  openingReport.push({id:b.id,beforeBlocked:b.blockedSamples.filter(Boolean).length,afterBlocked:now.blocked.filter(Boolean).length,movementM:movement});
 }
 const id=`wall-joints-${key}-${Date.now()}`,hash='wall-joints-source';let r=session.beginFloorplanScene({sessionId:id,sourceImageHash:hash,sourceImage:key});const identity=()=>({sessionId:id,sourceImageHash:hash,revision:r.revision});
 r=session.setFloorStructure({...identity(),...st,sourceSvg:svg,geometrySource:'svg-deterministic/v1'});r=session.setOpenings({...identity(),doors:st.doors,windows:st.windows});r=session.populateBasicFurniture(identity());r=session.validateScene(identity());assert.equal(r.validation.valid,true,JSON.stringify(r.validation));r=session.commitScene(identity());
 const bp=sceneToFloorplanBlueprint(r.scene!),restored=compileBlueprintToPascal(bp);assert.equal(blueprintWallCoordinateError(restored,bp),0);assert.deepEqual(bp.rooms.map(r=>r.polygon),st.rooms.map(r=>r.polygon));
 const nodes=Object.values(restored.nodes) as any[],walls=nodes.filter(n=>n.type==='wall'),native=calculateLevelMiters(walls);
 assert.ok(native.junctions.size>0);
 for(const o of [...st.doors,...st.windows]){const node=restored.nodes[o.id];assert.ok(node);assert.equal(node.width,o.width);}
 return {key,status:'PASS',rooms:st.rooms.length,walls:st.walls.length,doors:st.doors.length,windows:st.windows.length,unjoinedStructuralEnds:unjoined.length,nativeJunctions:native.junctions.size,apertureTerminals:terminals,openings:openingReport};
}
const output:any={kind:'programmatic-no-model-inference',baselineCommit:fixture.commit,plans:[],savedAiEdits:[]};
for(const baseline of fixture.plans){const[g,n]=baseline.key.split('-');const r=check(baseline.key,readFileSync(`${root}/public/preset/svg-v2/${g}/option-${n}.svg`,'utf8'),baseline);output.plans.push(r);console.log(r.key,'PASS',r.walls,'walls',r.nativeJunctions,'native joints');}
const saved=JSON.parse(readFileSync(`${root}/tests/svg-adapter/results/real-ai.json`,'utf8'));
for(const r of saved.results.filter((r:any)=>r.status==='PASS')){const key=`${r.key}-${r.kind}`;output.savedAiEdits.push(check(key,readFileSync(`${root}/tests/svg-adapter/results/${key}.svg`,'utf8')));console.log(key,'PASS (replayed saved AI output, no inference)');}
mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/geometry.json`,JSON.stringify(output,null,2));console.log(JSON.stringify({status:'PASS',plans:output.plans.length,savedAiEdits:output.savedAiEdits.length}));
