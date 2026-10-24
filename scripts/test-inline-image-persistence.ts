import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { packInlineImages,unpackInlineImages,packModelSession,unpackModelSession } from '../lib/ai/inline-image-persistence';
import { restoreBoundModelSession } from '../lib/ai/model3d-binding';
import { prepareDreamHouseScene } from '../lib/floorplans/pascal-v2/imported-two';

const url='data:image/png;base64,'+'a'.repeat(750_000), binding={variantId:'one-option-01',versionId:'V1',canonicalImageUrl:url};
test('repeated structure previews fit storage while roundtrip preserves every scene coordinate and identity',()=>{
 const scene=JSON.parse(readFileSync('public/preset/pascal-v2/one/option-01.pascal.json','utf8'));
 prepareDreamHouseScene(scene,{variantId:binding.variantId,residenceType:'one',optionIndex:1,imageUrl:'/preset/variants/one/option-01.png',imageHash:'12345678',imageDataUrl:null},'storage regression');
 Object.assign(scene.nodes.building_house.metadata||={}, {floorplanSource:'source-driven-pascal-v2',variantId:binding.variantId,modelBinding:binding,sourceDrawing:url});
 const result={url,provider:'qwen',sourceVariantId:binding.variantId,sourceImageHash:'12345678',userPrompt:'书房'};
 const saved={selectedVariant:{variantId:binding.variantId},generatedFloorplan:result,generatedFloorplanImage:url,aiFloorplan:{...result,prompt:'书房'},
  floorplanVersions:[{id:'V1',result,sourceVariantId:binding.variantId,sourceImageHash:'12345678',submittedRequirement:'书房',sceneSnapshot:scene}],
  selectedFloorplanVersionId:'V1',modelBinding:binding,confirmedBinding:binding,customRequirement:'书房',currentPascalScene:scene,pascalScene:scene,basePascalScene:scene,
  model3DLoaded:true,modelGenerationPhase:'completed',floorPlanConfirmed:true,currentStep:2};
 const before=JSON.stringify(saved), packed=JSON.stringify(packModelSession(saved));
 assert.ok(before.length>5_000_000);assert.ok(packed.length<2_000_000);assert.equal(JSON.stringify(saved),before);
 const restored=unpackModelSession(JSON.parse(packed));assert.deepEqual(restored,JSON.parse(before));
 assert.equal(restoreBoundModelSession(restored).modelLoaded,true);assert.equal(restoreBoundModelSession(restored).binding?.canonicalImageUrl,url);
 console.log(JSON.stringify({beforeChars:before.length,afterChars:packed.length}));
});
test('different version images remain different and cannot bind V2 to a V1 scene',()=>{
 const a={first:url,second:url+'b',nested:{first:url,second:url+'b'},modelBinding:binding};
 assert.deepEqual(unpackInlineImages(JSON.parse(JSON.stringify(packInlineImages(a)))),a);
});
test('legacy records without tables remain compatible and missing/corrupt payloads fail explicitly',()=>{
 const old={url:'/preset/one.png',scene:{position:[1,0,2]}};assert.equal(unpackInlineImages(old),old);assert.equal(packInlineImages(old),old);
 assert.throws(()=>unpackInlineImages({__dreamHouseInlineImagesV1:{},url:{__dreamHouseInlineImageRefV1:'0'}}),/Missing/);
 assert.throws(()=>unpackInlineImages({__dreamHouseInlineImagesV1:{'0':'not-an-image'}}),/Invalid/);
});
test('different scene versions remain distinct; missing scene references fail explicitly',()=>{
 const one={nodes:{wall:{start:[0,0],end:[1,0]}},rootNodeIds:['wall']},two=structuredClone(one);two.nodes.wall.end=[2,0];
 const saved={base:one,current:two,versions:[one,two]};
 assert.deepEqual(unpackModelSession(JSON.parse(JSON.stringify(packModelSession(saved)))),saved);
 assert.throws(()=>unpackModelSession({__dreamHouseScenesV1:{},current:{__dreamHouseSceneRefV1:'0'}}),/Missing/);
});
