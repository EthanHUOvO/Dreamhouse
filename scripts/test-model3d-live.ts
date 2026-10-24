import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, SyntheticModule } from 'node:vm';

const original = { nodes: { building_house: { id: 'building_house', type: 'building', metadata: { floorplanSource: 'verified-preset' } } }, rootNodeIds: ['building_house'] };
const source = 'data:image/png;base64,dGVzdA==';
const body = (mode?: unknown) => ({ sessionId: 'live-regression', sourceImageHash: '12345678', sourceImage: 'original.png', sourceImageDataUrl: source, fallbackScene: original, ...(mode === undefined ? {} : { reconstructionMode: mode }) });

async function route(preset: (...args: any[]) => any, generate: (...args: any[]) => any) {
  const file = new URL('../app/api/ai/model3d/stream/route.ts', import.meta.url);
  const module = new SourceTextModule(stripTypeScriptTypes(await readFile(file, 'utf8'), { mode: 'transform' }), { identifier: file.href });
  const stubs: Record<string, Record<string, unknown>> = {
    'next/server': { NextRequest: Request },
    '@/lib/ai/verified-preset-scene': { resolveVerifiedPresetScene: preset },
    '@/lib/ai/local-model3d-agent': { generatePascalSceneWithLocalQwen: generate },
  };
  await module.link(specifier => {
    const exports = stubs[specifier]; assert.ok(exports, specifier);
    return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
  });
  await module.evaluate();
  return async (input: any) => (module.namespace as any).POST(new Request('http://test/api/ai/model3d/stream', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })) as Promise<Response>;
}

test('default mode keeps exact preset loading and performs no model inference', async () => {
  let calls = 0;
  const post = await route(async (image) => { assert.equal(image, source); return { source: 'verified-preset', scene: original }; }, async () => { calls++; });
  const text = await (await post(body())).text();
  assert.match(text, /event: complete/); assert.match(text, /verified-preset/); assert.equal(calls, 0);
});

test('explicit ai-live skips resolver, sends original bytes, and does not expose backup geometry to the model', async () => {
  let presets = 0, calls = 0;
  const post = await route(async () => { presets++; return { scene: original }; }, async (input) => {
    calls++; assert.equal(input.sourceImageDataUrl, source); assert.equal(input.sourceImageHash, '12345678');
    assert.equal(input.fallbackScene, undefined); assert.equal(input.scene, undefined);
    await input.onEvent({ type: 'complete', result: { scene: { nodes: { building_house: { metadata: { floorplanSource: 'mcp-qwen38-vulkan' } } } }, validation: { valid: true } } });
  });
  const text = await (await post(body('ai-live'))).text();
  assert.equal(presets, 0); assert.equal(calls, 1); assert.match(text, /mcp-qwen38-vulkan/); assert.doesNotMatch(text, /verified-preset/);
});

test('invalid modes are rejected before any scene or model work', async () => {
  let calls = 0;
  const post = await route(async () => { calls++; }, async () => { calls++; });
  for (const mode of ['force', true, 1, {}, []]) assert.equal((await post(body(mode))).status, 400);
  assert.equal(calls, 0);
});

test('failed live generation cannot report a preset fallback or completion', async () => {
  const frozen = JSON.stringify(original);
  const post = await route(async () => { throw new Error('must not resolve preset'); }, async (input) => {
    await input.onEvent({ type: 'scene', scene: { nodes: { partial: {} } } });
    throw new Error('model geometry invalid');
  });
  const text = await (await post(body('ai-live'))).text();
  assert.match(text, /event: error/); assert.match(text, /model geometry invalid/);
  assert.doesNotMatch(text, /event: fallback|event: complete|fallback-prebuilt/); assert.equal(JSON.stringify(original), frozen);
});

test('default non-preset failure remains a marked failed preview and preserves the backup input', async () => {
  const frozen = JSON.stringify(original);
  const post = await route(async () => null, async () => { throw new Error('model unavailable'); });
  const text = await (await post(body('auto'))).text();
  assert.match(text, /event: fallback/); assert.match(text, /fallback-prebuilt/); assert.doesNotMatch(text, /event: complete/);
  assert.equal(JSON.stringify(original), frozen);
});
