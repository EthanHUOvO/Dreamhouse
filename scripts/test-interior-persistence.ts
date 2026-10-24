/** Pure persistence regression; no HTTP, models, or persistent file writes. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function freeze<T>(value: T, visited = new Set<object>()): T {
  if (value && typeof value === 'object' && !visited.has(value)) {
    visited.add(value)
    for (const child of Object.values(value)) freeze(child, visited)
    Object.freeze(value)
  }
  return value
}

async function main() {
  const root = process.cwd()
  const assetRoot = path.resolve(process.env.IMAGE_PERSISTENCE_ASSET_ROOT || root)
  // The explicit file URL also permits a dependency-free Node strip-types run.
  const { compactInteriorMetadata, inflateInteriorMetadata } = await import(pathToFileURL(path.join(root, 'lib/ai/interior-persistence.ts')).href)
  const report: Array<Record<string, unknown>> = []
  const samples: string[] = []
  for (const residence of ['one', 'two', 'three']) {
    for (let option = 1; option <= 8; option++) {
      const index = String(option).padStart(2, '0'), variantId = `${residence}-option-${index}`
      const sceneName = residence === 'two' ? `two-${index}.pascal.json` : `option-${index}.pascal.json`
      const scene = JSON.parse(await readFile(path.join(root, 'public/preset/pascal-v2', residence, sceneName), 'utf8'))
      assert.ok(scene.nodes && scene.rootNodeIds, `${variantId}: actual scene missing`)
      const png = await readFile(path.join(assetRoot, 'public/preset/variants', residence, `option-${index}.png`))
      assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${variantId}: original file is not PNG`)
      assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0)
      const image = `data:image/png;base64,${png.toString('base64')}`
      samples.push(image)
      const modelBinding = { variantId, versionId: 'original', canonicalImageUrl: `/preset/variants/${residence}/option-${index}.png`, sourceImageHash: createHash('sha256').update(png).digest('hex') }
      const camera = { position: [1, 1.6, 2], target: [3, 1.6, 2], fov: 60 }
      const captureId = `capture-${variantId}`
      const input = freeze({
        id: 'session-persistence-test', selectedVariant: { residenceType: residence, variantId, optionIndex: option, imageUrl: modelBinding.canonicalImageUrl },
        selectedStyleId: 'natural_wood', selectedCaptureId: captureId, sceneRevision: 7,
        modelBinding, confirmedBinding: modelBinding, modelGenerationPhase: 'completed', model3DLoaded: true,
        basePascalScene: scene, currentPascalScene: scene, pascalScene: scene,
        capturedViews: [{
          id: captureId, sessionId: 'session-persistence-test', sceneRevision: 7, sceneVersion: 'pascal-v2', modelBinding,
          roomId: 'living', roomName: '客厅', roomType: 'living_room', camera, image, screenshotDataUrl: image,
          capturedAt: '2026-10-13T10:00:00.000Z', status: 'done', styleId: 'natural_wood', styleName: '原木风', stylePrompt: 'natural wood',
          renderedImage: { url: '/api/generated-images/12345678-1234-1234-1234-123456789abc.png', provider: 'qwen', model: 'Qwen-Image-2.1-Fun-Acc-4Step',
            requestId: `request-${variantId}`, generation: { cacheHit: false, elapsedMs: 135000, changedRatio: 0.12 },
            sourceCaptureId: captureId, sourceImage: image, styleId: 'natural_wood', styleName: '原木风', camera, createdAt: '2026-10-13T10:02:15.000Z' },
        }],
        generatedInteriorImages: [{ id: `${captureId}-natural_wood`, sourceCaptureId: captureId, sourceImage: image,
          camera, styleId: 'natural_wood', styleName: '原木风', prompt: 'natural wood',
          renderedImage: '/api/generated-images/12345678-1234-1234-1234-123456789abc.png', createdAt: '2026-10-13T10:02:15.000Z' }],
        renders: [{ id: captureId, sourceSceneRevision: 7, url: '/api/generated-images/12345678-1234-1234-1234-123456789abc.png', provider: 'qwen', model: 'Qwen-Image-2.1-Fun-Acc-4Step' }],
        currentStep: 3, customRequirement: '保留用户原始要求', unrelatedMetadata: { keep: ['all', 'fields'], selectedStyleId: 'natural_wood' },
      })
      const before = JSON.stringify(input), compact = compactInteriorMetadata(input), serialized = JSON.stringify(compact)
      assert.equal(JSON.stringify(input), before, `${variantId}: input mutated`)
      assert.equal(compact.currentPascalScene, input.currentPascalScene, `${variantId}: scene touched`)
      assert.equal(compact.basePascalScene, input.basePascalScene)
      assert.equal(compact.pascalScene, input.pascalScene)
      assert.equal(compact.modelBinding, input.modelBinding)
      assert.equal(compact.capturedViews[0].image, image)
      assert.equal(Object.hasOwn(compact.capturedViews[0], 'screenshotDataUrl'), false)
      assert.equal(Object.hasOwn(compact.capturedViews[0].renderedImage, 'sourceImage'), false)
      assert.equal(Object.hasOwn(compact.generatedInteriorImages[0], 'sourceImage'), false)
      assert.ok(serialized.length < before.length - image.length * 2.9, `${variantId}: three duplicate screenshots were not removed`)
      const parsed = freeze(JSON.parse(serialized)), parsedBefore = JSON.stringify(parsed)
      const restored = inflateInteriorMetadata(parsed)
      assert.equal(JSON.stringify(parsed), parsedBefore, `${variantId}: saved record mutated during inflate`)
      assert.deepEqual(restored, JSON.parse(before), `${variantId}: JSON/storage roundtrip is not equivalent`)
      assert.equal(restored.capturedViews[0].renderedImage.requestId, `request-${variantId}`)
      assert.equal(restored.capturedViews[0].status, 'done')
      assert.equal(restored.selectedStyleId, 'natural_wood')
      assert.deepEqual(compactInteriorMetadata(restored), JSON.parse(serialized), `${variantId}: compact/inflate storage representation is not stable`)

      // Use the real payload lengths to reproduce an intermediate quota. An
      // atomic failed write retains the old value, while the compact write can
      // persist the new image and all of its metadata without losing user data.
      const quota = Math.floor((before.length + serialized.length) / 2)
      let stored = 'previous-user-data'
      const save = (text: string) => { if (text.length > quota) throw Object.assign(new Error('storage quota exceeded'), { name: 'QuotaExceededError' }); stored = text }
      assert.throws(() => save(before), (error: any) => error.name === 'QuotaExceededError')
      assert.equal(stored, 'previous-user-data')
      save(serialized)
      assert.deepEqual(inflateInteriorMetadata(JSON.parse(stored)), JSON.parse(before))
      report.push({ variantId, nodes: Object.keys(scene.nodes).length, pngBytes: png.length, pngSha256: modelBinding.sourceImageHash,
        beforeChars: before.length, afterChars: serialized.length, beforeUtf8Bytes: Buffer.byteLength(before), afterUtf8Bytes: Buffer.byteLength(serialized),
        savedChars: before.length - serialized.length, restoredEquivalent: true, inputUnchanged: true })
    }
  }
  assert.equal(report.length, 24)
  const [imageA, imageB] = samples
  assert.notEqual(imageA, imageB)
  const distinct = freeze({ capturedViews: [{ id: 'a', image: imageA, screenshotDataUrl: imageB, renderedImage: { sourceImage: imageB, requestId: 'keep-me', styleId: 'natural_wood' } }],
    generatedInteriorImages: [{ sourceCaptureId: 'a', sourceImage: imageB }, { sourceCaptureId: 'unknown', sourceImage: imageA }] })
  assert.deepEqual(compactInteriorMetadata(distinct), distinct, 'a different source or unmatched capture ID was erased')
  assert.deepEqual(inflateInteriorMetadata(compactInteriorMetadata(distinct)), distinct)
  const ambiguous = freeze({ capturedViews: [{ id: 'same', image: imageA }, { id: 'same', image: imageB }], generatedInteriorImages: [{ sourceCaptureId: 'same', sourceImage: imageA }] })
  assert.equal(compactInteriorMetadata(ambiguous).generatedInteriorImages[0].sourceImage, imageA, 'ambiguous duplicate capture ID must not lose source')
  const legacy = freeze({ capturedViews: [{ id: 'legacy', screenshotDataUrl: imageA, renderedImage: { sourceImage: imageA, status: 'done' } }] })
  assert.deepEqual(compactInteriorMetadata(legacy), legacy, 'legacy data without canonical image must not be deleted')
  assert.deepEqual(inflateInteriorMetadata(legacy), legacy)
  const explicit = freeze({ capturedViews: [{ id: 'explicit', image: imageA, screenshotDataUrl: null, renderedImage: { sourceImage: null } }], generatedInteriorImages: [{ sourceCaptureId: 'explicit', sourceImage: null }] })
  assert.deepEqual(inflateInteriorMetadata(explicit), explicit, 'explicit alternate/null values must not be replaced')
  for (const value of [null, undefined, [], 'legacy', 0]) {
    assert.equal(compactInteriorMetadata(value), value)
    assert.equal(inflateInteriorMetadata(value), value)
  }
  console.log(JSON.stringify({ test: 'interior-persistence', realModelRequests: 0, variants: report.length,
    savedCharsTotal: report.reduce((sum, row) => sum + Number(row.savedChars), 0),
    negativeCasesPassed: true, report }, null, 2))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
