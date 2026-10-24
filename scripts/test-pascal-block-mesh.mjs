import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const { ShapeUtils, Vector2, BufferGeometry, Float32BufferAttribute, Group, Vector3 } = createRequire(import.meta.url)('three');
import { blockLocalTransform, buildBlockMeshData, needsBlockCompatibility } from '../lib/pascal/block-mesh.ts';

const triangulate = (points) => ShapeUtils.triangulateShape(points.map(([x, y]) => new Vector2(x, y)), []);
const fixture = (residence, index) => JSON.parse(readFileSync(resolve('public', 'preset', 'pascal-v2', residence, `${residence === 'two' ? 'two-' : 'option-'}${String(index).padStart(2, '0')}.pascal.json`), 'utf8'));
const freeze = (value) => { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; };

test('all real native blocks in 24 catalog scenes build finite geometry with authored faces and material slots intact', () => {
  for (const residence of ['one', 'two', 'three']) for (let index = 1; index <= 8; index++) {
    const scene = fixture(residence, index);
    const before = JSON.stringify(scene);
    freeze(scene);
    for (const node of Object.values(scene.nodes).filter((node) => node.type === 'block')) {
      const data = buildBlockMeshData(node, triangulate);
      assert.equal(data.faceCount, node.topology.faces.length, node.id);
      const expectedTriangles = node.topology.faces.reduce((sum, face) => sum + face.vertexIds.length - 2, 0);
      assert.equal(data.positions.length / 9, expectedTriangles, node.id);
      assert.ok(data.positions.length > 0 && data.positions.every(Number.isFinite));
      for (const slot of data.slots) {
        assert.ok(node.slots[slot]?.startsWith('scene:'), `${node.id}: ${slot}`);
        assert.ok(scene.materials[node.slots[slot].slice(6)], 'authored scene material exists');
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
      geometry.computeVertexNormals();
      assert.ok(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite));
      assert.equal(data.groups.reduce((sum, part) => sum + part.count, 0), data.positions.length / 3);
      geometry.dispose();
    }
    assert.equal(JSON.stringify(scene), before, 'complete source scene stays unchanged');
  }
});

test('original one-bedroom scene keeps all 88 furniture parts and four light fixtures', () => {
  const blocks = Object.values(fixture('one', 1).nodes).filter((node) => node.type === 'block');
  assert.equal(blocks.filter((node) => node.metadata.category === 'furniture').length, 88);
  assert.equal(blocks.filter((node) => node.metadata.category === 'lights').length, 4);
  assert.equal(blocks.filter((node) => needsBlockCompatibility(false, node)).length, 92);
});

test('registered native kinds and hidden blocks never get a duplicate fallback mesh', () => {
  const node = { id: 'b', type: 'block', visible: true };
  assert.equal(needsBlockCompatibility(true, node), false);
  assert.equal(needsBlockCompatibility(false, { ...node, visible: false }), false);
  assert.equal(needsBlockCompatibility(false, { ...node, type: 'item' }), false);
});

test('concave faces triangulate without filling their missing corner and preserve material grouping', () => {
  const node = { id: 'concave', type: 'block', topology: { vertices: [[0,0,0],[2,0,0],[2,0,1],[1,0,1],[1,0,2],[0,0,2]].map((position, i) => ({ id: `v${i}`, position })), faces: [{ id: 'f', vertexIds: ['v0','v1','v2','v3','v4','v5'], materialSlot: 'wood' }] } };
  const data = buildBlockMeshData(node, triangulate);
  let area = 0;
  for (let i = 0; i < data.positions.length; i += 9) {
    const [ax,,az,bx,,bz,cx,,cz] = data.positions.slice(i, i + 9);
    area += Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) / 2;
  }
  assert.equal(area, 3);
  assert.deepEqual(data.slots, ['wood']);
});

test('existing parent rotation/scale/translation and numeric block yaw compose through normal Three groups', () => {
  const parent = new Group();
  parent.position.set(10, 1, 20); parent.rotation.y = Math.PI / 2; parent.scale.set(2, 1, 1);
  const node = { id: 'b', type: 'block', position: [1, 2, 3], rotation: Math.PI / 2, scale: [0.5, 1, 2] };
  const transform = blockLocalTransform(node), group = new Group();
  group.position.fromArray(transform.position); group.rotation.fromArray([...transform.rotation, 'XYZ']); group.scale.fromArray(transform.scale);
  parent.add(group); parent.updateMatrixWorld(true);
  assert.deepEqual(group.getWorldPosition(new Vector3()).toArray().map((value) => Math.round(value)), [13, 3, 18]);
  const world = group.localToWorld(new Vector3(1, 0, 0));
  assert.ok(Math.abs(world.x - 12.5) < 1e-8 && Math.abs(world.z - 18) < 1e-8);
});

test('broken topology reports an explicit error rather than fabricating a furniture shape', () => {
  assert.throws(() => buildBlockMeshData({ id: 'bad', type: 'block', topology: { vertices: [], faces: [{ id: 'f', vertexIds: ['a','b','c'] }] } }, triangulate), /invalid vertex/);
});
