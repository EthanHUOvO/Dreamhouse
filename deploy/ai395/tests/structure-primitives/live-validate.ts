/** Validate saved REAL HTTP/MCP responses; never replace them with a rebuild.
 * The only compiler calls occur inside the existing save/restore test, after
 * the original returned SceneGraph has passed the production host guards. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {assertStructureSceneMatches,assertStructureSceneUsable,preserveStructureSourceFurniture} from '/app/lib/ai/structure-scene-validation';
import {verifySaveRestore,clone} from '../bedroom-edit/assertions';
const evidence=process.env.PRIMITIVES_EVIDENCE||'/evidence',run=process.env.PRIMITIVES_LIVE_RUN||'live-primitives-run3';
const sourceDir=path.join(evidence,'live-primitives-run1'),caseDir=path.join(evidence,run);
const sourceSvg=fs.readFileSync(path.join(sourceDir,'source.svg'),'utf8'),source=JSON.parse(fs.readFileSync(path.join(sourceDir,'source-scene.json'),'utf8')),before=svgToStructure(sourceSvg);
const sourceJson=JSON.stringify(source),results:any[]=[];let failed=0;
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
function check(name:string,fn:()=>unknown){try{const result=fn();results.push({name,status:'PASS',result});console.log('PASS',name);}catch(e:any){failed++;results.push({name,status:'FAIL',error:e.message,stack:e.stack});console.log('FAIL',name,e.message);}}
check('original_real_MCP_source_matches_source_SVG',()=>{assertStructureSceneMatches(source,before);return{sceneSha256:hash(sourceJson),sourceSvgSha256:hash(sourceSvg),mocked:false};});
for(const key of (process.env.PRIMITIVES_CASES||'merge,move,multi,study,bedroom').split(',')){
 const file=(suffix:string)=>path.join(caseDir,key+suffix);
 let response:any,record:any,svg:string,scene:any,after:any;
 check(`${key}_actual_inference_and_actual_MCP_response`,()=>{
  response=JSON.parse(fs.readFileSync(file('-response.json'),'utf8'));record=JSON.parse(fs.readFileSync(file('.json'),'utf8'));svg=fs.readFileSync(file('.svg'),'utf8');scene=JSON.parse(fs.readFileSync(file('-scene.json'),'utf8'));after=svgToStructure(svg);
  assert.equal(record.httpStatus,200);assert.equal(record.actualInference,true);assert.equal(response.provenance.actualInference,true);assert.ok(response.provenance.inference.length>=2);assert.ok(response.provenance.inference.every((x:any)=>x.model&&x.responseId));assert.equal(record.mcp.httpStatus,200);assert.equal(record.mcp.complete,true);assert.equal(record.mcp.validation.valid,true);assert.deepEqual(record.mcp.error,[]);assert.deepEqual(record.mcp.tools,['begin_floorplan_scene','set_floor_structure','set_openings','populate_basic_furniture','validate_scene','commit_scene']);if(record.png){assert.equal(record.png.width,1024);assert.ok(record.png.height>128);}assertStructureSceneMatches(scene,after);
  return{model:response.provenance.model,inferenceStages:response.provenance.inference.map((x:any)=>({stage:x.stage,responseId:x.responseId,elapsedMs:x.elapsedMs})),actualMcpTools:record.mcp.tools,png:record.png||'NOT_RECORDED_BY_OLDER_RUNNER',svgSha256:hash(svg),actualSceneSha256:hash(JSON.stringify(scene)),recompiledReplacement:false};
 });
 if(!scene||!response?.validation)continue;
 const originalScene=JSON.stringify(scene);let defaultAccepted=false;
 check(`${key}_default_actual_scene_host_guard`,()=>{const result=assertStructureSceneUsable(scene,before,after,response.validation);defaultAccepted=true;assert.equal(JSON.stringify(scene),originalScene,'guard modified actual MCP scene');return{outcome:'ACCEPTED',...result};});
 if(defaultAccepted)check(`${key}_accepted_default_V1_V2_save_restore`,()=>({guardOutcome:'ACCEPTED',sceneSource:'actual-http-mcp',...verifySaveRestore('one-option-01',sourceSvg,svg,source,scene)}));
 let preserved:any,accepted=false;
 check(`${key}_preserve_actual_source_furniture_without_moving`,()=>{
  preserved=preserveStructureSourceFurniture(scene,source,before,after,response.validation);const sourceItems=Object.values(source.nodes).filter((x:any)=>x.type==='item') as any[];
  for(const item of sourceItems){const expected=clone(item);expected.metadata.room_id=response.validation.roomIdMap?.[item.metadata.room_id]||item.metadata.room_id;assert.deepEqual(preserved.nodes[item.id],expected,item.id+' changed');}
  assert.equal(JSON.stringify(scene),originalScene);assert.equal(JSON.stringify(source),sourceJson);return{sourceItemIds:sourceItems.map(x=>x.id),sourceCount:sourceItems.length,moved:false};
 });
 if(preserved)check(`${key}_preserved_source_host_guard`,()=>{
  try{const result=assertStructureSceneUsable(preserved,before,after,response.validation,source);accepted=true;return{outcome:'ACCEPTED',...result};}
  catch(e:any){if(!['study','bedroom'].includes(key))throw e;assert.match(e.message,/STRUCTURE_SCENE_INVALID.*(?:边界冲突|碰撞|阻断|阻挡)/);return{outcome:'SAFE_REJECTION_REQUIRES_STEP3_MANUAL_FURNITURE_ADJUSTMENT',reason:e.message,committed:false,testPassDoesNotMeanEditAccepted:true};}
 });
 if(accepted)check(`${key}_accepted_preserved_V1_V2_save_restore`,()=>({guardOutcome:'ACCEPTED',sceneSource:'actual-http-mcp-with-production-source-preservation',...verifySaveRestore('one-option-01',sourceSvg,svg,source,preserved)}));
 check(`${key}_actual_candidate_and_source_not_mutated`,()=>{assert.equal(JSON.stringify(scene),originalScene);assert.equal(JSON.stringify(source),sourceJson);});
}
check('actual_two_step_failure_publishes_no_intermediate_svg',()=>{
 const negativeDir=fs.existsSync(path.join(caseDir,'negative-multi-response.json'))?caseDir:path.join(evidence,'live-primitives-run2');
 const d=JSON.parse(fs.readFileSync(path.join(negativeDir,'negative-multi-response.json'),'utf8')),record=JSON.parse(fs.readFileSync(path.join(negativeDir,'negative-multi.json'),'utf8'));
 assert.equal(record.httpStatus,422);assert.equal(d.provenance.actualInference,true);assert.equal(d.rolledBack,true);assert.equal(d.completedOperationCount,1);assert.equal(d.failedOperationId,'op2');assert.ok(!('svg' in d));assert.ok(!JSON.stringify(d).includes('<svg'));return{httpStatus:422,completedOperationCount:1,failedOperationId:d.failedOperationId,rolledBack:true,publishedIntermediateSvg:false};
});
const report={kind:'REAL_AI_HTTP_AND_REAL_MCP_SCENE_WITH_PRODUCTION_GUARDS',timestamp:new Date().toISOString(),run,summary:{pass:results.length-failed,fail:failed},results,limitations:['No image-generation model was called. Text inference is real; SVG geometry tools and Pascal MCP compile the structure.','PASS on a safe-rejection test means rollback worked, not that the requested edit was committed.','The actual MCP candidate scenes were never replaced with reconstructed scenes to make the host guard pass.','Sunlight, ventilation, load-bearing suitability and construction compliance remain unverified.']};
fs.mkdirSync(caseDir,{recursive:true});fs.writeFileSync(path.join(caseDir,'live-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));process.exitCode=failed?1:0;
