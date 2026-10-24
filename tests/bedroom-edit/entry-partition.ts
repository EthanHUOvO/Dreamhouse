import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSceneFromSvg,verifySaveRestore} from './assertions';
import {assertBedroomSceneUsable} from '/app/lib/ai/bedroom-scene-validation';
import {doorWorldXZ,isWalkthroughPositionBlocked} from '/app/lib/walkthrough-runtime';
const raw=readFileSync('/workspace/public/preset/svg-v2/three/option-01.svg','utf8');
const edited=readFileSync('/workspace/tests/bedroom-edit/fixtures/three-01-entry-partition.svg','utf8');
const before=buildSceneFromSvg(raw,'three-entry','before'),after=buildSceneFromSvg(edited,'three-entry','after');
const door='door_hinged-door-01',a=doorWorldXZ(before.scene,before.scene.nodes[door])!,b=doorWorldXZ(after.scene,after.scene.nodes[door])!;
assert.deepEqual(b,a,'Unchanged entry must not move when the exterior wall run is split');
assert.deepEqual(after.structure.outerPolygon,before.structure.outerPolygon,'Interior edit must retain source exterior');
assert.equal(isWalkthroughPositionBlocked(after.scene,b.x,b.z,new Set(after.bp.doors.map(d=>d.id)),.22),false);
assertBedroomSceneUsable(after.scene,before.structure,'room_1','room_9');
verifySaveRestore('three-entry',raw,edited,before.scene,after.scene);
// A genuinely obstructed entry still fails the same final guard.
const blocked=structuredClone(after.scene);blocked.nodes.blocking_wall={id:'blocking_wall',type:'wall',start:[b.x-.5,b.z],end:[b.x+.5,b.z],thickness:.12,height:2.8} as any;
assert.throws(()=>assertBedroomSceneUsable(blocked,before.structure,'room_1','room_9'));
console.log('PASS unchanged entry centreline, exterior, furnished access, restore; obstruction rejected (NO AI)');
