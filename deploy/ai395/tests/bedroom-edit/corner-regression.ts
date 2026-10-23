import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bedroomPartitionAnalysis,applyBedroomPartition,type BedroomRegion} from '/app/lib/ai/bedroom-edit-geometry';
import {checkBedroomDefaultScene} from '/app/lib/ai/bedroom-candidate-scene';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {buildSceneFromSvg,verifyBedroomStructure,verifyDoorGraph,verifySaveRestore,clone} from './assertions';
const root='/workspace',out='/evidence',results:any[]=[];
const fixture=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9000 11000"><path fill="#9a9a9a" fill-rule="evenodd" d="M500 500 H8500 V10500 H4900 V10300 H8300 V700 H700 V10300 H4100 V10500 H500 Z"/><rect x="4100" y="10300" width="800" height="200" fill="white"/><path id="entry" d="M4100,10400 L4100,9600 A800,800 0 0 0 4900,10400 Z" stroke="#2e9e4f" fill="none"/><text x="4500" y="5500">客餐厅</text><text x="4500" y="5800">76.44 m²</text></svg>`;
for(const direction of ['upper','lower','left','right'] as BedroomRegion[]){
 const before=buildSceneFromSvg(fixture,'synthetic-'+direction,'before'),analysis=bedroomPartitionAnalysis(fixture,{region:direction},checkBedroomDefaultScene);
 assert.ok(analysis.candidates.length,'synthetic '+direction+': '+JSON.stringify(analysis.diagnostics));
 const c=analysis.candidates[0],edit=applyBedroomPartition(fixture,c.id,{region:direction}),after=buildSceneFromSvg(edit.svg,'synthetic-'+direction,'after');
 assert.equal(c.position,direction);verifyBedroomStructure(fixture,edit.svg,c.targetRoomId,direction);verifyDoorGraph(before.bp,after.bp,c.targetRoomId,edit.validation.newRoomId);assertBedroomSceneUsable(after.scene,before.structure,c.targetRoomId,edit.validation.newRoomId);
 for(const wrong of ['upper','lower','left','right'].filter(d=>d!==direction))assert.throws(()=>applyBedroomPartition(fixture,c.id,{region:wrong as BedroomRegion}),'wrong-direction candidate accepted');
 verifySaveRestore('synthetic-'+direction,fixture,edit.svg,before.scene,after.scene);results.push({id:'synthetic-'+direction,status:'PASS',candidate:c});
 writeFileSync(`${out}/synthetic-${direction}.svg`,edit.svg);console.log('PASS synthetic',direction);
}
const plans=process.env.CORNER_TEST_ONLY==='synthetic'?[]:[['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']];
for(const[k,n]of plans){
 const id=`${k}-option-${n}`,svg=readFileSync(`${root}/public/preset/svg-v2/${k}/option-${n}.svg`,'utf8'),before=buildSceneFromSvg(svg,id,'before');
 verifySaveRestore(id,svg,svg,before.scene,before.scene);
 const analysis=bedroomPartitionAnalysis(svg,{region:'any'},checkBedroomDefaultScene),c=analysis.candidates[0];
 if(!c){results.push({id,status:'SAFE_REJECT',originalLoadRestore:'PASS',diagnostics:analysis.diagnostics});console.log('SAFE_REJECT',id,analysis.diagnostics.noSolutionReason);continue;}
 const edit=applyBedroomPartition(svg,c.id,{region:'any'}),after=buildSceneFromSvg(edit.svg,id,'after');
 verifyBedroomStructure(svg,edit.svg,c.targetRoomId,c.position);verifyDoorGraph(before.bp,after.bp,c.targetRoomId,edit.validation.newRoomId);
 const guard=assertBedroomSceneUsable(after.scene,before.structure,c.targetRoomId,edit.validation.newRoomId);
 verifySaveRestore(id,svg,edit.svg,before.scene,after.scene);
 const sunk=clone(after.scene);sunk.nodes[edit.validation.newDoorId].position[1]=-1;assert.throws(()=>assertBedroomSceneUsable(sunk,before.structure,c.targetRoomId,edit.validation.newRoomId),/DOOR_BELOW_FLOOR/);
 const blocked=clone(after.scene),item:any=Object.values(blocked.nodes).find((n:any)=>n.type==='item'),wall=edit.additions.find(a=>a.type==='wall')!;item.position=[(wall.x1!+wall.x2!)/2,0,(wall.y1!+wall.y2!)/2];
 assert.throws(()=>assertBedroomSceneUsable(blocked,before.structure,c.targetRoomId,edit.validation.newRoomId));
 results.push({id,status:'PASS',originalLoadRestore:'PASS',candidate:c,diagnostics:analysis.diagnostics,guard});writeFileSync(`${out}/${id}-corner.svg`,edit.svg);writeFileSync(`${out}/${id}-corner-scene.json`,JSON.stringify(after.scene));console.log('PASS catalog',id,c.position);
}
writeFileSync(`${out}/corner-regression.json`,JSON.stringify({kind:'programmatic-no-model-inference',results},null,2));
