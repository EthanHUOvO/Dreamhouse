import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {validateSvgModelPlan,planSvgModel} from '/app/lib/ai/svg-model-plan';
async function main(){
 const st=svgToStructure(readFileSync('/workspace/public/preset/svg-v2/one/option-01.svg','utf8'));
 const plan:any={steps:['set_floor_structure','set_openings','populate_basic_furniture','validate_scene','commit_scene']};
 for(const key of ['rooms','walls','doors','windows'] as const)plan[key]=st[key].map(v=>v.id);
 assert.deepEqual(validateSvgModelPlan(plan,st),plan);
 for(const key of ['rooms','walls','doors','windows']){const bad=structuredClone(plan);bad[key].pop();assert.throws(()=>validateSvgModelPlan(bad,st),/COVERAGE/);}
 const duplicate=structuredClone(plan);duplicate.rooms[1]=duplicate.rooms[0];assert.throws(()=>validateSvgModelPlan(duplicate,st),/COVERAGE/);
 const invented=structuredClone(plan);invented.walls[0]='invented';assert.throws(()=>validateSvgModelPlan(invented,st),/COVERAGE/);
 assert.throws(()=>validateSvgModelPlan({...plan,steps:[...plan.steps].reverse()},st),/STEPS/);
 const chat:any=async(request:any,options:any)=>{assert.equal(options.stage,'svg-model3d-plan');assert.match(request.messages[1].content,/confirmed-test-hash/);return {id:'CONTROLLED_STUB',model:'TEST_ONLY',choices:[{message:{tool_calls:[{type:'function',function:{name:'plan_svg_scene',arguments:JSON.stringify(plan)}}]}}]};};
 const result=await planSvgModel(st,'confirmed-test-hash',undefined,chat);assert.equal(result.provenance.responseId,'CONTROLLED_STUB');assert.equal(result.provenance.sourceImageHash,'confirmed-test-hash');
 await assert.rejects(()=>planSvgModel(st,'hash',undefined,async()=>{throw new Error('network-failure')}),/network-failure/);
 const abort=new AbortController();abort.abort();await assert.rejects(()=>planSvgModel(st,'hash',abort.signal,async()=>{throw new Error('must-not-call')}));
 console.log('PASS complete plan, missing/duplicate/invented entities, stage order, request hash, network failure, cancellation; CONTROLLED STUB NOT REAL AI');
}
main();
