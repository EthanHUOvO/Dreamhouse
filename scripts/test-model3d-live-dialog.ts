import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { canUseBoundModel } from '../lib/ai/model3d-binding';

// Run the actual portal close handler: this catches a dialog overwriting a
// successfully restored scene, which route/geometry tests cannot observe.
const source=readFileSync(new URL('../components/customer/TouchCustomerPortal.tsx',import.meta.url),'utf8');
const close=source.slice(source.indexOf('  function closeProgressTask()'),source.indexOf('  function applyGeneratedScene('));
const binding={variantId:'one-option-01',versionId:'original',canonicalImageUrl:'/preset/variants/one/option-01.png'};
function run(overrides:Record<string,any>={}){
 const writes:Record<string,any>={};
 runInNewContext(`${close}\ncloseProgressTask();`,{canUseBoundModel,progressTask:{kind:'model',error:'real AI validation failed'},
 floorPlanConfirmed:true,modelGenerationPhase:'completed',model3DLoaded:true,modelExperience:'viewer',
 selectionEpoch:{current:{binding}},confirmedBindingRef:{current:binding},modelBindingRef:{current:binding},
 setModelGenerationPhase:(v:any)=>writes.phase=v,setModelExperience:(v:any)=>writes.experience=v,
 setBomDetailsVisible:(v:any)=>writes.bom=v,setProgressTask:(v:any)=>writes.task=v,...overrides});
 return writes;
}
test('closing a failed live dialog retains the restored committed viewer',()=>{
 assert.deepEqual(run(),{phase:'completed',experience:'viewer',task:null});
});
test('closing a failed partial scene cannot unlock the viewer',()=>{
 assert.deepEqual(run({modelGenerationPhase:'error',model3DLoaded:false}),{phase:'error',experience:'intro',task:null});
});
test('closing a stale generation dialog cannot reuse a model bound to another version',()=>{
 assert.deepEqual(run({selectionEpoch:{current:{binding:{...binding,versionId:'V2'}}}}),{phase:'error',experience:'intro',task:null});
});
