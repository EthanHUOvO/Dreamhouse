import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import sharp from '/app/node_modules/sharp';
import {svgToStructure} from '/app/lib/ai/svg-geometry';
import {canonicalFromSpec,renderStructureSvg,parseStructureSvg} from '/app/lib/ai/structure-svg';
import {structureEditContext,generateStructureCandidates,applyStructureCandidate} from '/app/lib/ai/structure-primitives';
import {POST as rasterize} from '/app/app/api/ai/svg-render/route';
const root=process.env.BEDROOM_TEST_WORKSPACE||'/workspace',out=process.env.BEDROOM_TEST_OUTPUT||'/evidence';
const original=readFileSync(`${root}/public/preset/svg-v2/one/option-01.svg`,'utf8'),source=svgToStructure(original),canonical=renderStructureSvg(canonicalFromSpec(source));
const context=structureEditContext(original),master=context.rooms.find(r=>r.semantic==='master_bedroom')!,balcony=context.rooms.find(r=>r.semantic==='balcony'&&context.sharedBoundaries.some(b=>b.roomIds.includes(master.id)&&b.roomIds.includes(r.id)))!;
const op={id:'op1',type:'merge_rooms' as const,roomIds:[master.id,balcony.id]as[string,string],resultName:null,resultSemantic:null},analysis=generateStructureCandidates(original,op);assert.ok(analysis.candidates.length);
const edited=applyStructureCandidate(original,analysis.candidates[0].id,op);
const records:any[]=[];
const check=(name:string,fn:()=>unknown)=>{const evidence=fn();records.push({name,status:'PASS',evidence});console.log('PASS',name);};
function dimensions(svg:string){const root=/^<svg\b([^>]*)>/.exec(svg);assert.ok(root);const attr=(name:string)=>new RegExp(`\\b${name}="([^"]+)"`).exec(root[1])?.[1];return{width:Number(attr('width')),height:Number(attr('height')),viewBox:String(attr('viewBox')).split(/[\s,]+/).map(Number)};}
(async()=>{
for(const[label,svg,expected]of [['canonical-source',canonical,source],['actual-merge-output',edited.svg,edited.structure]]as const){
 const size=dimensions(svg),expectedHeight=Math.round(1024*size.viewBox[3]/size.viewBox[2]);
 check(label+'-explicit-display-pixels',()=>{assert.equal(size.width,1024);assert.equal(size.height,expectedHeight);assert.ok(size.height>=1&&size.height<=4096);assert.ok(size.viewBox[2]<100&&size.viewBox[3]<100,'geometry viewBox remains metres, separate from display pixels');return size;});
 check(label+'-metre-geometry-roundtrip-exact',()=>{const parsed=parseStructureSvg(svg);assert.ok(parsed);for(const key of ['outerPolygon','walls','rooms','doors','windows']as const){if(key==='rooms')assert.deepEqual(parsed.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.polygon})),expected.rooms.map(r=>({id:r.id,name:r.name,semantic:r.semantic,polygon:r.polygon})));else if(key==='outerPolygon'||key==='walls')assert.deepEqual(parsed[key],expected[key]);else{assert.deepEqual(parsed[key].map(o=>[o.id,o.wallId]),expected[key].map(o=>[o.id,o.wallId]));for(const actual of parsed[key]){const before=expected[key].find(o=>o.id===actual.id)!;assert.ok(Math.abs(actual.width-before.width)<=1e-12);assert.ok(Math.abs(actual.distance-before.distance)<=1e-12);}}}return{viewBoxUnchanged:true,geometryUnits:'metres',openingFloatRoundtripToleranceM:1e-12};});
 const response=await rasterize({json:async()=>({svgText:svg})}as any);assert.equal(response.status,200);const buffer=Buffer.from(await response.arrayBuffer()),metadata=await sharp(buffer).metadata();
 check(label+'-actual-PNG-route-size',()=>{assert.equal(response.headers.get('content-type'),'image/png');assert.equal(metadata.width,1024);assert.ok(Math.abs(Number(metadata.height)-expectedHeight)<=1);assert.ok(Number(metadata.width)>100,'reject the former approximately 14px raster output');return{width:metadata.width,height:metadata.height,format:metadata.format,bytes:buffer.length};});
}
check('invalid-explicit-display-width-rejected',()=>{assert.throws(()=>parseStructureSvg(canonical.replace('width="1024"','width="14"')),/STRUCTURE_SVG_PIXEL_SIZE_OR_ASPECT_RATIO_INVALID/);});
check('invalid-explicit-display-aspect-rejected',()=>{const size=dimensions(canonical);assert.throws(()=>parseStructureSvg(canonical.replace(`height="${size.height}"`,`height="${size.height+20}"`)),/STRUCTURE_SVG_PIXEL_SIZE_OR_ASPECT_RATIO_INVALID/);});
check('legacy-metre-profile-without-display-size-still-readable',()=>{const size=dimensions(canonical),legacy=canonical.replace(` width="1024" height="${size.height}"`,'');const parsed=parseStructureSvg(legacy);assert.ok(parsed);assert.deepEqual(parsed.rooms.map(r=>r.polygon),source.rooms.map(r=>r.polygon));return{backwardCompatibleParsing:true,legacyCachedPNGQuality:'NOT_REGENERATED_BY_THIS_TEST'};});
mkdirSync(out,{recursive:true});writeFileSync(`${out}/svg-raster.json`,JSON.stringify({kind:'PROGRAMMATIC_REAL_SHARP_AND_ROUTE_NO_AI',summary:{pass:records.length,fail:0},tests:records,limitations:['Raster dimensions and geometry consistency are verified, not subjective visual quality.','No model is called. The historical first study SVG_EDIT_FAILED remains UNKNOWN; a later successful replay does not explain that failure.']},null,2));console.log(JSON.stringify({pass:records.length,fail:0}));
})().catch(error=>{console.error(error);process.exitCode=1});
