import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {verifySceneMatchesSvg,buildSceneFromSvg,verifySaveRestore} from './assertions';
const out='/evidence/live-release',rows:any[]=[];
for(const name of readdirSync(out).filter(f=>f.endsWith('.json')&&!f.endsWith('-scene.json'))){
 const record=JSON.parse(readFileSync(`${out}/${name}`,'utf8')),key=record.key;
 if(!key)continue;
 if(record.httpStatus!==200){rows.push({key,status:'SAFE_REJECT',error:record.error,actualInference:record.provenance?.actualInference});continue;}
 const [k,n]=(record.sourceKey||key).split('-'),original=readFileSync(`/workspace/public/preset/svg-v2/${k}/option-${n}.svg`,'utf8');
 const row:any={key,status:'FAIL',actualInference:record.provenance?.actualInference,step2Ms:record.elapsedMs};
 try{
  const edited=readFileSync(`${out}/${key}.svg`,'utf8'),scene=JSON.parse(readFileSync(`${out}/${key}-scene.json`,'utf8'));
  const ai=scene.nodes.building_house.metadata.svgModelPlan;
  assert.equal(ai.provenance.actualInference,true);assert.ok(ai.provenance.responseId);row.ai3d={model:ai.provenance.model,responseId:ai.provenance.responseId,elapsedMs:ai.provenance.elapsedMs,promptTokens:ai.provenance.usage?.prompt_tokens};
  verifySceneMatchesSvg(edited,scene);row.sceneMatchesSvg='PASS';
  row.guard=assertBedroomSceneUsable(scene,svgToStructure(original),record.validation.targetRoomId,record.validation.newRoomId,undefined,record.intent.action==='add_bathroom'?'bathroom':'bedroom');
  const baseline=buildSceneFromSvg(original,key,'before');verifySaveRestore(key,original,edited,baseline.scene,scene);row.saveRestore='PASS';row.status='PASS';
 }catch(e:any){row.error=e.message;row.status='REJECT_AT_STEP3';}
 rows.push(row);console.log(JSON.stringify({key:row.key,status:row.status,error:row.error,ai3d:row.ai3d}));
}
writeFileSync('/evidence/live-split-validation.json',JSON.stringify({kind:'INDEPENDENT_CHECK_OF_ACTUAL_AI_HTTP_OUTPUT_NOT_NEW_INFERENCE',rows},null,2));
