import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {buildSceneFromSvg,verifySaveRestore,hash} from '../bedroom-edit/assertions';
const root=process.env.BEDROOM_TEST_WORKSPACE||'/workspace',out=process.env.BEDROOM_TEST_OUTPUT||'/evidence';
const rows:any[]=[];let failed=0;
for(const [kind,number]of [['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']]){
 const id=`${kind}-option-${number}`,svg=readFileSync(`${root}/public/preset/svg-v2/${kind}/option-${number}.svg`,'utf8'),sourceHash=hash(svg),started=performance.now();
 try{const actual=buildSceneFromSvg(svg,id,'catalog-restore'),restore=verifySaveRestore(id,svg,svg,actual.scene,actual.scene);assert.equal(hash(svg),sourceHash);rows.push({variantId:id,status:'PASS',rooms:actual.structure.rooms.length,walls:actual.structure.walls.length,doors:actual.structure.doors.length,windows:actual.structure.windows.length,furniture:Object.values(actual.scene.nodes).filter(n=>n.type==='item').length,restore,elapsedMs:performance.now()-started});console.log('PASS',id);}
 catch(error:any){failed++;rows.push({variantId:id,status:'FAIL',reason:error.message,stack:error.stack,elapsedMs:performance.now()-started});console.error('FAIL',id,error.message);}
}
mkdirSync(out,{recursive:true});const report={kind:'PROGRAMMATIC_CATALOG_LOADING_AND_SAVE_RESTORE_NO_AI',timestamp:new Date().toISOString(),summary:{pass:rows.length-failed,fail:failed,total:rows.length},plans:rows,limitations:['This suite validates each original catalog plan. It does not claim all requested topology edits are feasible.','Actual MCP functions execute locally without HTTP/network and no AI model is called.']};writeFileSync(`${out}/catalog-restore.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));process.exitCode=failed?1:0;
