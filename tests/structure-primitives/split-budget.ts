import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {generateRoomSplitCandidates,applyRoomSplitCandidate} from '/app/lib/ai/room-split-primitives';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
const records:any[]=[];let upperSvg:string|undefined;
for(const [variant,direction,expected]of[['01','upper','PASS'],['01','any','PASS'],['07','any','SPLIT_SEARCH_BUDGET_EXCEEDED']]as const){
 const svg=readFileSync(`/workspace/public/preset/svg-v2/one/option-${variant}.svg`,'utf8'),original=svg,target=svgToStructure(svg).rooms.find(r=>r.semantic==='living_room')!,op={type:'split_room' as const,targetRoomId:target.id,newRoomName:'书房',newRoomSemantic:'study' as const,direction},started=performance.now();
 let result:any,error:string|undefined;
 try{result=generateRoomSplitCandidates(svg,op);}catch(e){error=e instanceof Error?e.message:String(e);}
 const elapsedMs=performance.now()-started;assert.equal(svg,original);assert.ok(elapsedMs<5000,`search exceeded 5 seconds: ${elapsedMs}`);
 if(expected==='PASS'){
  assert.equal(error,undefined);assert.ok(result.candidates.length);assert.equal(result.candidates[0].id,'split-tph47z-19rxvel');const applied=applyRoomSplitCandidate(svg,result.candidates[0].id,op);assert.ok(applied.validation.valid);assert.ok(applied.svg);
  if(direction==='upper')upperSvg=applied.svg;else assert.equal(applied.svg,upperSvg,'any must select and execute the same first verified direction');
 }else{assert.equal(error,expected);assert.equal(result,undefined,'budget exhaustion must not publish partial candidates');}
 records.push({variant:`one-option-${variant}`,direction,expected,status:'PASS',elapsedMs,error,candidates:result?.candidates.length??0,sourceUnchanged:true});
}
writeFileSync('/evidence/split-budget.json',JSON.stringify({kind:'programmatic-no-ai-inference',records},null,2));console.log(JSON.stringify(records,null,2));
