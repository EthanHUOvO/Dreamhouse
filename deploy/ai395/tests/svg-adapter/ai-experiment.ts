import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {NextRequest} from '/app/node_modules/next/server.js';
import {POST} from '/app/app/api/ai/svg-edit/route';
import * as session from '/app/services/pascal-mcp/session-store';
const out='/workspace/tests/svg-adapter/results';mkdirSync(out,{recursive:true});
const results:any[]=[];
async function main(){
for(const [key,kind] of [['one-01','partition'],['two-02','partition'],['three-03','partition'],['one-01','sliding'],['two-01','sliding'],['three-03','sliding']]){
  const [group,n]=key.split('-'),svgText=readFileSync(`/workspace/public/preset/svg-v2/${group}/option-${n}.svg`,'utf8'),instruction=kind==='partition'?'在主卧内新增一个卫生间，需要加两面隔墙和一扇门':'在客厅和阳台之间加一扇推拉门';
  const started=performance.now();console.log('AI_START',key,kind);
  const response=await POST(new NextRequest('http://localhost/api/ai/svg-edit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({svgText,instruction})}));
  const data=await response.json(),result:any={key,kind,httpStatus:response.status,elapsedMs:Math.round(performance.now()-started),status:response.ok?'PASS':'FAIL',error:data.reason||data.error,attempts:data.attempts,provenance:data.provenance,validation:data.validation};
  if(response.ok){
    writeFileSync(`${out}/${key}-${kind}.svg`,data.svg);
    writeFileSync(`${out}/${key}-${kind}-diff.json`,JSON.stringify(data.additions,null,2));
    try{const st=data.structure,id=`ai-svg-${key}-${kind}-${Date.now()}`,hash='ai-svg-real-inference';let r=session.beginFloorplanScene({sessionId:id,sourceImageHash:hash,sourceImage:key});const ident=()=>({sessionId:id,sourceImageHash:hash,revision:r.revision});r=session.setFloorStructure({...ident(),...st,sourceSvg:data.svg,geometrySource:'svg-deterministic/v1',scaleMethod:'drawing-dimensions'});r=session.setOpenings({...ident(),doors:st.doors,windows:st.windows});r=session.populateBasicFurniture(ident());r=session.validateScene(ident());assert.equal(r.validation.valid,true);r=session.commitScene(ident());result.pascal='PASS';result.rooms=st.rooms.map((r:any)=>r.name);result.doors=st.doors.length;}
    catch(e:any){result.status='FAIL';result.pascal=e.message;}
  }
  results.push(result);writeFileSync(`${out}/real-ai.json`,JSON.stringify({kind:'real-local-model-inference',results},null,2));console.log('AI_RESULT',JSON.stringify(result));
}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
