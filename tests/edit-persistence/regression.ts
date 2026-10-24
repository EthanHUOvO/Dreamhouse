import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import * as mcp from '/app/services/pascal-mcp/session-store';
import {sceneToFloorplanBlueprint,sceneToBoundVariantBlueprint,compileBlueprintToPascal,validateVariantBlueprint} from '/app/lib/floorplans/blueprint';
import {saveVariantDesign,loadSavedVariantDesign,createDefaultCalibration} from '/app/lib/floorplans/variant-persistence';
import {validateLayout} from '/app/lib/layout-tools';
import {moveFurniture,rotateFurniture} from '/app/lib/furniture-edit';
import {moveDoor,removeDoor,addDoor} from '/app/lib/floorplans/door-edit';
import {moveWallParallel,removeWallSafe} from '/app/lib/floorplans/wall-edit';
import {restoreBoundModelSession} from '/app/lib/ai/model3d-binding';
import {packModelSession,unpackModelSession} from '/app/lib/ai/inline-image-persistence';
import {assertPascalSceneIntegrity} from '/app/lib/pascal/scene-integrity';
const output:any={kind:'programmatic-no-ai-inference',plans:[],negative:[]};
const clone=(v:any)=>JSON.parse(JSON.stringify(v));
for (const [type,n] of [['one','01'],['one','02'],['one','07'],['two','01'],['two','02'],['two','07'],['three','01'],['three','03'],['three','07']]) {
 const variantId=`${type}-option-${n}`,url=`/preset/svg-v2/${type}/option-${n}.svg`,svg=readFileSync('/workspace/public'+url,'utf8'),structure=svgToStructure(svg);
 const sessionId=`save-regression-${variantId}`,sourceImageHash=variantId;
 let result=mcp.beginFloorplanScene({sessionId,sourceImageHash,sourceImage:url});
 const ident=()=>({sessionId,sourceImageHash,revision:result.revision});
 result=mcp.setFloorStructure({...ident(),...structure,sourceSvg:svg,geometrySource:'svg-deterministic/v1',scaleMethod:'drawing-dimensions'});
 result=mcp.setOpenings({...ident(),doors:structure.doors,windows:structure.windows});
 result=mcp.populateBasicFurniture(ident());result=mcp.validateScene(ident());assert.equal(result.validation.valid,true);result=mcp.commitScene(ident());
 const binding={variantId,versionId:'original',canonicalImageUrl:url};
 let scene=clone(result.scene);Object.assign(scene.nodes.building_house.metadata,{variantId,modelBinding:binding,sourceDrawing:url});
 const base=clone(scene),storage=new Map<string,string>();
 const target={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v)},removeItem:(k:string)=>{storage.delete(k)}};
 const raw=sceneToFloorplanBlueprint(scene),calibration=createDefaultCalibration(variantId,raw,true);
 assert.throws(()=>saveVariantDesign(variantId,raw,calibration,target,sessionId),/variantId/,'reproduce task-id vs variant-id rejection');
 // Actual existing edit tools, followed by strict save and restore.
 const item:any=Object.values(scene.nodes).find((x:any)=>x.type==='item'&&x.metadata?.furniture_asset_key==='sofa');assert.ok(item);
 scene=rotateFurniture(moveFurniture(scene,item.id,.15,0),item.id,90);
 assert.notDeepEqual(scene.nodes[item.id].position,base.nodes[item.id].position);
 let movedDoor='',movedWall='';
 for(const door of sceneToFloorplanBlueprint(scene).doors){
  if(door.locked||door.id==='door_entry')continue;
  for(const delta of [.02,-.02]){try{const next=moveDoor(scene,door.id,door.hostWallId,door.offset+delta).scene;if(validateVariantBlueprint(sceneToFloorplanBlueprint(next)).valid){scene=next;movedDoor=door.id;break;}}catch{}}
  if(movedDoor)break;
 }
 assert.ok(movedDoor,variantId+': no valid door edit');
 const originalDoor=sceneToFloorplanBlueprint(scene).doors.find(d=>d.id===movedDoor)!;
 const removed=removeDoor(scene,movedDoor).scene;
 assert.equal(validateVariantBlueprint(sceneToBoundVariantBlueprint(removed,binding)).valid,true,'door deletion updates expected count');
 scene=addDoor(removed,originalDoor).scene;
 assert.equal(validateVariantBlueprint(sceneToBoundVariantBlueprint(scene,binding)).valid,true,'door addition updates expected count');
 const removedWall=removeWallSafe(scene,originalDoor.hostWallId,'delete').scene;
 assert.equal(validateVariantBlueprint(sceneToBoundVariantBlueprint(removedWall,binding)).valid,true,'wall deletion updates hosted opening counts');
 const existingLayoutIssues=new Set(validateLayout(scene).issues);
 for(const wall of Object.values(scene.nodes) as any[]){
  if(wall.type!=='wall'||wall.metadata?.locked||wall.metadata?.editable===false||wall.metadata?.structural_type==='load_bearing')continue;
  for(const delta of [.02,-.02]){try{const next=moveWallParallel(scene,wall.id,delta).scene;if(validateVariantBlueprint(sceneToFloorplanBlueprint(next)).valid&&assertPascalSceneIntegrity(next).valid&&validateLayout(next).issues.every(issue=>existingLayoutIssues.has(issue))){scene=next;movedWall=wall.id;break;}}catch{}}
  if(movedWall)break;
 }
 assert.ok(movedWall,variantId+': no valid wall edit');
 const beforeSave=JSON.stringify(scene),bp=sceneToBoundVariantBlueprint(scene,binding);
 assert.equal(bp.id,variantId);assert.equal(JSON.stringify(scene),beforeSave,'save must not mutate source');
 saveVariantDesign(variantId,bp,calibration,target,sessionId);
 const restored=loadSavedVariantDesign(variantId,target,sessionId);assert.ok(restored);
 const compiled=compileBlueprintToPascal(restored!.blueprint),round=sceneToFloorplanBlueprint(compiled);
 for(const field of ['walls','rooms','doors','windows','furniture'])assert.deepEqual(round[field],bp[field],variantId+':'+field);
 assert.equal(assertPascalSceneIntegrity(compiled).valid,true);
 const selection={provider:'preset',sourceVariantId:variantId,sourceImageHash,url,userPrompt:''};
 const saved={selectedVariant:{variantId,imageUrl:url},currentPascalScene:scene,generatedFloorplan:selection,floorPlanConfirmed:true,model3DLoaded:true,modelGenerationPhase:'completed',modelBinding:binding,confirmedBinding:binding,currentStep:3,customRequirement:'',sceneRevision:12};
 const session=restoreBoundModelSession(unpackModelSession(JSON.parse(JSON.stringify(packModelSession(saved)))));
 assert.equal(session.modelLoaded,true);assert.deepEqual(session.scene,clone(scene),'session must preserve edited snapshot exactly');
 for(const patch of [{variantId:'two-option-99'},{versionId:'v2'},{canonicalImageUrl:'/other.svg'}])assert.throws(()=>sceneToBoundVariantBlueprint(scene,{...binding,...patch}));
 const invalid=clone(scene);Object.values(invalid.nodes).find((n:any)=>(n.type==='window'||n.type==='door'))!.width=0;
 assert.throws(()=>sceneToBoundVariantBlueprint(invalid,binding),'zero width cannot be hidden by identity binding');
 const wrongCount=clone(scene);wrongCount.nodes.building_house.metadata.floorplanBlueprint.expected.doorCount+=3;
 assert.throws(()=>sceneToBoundVariantBlueprint(removeDoor(wrongCount,movedDoor).scene,binding),'an edit must not repair unrelated expected-count corruption');
 output.negative.push({variantId,wrongBindingsRejected:3,invalidOpeningRejected:true,unrelatedCorruptionRejected:true});
 output.plans.push({variantId,status:'PASS',furniture:item.id,door:movedDoor,wall:movedWall,savedId:bp.id,fullSessionExact:true});
}
console.log(JSON.stringify(output,null,2));
writeFileSync('/evidence/edit-persistence.json',JSON.stringify(output,null,2));
