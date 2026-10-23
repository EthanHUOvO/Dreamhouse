/** Real portal functions, controlled network/state. This is not AI inference. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from '/app/node_modules/typescript/lib/typescript.js';
import {readFileSync} from 'node:fs';
import {originalFloorplanMatches,canonicalFloorplanSource} from '/app/lib/ai/model3d-source';
import {floorplanModelBinding,sameModelBinding} from '/app/lib/ai/model3d-binding';
const source=readFileSync('/workspace/TouchCustomerPortal.tsx','utf8');
const file=ts.createSourceFile('portal.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function extract(name:string,scope:any,expression=false){
 let node:any;function visit(n:any){if((expression?ts.isVariableDeclaration(n):ts.isFunctionDeclaration(n))&&n.name?.getText(file)===name)node=n;ts.forEachChild(n,visit)}visit(file);assert.ok(node,name);
 const js=ts.transpileModule(expression?`const result=${node.initializer.getText(file)};result`:node.getText(file)+';'+name,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return vm.runInContext(js,vm.createContext(scope));
}
function savedVersionSnapshotRegression(){
 const clone=(value:any)=>JSON.parse(JSON.stringify(value)),variantId='one-option-01';
 const makeVersion=(id:string,sofaX:number)=>{
  const result={provider:'qwen',model:'svg-edit',url:`/${id}.png`,sourceVariantId:variantId,sourceImageHash:'same-source',userPrompt:'新增卧室',geometryVerified:true};
  const binding=floorplanModelBinding(variantId,result,id)!;
  return{id,sourceVariantId:variantId,sourceImageHash:'same-source',submittedRequirement:'新增卧室',result,sceneSnapshot:{nodes:{building_house:{metadata:{modelBinding:binding,sourceDrawing:result.url}},sofa:{id:'sofa',type:'item',position:[sofaX,0,1]}},rootNodeIds:['building_house']}};
 };
 const v1=makeVersion('v1',1),v2=makeVersion('v2',11),binding=floorplanModelBinding(variantId,v1.result,v1.id)!;
 const edited=clone(v1.sceneSnapshot);edited.nodes.sofa.position[0]=2;
 const state:any={versions:[v1,v2],setterCalls:0,error:'',dirty:true,saved:0};
 const saveScope:any={scene:edited,modelMatchesSelection:true,currentBinding:binding,selectedVariant:{variantId},sessionId:'save-snapshot-test',
  assertPascalSceneIntegrity:()=>({valid:true}),sceneToBoundVariantBlueprint:()=>({id:variantId}),calibrationForPersistence:{current:{variantId}},
  saveVariantDesign:()=>{throw new Error('QuotaExceededError')},setBlueprintCalibration:()=>{},setBlueprintSource:()=>{},setFloorplanSpec:()=>{},blueprintToFloorplanSpec:(v:any)=>v,
  blueprintDirty:{current:true},committedSceneRef:{current:v1.sceneSnapshot},cloneScene:clone,floorplanModelBinding,sameModelBinding,
  setFloorplanVersions:(update:any)=>{state.setterCalls++;state.versions=update(state.versions)},setHasUnsavedChanges:(dirty:boolean)=>{state.dirty=dirty},setFurniturePresetStatus:()=>{},setError:(error:string)=>{state.error=error}};
 const save=extract('saveCurrentVariantDesign',saveScope),before=JSON.stringify(state.versions);
 assert.equal(save(),false);assert.equal(state.error,'QuotaExceededError');assert.equal(state.setterCalls,0);
 assert.equal(JSON.stringify(state.versions),before,'quota failure must preserve both version snapshots');assert.strictEqual(saveScope.committedSceneRef.current,v1.sceneSnapshot);assert.equal(state.dirty,true);
 saveScope.saveVariantDesign=()=>{state.saved++};assert.equal(save(),true);assert.equal(state.saved,1);assert.equal(state.setterCalls,1);assert.equal(state.dirty,false);
 assert.equal(JSON.stringify(state.versions[0].sceneSnapshot),JSON.stringify(edited),'saved V1 must receive the actual edited scene');
 assert.notStrictEqual(state.versions[0].sceneSnapshot,edited,'version snapshot must be cloned');assert.strictEqual(state.versions[1],v2,'saving V1 must not replace V2');
 assert.equal(state.versions[1].sceneSnapshot.nodes.sofa.position[0],11);assert.equal(v1.sceneSnapshot.nodes.sofa.position[0],1,'previous V1 object is immutable');
 // Exercise the actual selection and confirmation handlers, including a trip
 // through V2, so returning to V1 must use the newly committed snapshot.
 const selection:any={floorplanModelBinding,sameModelBinding,cloneScene:clone,floorplanVersions:state.versions,selectedVariant:{variantId},
  selectedFloorplanVersionId:'v1',selectedFloorplanVersionIdRef:{current:'v1'},editSourceVersionIdRef:{current:'v1'},setEditSourceVersionId:()=>{},selectionEpoch:{current:{binding}},modelBindingRef:{current:binding},confirmedBindingRef:{current:binding},
  committedSceneRef:{current:clone(edited)},sceneForPersistence:{current:clone(edited)},aiFloorplan:{...v1.result,prompt:v1.submittedRequirement},applied:null,
  invalidateConfirmedSelection:(next:any)=>{selection.selectionEpoch.current.binding=next;selection.modelBindingRef.current=null},
  setSelectedFloorplanVersionId:(id:string)=>{selection.selectedFloorplanVersionId=id},setPrompt:()=>{},setFloorplan:()=>{},setAiFloorplan:(next:any)=>{selection.aiFloorplan=next},
  setError:(message:string)=>{throw new Error(message)},assertPascalSceneIntegrity:()=>({valid:true}),validateVariantBlueprint:()=>({valid:true}),sceneToFloorplanBlueprint:()=>({}),
  commitStructureScene:(_before:any,next:any,apply:any)=>{apply(next);return{ok:true}},applySceneSnapshot:(next:any)=>{selection.applied=clone(next)},
  applyGeneratedScene:(next:any)=>{selection.applied=clone(next);selection.committedSceneRef.current=clone(next);selection.sceneForPersistence.current=clone(next)},
  setConfirmedBinding:()=>{},setModelBinding:()=>{},setFloorPlanConfirmed:()=>{},setModelGenerationPhase:()=>{},setModel3DLoaded:()=>{},setModelExperience:()=>{},setSlide:()=>{},cancelModelGenerationTimers:()=>{}};
 const choose=extract('selectFloorplanVersion',selection),confirm=extract('confirmFloorPlanSelection',selection);
 choose(state.versions[1]);confirm(state.versions[1].result);assert.equal(selection.applied.nodes.sofa.position[0],11,'V2 uses its own snapshot');
 choose(state.versions[0]);confirm(state.versions[0].result);assert.equal(selection.applied.nodes.sofa.position[0],2,'return to V1 restores saved furniture, not generation-time snapshot');
 assert.equal(JSON.stringify(selection.applied),JSON.stringify(edited));assert.strictEqual(state.versions[1],v2);
}
async function main(){
 savedVersionSnapshotRegression();
 const displayError=extract('customerErrorMessage',{});
 assert.equal(displayError('BEDROOM_SCENE_FURNITURE_COLLISION：新增隔墙与家具重叠，已保留原方案。'),'新增隔墙与家具重叠，已保留原方案。');
 assert.doesNotMatch(displayError('Scene internal details'),/internal details/);
 const mutations:string[]=[],oldScene={nodes:{building_house:{metadata:{floorplanSource:'svg-deterministic/v1'}}}},oldCaptures=['saved'];
 const ref={current:new AbortController()},scope:any={prompt:'old',setPrompt:(s:string)=>{scope.prompt=s},floorplanRequestId:{current:4},floorplanAbortController:ref,adjustmentInFlight:{current:true},
 setFloorplanBusy:()=>{},setProgressTask:()=>{},setError:()=>{},invalidateConfirmedSelection:()=>{throw new Error('draft invalidated committed scene')},scene:oldScene,capturedViews:oldCaptures};
 extract('changeModificationDraft',scope)('在客餐厅上侧新增一个卧室');assert.equal(scope.floorplanRequestId.current,5);assert.equal(ref.current,null);assert.strictEqual(scope.scene,oldScene);assert.strictEqual(scope.capturedViews,oldCaptures);
 const floorplan={provider:'qwen',sourceVariantId:'one-option-01',sourceImageHash:'original',url:'/v1.png',userPrompt:'已完成的需求'};
 const matching={originalFloorplanMatches,canonicalFloorplanSource,selectedImageVersion:undefined,floorplan,selectedVariant:{variantId:'one-option-01',imageHash:'original'},modificationRequest:'失败或未提交的新需求',aiFloorplan:{...floorplan,prompt:floorplan.userPrompt}};
 assert.equal(extract('floorplanMatchesSelection',matching,true),true,'a new draft must not unbind V1');
 assert.equal(extract('floorplanMatchesSelection',{...matching,aiFloorplan:{...matching.aiFloorplan,sourceVariantId:'two-option-01'}},true),false);
 const cached={...matching,floorplan:{...floorplan,url:'blob:reloaded'},selectedImageVersion:{id:'v1',sourceVariantId:'one-option-01',sourceImageHash:'original',submittedRequirement:floorplan.userPrompt,result:floorplan}};
 assert.equal(extract('floorplanMatchesSelection',cached,true),true,'IndexedDB blob aliases retain the selected version identity after hydration');
 assert.equal(extract('floorplanMatchesSelection',{...cached,aiFloorplan:{...matching.aiFloorplan,url:'/v2.png'}},true),false,'a different version image must still be rejected');
 const start:any={adjustmentInFlight:{current:false},originalSelectionInFlight:{current:false},layoutBusy:false,floorplanBusy:false,modificationRequest:'新增卧室',hasUnsavedChanges:false,sessionId:'test',svgSource:'svg',
 isSessionCurrent:()=>true,floorplanRequestId:{current:2},floorplanError:{current:'无可行方案'},setError:()=>{},cancelModelGenerationTimers:()=>{throw new Error('cleared existing model')},
 beginProgressTask:()=>1,generateFloorplan:async()=>{start.floorplanRequestId.current++;return false},wait:async()=>{},completeProgressTask:(_id:any,error:any)=>{assert.match(error,/无可行方案/)}};
 for(const name of ['invalidateConfirmedSelection','setFloorPlanConfirmed','setModelGenerationPhase','setModel3DLoaded','setModelExperience','setCapturedViews','setOverall','setRoomImages','setBom','setBudget']) start[name]=()=>mutations.push(name);
 await extract('startDesignAdjustment',start)();assert.deepEqual(mutations,[]);assert.equal(start.adjustmentInFlight.current,false);
 const prepare:any={sessionId:'test',scene:oldScene,svgDataUrl:()=>'<svg>',hashDataUrl:async()=>'hash',fetch:async()=>({}),cloneScene:(x:any)=>JSON.parse(JSON.stringify(x)),
 assertPascalSceneIntegrity:()=>({valid:true}),validateVariantBlueprint:()=>({valid:true}),sceneToFloorplanBlueprint:()=>({}),acceptsSvgScene:(r:any,h:string)=>r.sourceImageHash===h&&r.validation.valid,
 consumeModel3dSse:async(_res:any,fn:any)=>{fn('scene',{scene:{nodes:{partial:true}}});fn('error',{message:'门不可达'})}};
 await assert.rejects(extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController()),/保留原方案/);assert.strictEqual(prepare.scene,oldScene);
 prepare.consumeModel3dSse=async(_res:any,fn:any)=>fn('complete',{result:{sourceImageHash:'wrong',validation:{valid:true},scene:oldScene}});
 await assert.rejects(extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController()),/版本不一致/);
 prepare.consumeModel3dSse=async(_res:any,fn:any)=>fn('complete',{result:{sourceImageHash:'hash',validation:{valid:true},scene:oldScene}});
 const result=await extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController());assert.equal(JSON.stringify(result),JSON.stringify(oldScene));assert.notStrictEqual(result,oldScene);
 prepare.assertPascalSceneIntegrity=()=>({valid:false});await assert.rejects(extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController()),/完整性/);
 // The new generic transaction branch must reject unsafe candidates before
 // exposing any scene, and must preserve an exact-bound source for the guard.
 prepare.assertPascalSceneIntegrity=()=>({valid:true});
 prepare.svgToStructure=(svg:string)=>({svg});
 prepare.preserveStructureSourceFurniture=()=>{throw new Error('STRUCTURE_SCENE_INVALID：家具与新隔墙碰撞，已保留原方案。')};
 const sourceBefore=JSON.stringify(oldScene),transaction={operations:[{operation:{type:'merge_rooms'}}]};
 await assert.rejects(extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController(),'<source/>',undefined,oldScene,transaction),/家具与新隔墙碰撞/);
 assert.equal(JSON.stringify(oldScene),sourceBefore,'failed generic host guard must preserve committed scene');
 prepare.preserveStructureSourceFurniture=(candidate:any,source:any,before:any,after:any,received:any)=>{assert.strictEqual(source,oldScene);assert.equal(before.svg,'<source/>');assert.equal(after.svg,'<svg/>');assert.strictEqual(received,transaction);return JSON.parse(JSON.stringify(candidate))};
 prepare.assertStructureSceneUsable=()=>({valid:true,checkedFurniture:2});
 const safe=await extract('prepareSvgEditScene',prepare)('<svg/>','/image',new AbortController(),'<source/>',undefined,oldScene,transaction);
 assert.equal(safe.nodes.building_house.metadata.structureSceneValidation.valid,true);assert.equal(JSON.stringify(oldScene),sourceBefore);
 // Structural check on real handler: all network/image/3D validation and stale
 // guards precede any version/state mutation. No success-only replica here.
 let generate:any;function visit(n:any){if(ts.isFunctionDeclaration(n)&&n.name?.text==='generateFloorplan')generate=n;ts.forEachChild(n,visit)}visit(file);
 const code=generate.getText(file);assert.ok(code.indexOf('prepareSvgEditScene(')<code.indexOf('setAiFloorplan('));assert.ok(code.indexOf('assertImageDecodes(')<code.indexOf('setAiFloorplan('));assert.ok(code.indexOf('mismatchReasons.length')<code.indexOf('setAiFloorplan('));
 assert.match(code,/sceneSnapshot: editedScene/);
 assert.match(source,/customRequirement: currentFloorplan\?\.userPrompt \?\? prompt/);assert.match(source,/editDraft: prompt/);
 console.log(JSON.stringify({status:'PASS',kind:'actual-portal-handlers-controlled-network-no-AI',checks:['save-updates-only-bound-version-snapshot','quota-failure-preserves-version-snapshots','switch-V1-V2-V1-restores-saved-furniture','draft-keeps-committed-scene','draft-does-not-unbind-version','failure-does-not-clear-captures-or-model','candidate-stream-never-publishes-partial-scene','mismatched-source-rejected','invalid-Pascal-rejected','success-clones-candidate','version-commit-after-full-validation','draft-persisted-separately','generic-hostguard-failure-preserves-source','generic-hostguard-runs-before-publishing']}));
}
main().catch(e=>{console.error(e);process.exit(1)});
