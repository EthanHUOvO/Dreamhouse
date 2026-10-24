import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base=process.env.TEST_WEB_URL||'http://web:3000',root='/workspace',output={kind:'production-http-and-mcp',base,plans:[],editedScenes:[],negative:[],ai:[]};
const dir=`${root}/tests/svg-adapter/results`;mkdirSync(dir,{recursive:true});
const expected=JSON.parse(readFileSync(`${root}/tests/svg-adapter/source-annotations.json`));
const sha=s=>createHash('sha256').update(s).digest('hex');
const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
async function model3d(key,svg,names,uri=false){
  const start=performance.now(),sessionId=`svg-http-${key}-${Date.now()}`,hash=sha(svg);
  const response=await post('/api/ai/model3d/stream',{sessionId,sourceImageHash:hash,sourceImage:key,sourceImageDataUrl:uri?`data:image/svg+xml,${encodeURIComponent(svg)}`:`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,reconstructionMode:'auto',fallbackScene:{nodes:{}}});
  assert.equal(response.status,200);const text=await response.text(),events=text.split(/\r?\n\r?\n/).flatMap(b=>{const data=/^data: (.*)$/m.exec(b);return data?[JSON.parse(data[1])]:[];});
  assert.equal(events.filter(e=>e.type==='complete').length,1,text.slice(-1000));assert.ok(!events.some(e=>e.type==='fallback'||e.type==='error'),text.slice(-1000));
  assert.deepEqual(events.filter(e=>e.type==='tool'&&e.status==='complete').map(e=>e.name),['begin_floorplan_scene','set_floor_structure','set_openings','populate_basic_furniture','validate_scene','commit_scene']);
  const result=events.find(e=>e.type==='complete').result;assert.equal(result.validation.valid,true);assert.equal(result.sourceImageHash,hash);assert.equal(result.provenance.floorplanSource,'svg-deterministic/v1');assert.equal(result.provenance.model,null);
  const nodes=Object.values(result.scene.nodes),zones=nodes.filter(n=>n.type==='zone');assert.deepEqual(zones.map(z=>z.name),names);
  const bp=result.scene.nodes.building_house.metadata.floorplanBlueprint;
  assert.deepEqual(bp.rooms.map(r=>r.polygon),result.provenance.rawModelStructure.rooms.map(r=>r.polygon));
  if(key.endsWith('-partition')){
    const door=bp.doors.find(d=>d.id.startsWith('door_edit-')),master=bp.rooms.find(r=>r.semantic==='master_bedroom'),bath=bp.rooms.at(-1);
    assert.ok(door&&master&&bath.semantic==='bathroom');assert.deepEqual(new Set(door.connects),new Set([master.id,bath.id]));
  }
  if(key.endsWith('-sliding')){
    const door=bp.doors.find(d=>d.id.startsWith('door_edit-'));assert.equal(door?.doorType,'sliding');assert.deepEqual(new Set(door.connects.map(id=>bp.rooms.find(r=>r.id===id)?.semantic)),new Set(['living_room','balcony']));
  }
  for(const z of zones){const sem=z.metadata.semantic_type,kind=sem==='living_room'?'sofa':sem==='master_bedroom'?'doubleBed':null;if(kind)assert.ok(nodes.some(n=>n.type==='item'&&n.metadata?.room_id===z.id&&n.metadata?.furniture_asset_key===kind));}
  return {key,status:'PASS',sessionId,sourceImageHash:hash,rooms:zones.length,walls:bp.walls.length,doors:bp.doors.length,windows:bp.windows.length,elapsedMs:Math.round(performance.now()-start),uriEncoded:uri};
}
for(const[key,plan]of Object.entries(expected)){
  const[g,n]=key.split('-'),path=`/preset/svg-v2/${g}/option-${n}.svg`,svg=readFileSync(`${root}/public${path}`,'utf8'),served=await fetch(base+path);assert.equal(served.status,200);assert.equal(sha(await served.text()),sha(svg));
  const png=await post('/api/ai/svg-render',{svgText:svg});assert.equal(png.status,200);assert.equal(png.headers.get('content-type'),'image/png');assert.ok((await png.arrayBuffer()).byteLength>1000);
  const r=await model3d(key,svg,plan.rooms.map(r=>r[0]),key==='one-02');output.plans.push(r);console.log('HTTP',JSON.stringify(r));
}
const previous=JSON.parse(readFileSync(`${dir}/real-ai.json`));
for(const r of previous.results.filter(r=>r.status==='PASS')){
  const svg=readFileSync(`${dir}/${r.key}-${r.kind}.svg`,'utf8');output.editedScenes.push(await model3d(`${r.key}-${r.kind}`,svg,r.rooms));
}
// A geometry-only release can replay saved genuine AI outputs without running
// a new, costly inference. The evidence records the actual inference count.
const svg=readFileSync(`${root}/public/preset/svg-v2/one/option-01.svg`,'utf8');
if(process.env.SKIP_NEW_AI_INFERENCE!=='1'){
// One real HTTP editor request proves that the built route reaches the model.
const start=performance.now(),edited=await post('/api/ai/svg-edit',{svgText:svg,instruction:'在主卧内新增一个卫生间，需要加两面隔墙和一扇门'}),data=await edited.json();
assert.equal(edited.status,200,JSON.stringify(data));assert.equal(data.provenance.actualInference,true);assert.equal(data.provenance.model,'Ours');assert.equal(data.additions.filter(a=>a.type==='wall').length,2);assert.equal(data.additions.filter(a=>a.type==='door').length,1);
const render=await post('/api/ai/svg-render',{svgText:data.svg});assert.equal(render.status,200);writeFileSync(`${dir}/production-one-01-partition.png`,Buffer.from(await render.arrayBuffer()));writeFileSync(`${dir}/production-one-01-partition.svg`,data.svg);
output.ai.push({key:'one-01',kind:'partition',status:'PASS',model:data.provenance.model,elapsedMs:Math.round(performance.now()-start),attempts:data.attempts});
output.editedScenes.push(await model3d('production-one-01-partition',data.svg,data.structure.rooms.map(r=>r.name)));
}
const invalid=await post('/api/ai/model3d/stream',{sessionId:`svg-invalid-${Date.now()}`,sourceImageHash:'invalid-source',sourceImageDataUrl:`data:image/svg+xml;base64,${Buffer.from('<svg viewBox="0 0 10 10"><g></svg>').toString('base64')}`,fallbackScene:{nodes:{}},reconstructionMode:'auto'});const errorText=await invalid.text();assert.ok(errorText.includes('event: error'));assert.ok(!errorText.includes('event: complete')&&!errorText.includes('event: fallback'));output.negative.push({case:'invalid-svg-no-prebuilt-fallback',status:'PASS'});
const unsupported=await post('/api/ai/svg-edit',{svgText:svg,instruction:'把客厅改成游泳池'}),unsupportedBody=await unsupported.json();assert.equal(unsupported.status,422);assert.equal(unsupportedBody.rolledBack,true);assert.ok(!unsupportedBody.svg);output.negative.push({case:'unsupported-instruction-no-silent-other-edit',status:'PASS'});
const outputDir=process.env.SVG_HTTP_RESULT_DIR||dir;mkdirSync(outputDir,{recursive:true});
writeFileSync(`${outputDir}/production-http.json`,JSON.stringify(output,null,2));console.log(JSON.stringify({status:'PASS',basePlans:output.plans.length,editedScenes:output.editedScenes.length,realHttpAi:output.ai.length,negative:output.negative},null,2));
