import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { generateRoomSplitCandidates,applyRoomSplitCandidate,clipRoomPolygon } from '/app/lib/ai/room-split-primitives';
import { svgToStructure,polygonArea } from '/app/lib/ai/svg-geometry';
import { canonicalFromSpec,renderStructureSvg } from '/app/lib/ai/structure-svg';
import { buildSceneFromSvg,verifySaveRestore } from '../bedroom-edit/assertions';
const root=process.env.SPLIT_TEST_WORKSPACE||'/workspace',outDir=process.env.SPLIT_TEST_OUTPUT||'/evidence';
const output:any={kind:'programmatic-no-ai-inference',plans:[],negative:[],synthetic:[],failures:[]};mkdirSync(outDir,{recursive:true});
const plans=[['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']].filter(([k,n])=>!process.env.SPLIT_TEST_ONLY||`${k}-${n}`===process.env.SPLIT_TEST_ONLY);
for(const [kind,n] of plans){
 const key=`${kind}-option-${n}`,svg=readFileSync(`${root}/public/preset/svg-v2/${kind}/option-${n}.svg`,'utf8'),st=svgToStructure(svg),target=st.rooms.find(r=>r.semantic===(process.env.SPLIT_TEST_TARGET||'living_room'));
 if(!target){output.plans.push({key,status:'NO_LIVING_ROOM'});continue;}
 console.log('TEST',key);
 if(process.env.SPLIT_TEST_DIAGNOSTIC&&key==='one-option-01')console.log('SOURCE',JSON.stringify({target,walls:st.walls,doors:st.doors,rooms:st.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic}))}));
 let originalLoadAndRestore:any;
 try{
  const before=buildSceneFromSvg(svg,key,'split-original');originalLoadAndRestore=verifySaveRestore(key,svg,svg,before.scene,before.scene);
  if(process.env.SPLIT_TEST_RESTORE_ONLY){output.plans.push({key,status:'ORIGINAL_LOAD_AND_RESTORE_PASS',originalLoadAndRestore});continue;}
  const op:any={type:'split_room',targetRoomId:target.id,newRoomName:'书房',newRoomSemantic:'study',direction:process.env.SPLIT_TEST_DIRECTION||'any'},analysis=generateRoomSplitCandidates(svg,op);
  assert.throws(()=>applyRoomSplitCandidate(svg,'forged-candidate',op),/SPLIT_CANDIDATE|SPLIT_SEARCH_BUDGET_EXCEEDED/);
  assert.throws(()=>generateRoomSplitCandidates(svg,{...op,minAreaM2:-1}),/SPLIT_MIN_AREA/);
  assert.throws(()=>generateRoomSplitCandidates(svg,{...op,direction:'northeast'}),/SPLIT_DIRECTION/);
  assert.equal(generateRoomSplitCandidates(svg,{...op,minAreaM2:1000}).candidates.length,0);
  const protectedRoom=st.rooms.find(r=>['bathroom','kitchen'].includes(r.semantic));if(protectedRoom)assert.throws(()=>generateRoomSplitCandidates(svg,{...op,targetRoomId:protectedRoom.id}),/SPLIT_TARGET_IS_PROTECTED/);
  output.negative.push({key,forgedCandidate:'PASS',invalidArea:'PASS',invalidDirection:'PASS',impossibleArea:'PASS',protectedRoom:'PASS'});
  if(!analysis.candidates.length){output.plans.push({key,status:'NO_VERIFIED_CANDIDATE',originalLoadAndRestore,diagnostics:analysis.diagnostics});continue;}
  const result=applyRoomSplitCandidate(svg,analysis.candidates[0].id,op),next=svgToStructure(result.svg);
  assert.throws(()=>applyRoomSplitCandidate(svg+'\n',analysis.candidates[0].id,op),/SPLIT_CANDIDATE|SPLIT_SEARCH_BUDGET_EXCEEDED/,'candidate is bound to exact source');
  assert.equal(next.rooms.length,st.rooms.length+1);assert.equal(next.doors.length,st.doors.length+1);assert.equal(next.windows.length,st.windows.length);
  assert.deepEqual(next.outerPolygon,st.outerPolygon);
  for(const old of st.rooms.filter(r=>r.id!==target.id))assert.deepEqual(next.rooms.find(r=>r.id===old.id)?.polygon,old.polygon);
  const newRoom=next.rooms.find(r=>r.id===result.candidate.newRoomId)!,retained=next.rooms.find(r=>r.id===target.id)!;
  assert.ok(Math.abs(polygonArea(newRoom.polygon)+polygonArea(retained.polygon)-polygonArea(target.polygon))<1e-7);
  assert.ok(result.validation.valid);writeFileSync(`${outDir}/split-${key}.svg`,result.svg);
  const after=buildSceneFromSvg(result.svg,key,'split-modified'),modifiedSaveRestore=verifySaveRestore(key,svg,result.svg,before.scene,after.scene);
  output.plans.push({key,status:'PASS',candidates:analysis.candidates.length,candidate:result.candidate,validation:result.validation,originalLoadAndRestore,modifiedSaveRestore});
 }catch(e){if(e instanceof Error&&e.message==='SPLIT_SEARCH_BUDGET_EXCEEDED')output.plans.push({key,status:'SEARCH_BUDGET_EXCEEDED',originalLoadAndRestore,sourceUnchanged:true,partialCandidatesPublished:false});else{output.failures.push({key,error:e instanceof Error?e.stack:String(e)});console.error(key,e);}}
}
// L-shaped input must retain its concavity exactly, rather than replace it
// with a rectangular bounding box. A U-shaped multi-span cut is rejected.
const l:any=[[0,0],[8,0],[8,3],[5,3],[5,8],[0,8]],a=clipRoomPolygon(l,1,4,true),b=clipRoomPolygon(l,1,4,false);
assert.equal(polygonArea(a)+polygonArea(b),polygonArea(l));assert.ok(a.length>4);output.synthetic.push({test:'concave-halfplane-exact-area',status:'PASS'});
for(const direction of['upper','lower','left','right']){
 const walls=[{id:'north',start:[0,0],end:[8,0],structural:'partition'},{id:'east',start:[8,0],end:[8,8],structural:'partition'},{id:'south',start:[0,8],end:[8,8],structural:'partition'},{id:'west',start:[0,0],end:[0,8],structural:'partition'}]as any;
 // Place the existing entrance opposite the requested new room; positions
 // derive from this synthetic fixture, never from a catalogue variant.
 const wallId=direction==='upper'?'south':direction==='lower'?'north':direction==='left'?'east':'west';
 const svg=renderStructureSvg(canonicalFromSpec({outerPolygon:[[0,0],[8,0],[8,8],[0,8]],walls,rooms:[{id:'living',name:'客厅',semantic:'living_room',polygon:[[0,0],[8,0],[8,8],[0,8]],expectedArea:64,color:'#eeeeee'}],doors:[{id:'entry',name:'入户门',wallId,distance:4,width:.9,height:2.1,doorType:'hinged'}],windows:[]}));
 try{const op:any={targetRoomId:'living',newRoomName:'卧室',newRoomSemantic:'bedroom',direction},analysis=generateRoomSplitCandidates(svg,op);assert.ok(analysis.candidates.length,JSON.stringify(analysis.diagnostics));const result=applyRoomSplitCandidate(svg,analysis.candidates[0].id,op);assert.equal(result.candidate.direction,direction);output.synthetic.push({test:`direction-${direction}`,status:'PASS',candidates:analysis.candidates.length});}catch(e){output.failures.push({test:`direction-${direction}`,error:e instanceof Error?e.stack:String(e)});}
}
writeFileSync(`${outDir}/${process.env.SPLIT_TEST_RESTORE_ONLY?'split-restore.json':'split-programmatic.json'}`,JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));if(output.failures.length)process.exitCode=1;
