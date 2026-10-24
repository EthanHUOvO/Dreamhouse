import {readFileSync,writeFileSync} from 'node:fs';
import {bedroomPartitionAnalysis,applyBedroomPartition} from '/app/lib/ai/bedroom-edit-geometry';
import {checkBedroomDefaultScene} from '/app/lib/ai/bedroom-candidate-scene';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {buildSceneFromSvg} from './assertions';
const plans=[['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']],results:any[]=[];
for(const [kind,n] of plans){
 const id=`${kind}-option-${n}`,svg=readFileSync(`/workspace/public/preset/svg-v2/${kind}/option-${n}.svg`,'utf8'),started=Date.now();
 console.log('START',id);
 try{
  const before=buildSceneFromSvg(svg,id,'before'),analysis=bedroomPartitionAnalysis(svg,{region:'any'},checkBedroomDefaultScene),rows=[];
  for(const candidate of analysis.candidates){
   try{const edited=applyBedroomPartition(svg,candidate.id,{region:'any'}),after=buildSceneFromSvg(edited.svg,id,candidate.id);assertBedroomSceneUsable(after.scene,before.structure,candidate.targetRoomId,edited.validation.newRoomId);rows.push({id:candidate.id,position:candidate.position,status:'PASS'});}
   catch(e:any){rows.push({id:candidate.id,position:candidate.position,status:'FAIL',reason:e.message});}
  }
  const row={id,analysis,candidates:rows,elapsedMs:Date.now()-started};results.push(row);console.log(JSON.stringify(row));
 }catch(e:any){results.push({id,status:'FAIL',reason:e.message});console.log(id,e.message);}
 writeFileSync('/evidence/corner-diagnostic.json',JSON.stringify(results,null,2));
}
