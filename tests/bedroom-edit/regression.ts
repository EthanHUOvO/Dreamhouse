import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {bedroomEditContext,bedroomPartitionAnalysis,applyBedroomPartition} from '/app/lib/ai/bedroom-edit-geometry';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {verifyBedroomStructure,buildSceneFromSvg,verifyDoorGraph,verifyFurnishedAccess,verifySaveRestore,hash,clone} from './assertions';

const root=process.env.BEDROOM_TEST_WORKSPACE||'/workspace',outDir=process.env.BEDROOM_TEST_OUTPUT||'/evidence';
const output:any={kind:'programmatic-no-ai-inference',timestamp:new Date().toISOString(),plans:[],negative:[],failures:[],limitations:['Geometry is a design preview, not building-code compliance.','NO_FEASIBLE_PLAN means this bounded candidate search found no verified layout; it does not prove architectural impossibility.','SVG input has no furniture; Step3 furniture in these tests is the existing default-furniture generator. Existing manually placed furniture preservation is not proved by this suite.','No text or image model is invoked by this suite.']};
mkdirSync(outDir,{recursive:true});
const plans=[['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']];
for(const [kind,n] of plans) {
 const variantId=`${kind}-option-${n}`,svg=readFileSync(`${root}/public/preset/svg-v2/${kind}/option-${n}.svg`,'utf8'),originalHash=hash(svg),started=performance.now();
 console.log(`TEST ${variantId}`);
 try {
  const before=buildSceneFromSvg(svg,variantId,'v1');
  const context=bedroomEditContext(svg),analysis=bedroomPartitionAnalysis(svg),candidates=analysis.candidates;
  assert.ok(Array.isArray(candidates));
  assert.throws(()=>applyBedroomPartition(svg,'not-a-generated-candidate'),'unrecognised candidate must fail closed');
  assert.equal(hash(svg),originalHash);output.negative.push({variantId,test:'forged-candidate-source-unchanged',status:'PASS'});
  if(!candidates.length) {
   assert.notEqual(variantId,'one-option-01','required initial plan has no valid bedroom partition: '+JSON.stringify(analysis.diagnostics));
   const preserved=verifySaveRestore(variantId,svg,svg,before.scene,before.scene);
   output.plans.push({variantId,status:'NO_FEASIBLE_PLAN',safeFailure:'PASS',candidates:0,diagnostics:analysis.diagnostics,sourceUnchanged:hash(svg)===originalHash,originalLoadAndRestore:preserved,elapsedMs:performance.now()-started});
   continue;
  }
  const candidate=candidates[0],edited=applyBedroomPartition(svg,candidate.id),geometry=verifyBedroomStructure(svg,edited.svg,candidate.targetRoomId);
  assert.equal(hash(svg),originalHash,'successful planning must not mutate source');
  const after=buildSceneFromSvg(edited.svg,variantId,'v2');
  const graph=verifyDoorGraph(before.bp,after.bp,geometry.target.id,geometry.bedroom.id);
  const furnished=verifyFurnishedAccess(before.scene,after.scene,after.bp,geometry.before,geometry.target.id,geometry.bedroom.id,graph.newDoorId);
  const hostGuard=assertBedroomSceneUsable(after.scene,geometry.before,geometry.target.id,geometry.bedroom.id);
  const sunk=clone(after.scene);sunk.nodes[graph.newDoorId].position[1]=-1;
  assert.throws(()=>assertBedroomSceneUsable(sunk,geometry.before,geometry.target.id,geometry.bedroom.id),/BEDROOM_SCENE_DOOR_BELOW_FLOOR/);
  const noDimensions=clone(after.scene),item:any=Object.values(noDimensions.nodes).find((n:any)=>n.type==='item');delete item.asset.dimensions;
  assert.throws(()=>assertBedroomSceneUsable(noDimensions,geometry.before,geometry.target.id,geometry.bedroom.id),/BEDROOM_SCENE_FURNITURE_UNKNOWN/);
  const collision=clone(after.scene),wall=edited.additions.find(a=>a.type==='wall'&&Math.hypot(a.x2!-a.x1!,a.y2!-a.y1!)>.5)!,sofa:any=Object.values(collision.nodes).find((n:any)=>n.type==='item'&&n.metadata?.furniture_asset_key==='sofa');
  sofa.position=[(wall.x1!+wall.x2!)/2,0,(wall.y1!+wall.y2!)/2];
  assert.throws(()=>assertBedroomSceneUsable(collision,geometry.before,geometry.target.id,geometry.bedroom.id),/BEDROOM_SCENE_FURNITURE_COLLISION/);
  if(variantId==='one-option-01') {
   const bottomSvg=readFileSync(`${root}/tests/bedroom-edit/fixtures/one01-bottom-door.svg`,'utf8'),bottom=buildSceneFromSvg(bottomSvg,variantId,'negative-bottom-door'),bottomGeometry=verifyBedroomStructure(svg,bottomSvg,candidate.targetRoomId);
   assert.throws(()=>assertBedroomSceneUsable(bottom.scene,geometry.before,geometry.target.id,bottomGeometry.bedroom.id),/BEDROOM_SCENE_ENTRANCE_PATH_BLOCKED/,'known default-sofa obstruction must fail closed');
   assert.equal(hash(svg),originalHash);output.negative.push({variantId,test:'actual-default-furniture-blocked-bottom-door',status:'PASS'});
   for(const constraints of [{region:'lower'},{preserveEntrance:false},{targetRoomId:'room_unknown'},{protectedRoomIds:[geometry.target.id]},{minAreaM2:-1}])assert.throws(()=>bedroomPartitionAnalysis(svg,constraints as any),'unsafe or unknown constraints rejected');
   assert.equal(bedroomPartitionAnalysis(svg,{minAreaM2:1000}).candidates.length,0,'unattainable requested area must not be weakened');
   output.negative.push({variantId,test:'unsafe-constraints-and-unattainable-area',status:'PASS'});
  }
  const persisted=verifySaveRestore(variantId,svg,edited.svg,before.scene,after.scene);
  assert.throws(()=>applyBedroomPartition(edited.svg,candidate.id),'candidate must be bound to its exact source SVG');
  const altered=svg.replace(/(<svg[^>]*>)/,'$1\n<!-- changed source -->');
  assert.throws(()=>applyBedroomPartition(altered,candidate.id),'even same geometry with new source must reject old candidate');
  output.negative.push({variantId,test:'stale-candidate-and-invalid-save',status:'PASS'});
  writeFileSync(`${outDir}/${variantId}-bedroom.svg`,edited.svg);
  writeFileSync(`${outDir}/${variantId}-scene.json`,JSON.stringify(after.scene,null,2));
  const alternatives=[];
  for(const alternative of candidates.slice(1)) {
   const changed=applyBedroomPartition(svg,alternative.id),g=verifyBedroomStructure(svg,changed.svg,alternative.targetRoomId),compiled=buildSceneFromSvg(changed.svg,variantId,alternative.id),door=verifyDoorGraph(before.bp,compiled.bp,g.target.id,g.bedroom.id);
   verifyFurnishedAccess(before.scene,compiled.scene,compiled.bp,g.before,g.target.id,g.bedroom.id,door.newDoorId);
   assertBedroomSceneUsable(compiled.scene,g.before,g.target.id,g.bedroom.id);
   verifySaveRestore(variantId,svg,changed.svg,before.scene,compiled.scene);
   alternatives.push({candidateId:alternative.id,status:'PASS',newAreaM2:alternative.newAreaM2,geometryMcpFurnitureAccessAndRestore:true});
  }
  output.plans.push({variantId,status:'PASS',candidateCount:candidates.length,candidate,alternatives,geometry:geometry.summary,doorGraph:graph,furnished,hostGuard,saveRestore:persisted,validation:edited.validation,sourceSha256:originalHash,outputSha256:hash(edited.svg),elapsedMs:performance.now()-started});
 } catch(error:any) {
  output.plans.push({variantId,status:'FAIL',error:error.message,stack:error.stack,elapsedMs:performance.now()-started});
  output.failures.push({variantId,error:error.message});console.error(variantId+': '+error.message);
 }
}
output.summary={pass:output.plans.filter((p:any)=>p.status==='PASS').length,noFeasible:output.plans.filter((p:any)=>p.status==='NO_FEASIBLE_PLAN').length,fail:output.failures.length};
writeFileSync(`${outDir}/programmatic.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify({kind:output.kind,summary:output.summary,plans:output.plans.map(({variantId,status,candidateCount,error,elapsedMs}:any)=>({variantId,status,candidateCount,error,elapsedMs}))},null,2));
process.exitCode=output.failures.length?1:0;
