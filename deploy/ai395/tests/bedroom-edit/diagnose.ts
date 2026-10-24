import {readFileSync,writeFileSync} from 'node:fs';
import {bedroomPartitionAnalysis,applyBedroomPartition} from '/app/lib/ai/bedroom-edit-geometry';
import {verifyBedroomStructure,buildSceneFromSvg,verifyDoorGraph,verifyFurnishedAccess,clone} from './assertions';
const variantId='one-option-01',svg=readFileSync('/workspace/public/preset/svg-v2/one/option-01.svg','utf8'),analysis=bedroomPartitionAnalysis(svg),before=buildSceneFromSvg(svg,variantId,'baseline');
const output:any={kind:'programmatic-diagnostic-no-AI',analysis,plans:[]};
for(const [i,candidate] of analysis.candidates.entries()) {
 const edited=applyBedroomPartition(svg,candidate.id),geometry=verifyBedroomStructure(svg,edited.svg,candidate.targetRoomId),after=buildSceneFromSvg(edited.svg,variantId,'candidate-'+i);
 const graph=verifyDoorGraph(before.bp,after.bp,geometry.target.id,geometry.bedroom.id);
 writeFileSync('/evidence/diagnostic-candidate-'+i+'.svg',edited.svg);
 writeFileSync('/evidence/diagnostic-candidate-'+i+'.json',JSON.stringify(after.scene,null,2));
 const row:any={candidate,graph};
 try {row.furnished=verifyFurnishedAccess(before.scene,after.scene,after.bp,geometry.before,geometry.target.id,geometry.bedroom.id,graph.newDoorId);row.status='PASS';}catch(error:any){row.status='FAIL';row.error=error.message;}
 const empty=clone(after.scene);for(const [id,node] of Object.entries(empty.nodes) as any[])if(node.type==='item')delete empty.nodes[id];
 try{row.withoutFurniture=verifyFurnishedAccess(before.scene,empty,after.bp,geometry.before,geometry.target.id,geometry.bedroom.id,graph.newDoorId);row.withoutFurnitureStatus='PASS';}catch(error:any){row.withoutFurnitureStatus='FAIL';row.withoutFurnitureError=error.message;}
 output.plans.push(row);console.log(JSON.stringify({candidateId:candidate.id,status:row.status,error:row.error,withoutFurnitureStatus:row.withoutFurnitureStatus,withoutFurnitureError:row.withoutFurnitureError}));
}
writeFileSync('/evidence/diagnostic.json',JSON.stringify(output,null,2));
