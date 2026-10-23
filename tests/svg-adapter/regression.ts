import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {svgToStructure,pointInPolygon,polygonArea} from '/app/lib/ai/svg-geometry';
import {svgEditContext,applySvgEdits,partitionCandidates} from '/app/lib/ai/svg-edit-geometry';
import * as session from '/app/services/pascal-mcp/session-store';
import {sceneToFloorplanBlueprint,compileBlueprintToPascal,blueprintWallCoordinateError} from '/app/lib/floorplans/blueprint';
import {DoorNode} from '/app/node_modules/@pascal-app/core/dist/schema/nodes/door.js';
import {selectedSvgSource,svgDataUrl,svgFromDataUrl,acceptsSvgScene} from '/app/lib/ai/svg-version';
import {shouldHydrateImportedPreset} from '/app/lib/ai/model3d-source';
import {floorplanModelBinding,restoreBoundModelSession} from '/app/lib/ai/model3d-binding';
import {packModelSession,unpackModelSession} from '/app/lib/ai/inline-image-persistence';
const root='/workspace',output:any={kind:'programmatic-no-model-inference',plans:[],negative:[],edits:[]};
const annotations=JSON.parse(readFileSync(`${root}/tests/svg-adapter/source-annotations.json`,'utf8'));
const read=(key:string)=>{const[k,n]=key.split('-');return readFileSync(`${root}/public/preset/svg-v2/${k}/option-${n}.svg`,'utf8');};
for(const[key,expected]of Object.entries(annotations) as any){
  console.log(`TEST ${key}`);
  const started=performance.now(),svg=read(key),st=svgToStructure(svg);
  assert.deepEqual(st.rooms.map(r=>[r.name,r.sourceArea]),expected.rooms.map((r:any)=>[r[0],+r[1]]),key);
  assert.equal(st.doors.length,expected.doors.length+expected.parallel.length+(key==='three-07'?1:0));
  assert.equal(st.windows.length,expected.windows.length);
  for(const o of [...st.doors,...st.windows]){
    const w=st.walls.find(w=>w.id===o.wallId)!;assert.ok(w,o.id);
    const len=Math.hypot(w.end[0]-w.start[0],w.end[1]-w.start[1]);
    assert.ok(o.width>0&&o.distance>=o.width/2-.001&&o.distance+o.width/2<=len+.001,o.id);
  }
  const id=`svg-unit-${key}-${Date.now()}`,hash='svg-regression-source';
  let r=session.beginFloorplanScene({sessionId:id,sourceImageHash:hash,sourceImage:key});
  const ident=()=>({sessionId:id,sourceImageHash:hash,revision:r.revision});
  r=session.setFloorStructure({...ident(),...st,sourceSvg:svg,geometrySource:'svg-deterministic/v1',scaleMethod:'drawing-dimensions'});
  r=session.setOpenings({...ident(),doors:st.doors,windows:st.windows});
  r=session.populateBasicFurniture(ident());r=session.validateScene(ident());assert.equal(r.validation.valid,true,JSON.stringify(r.validation));
  r=session.commitScene(ident());
  const bp=sceneToFloorplanBlueprint(r.scene!),round=compileBlueprintToPascal(bp),nodes=Object.values(round.nodes) as any[];
  assert.equal(r.provenance.floorplanSource,'svg-deterministic/v1');assert.equal(r.provenance.model,null);
  assert.deepEqual(bp.rooms.map(r=>r.name),st.rooms.map(r=>r.name));
  assert.deepEqual(bp.rooms.map(r=>r.polygon),st.rooms.map(r=>r.polygon));
  assert.equal(blueprintWallCoordinateError(round,bp),0);
  for(const o of st.doors){const d=bp.doors.find(d=>d.id===o.id)!;assert.equal(d.width,o.width);assert.ok(Math.abs(d.offset+o.width/2-o.distance)<1e-12);assert.equal(d.doorType,o.doorType);}
  for(const r of st.rooms.filter(r=>['living_room','master_bedroom'].includes(r.semantic))){const kind=r.semantic==='living_room'?'sofa':'doubleBed';assert.ok(nodes.some(n=>n.type==='item'&&n.metadata?.room_id===r.id&&n.metadata?.furniture_asset_key===kind),`${key}:${r.name}:${kind}`);}
  for(const d of nodes.filter(n=>n.type==='door')){assert.ok(d.position[1]-d.height/2>=-.001,`door below local floor:${d.id}`);const native=DoorNode.safeParse(d);assert.ok(native.success,JSON.stringify(native.error));}
  output.plans.push({key,status:'PASS',rooms:st.rooms.length,walls:st.walls.length,doors:st.doors.length,windows:st.windows.length,elapsedMs:+(performance.now()-started).toFixed(1),areas:st.rooms.map(r=>({name:r.name,printed:r.sourceArea,measured:+r.expectedArea.toFixed(3),relativeDelta:r.sourceArea?+(r.expectedArea/r.sourceArea-1).toFixed(3):null})),apertureHosts:st.doors.concat(st.windows).filter(o=>(o as any).apertureHost).map(o=>o.sourceGlyph)});
}
const reject=(name:string,fn:()=>unknown)=>{assert.throws(fn);output.negative.push({name,status:'PASS'});};
for(const key of ['two-01','three-07']){const[k,n]=key.split('-');reject(`raw-source-ambiguity:${key}`,()=>svgToStructure(readFileSync(`${root}/tests/svg-adapter/original/${k}/option-${n}.svg`,'utf8')));}
const one=read('one-01');
const oneGeometry=svgToStructure(one),co=oneGeometry.coordinates;
const metric=(x:number,y:number):[number,number]=>[(x-co.minX)*co.metersPerUnitX,(y-co.minY)*co.metersPerUnitY];
const living=oneGeometry.rooms.find(r=>r.semantic==='living_room')!;
assert.ok(pointInPolygon(metric(320,200),living.polygon),'entry neck belongs to concave living room');
assert.ok(!pointInPolygon(metric(237,171),living.polygon),'bathroom must not be absorbed by living-room bounding box');
const measuredDoor=oneGeometry.doors.find(d=>d.sourceGlyph==='hinged-door-02')!,host=oneGeometry.walls.find(w=>w.id===measuredDoor.wallId)!,length=Math.hypot(host.end[0]-host.start[0],host.end[1]-host.start[1]);
const doorCentre=host.start.map((v,i)=>v+(host.end[i]-v)/length*measuredDoor.distance),expectedCentre=metric(294,(184+235)/2);
assert.ok(Math.hypot(doorCentre[0]-expectedCentre[0],doorCentre[1]-expectedCentre[1])<.06,'hinge must not be used as the opening centre');
assert.ok(Math.abs(measuredDoor.width-51*co.metersPerUnitY)<1e-9,'opening width comes from source endpoints');
assert.equal(svgFromDataUrl(svgDataUrl(one)),one);
assert.equal(shouldHydrateImportedPreset('svg-deterministic/v1'),false);
reject('zero-window',()=>svgToStructure(one.replace('width="111" height="16"','width="0" height="16"')));
reject('entity',()=>svgToStructure('<!DOCTYPE svg [<!ENTITY secret SYSTEM "file:///etc/passwd">]>'+one));
reject('open-xml',()=>svgToStructure(one.replace('</svg>','')));
reject('duplicate-id',()=>svgToStructure(one.replace('id="window-02"','id="window-01"')));
reject('geometry-transform',()=>svgToStructure(one.replace('id="walls"','id="walls" transform="translate(10,0)"')));
reject('floating-door',()=>svgToStructure(one.replace('</svg>','<path id="floating" d="M600,30 L600,60 A30,30 0 0 0 630,30 Z" stroke="#2e9e4f"/></svg>')));
reject('unsupported-wall-curve',()=>svgToStructure(one.replace('M406,541','M406,541 Q410,540 420,550')));
reject('wall-outside-target',()=>applySvgEdits(one,'在主卧内新增一个卫生间，需要加两面隔墙和一扇门',[{type:'wall',x1:-1,y1:-1,x2:2,y2:-1},{type:'wall',x1:2,y1:-1,x2:2,y2:3},{type:'door',x1:2,y1:1,x2:2,y2:1.75},{type:'label',x:1,y:1,text:'卫生间'}]));
// A failed strict SVG opening must not be silently repaired or mutate revision.
let r=session.beginFloorplanScene({sessionId:'negative-opening',sourceImageHash:'negative-opening',sourceImage:'one-01'}),st=svgToStructure(one);
r=session.setFloorStructure({sessionId:r.sessionId,sourceImageHash:r.sourceImageHash,revision:r.revision,...st,sourceSvg:one,geometrySource:'svg-deterministic/v1'});
const previous=JSON.stringify(r);
reject('opening-no-repair-and-rollback',()=>session.setOpenings({sessionId:r.sessionId,sourceImageHash:r.sourceImageHash,revision:r.revision,doors:[{...st.doors[0],width:0}],windows:st.windows}));
assert.equal(JSON.stringify(session.getPascalSession(r.sessionId)),previous);
let invalid=session.beginFloorplanScene({sessionId:'negative-source',sourceImageHash:'negative-source',sourceImage:'one-01'});
reject('cannot-claim-svg-provenance-without-svg',()=>session.setFloorStructure({sessionId:invalid.sessionId,sourceImageHash:invalid.sourceImageHash,revision:invalid.revision,...st,geometrySource:'svg-deterministic/v1'}));
reject('cannot-change-parsed-room-geometry',()=>session.setFloorStructure({sessionId:invalid.sessionId,sourceImageHash:invalid.sourceImageHash,revision:invalid.revision,...st,sourceSvg:one,rooms:st.rooms.map((r,i)=>i? r:{...r,name:'伪造房间'}),geometrySource:'svg-deterministic/v1'}));
// Legacy ungrouped millimetre input remains supported, with no fixed outline.
const legacy=svgToStructure(readFileSync(`${root}/v2-svg-option1-1.svg`,'utf8'));assert.equal(legacy.rooms.length,6);assert.deepEqual(legacy.rooms.map(r=>r.sourceArea),[3.58,11.65,15.84,4.72,4.21,3.7]);output.legacy={status:'PASS',rooms:6};
for(const key of ['one-01','two-02','three-03']){
  const svg=read(key),instruction='在主卧内新增一个卫生间，需要加两面隔墙和一扇门',candidates=partitionCandidates(svg,instruction);
  assert.ok(candidates.length>0,key);
  const edited=applySvgEdits(svg,instruction,candidates[0].additions);
  assert.equal(edited.structure.rooms.length,svgToStructure(svg).rooms.length+1);
  // Byte preservation is checked on complete dimension groups and all labels
  // other than the edited master bedroom, not by reserialising the document.
  for(const id of ['dimension-labels','source-dimensions']){const tag=new RegExp(`<g id="${id}"[\\s\\S]*?<\\/g>`).exec(svg)?.[0];if(tag)assert.ok(edited.svg.includes(tag));}
  output.edits.push({key,kind:'programmatic-candidate-not-ai',status:'PASS',candidates:candidates.length});
}
function makeScene(svg:string,id:string){const st=svgToStructure(svg),hash='version-test-source';let r=session.beginFloorplanScene({sessionId:id,sourceImageHash:hash,sourceImage:id});const identity=()=>({sessionId:id,sourceImageHash:hash,revision:r.revision});r=session.setFloorStructure({...identity(),...st,sourceSvg:svg,geometrySource:'svg-deterministic/v1',scaleMethod:'drawing-dimensions'});r=session.setOpenings({...identity(),doors:st.doors,windows:st.windows});r=session.populateBasicFurniture(identity());r=session.validateScene(identity());return session.commitScene(identity()).scene!;}
const modified=applySvgEdits(one,'在主卧内新增一个卫生间，需要加两面隔墙和一扇门',partitionCandidates(one,'在主卧内新增一个卫生间，需要加两面隔墙和一扇门')[0].additions).svg;
const variantId='one-option-01',versionResults=[one,modified].map((svg,i)=>({id:`v${i+1}`,sourceVariantId:variantId,sourceImageHash:'version-test-source',svgSource:svg,submittedRequirement:`requirement-${i+1}`,result:{provider:'qwen',model:'svg-edit',url:`/version-${i+1}.png`,sourceVariantId:variantId,sourceImageHash:'version-test-source',userPrompt:`requirement-${i+1}`,geometryVerified:true}}));
assert.equal(selectedSvgSource(versionResults,'v1',variantId,one),one);
assert.equal(selectedSvgSource(versionResults,'v2',variantId,one),modified);
assert.equal(selectedSvgSource(versionResults,null,variantId,one),one);
reject('missing-version-xml-never-inherits-latest',()=>selectedSvgSource([{...versionResults[0],svgSource:undefined}],'v1',variantId,modified));
let wrongScene:any;
for(const [i,v]of versionResults.entries()){
  const binding=floorplanModelBinding(variantId,v.result,v.id)!,scene=makeScene(v.svgSource,`version-restore-${i}`);
  Object.assign(scene.nodes.building_house.metadata,{modelBinding:binding,variantId,sourceDrawing:binding.canonicalImageUrl});
  const saved={selectedVariant:{variantId,imageUrl:'/original.svg'},floorplanVersions:versionResults,selectedFloorplanVersionId:v.id,generatedFloorplan:v.result,currentPascalScene:scene,floorPlanConfirmed:true,model3DLoaded:true,modelGenerationPhase:'completed',confirmedBinding:binding,modelBinding:binding,customRequirement:v.submittedRequirement,currentStep:3};
  const persisted=unpackModelSession(JSON.parse(JSON.stringify(packModelSession(saved)))),restored=restoreBoundModelSession(persisted);
  assert.equal(restored.modelLoaded,true);assert.equal(restored.blueprint?.rooms.length,i?7:6);assert.equal(selectedSvgSource(persisted.floorplanVersions,v.id,variantId,one),v.svgSource);
  assert.ok(acceptsSvgScene({scene,sourceImageHash:'same',validation:{valid:true}},'same'));assert.ok(!acceptsSvgScene({scene,sourceImageHash:'wrong',validation:{valid:true}},'same'));
  if(i)wrongScene=scene;else output.versionSaved=saved;
}
assert.equal(restoreBoundModelSession({...output.versionSaved,currentPascalScene:wrongScene}).modelLoaded,false);
delete output.versionSaved;output.versions={status:'PASS',v1Rooms:6,v2Rooms:7,xmlRestored:true,wrongVersionRejected:true,svgNotReplacedByPreset:true};
for(const key of Object.keys(annotations))for(const instruction of ['在主卧内新增一个卫生间，需要加两面隔墙和一扇门','在客厅和阳台之间加一扇推拉门']){try{const c=svgEditContext(read(key),instruction);output.edits.push({key,partition:c.partition,freeSpans:c.context.freeLivingBalconySpans.length,masterVertices:c.target?.polygon.length});}catch(e:any){output.edits.push({key,error:e.message});}}
mkdirSync(`${root}/tests/svg-adapter/results`,{recursive:true});writeFileSync(`${root}/tests/svg-adapter/results/programmatic.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify({status:'PASS',plans:output.plans.map(({key,rooms,elapsedMs}:any)=>({key,rooms,elapsedMs})),negative:output.negative,legacy:output.legacy,editFeasibility:output.edits},null,2));
