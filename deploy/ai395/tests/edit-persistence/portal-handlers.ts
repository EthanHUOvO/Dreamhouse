/** Executes the actual portal handlers with controlled state/network, without React/WebGL/AI. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from '/app/node_modules/typescript/lib/typescript.js';
import {readFileSync} from 'node:fs';
import {sceneToBoundVariantBlueprint} from '/app/lib/floorplans/blueprint';
import {sameModelBinding,selectionJobCurrent,floorplanModelBinding} from '/app/lib/ai/model3d-binding';
const source=readFileSync('/workspace/TouchCustomerPortal.tsx','utf8');
const file=ts.createSourceFile('portal.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function handler(name:string,scope:any,sourceText=source){
 const file=ts.createSourceFile("handler.tsx",sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let node:any;function visit(n:any){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;ts.forEachChild(n,visit);}visit(file);assert.ok(node,name);
 const js=ts.transpileModule(node.getText(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 return vm.runInContext(js+';'+name,vm.createContext(scope));
}
const binding={variantId:'one-option-01',versionId:'original',canonicalImageUrl:'/preset/svg-v2/one/option-01.svg'};
const image='data:image/png;base64,'+'A'.repeat(1100),scene={nodes:{building_house:{metadata:{floorplanVersion:'pascal-v2'}}}};
function renderScope(){
 const state:any={busy:false,captures:[{id:'c1',image,sceneRevision:12,modelBinding:binding,status:'captured'}],error:'',overall:null};
 const pending:any[]=[];
 const scope:any={scene,sceneRevision:12,sessionId:'test-session',modelMatchesSelection:true,selectionEpoch:{current:{sequence:1,binding}},sceneForPersistence:{current:scene},
  capturedViews:state.captures,activeCaptureId:'c1',modelBindingRef:{current:binding},renderAbortController:{current:null},lockedStyleId:'',selectedStyleId:'modern',
  sameModelBinding,selectionJobCurrent,AbortController,console,
  isSessionCurrent:(id:string)=>id==='test-session',createSessionRequest:()=>new AbortController(),releaseSessionRequest:()=>{},
  setError:(value:any)=>{state.error=value},setRenderBusy:(value:any)=>{state.busy=value},
  setCapturedViews:(update:any)=>{state.captures=update(state.captures)},setOverall:(value:any)=>{state.overall=value},setActiveCaptureId:()=>{},
  buildInteriorPrompt:()=>'style',inferRoomType:()=>'living_room',INTERIOR_STYLE_PRESETS:{modern:{name:'现代简约'}},
  generateInterior:(input:any)=>new Promise((resolve,reject)=>{pending.push({input,resolve,reject})})};
 return {scope,state,pending,run:handler('generateRenders',scope)};
}
async function main(){
 let h=renderScope();h.scope.capturedViews=[{...h.state.captures[0],sceneRevision:11}];
 assert.equal(await h.run(),false);assert.equal(h.pending.length,0);assert.match(h.state.error,/重新拍摄/);assert.equal(h.state.busy,false);
 h=renderScope();const failed=h.run();h.pending[0].reject(new Error('装修生成等待超时，请重新生成。'));
 assert.equal(await failed,false);assert.equal(h.state.busy,false);assert.equal(h.state.captures[0].status,'failed');assert.match(h.state.error,/等待超时/);
 h=renderScope();const stale=h.run();h.scope.sceneForPersistence.current={nodes:{}};
 h.pending[0].resolve({image:{url:'/api/generated-images/stale.png'}});
 assert.equal(await stale,false);assert.equal(h.state.busy,false);assert.equal(h.state.captures[0].status,'captured');assert.equal(h.state.overall,null);
 h=renderScope();const old=h.run();h.scope.renderAbortController.current.abort();const newer=h.run();
 h.pending[0].resolve({image:{url:'/api/generated-images/old.png'}});
 assert.equal(await old,false);assert.equal(h.state.overall,null);assert.equal(h.state.busy,true,'old finally must not clear new busy flag');
 h.pending[1].resolve({image:{url:'/api/generated-images/new.png'}});
 assert.equal(await newer,true);assert.equal(h.state.busy,false);assert.equal(h.state.captures[0].status,'done');assert.equal(h.state.overall.url,'/api/generated-images/new.png');
 // Actual save handler must expose errors, preserve dirty state on failure and commit only after storage succeeds.
 const saveState:any={dirty:true,committed:null,error:'',saved:0};
 const saveScope:any={scene,modelMatchesSelection:true,currentBinding:binding,selectedVariant:{variantId:binding.variantId},sessionId:'test-session',
  assertPascalSceneIntegrity:()=>({valid:true}),sceneToBoundVariantBlueprint:()=>({id:binding.variantId}),
  calibrationForPersistence:{current:{variantId:binding.variantId}},saveVariantDesign:()=>{throw new Error('QuotaExceededError')},
  setBlueprintCalibration:()=>{},setBlueprintSource:()=>{},setFloorplanSpec:()=>{},blueprintToFloorplanSpec:(v:any)=>v,setFloorplanVersions:()=>{},sameModelBinding,floorplanModelBinding,
  blueprintDirty:{current:true},committedSceneRef:{current:scene},cloneScene:(v:any)=>JSON.parse(JSON.stringify(v)),
  setHasUnsavedChanges:(v:any)=>{saveState.dirty=v},setFurniturePresetStatus:()=>{},setError:(v:any)=>{saveState.error=v}};
 const save=handler('saveCurrentVariantDesign',saveScope);
 assert.equal(save(),false);assert.equal(saveState.dirty,true);assert.equal(saveScope.blueprintDirty.current,true);
 saveScope.saveVariantDesign=()=>{saveState.saved++};assert.equal(save(),true);assert.equal(saveState.saved,1);assert.equal(saveState.dirty,false);
 const captureState:any={views:[],error:''};let saveResult=false;
 const captureScope:any={scene,sceneRevision:12,sessionId:'test-session',modelMatchesSelection:true,blueprintDirty:{current:true},
  saveCurrentVariantDesign:()=>saveResult,capturedViews:[],rooms:[],activeRenderRoomId:undefined,selectedStyleId:'modern',confirmedBinding:binding,
  setError:(v:any)=>{captureState.error=v},setCapturedViews:(fn:any)=>{captureState.views=fn(captureState.views)},setActiveCaptureId:()=>{},
  buildInteriorPrompt:()=>'',inferRoomType:()=>'living_room',captureToastTimer:{current:null},setCaptureToast:()=>{},setLayoutProgress:()=>{},
  setTimeout:()=>1,clearTimeout:()=>{},console};
 const capture=handler('captureView',captureScope),input={id:'c2',image,sceneRevision:12,sessionId:'test-session'};
 await capture(input);assert.equal(captureState.views.length,0,'failed save blocks draft photo');
 saveResult=true;await capture({...input,sceneRevision:11});assert.equal(captureState.views.length,0,'stale renderer cannot claim current revision');
 await capture(input);assert.equal(captureState.views.length,1);assert.equal(captureState.views[0].sceneRevision,12);
 const viewer=readFileSync('/workspace/app-src/components/shared/PascalViewer.tsx','utf8');
 const original={apply:(x:number,y:number)=>({x:x*.05,y:y*.05})},shifted={apply:(x:number,y:number)=>({x:x*.05,y:(y-100)*.05})};
 const matrixRef={current:original as any};
 const svg={getScreenCTM:()=>({inverse:()=>shifted}),createSVGPoint:()=>({x:0,y:0,matrixTransform(m:any){return m.apply(this.x,this.y)}})};
 const eventPoint=handler('eventPoint',{gestureMatrix:matrixRef},viewer);
 assert.equal(eventPoint({currentTarget:svg,clientX:100,clientY:201})[1],10.05,'selection layout shift must not turn 1px into a 100px edit');
 matrixRef.current=null;
 assert.equal(eventPoint({currentTarget:svg,clientX:100,clientY:201})[1],5.050000000000001,'next gesture uses the new viewport');
 console.log(JSON.stringify({status:'PASS' ,kind:'actual-portal-handlers-with-stubs-no-ai',checks:['stale-photo-no-request','timeout-clears-busy','stale-scene-clears-rendering','cancelled-response-cannot-overwrite-new-request','storage-failure-keeps-draft','capture-auto-save-and-revision-guard','wall-drag-frozen-coordinates']},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
