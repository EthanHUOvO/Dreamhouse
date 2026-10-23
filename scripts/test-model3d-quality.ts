import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectModel3dQuality, type ModelStructure } from '../lib/ai/model3d-quality';

const structure: ModelStructure = {
  outerPolygon: [[0,0],[6,0],[6,4],[0,4]],
  walls: [{ id:'entry',start:[0,0],end:[3,0] },{ id:'split',start:[3,0],end:[3,4] },{ id:'east',start:[6,0],end:[6,4] }],
  rooms: [{ id:'living',name:'客餐厅',polygon:[[0,0],[3,0],[3,4],[0,4]],expectedArea:12 },{ id:'bed',name:'主卧',polygon:[[3,0],[6,0],[6,4],[3,4]],expectedArea:12 }],
};
const doors = [{ id:'entryDoor',wallId:'entry',width:.86,distance:1.5 },{ id:'bedDoor',wallId:'split',width:.86,distance:2 }];
const inspect = (s=structure,d=doors,w:any[]=[],scene?:any)=>inspectModel3dQuality(s,{doors:d,windows:w},scene);

test('connected rooms and real exterior entrance pass, independent of names/model labels',()=>{
  const before=JSON.stringify(structure), result=inspect();
  assert.equal(result.valid,true); assert.equal(result.exteriorDoors,1); assert.equal(result.connectedRoomCount,2);
  assert.equal(JSON.stringify(structure),before);
});
test('missing room doors and an exterior entrance are detected without inserting defaults',()=>{
  assert.match(inspect(structure,doors.slice(0,1)).issues.join(';'),/disconnected/);
  assert.match(inspect(structure,doors.slice(1)).issues.join(';'),/exterior entrance/);
});
test('openings cannot overlap horizontally and vertically; genuine transoms are allowed',()=>{
  const windows=[{id:'a',wallId:'east',distance:2,width:1.5},{id:'b',wallId:'east',distance:2.7,width:1.5}];
  assert.match(inspect(structure,doors,windows).issues.join(';'),/overlap/);
  assert.equal(inspect(structure,doors,[{id:'transom',wallId:'entry',distance:1.5,width:.86,sillHeight:2.2,height:.3}]).valid,true);
});
test('zero/negative/nonfinite/missing widths and out-of-wall centers are rejected',()=>{
  for(const width of [0,-1,NaN,undefined])assert.match(inspect(structure,[{...doors[0],width} as any,doors[1]]).issues.join(';'),/invalid dimensions/);
  assert.match(inspect(structure,[{...doors[0],distance:4},doors[1]]).issues.join(';'),/host wall/);
});
test('area labels do not silently validate greatly different polygon areas',()=>{
  const s=structuredClone(structure);s.rooms[0].expectedArea=3.58;
  assert.match(inspect(s).issues.join(';'),/mm dimensions and m2/);
});
test('doors into missing internal corridor polygons are detected',()=>{
  const s=structuredClone(structure);s.rooms[1].polygon=[[3.5,0],[6,0],[6,4],[3.5,4]];
  assert.match(inspect(s).issues.join(';'),/unassigned interior space/);
});
test('stored door links must match local geometric sides, not every room touching a long wall',()=>{
  const scene={nodes:{entryDoor:{connects:['living',null]},bedDoor:{connects:['bed','living']}}};
  assert.equal(inspect(structure,doors,[],scene).valid,true);
  scene.nodes.bedDoor.connects=['living','unrelated'];
  assert.match(inspect(structure,doors,[],scene).issues.join(';'),/split host wall/);
});
