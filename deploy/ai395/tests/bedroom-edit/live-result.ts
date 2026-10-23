import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {verifyBedroomStructure,verifySceneMatchesSvg,buildSceneFromSvg,verifyDoorGraph,verifyFurnishedAccess,verifySaveRestore,hash} from './assertions';

const root=process.env.BEDROOM_TEST_WORKSPACE||'/workspace';
const originalPath=process.env.BEDROOM_LIVE_SOURCE||`${root}/public/preset/svg-v2/one/option-01.svg`;
const svgPath=process.env.BEDROOM_LIVE_SVG||'/live/one-01.svg';
const scenePath=process.env.BEDROOM_LIVE_SCENE||'/live/one-01-scene.json';
const outputPath=process.env.BEDROOM_LIVE_OUTPUT||'/evidence/live-result-validation.json';
const output:any={kind:'independent-validation-of-live-AI-output',aiInferencePerformedByThisScript:false,timestamp:new Date().toISOString(),status:'FAIL',inputPaths:{originalPath,svgPath,scenePath},checks:{},limitations:['This script consumes the saved live HTTP output; it does not invoke a model.','The actual returned SceneGraph is checked directly and is not replaced by a deterministic candidate or newly compiled edited scene.','Storage roundtrip is a programmatic harness with the same production binding/serializer; the raw model3d HTTP result has no Portal version binding. Browser persistence is a separate test.']};
const started=performance.now();
try {
 const originalSvg=readFileSync(originalPath,'utf8'),editedSvg=readFileSync(svgPath,'utf8'),sceneText=readFileSync(scenePath,'utf8'),scene=JSON.parse(sceneText);
 assert.ok(scene&&scene.nodes&&Array.isArray(scene.rootNodeIds),'input must be the actual SceneGraph, not a response wrapper');
 const originalSceneText=JSON.stringify(scene);
 output.inputHashes={originalSvg:hash(originalSvg),editedSvg:hash(editedSvg),sceneFile:hash(sceneText)};
 output.actualSceneMetadata={floorplanSource:scene.nodes.building_house?.metadata?.floorplanSource,sourceImageHash:scene.nodes.building_house?.metadata?.sourceImageHash,mcpSessionId:scene.nodes.building_house?.metadata?.mcpSessionId,modelBinding:scene.nodes.building_house?.metadata?.modelBinding??null};
 const geometry=verifyBedroomStructure(originalSvg,editedSvg);
 output.checks.structure=geometry.summary;
 // Only the original scene is compiled to provide an independent before state.
 const baseline=buildSceneFromSvg(originalSvg,'one-option-01','live-result-original-reference');
 const actual=verifySceneMatchesSvg(editedSvg,scene);
 output.checks.actualReturnedScene={status:'PASS',rooms:actual.bp.rooms.length,walls:actual.bp.walls.length,doors:actual.bp.doors.length,windows:actual.bp.windows.length,roomPolygonsExact:true,wallCoordinatesExact:true,openingHostsOffsetsWidthsExact:true,doorsAboveFloor:true};
 const graph=verifyDoorGraph(baseline.bp,actual.bp,geometry.target.id,geometry.bedroom.id);
 output.checks.doorGraph=graph;
 output.checks.independentFurnitureAndWalkthrough=verifyFurnishedAccess(baseline.scene,scene,actual.bp,geometry.before,geometry.target.id,geometry.bedroom.id,graph.newDoorId);
 output.checks.productionFinalSceneGuard=assertBedroomSceneUsable(scene,geometry.before,geometry.target.id,geometry.bedroom.id);
 output.checks.programmaticSaveRestore={scope:'actual scene clone bound to fixture V1/V2 using production binding, strict variant storage and session serializers; not a browser refresh claim',...verifySaveRestore('one-option-01',originalSvg,editedSvg,baseline.scene,scene)};
 assert.equal(JSON.stringify(scene),originalSceneText,'validation or storage test must not mutate the actual returned scene');
 assert.equal(readFileSync(svgPath,'utf8'),editedSvg,'actual returned SVG was modified');
 assert.equal(readFileSync(scenePath,'utf8'),sceneText,'actual returned scene file was modified');
 output.checks.inputUnchanged=true;output.status='PASS';
} catch(error:any) {
 output.error={message:error.message,stack:error.stack};process.exitCode=1;
}
output.elapsedMs=performance.now()-started;
mkdirSync(dirname(outputPath),{recursive:true});writeFileSync(outputPath,JSON.stringify(output,null,2));
console.log(JSON.stringify({kind:output.kind,status:output.status,elapsedMs:output.elapsedMs,error:output.error?.message,outputPath},null,2));
