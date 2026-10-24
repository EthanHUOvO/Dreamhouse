import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const publicRoot = process.env.ASSET_ROOT || "/workspace/public";
const manifest = JSON.parse(readFileSync(join(publicRoot, "items/asset-manifest.json"), "utf8"));
assert.equal(manifest.assets.filter((asset) => asset.path.endsWith(".glb")).length, 15);
const { resolveCdnUrl, resolveAssetUrl } = await import("/app/node_modules/@pascal-app/viewer/dist/lib/asset-url.js");
const decoderRoot = "/app/node_modules/three/examples/jsm/libs/draco/gltf";
const temporary = mkdtempSync(join(tmpdir(), "furniture-draco-"));
const wrapper = join(temporary, "decoder.cjs");
writeFileSync(wrapper, readFileSync(join(decoderRoot, "draco_wasm_wrapper.js")));
const factory = createRequire(import.meta.url)(wrapper);
const draco = await factory({ wasmBinary: readFileSync(join(decoderRoot, "draco_decoder.wasm")) });
const decoded = [];

for (const asset of manifest.assets) {
  const bytes = readFileSync(join(publicRoot, asset.path));
  assert.equal(bytes.length, asset.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  assert.equal(resolveCdnUrl(asset.path), asset.path);
  assert.equal(await resolveAssetUrl(asset.path), asset.path);
  assert.equal(resolveCdnUrl("https://editor.pascal.app" + asset.path), asset.path);
  if (!asset.path.endsWith(".glb")) continue;
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
  const binHeader = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942);
  const bin = bytes.subarray(binHeader + 8);
  for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
    assert.ok(!resource.uri || resource.uri.startsWith("data:"), `${asset.path}: external resource ${resource.uri}`);
  }
  let vertices = 0, triangles = 0;
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const extension = primitive.extensions?.KHR_draco_mesh_compression;
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    if (!extension) {
      assert.equal(accessor.componentType, 5126);
      assert.equal(accessor.type, "VEC3");
      const view = gltf.bufferViews[accessor.bufferView];
      const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
      const stride = view.byteStride || 12;
      const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
      for (let point = 0; point < accessor.count; point++) for (let axis = 0; axis < 3; axis++) {
        const value = bin.readFloatLE(start + point * stride + axis * 4);
        assert.ok(Number.isFinite(value));
        low[axis] = Math.min(low[axis], value);
        high[axis] = Math.max(high[axis], value);
      }
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(Math.abs(low[axis] - accessor.min[axis]) < 0.002);
        assert.ok(Math.abs(high[axis] - accessor.max[axis]) < 0.002);
      }
      vertices += accessor.count;
      triangles += (primitive.indices === undefined ? accessor.count : gltf.accessors[primitive.indices].count) / 3;
      continue;
    }
    const view = gltf.bufferViews[extension.bufferView];
    const compressed = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    const decoder = new draco.Decoder();
    const buffer = new draco.DecoderBuffer();
    const geometry = new draco.Mesh();
    const values = new draco.DracoFloat32Array();
    let status;
    try {
      buffer.Init(new Int8Array(compressed), compressed.length);
      status = decoder.DecodeBufferToMesh(buffer, geometry);
      assert.ok(status.ok(), `${asset.path}: ${status.error_msg()}`);
      assert.ok(geometry.num_points() > 0 && geometry.num_faces() > 0);
      vertices += geometry.num_points();
      triangles += geometry.num_faces();
      const positions = decoder.GetAttributeByUniqueId(geometry, extension.attributes.POSITION);
      assert.ok(decoder.GetAttributeFloatForAllPoints(geometry, positions, values));
      const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < values.size(); i++) {
        const value = values.GetValue(i);
        assert.ok(Number.isFinite(value));
        low[i % 3] = Math.min(low[i % 3], value);
        high[i % 3] = Math.max(high[i % 3], value);
      }
      assert.equal(geometry.num_points(), accessor.count);
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(Math.abs(low[axis] - accessor.min[axis]) < 0.002, `${asset.path}: decoded minimum differs`);
        assert.ok(Math.abs(high[axis] - accessor.max[axis]) < 0.002, `${asset.path}: decoded maximum differs`);
      }
    } finally {
      for (const value of [status, values, geometry, buffer, decoder]) if (value) draco.destroy(value);
    }
  }
  decoded.push({ path: asset.path, vertices, triangles });
}
assert.equal(resolveCdnUrl("https://example.com/custom.glb"), "https://example.com/custom.glb");
assert.match(resolveCdnUrl("/textures/floor.webp"), /\/textures\/floor.webp$/);
for (const file of ["draco/draco_decoder.js", "draco/draco_decoder.wasm", "draco/draco_wasm_wrapper.js", "basis/basis_transcoder.js", "basis/basis_transcoder.wasm"]) {
  assert.ok(readFileSync(join("/app/public/decoders", file)).length > 1000);
}
console.log(JSON.stringify({ status: "PASS", checkedResources: manifest.assets.length, decodedModels: decoded.length, models: decoded, realAiInference: false }, null, 2));
