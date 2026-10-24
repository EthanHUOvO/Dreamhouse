import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from '/app/node_modules/typescript/lib/typescript.js';
import {readFileSync} from 'node:fs';
import {floorplanModelBinding,sameModelBinding,selectionJobCurrent} from '/app/lib/ai/model3d-binding';
import {selectedSvgSource} from '/app/lib/ai/svg-version';
const source=readFileSync('/workspace/TouchCustomerPortal.tsx','utf8');
const file=ts.createSourceFile('portal.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn:any;function visit(n:any){if(ts.isFunctionDeclaration(n)&&n.name?.text==='startModelGeneration')fn=n;ts.forEachChild(n,visit)}visit(file);
const code=ts.transpileModule(fn.getText(file)+';startModelGeneration',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
async function run(mode:string){
 const clone=(v:any)=>JSON.parse(JSON.stringify(v));
 const variantId='one-option-01',image={url:'/new.png',sourceVariantId:variantId,sourceImageHash:'original',userPrompt:'新增卫生间',geometryVerified:true};
 const binding=floorplanModelBinding(variantId,image,'v2')!,oldBinding={...binding,versionId:'v1',canonicalImageUrl:'/old.png'};
 const previous={nodes:{building_house:{metadata:{modelBinding:oldBinding}}},rootNodeIds:['building_house']};
 const candidate={nodes:{building_house:{metadata:{svgModelPlan:{provenance:{actualInference:true,sourceImageHash:'hash'}}}}},rootNodeIds:['building_house']};
 const version={id:'v2',sourceVariantId:variantId,svgSource:'<svg/>',result:image,editContext:{intent:{action:'add_bathroom'},originalSvg:'before'},validationStatus:'ready'};
 const updates:any[]=[],scope:any={console:{error:()=>{}},Date,JSON,Object,String,Boolean,Error,AbortController,
  modifiedFloorPlan:image,floorPlanConfirmed:true,currentBinding:binding,confirmedBindingRef:{current:binding},modelGenerationPhase:'idle',modelGenerationAbortController:{current:null},sessionId:'test',selectionEpoch:{current:{epoch:1,binding}},
  isSessionCurrent:()=>true,selectionJobCurrent,sameModelBinding,cloneScene:clone,scene:previous,basePascalScene:previous,sceneRevision:3,model3DLoaded:false,modelMatchesSelection:false,modelBindingRef:{current:oldBinding},modelSourceNotice:null,blueprintCalibration:null,floorplanSpec:null,
  svgSource:'original',floorplanVersions:[version],selectedFloorplanVersionId:'v2',selectedVariant:{variantId},aiFloorplan:null,
  canonicalFloorplanSource:()=>'/new.png',selectedSvgSource,svgDataUrl:(s:string)=>s,hashDataUrl:async()=>'hash',fetch:async()=>({}),window:{setTimeout:()=>1,clearTimeout:()=>{}},beginProgressTask:()=>1,cancelModelGenerationTimers:()=>{},debugUi:true,
  acceptsSvgScene:()=>true,validateEditedScene:(scene:any,context:any)=>{assert.equal(context,version.editContext);if(mode==='collision')throw new Error('FURNITURE_COLLISION');return clone(scene)},
  applyGeneratedScene:(scene:any,commit:boolean)=>updates.push({scene:clone(scene),commit}),
  setFloorplanVersions:(fn:any)=>{scope.floorplanVersions=fn(scope.floorplanVersions)},
  completeProgressTask:(_id:any,error?:string)=>{scope.completionError=error},
  consumeModel3dSse:async(_response:any,on:any)=>{
   on('scene',{scene:{nodes:{partial:true}}});assert.equal(updates.length,0,'intermediate SVG scene must stay private');
   if(mode==='stale')scope.selectionEpoch.current={epoch:2,binding:oldBinding};
   if(mode==='fallback'){on('fallback',{scene:{nodes:{unexpectedFallback:true}},reason:'test'});return;}
   if(mode==='network')throw new Error('NETWORK_ERROR');
   if(mode==='missing-ai')delete (candidate.nodes.building_house.metadata as any).svgModelPlan;
   on('complete',{result:{scene:candidate,validation:{valid:true}}});
  },
 };
 for(const name of fn.getText(file).matchAll(/\b(set[A-Z]\w*)\(/g))if(!scope[name[1]])scope[name[1]]=(value:any)=>{scope[name[1]+'Value']=value};
 await vm.runInContext(code,vm.createContext(scope))();
 if(mode==='success'){
  assert.equal(updates.length,1);assert.equal(updates[0].commit,true);assert.equal(scope.floorplanVersions[0].sceneSnapshot.nodes.building_house.metadata.modelBinding.versionId,'v2');assert.equal(scope.setModelGenerationPhaseValue,'completed');assert.equal(scope.completionError,undefined);
 }else if(mode==='stale'){assert.equal(updates.length,0);assert.equal(scope.floorplanVersions[0].sceneSnapshot,undefined)}
 else{assert.equal(updates.length,1);assert.deepEqual(updates[0].scene,previous);assert.equal(scope.floorplanVersions[0].sceneSnapshot,undefined);assert.equal(scope.floorplanVersions[0].validationStatus,'failed');assert.deepEqual(scope.modelBindingRef.current,oldBinding);assert.ok(scope.completionError);assert.equal(scope.setCapturedViewsValue,undefined)}
 console.log('PASS',mode);
}
async function main(){for(const mode of ['success','collision','network','fallback','missing-ai','stale'])await run(mode);console.log('Actual Step3 handler; controlled network, NOT real AI')}
main().catch(e=>{console.error(e);process.exitCode=1});
