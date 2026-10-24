/** Run with: npx tsx scripts/test-image-flow.ts. No real model is contacted. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { getAiConfig } from '../lib/ai/config'
import { localImageTarget, qwenGenerateImage } from '../lib/ai/qwen-image-client'
import { generatedImageFile, measureImageChange, readImageResult, reserveImageResult, writeImageResult } from '../lib/ai/image-result-cache'
import { prepareFloorPlanForAI, prepareImageForInteriorEdit } from '../lib/ai/server-image'
import { generateDreamHouseImage, type FloorplanEditImageInput } from '../lib/ai/image-service'

const EDIT_MODEL = 'Qwen-Image-2.1-Fun-Acc-4Step'
type ImagePost = { model: string; mode: string; images: string[]; prompt: string; size: string; steps: number }
type Behavior = { pixels?: 'edited' | 'copy' | 'near-copy'; model?: string | null; hold?: Gate; url?: string | null; requestId?: string | null; file?: 'empty' | 'bad-png' | 'truncated-png' }
type Gate = { entered: Promise<void>; markEntered: () => void; released: Promise<void>; release: () => void; closed: Promise<void>; markClosed: () => void }

function gate(): Gate {
  let markEntered!: () => void, release!: () => void, markClosed!: () => void
  return {
    entered: new Promise<void>(resolve => { markEntered = resolve }),
    get markEntered() { return markEntered },
    released: new Promise<void>(resolve => { release = resolve }),
    get release() { return release },
    closed: new Promise<void>(resolve => { markClosed = resolve }),
    get markClosed() { return markClosed },
  }
}
function dataUrl(bytes: Buffer) { return `data:image/png;base64,${bytes.toString('base64')}` }
function bytesFromDataUrl(url: string) { return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64') }
const errorStatus = (status: number) => (error: any) => error?.status === status

async function withDeadline<T>(promise: Promise<T>, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), 5_000)
    })])
  } finally { if (timer) clearTimeout(timer) }
}

async function main() {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'ideal-image-flow-'))
  const env = process.env as Record<string, string | undefined>
  const settings = {
    AI_MODE: 'local', NODE_ENV: 'test', LOCAL_IMAGE_MODEL: 'Z-Image-Turbo',
    LOCAL_EDIT_IMAGE_MODEL: EDIT_MODEL, GENERATED_IMAGE_DIR: temp,
    QWEN_IMAGE_TIMEOUT_MS: '5000', QWEN_FLOORPLAN_STEPS: '4', QWEN_INTERIOR_STEPS: '4',
    QWEN_FLOORPLAN_MAX_DIMENSION: '512', QWEN_INTERIOR_MAX_DIMENSION: '512',
    LOCAL_IMAGE_BASE_URL: '', LOCAL_EDIT_IMAGE_BASE_URL: '',
  }
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, env[key]]))
  Object.assign(env, settings)
  const defaultRequests: ImagePost[] = [], editRequests: ImagePost[] = []
  let nextBehavior: Behavior = {}, serverFailure: unknown
  const servers: Server[] = []
  const checks: Array<{ name: string; passed: boolean; error?: string }> = []
  async function check(name: string, run: () => Promise<void> | void) {
    try { await run(); checks.push({ name, passed: true }) }
    catch (error: any) { checks.push({ name, passed: false, error: error?.stack || String(error) }) }
  }
  async function cacheRecords() {
    return (await readdir(path.join(temp, 'cache')).catch(() => [] as string[])).sort()
  }
  async function startStub(kind: 'default' | 'edit') {
    const server = createServer(async (req, res) => {
      try {
        assert.equal(req.method, 'POST')
        assert.equal(req.url, '/v1/images/generations')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(Buffer.from(chunk))
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as ImagePost
        ;(kind === 'edit' ? editRequests : defaultRequests).push(body)
        const behavior = kind === 'edit' ? nextBehavior : {}
        if (kind === 'edit') nextBehavior = {}
        if (behavior.hold) {
          res.once('close', behavior.hold.markClosed)
          behavior.hold.markEntered()
          await Promise.race([behavior.hold.released, behavior.hold.closed])
        }
        if (res.destroyed) return
        assert.equal(body.images.length, 1, 'exactly one source image must cross HTTP')
        const source = bytesFromDataUrl(body.images[0])
        const metadata = await sharp(source).metadata()
        assert.equal(body.size, `${metadata.width}*${metadata.height}`)
        let output: Buffer
        if (behavior.pixels === 'copy') output = source
        else if (behavior.pixels === 'near-copy') output = await sharp(source).linear(1, 1).png().toBuffer()
        else {
          const width = metadata.width!, height = metadata.height!
          const overlay = Buffer.from(`<svg width="${width}" height="${height}"><rect x="${Math.floor(width / 3)}" y="${Math.floor(height / 3)}" width="${Math.floor(width / 3)}" height="${Math.floor(height / 3)}" fill="#04a6cc"/></svg>`)
          output = await sharp(source).composite([{ input: overlay }]).png().toBuffer()
        }
        if (res.destroyed) return
        const id = randomUUID()
        if (behavior.file === 'empty') output = Buffer.alloc(0)
        else if (behavior.file === 'bad-png') output = Buffer.from('not a decodable image')
        else if (behavior.file === 'truncated-png') output = output.subarray(0, 64)
        await writeFile(path.join(temp, `${id}.png`), output)
        const model = behavior.model === null ? undefined : behavior.model || (kind === 'edit' ? EDIT_MODEL : 'Z-Image-Turbo')
        const url = behavior.url === null ? undefined : behavior.url ?? `/api/generated-images/${id}.png`
        const requestId = behavior.requestId === null ? undefined : behavior.requestId ?? id
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ model, requestId, url, width: metadata.width, height: metadata.height, elapsedMs: 12, usage: { steps: body.steps, backend: 'local-http-test-stub', processMs: 10, queueMs: 2 } }))
      } catch (error: any) {
        serverFailure ||= error
        if (!res.destroyed) { res.writeHead(500); res.end(JSON.stringify({ error: error.message })) }
      }
    })
    servers.push(server)
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    return `http://127.0.0.1:${address.port}`
  }
  try {
    const defaultUrl = await startStub('default'), editUrl = await startStub('edit')
    env.LOCAL_IMAGE_BASE_URL = defaultUrl
    env.LOCAL_EDIT_IMAGE_BASE_URL = `${editUrl}/`
    const source = await sharp({ create: { width: 800, height: 512, channels: 3, background: '#f2f2f2' } }).png().toBuffer()
    const alternateSource = await sharp({ create: { width: 800, height: 512, channels: 3, background: '#eeeeee' } }).png().toBuffer()
    const input: FloorplanEditImageInput = { mode: 'floorplan-edit', originalFloorplan: dataUrl(source), userPrompt: '把指定区域改为书房' }

    await check('Z default remains distinct; both instruction-edit modes select the real Qwen URL/model', () => {
      const config = getAiConfig()
      assert.equal(config.imageModel, 'Z-Image-Turbo')
      assert.equal(config.nativeBaseUrl, defaultUrl)
      assert.equal(config.editImageBaseUrl, editUrl)
      assert.equal(config.editImageModel, EDIT_MODEL)
      assert.deepEqual(localImageTarget(undefined, config), { baseUrl: defaultUrl, model: 'Z-Image-Turbo' })
      for (const mode of ['floorplan-edit', 'walkthrough-render']) assert.deepEqual(localImageTarget(mode, config), { baseUrl: editUrl, model: EDIT_MODEL })
    })
    await check('request model labels cannot redirect a worker or bypass an unconfigured Turbo editor', async () => {
      const before = editRequests.length + defaultRequests.length
      await assert.rejects(qwenGenerateImage({ mode: 'walkthrough-render', model: 'Qwen-Image-2.1', images: [dataUrl(source)], prompt: 'test' }), errorStatus(400))
      env.LOCAL_EDIT_IMAGE_MODEL = 'Z-Image-Turbo'
      try { await assert.rejects(generateDreamHouseImage(input), errorStatus(503)) }
      finally { env.LOCAL_EDIT_IMAGE_MODEL = EDIT_MODEL }
      assert.equal(editRequests.length + defaultRequests.length, before)
    })
    await check('real returned model must match exactly, including rejecting a missing label; failures are not cached', async () => {
      for (const model of ['Z-Image-Turbo', 'qwen-image-2.1-fun-acc-4step', null]) {
        nextBehavior = { model }
        const before = await cacheRecords()
        await assert.rejects(generateDreamHouseImage({ ...input, userPrompt: `strict model ${model}` }), errorStatus(502))
        assert.deepEqual(await cacheRecords(), before)
      }
    })
    await check('local output requires a canonical generated URL and a nonblank request ID; invalid contracts do not cache', async () => {
      const invalid: Behavior[] = [
        { url: null }, { url: 'https://example.invalid/result.png' }, { url: dataUrl(source) },
        { url: '/api/generated-images/bogus' }, { url: '/api/generated-images/../outside.png' },
        { url: `/api/generated-images/${randomUUID()}.png?query=1` },
        { requestId: null }, { requestId: '' }, { requestId: '   ' },
      ]
      for (const [index, behavior] of invalid.entries()) {
        nextBehavior = behavior
        const before = await cacheRecords()
        await assert.rejects(generateDreamHouseImage({ ...input, userPrompt: `invalid local output contract ${index}` }), errorStatus(502))
        assert.deepEqual(await cacheRecords(), before)
      }
    })
    await check('missing, empty, invalid, and truncated local images are 502 failures for both editing modes', async () => {
      const invalid: Behavior[] = [
        { url: `/api/generated-images/${randomUUID()}.png` },
        { file: 'empty' }, { file: 'bad-png' }, { file: 'truncated-png' },
      ]
      for (const mode of ['floorplan-edit', 'walkthrough-render'] as const) {
        for (const [index, behavior] of invalid.entries()) {
          nextBehavior = behavior
          const before = await cacheRecords()
          const request = mode === 'floorplan-edit'
            ? { ...input, userPrompt: `invalid image ${mode} ${index}` }
            : { mode, pascalScreenshot: dataUrl(source), roomName: '客厅', stylePrompt: `invalid image ${mode} ${index}` }
          await assert.rejects(generateDreamHouseImage(request), errorStatus(502))
          assert.deepEqual(await cacheRecords(), before)
        }
      }
    })
    await check('complete floorplan pipeline sends prepared pixels, restores size, caches completion, and fresh really posts again', async () => {
      const before = editRequests.length
      const first = await generateDreamHouseImage(input)
      assert.equal(first.model, EDIT_MODEL)
      assert.equal(first.fallback, false)
      assert.equal(first.generation.cacheHit, false)
      assert.equal(first.generation.changed, true)
      assert.equal(editRequests.length, before + 1)
      const post = editRequests.at(-1)!
      assert.equal(post.model, EDIT_MODEL)
      assert.equal(post.steps, 4)
      assert.equal(post.size, '512*512')
      const prepared = await prepareFloorPlanForAI(input.originalFloorplan)
      assert.equal(post.images[0], prepared.dataUrl)
      assert.ok(post.prompt.includes(input.userPrompt))
      const file = generatedImageFile(first.url)
      assert.ok(file)
      const metadata = await sharp(await readFile(file)).metadata()
      assert.equal(metadata.width, 800)
      assert.equal(metadata.height, 512)
      const second = await generateDreamHouseImage(input)
      assert.equal(second.url, first.url)
      assert.equal(second.requestId, first.requestId)
      assert.equal(second.generation.cacheHit, true)
      assert.equal(editRequests.length, before + 1)
      const fresh = await generateDreamHouseImage(input, { fresh: true })
      assert.notEqual(fresh.url, first.url)
      assert.equal(fresh.generation.cacheHit, false)
      assert.equal(editRequests.length, before + 2)
      const afterFresh = await generateDreamHouseImage(input)
      assert.equal(afterFresh.url, fresh.url)
      assert.equal(editRequests.length, before + 2)
      assert.equal(defaultRequests.length, 0, '3001 Turbo default must receive no edit POST')
    })
    await check('changing either source pixels or instruction cannot reuse another completed image', async () => {
      const before = editRequests.length
      const original = await generateDreamHouseImage(input)
      const changedSource = await generateDreamHouseImage({ ...input, originalFloorplan: dataUrl(alternateSource) })
      const changedPrompt = await generateDreamHouseImage({ ...input, userPrompt: '只修改厨房颜色' })
      assert.notEqual(changedSource.url, original.url)
      assert.notEqual(changedPrompt.url, original.url)
      assert.notEqual(changedSource.url, changedPrompt.url)
      assert.equal(editRequests.length, before + 2)
      assert.notEqual(editRequests.at(-2)!.images[0], editRequests.at(-1)!.images[0])
      assert.notEqual(editRequests.at(-2)!.prompt, editRequests.at(-1)!.prompt)
    })
    await check('nonempty corrupt cached PNG is a miss, is regenerated, and valid replacement still hits normally', async () => {
      const cacheInput = { ...input, userPrompt: '缓存图片损坏后的恢复' }
      const first = await generateDreamHouseImage(cacheInput)
      const outputPath = generatedImageFile(first.url)
      assert.ok(outputPath)
      // Keep the cache JSON and file size nonzero: stat-only validation would
      // incorrectly return this cached result without a second HTTP request.
      await writeFile(outputPath, Buffer.from('nonempty corrupted PNG pixels'))
      const before = editRequests.length
      const recovered = await generateDreamHouseImage(cacheInput)
      assert.equal(recovered.generation.cacheHit, false)
      assert.notEqual(recovered.url, first.url)
      assert.equal(editRequests.length, before + 1)
      await sharp(await readFile(generatedImageFile(recovered.url)!)).stats()
      const hit = await generateDreamHouseImage(cacheInput)
      assert.equal(hit.url, recovered.url)
      assert.equal(hit.generation.cacheHit, true)
      assert.equal(editRequests.length, before + 1)
    })
    await check('same pixels and near-copy pixels are 422 failures, do not cache, and release pending reservations', async () => {
      const uniform = await sharp({ create: { width: 512, height: 512, channels: 3, background: '#f0f0f0' } }).png().toBuffer()
      const copyInput = { ...input, originalFloorplan: dataUrl(uniform), userPrompt: '复制检查' }
      const before = await cacheRecords(), count = editRequests.length
      for (const pixels of ['copy', 'near-copy'] as const) {
        nextBehavior = { pixels }
        await assert.rejects(generateDreamHouseImage(copyInput), errorStatus(422))
        assert.deepEqual(await cacheRecords(), before)
      }
      assert.equal(editRequests.length, count + 2, 'failure must retry HTTP, not return a cached copy or remain pending')
      const changed = await generateDreamHouseImage(copyInput)
      assert.equal(changed.generation.changed, true)
      assert.equal(editRequests.length, count + 3)
      assert.equal((await measureImageChange(uniform, uniform)).changed, false)
    })
    await check('duplicate in-flight request is 409; real HTTP cancellation leaves no completion cache and retry succeeds', async () => {
      const held = gate(), controller = new AbortController()
      const cancelInput = { ...input, userPrompt: '取消中的独立请求' }
      const before = await cacheRecords(), beforeFiles = (await readdir(temp)).sort()
      nextBehavior = { hold: held }
      const job = generateDreamHouseImage(cancelInput, { signal: controller.signal })
      // Attach rejection immediately so cancellation cannot become unhandled.
      const rejected = assert.rejects(job, (error: any) => error?.name === 'AbortError')
      try {
        await withDeadline(held.entered, 'HTTP stub did not receive cancellable request')
        await assert.rejects(generateDreamHouseImage(cancelInput), errorStatus(409))
        controller.abort(new DOMException('test cancellation', 'AbortError'))
        await rejected
        await withDeadline(held.closed, 'HTTP stub did not observe the cancelled connection')
        assert.deepEqual(await cacheRecords(), before)
        assert.deepEqual((await readdir(temp)).sort(), beforeFiles, 'cancelled HTTP stub must not write an output or cache')
      } finally { controller.abort(); held.release() }
      const retry = await generateDreamHouseImage(cancelInput)
      assert.equal(retry.generation.cacheHit, false)
      assert.equal(retry.generation.changed, true)
    })
    await check('cancellation after normalization but during asynchronous pixel checking cannot publish cache', async () => {
      const controller = new AbortController()
      const lateInput = { ...input, userPrompt: '规范化后的取消检查' }
      const before = await cacheRecords()
      const originalCheck = controller.signal.throwIfAborted.bind(controller.signal)
      let checkpoints = 0
      // The actual AbortController and HTTP/sharp pipeline remain in use. For
      // fresh requests, checkpoint 3 is after normalization and output decoding.
      // Abort in the next microtask while pixel comparison awaits Sharp work.
      Object.defineProperty(controller.signal, 'throwIfAborted', { configurable: true, value() {
        originalCheck()
        checkpoints++
        if (checkpoints === 3) queueMicrotask(() => controller.abort(new DOMException('late cancellation', 'AbortError')))
      } })
      try {
        await assert.rejects(generateDreamHouseImage(lateInput, { fresh: true, signal: controller.signal }), (error: any) => error?.name === 'AbortError')
        assert.ok(controller.signal.aborted)
        assert.deepEqual(await cacheRecords(), before)
      } finally { controller.abort(); delete (controller.signal as any).throwIfAborted }
      const retry = await generateDreamHouseImage(lateInput)
      assert.equal(retry.generation.cacheHit, false)
    })
    await check('already-aborted requests never POST; standalone pending reservations release normally', async () => {
      const controller = new AbortController(); controller.abort()
      const before = editRequests.length
      await assert.rejects(generateDreamHouseImage(input, { fresh: true, signal: controller.signal }), (error: any) => error?.name === 'AbortError')
      assert.equal(editRequests.length, before)
      const release = reserveImageResult('test-only-reservation')
      try { assert.throws(() => reserveImageResult('test-only-reservation'), errorStatus(409)) }
      finally { release() }
      reserveImageResult('test-only-reservation')()
    })
    await check('cancelling after the temporary cache write cleans the temp and preserves the previous committed result', async () => {
      const key = 'f'.repeat(64), imageName = `${randomUUID()}.png`
      await writeFile(path.join(temp, imageName), source)
      const previousResult = { provider: 'qwen', fallback: false, url: `/api/generated-images/${imageName}`, requestId: 'old-committed-result', model: EDIT_MODEL }
      await writeImageResult(key, previousResult)
      assert.equal((await readImageResult(key)).requestId, 'old-committed-result')
      const controller = new AbortController(), nativeCheck = controller.signal.throwIfAborted.bind(controller.signal)
      let checkpoints = 0
      // Checkpoint 2 belongs to writeImageResult immediately before rename,
      // after the real temporary file has been written to the test directory.
      Object.defineProperty(controller.signal, 'throwIfAborted', { configurable: true, value() {
        checkpoints++
        if (checkpoints === 2) controller.abort(new DOMException('cancel before cache commit', 'AbortError'))
        nativeCheck()
      } })
      try {
        await assert.rejects(writeImageResult(key, { ...previousResult, requestId: 'must-not-commit' }, undefined, controller.signal), (error: any) => error?.name === 'AbortError')
        assert.equal(checkpoints, 2)
        assert.equal((await readImageResult(key)).requestId, 'old-committed-result')
        assert.equal((await cacheRecords()).some(name => name.endsWith('.tmp')), false)
      } finally { delete (controller.signal as any).throwIfAborted }
    })
    await check('landscape interior screenshot uses non-square 512 budget, real edit URL, and original output aspect', async () => {
      const screenshot = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#dadada' } }).png().toBuffer()
      const prepared = await prepareImageForInteriorEdit(dataUrl(screenshot))
      assert.equal(prepared.width, 512)
      assert.equal(prepared.height, 320)
      assert.equal(prepared.size, '512*320')
      const before = editRequests.length
      const rendered = await generateDreamHouseImage({ mode: 'walkthrough-render', pascalScreenshot: dataUrl(screenshot), stylePrompt: '测试现代装修风格', roomName: '客厅' })
      assert.equal(editRequests.length, before + 1)
      assert.equal(editRequests.at(-1)!.size, '512*320')
      assert.equal(editRequests.at(-1)!.steps, 4)
      assert.equal(editRequests.at(-1)!.images[0], prepared.dataUrl)
      assert.equal(rendered.model, EDIT_MODEL)
      const outputPath = generatedImageFile(rendered.url)
      assert.ok(outputPath)
      const metadata = await sharp(await readFile(outputPath)).metadata()
      assert.equal(metadata.width, 1600)
      assert.equal(metadata.height, 1000)
      assert.equal(defaultRequests.length, 0)
    })
    if (serverFailure) checks.push({ name: 'HTTP stub assertions', passed: false, error: String(serverFailure) })
    console.log(JSON.stringify({ test: 'image-flow', realInference: false, passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length, defaultPosts: defaultRequests.length, editPosts: editRequests.length, checks }, null, 2))
    if (checks.some(check => !check.passed)) process.exitCode = 1
  } finally {
    await Promise.all(servers.map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()) })))
    for (const key of Object.keys(settings)) { if (previous[key] === undefined) delete env[key]; else env[key] = previous[key] }
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()))
    assert.ok(path.basename(temp).startsWith('ideal-image-flow-'))
    await rm(temp, { recursive: true, force: true })
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
