import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPascalSceneGeneration } from '../lib/ai/local-model3d-agent';

const input={sessionId:'strict-agent',sourceImageHash:'12345678',sourceImage:'original.png',sourceImageDataUrl:'data:image/png;base64,dGVzdA==',strictGeometry:true};
const structure={scaleMethod:'drawing-dimensions',dimensionEvidence:{unit:'mm',horizontalChains:[[3000,3000]],verticalChains:[[4000]]},
 outerPolygon:[[0,0],[6,0],[6,4],[0,4]],walls:[{id:'entry',start:[0,0],end:[3,0]},{id:'split',start:[3,0],end:[3,4]}],
 rooms:[{id:'living',name:'客餐厅',semantic:'living_dining',polygon:[[0,0],[3,0],[3,4],[0,4]],expectedArea:12},
 {id:'bed',name:'主卧',semantic:'bedroom',polygon:[[3,0],[6,0],[6,4],[3,4]],expectedArea:12}]};
const openings={doors:[{id:'entryDoor',wallId:'entry',width:.86,distance:1.5},{id:'bedDoor',wallId:'split',width:.86,distance:2}],windows:[]};
function dependencies(s=structure,o:any=openings){
 const calls:any[]=[],modelCalls:any[]=[];let revision=0;
 return {calls,modelCalls,model:'stub',tools:['set_floor_structure','set_openings'].map(name=>({name,inputSchema:{type:'object',properties:{}}})),
 chat:async(body:any)=>{modelCalls.push(body);const name=body.tools[0].function.name;return {choices:[{message:{tool_calls:[{id:`call-${modelCalls.length}`,function:{name,arguments:JSON.stringify(name==='set_floor_structure'?s:o)}}]}}]};},
 call:async(name:string,args:any)=>{calls.push({name,args});return {revision:++revision,status:name,scene:{nodes:{entryDoor:{connects:['living',null]},bedDoor:{connects:['living','bed']}}},validation:{valid:true,issues:[]}};}};
}
test('strict orchestration commits measured valid geometry and canonical furniture semantics',async()=>{
 const d=dependencies();await runPascalSceneGeneration(input,d);
 assert.equal(d.calls.at(-1).name,'commit_scene');assert.equal(d.modelCalls.length,2);
 assert.deepEqual(d.calls[1].args.rooms.map((r:any)=>r.semantic),['living_room','master_bedroom']);
 assert.equal(d.calls[2].args.doors[0].width,.86);assert.equal(d.calls[2].args.doors[0].distance,1.5);
});
test('strict topology failure blocks commit despite MCP core validity and bounds corrections',async()=>{
 const d=dependencies(structure,{doors:[openings.doors[0]],windows:[]});
 await assert.rejects(runPascalSceneGeneration(input,d),/rooms disconnected/);
 assert.equal(d.calls.some(c=>c.name==='commit_scene'),false);assert.equal(d.modelCalls.length,6);
});
test('strict mode rejects missing widths without calling opening tool or filling defaults',async()=>{
 const d=dependencies(structure,{doors:[{id:'entryDoor',wallId:'entry',distance:1.5}],windows:[]});
 await assert.rejects(runPascalSceneGeneration(input,d),/finite positive measured width/);
 assert.equal(d.calls.some(c=>c.name==='set_openings'||c.name==='commit_scene'),false);assert.equal(d.modelCalls.length,4);
});
test('strict dimension contradictions fail before any geometry is applied',async()=>{
 const s=structuredClone(structure);s.dimensionEvidence.horizontalChains=[[10000]];const d=dependencies(s);
 await assert.rejects(runPascalSceneGeneration(input,d),/disagree with printed mm chains/);
 assert.deepEqual(d.calls.map(c=>c.name),['begin_floorplan_scene']);assert.equal(d.modelCalls.length,3);
});
