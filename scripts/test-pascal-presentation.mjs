import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { overviewBounds, overviewCamera, overviewSceneKey, presentationWallMode } from '../lib/pascal/presentation.ts';

const fixture = (residence, option) => JSON.parse(readFileSync(new URL(`../public/preset/pascal-v2/${residence}/${residence === 'two' ? `two-${option}` : `option-${option}`}.pascal.json`, import.meta.url), 'utf8'));
const frozen = (value) => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) frozen(child);
  }
  return value;
};
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const normalize = (a) => a.map((value) => value / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Independently project all eight bounding-box corners onto the camera axes.
function assertFits(bounds, frame, aspect, fov = 50) {
  const outward = normalize(subtract(frame.position, frame.target));
  const right = normalize(cross([0, 1, 0], outward));
  const up = cross(outward, right);
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
    const offset = subtract([x, y, z], frame.target);
    const depth = frame.distance - dot(offset, outward);
    assert.ok(depth > 0.1, 'every corner is in front of the camera');
    const halfHeight = depth * Math.tan(fov * Math.PI / 360);
    assert.ok(Math.abs(dot(offset, up)) / halfHeight <= 0.820001, 'vertical projection has the promised margin');
    assert.ok(Math.abs(dot(offset, right)) / (halfHeight * aspect) <= 0.820001, 'horizontal projection has the promised margin');
  }
}

test('24 real catalog scenes fit desktop and phone viewports without changing geometry, items, or materials', () => {
  for (const residence of ['one', 'two', 'three']) for (let index = 1; index <= 8; index++) {
    const scene = fixture(residence, String(index).padStart(2, '0'));
    const original = JSON.stringify(scene);
    frozen(scene);
    const bounds = overviewBounds(scene);
    assert.ok(bounds.min.every(Number.isFinite) && bounds.max.every(Number.isFinite));
    for (const aspect of [1166 / 430, 360 / 340, 0.7]) {
      const frame = overviewCamera(bounds, aspect);
      assertFits(bounds, frame, aspect);
      assert.ok(frame.minDistance < frame.distance && frame.maxDistance > frame.distance);
    }
    assert.equal(JSON.stringify(scene), original, `${residence}-${index}: all source fields remain untouched`);
  }
});

test('three-bedroom building offsets frame the world-space house center instead of its local origin', () => {
  const scene = fixture('three', '01');
  const bounds = overviewBounds(scene);
  const frame = overviewCamera(bounds, 2.7);
  assert.ok(Math.abs(frame.target[0]) < 0.001);
  assert.ok(Math.abs(frame.target[2]) < 0.001);
  assert.ok(frame.target[1] > 1 && frame.target[1] < 2);
});

test('ancestor rotation, scale and translation are included in the display bounds', () => {
  const scene = { nodes: {
    building: { id: 'building', type: 'building', parentId: null, position: [10, 1, 20], rotation: [0, Math.PI / 2, 0], scale: [2, 1, 1] },
    level: { id: 'level', type: 'level', parentId: 'building', position: [0, 0.5, 0] },
    wall: { id: 'wall', type: 'wall', parentId: 'level', start: [0, 0], end: [2, 1], height: 3 },
  } };
  const bounds = overviewBounds(scene);
  assert.deepEqual(bounds.min.map((value) => Math.round(value * 100) / 100), [9.82, 1.5, 15.82]);
  assert.deepEqual(bounds.max.map((value) => Math.round(value * 100) / 100), [11.18, 4.5, 20.18]);
});

test('site planes, distant furniture and invalid points cannot derail house framing', () => {
  const scene = { nodes: {
    wall: { id: 'wall', type: 'wall', start: [0, 0], end: [4, 5], height: 2.8 },
    site: { id: 'site', type: 'site', polygon: [[-1e6, -1e6], [1e6, 1e6]] },
    item: { id: 'item', type: 'item', position: [1e6, 0, 1e6] },
    invalid: { id: 'invalid', type: 'wall', start: [NaN, null], end: [Infinity, 5] },
  } };
  const bounds = overviewBounds(scene);
  assert.deepEqual(bounds.min, [-0.18, 0, -0.18]);
  assert.deepEqual(bounds.max, [4.18, 2.8, 5.18]);
  const fallback = overviewCamera(overviewBounds({ nodes: {} }), NaN);
  assert.ok(fallback.position.every(Number.isFinite));
});

test('overview transparency is a display choice; walkthrough always uses full walls', () => {
  assert.equal(presentationWallMode(false, 'translucent'), 'translucent');
  assert.equal(presentationWallMode(false, 'up'), 'up');
  assert.equal(presentationWallMode(true, 'translucent'), 'up');
  assert.equal(presentationWallMode(true, 'up'), 'up');
});

test('camera identity stays stable for manual edits but changes for a different generation source', () => {
  const scene = fixture('one', '01');
  const before = overviewSceneKey(scene);
  const edited = structuredClone(scene);
  const wall = Object.values(edited.nodes).find((node) => node.type === 'wall');
  wall.end[0] += 0.2;
  assert.equal(overviewSceneKey(edited), before);
  const building = Object.values(edited.nodes).find((node) => node.type === 'building');
  building.metadata ||= {};
  building.metadata.mcpSessionId = 'new-generation';
  assert.notEqual(overviewSceneKey(edited), before);
});
