import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bathroomPartitionCandidates,applyBathroomPartition} from '/app/lib/ai/bathroom-edit-geometry';
import {partitionCandidates} from '/app/lib/ai/svg-edit-geometry';
import {validateSvgModelPlan,planSvgModel} from '/app/lib/ai/svg-model-plan';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {buildSceneFromSvg,verifySaveRestore} from './assertions';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
async function main(){
const results:any[]=[];
const fixture=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9000 11000"><path fill="#9a9a9a" fill-rule="evenodd" d="M500 500 H8500 V10500 H4900 V10300 H8300 V700 H700 V10300 H4100 V10500 H500 Z"/><rect x="4100" y="10300" width="800" height="200" fill="white"/><path id="entry" d="M4100,10400 L4100,9600 A800,800 0 0 0 4900,10400 Z" stroke="#2e9e4f" fill="none"/><text x="4500" y="5500">主卧</text><text x="4500" y="5800">76.44 m²</text></svg>`;
for(const region of ['upper','lower','left','right','upper-left','upper-right','lower-left','lower-right'] as const){
 const candidates=bathroomPartitionCandidates(fixture,region);assert.ok(candidates.length,'synthetic bathroom '+region);
 for(const c of candidates){assert.ok(c.position===region||c.position.split('-').includes(region));const edit=applyBathroomPartition(fixture,c.id,region);assert.equal(edit.validation.valid,true);}
 console.log('PASS synthetic bathroom',region);
}

for(const [k,n] of [['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']]){
 const id=`${k}-${n}`,svg=readFileSync(`/workspace/public/preset/svg-v2/${k}/option-${n}.svg`,'utf8');
 const candidates=bathroomPartitionCandidates(svg),before=buildSceneFromSvg(svg,id,'before');
 const rows=[];
 for(const c of candidates){
  const edit=applyBathroomPartition(svg,c.id,c.position),after=buildSceneFromSvg(edit.svg,id,'after');
  verifySaveRestore(id,svg,edit.svg,before.scene,after.scene);
  let scene='PASS';try{assertBedroomSceneUsable(after.scene,before.structure,edit.validation.targetRoomId!,edit.validation.newRoomId,undefined,'bathroom')}catch(e:any){scene=e.message}
  rows.push({id:c.id,position:c.position,scene});
  const opposite=c.position.startsWith('upper')?'lower':'upper';
  assert.throws(()=>applyBathroomPartition(svg,c.id,opposite));
 }
 const row={id,legacy:partitionCandidates(svg,'在主卧内新增卫生间').map(c=>c.id),candidates:rows};results.push(row);console.log(JSON.stringify(row));
}
const svg=readFileSync('/workspace/public/preset/svg-v2/one/option-01.svg','utf8'),st=svgToStructure(svg);
const plan={steps:['set_floor_structure','set_openings','populate_basic_furniture','validate_scene','commit_scene'],...Object.fromEntries(['rooms','walls','doors','windows'].map(k=>[k,(st as any)[k].map((v:any)=>v.id)]))};
validateSvgModelPlan(plan,st);
assert.throws(()=>validateSvgModelPlan({...plan,rooms:[]},st),/COVERAGE/);
assert.throws(()=>validateSvgModelPlan({...plan,walls:['fake']},st),/COVERAGE/);
assert.throws(()=>validateSvgModelPlan({...plan,steps:plan.steps.slice(1)},st),/STEPS/);
assert.throws(()=>validateSvgModelPlan({...plan,skipValidation:true},st),/INVALID/);
let calls=0;
const ai=await planSvgModel(st,'test-hash',undefined,async()=>{calls++;return{model:'CONTROLLED-NOT-AI',choices:[{message:{tool_calls:[{function:{name:'plan_svg_scene',arguments:JSON.stringify(plan)}}]}}]}});
assert.equal(calls,1);assert.equal(ai.provenance.sourceImageHash,'test-hash');
const abort=new AbortController();abort.abort();await assert.rejects(planSvgModel(st,'hash',abort.signal));
writeFileSync('/evidence/split-geometry.json',JSON.stringify({kind:'PROGRAMMATIC_CONTROLLED_NO_REAL_AI',results,modelPlanChecks:6},null,2));

}
main().catch(e=>{console.error(e);process.exitCode=1});
