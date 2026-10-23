import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { JobQueue, imageSize, runImageProcess, withGpuLock } from '../services/local-ai-runtime.ts'

const quiet = new AbortController().signal
const directory = await mkdtemp(join(tmpdir(), 'ideal-house-ai-runtime-'))
try {
  const queue = new JobQueue(1, 1000)
  let finish, abandoned = false
  const first = queue.run(() => new Promise(resolve => { finish = resolve }), quiet)
  await delay(5)
  const cancelled = new AbortController()
  const second = queue.run(async () => { abandoned = true }, cancelled.signal)
  const rejected = assert.rejects(second, /cancelled/)
  await assert.rejects(queue.run(async () => {}, quiet), error => error.status === 429)
  cancelled.abort(new Error('cancelled'))
  await rejected
  assert.equal(queue.state.waiting, 0)
  const third = queue.run(async () => 'recovered capacity', quiet)
  finish('first')
  assert.equal(await first, 'first')
  assert.equal(await third, 'recovered capacity')
  assert.equal(abandoned, false)

  const expiring = new JobQueue(2, 40)
  let unblock, expiredRan = false
  const blocker = expiring.run(() => new Promise(resolve => { unblock = resolve }), quiet)
  await delay(5)
  await assert.rejects(expiring.run(async () => { expiredRan = true }, quiet), error => error.status === 504)
  unblock()
  await blocker
  assert.equal(expiredRan, false)

  assert.deepEqual(imageSize('1536*768', '512*512', 1024), [1024, 512])
  assert.deepEqual(imageSize('2048*256', '512*512', 1024), [1024, 128])
  assert.throws(() => imageSize('512*0'), error => error.status === 400)

  const pidFile = join(directory, 'child.pid')
  const controller = new AbortController()
  const running = runImageProcess(process.execPath, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`], controller.signal, 5000)
  const stopped = assert.rejects(running, /cancelled/)
  let pid
  for (let attempt = 0; attempt < 100; attempt++) {
    try { pid = Number(await readFile(pidFile, 'utf8')); break } catch { await delay(10) }
  }
  assert.ok(pid, 'child started')
  controller.abort(new Error('cancelled'))
  await stopped
  assert.throws(() => process.kill(pid, 0), 'cancellation waits until the process has exited')

  await assert.rejects(runImageProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], quiet, 30), error => error.status === 504)

  if (process.platform !== 'win32') {
    process.env.LOCAL_AI_GPU_LOCK_DIR = join(directory, 'gpu')
    let active = 0, peak = 0
    await Promise.all(Array.from({ length: 3 }, () => withGpuLock(quiet, Date.now() + 3000, async () => { active++; peak = Math.max(peak, active); await delay(40); active-- })))
    assert.equal(peak, 1, 'independent workers share one flock')
    const holder = withGpuLock(quiet, Date.now() + 3000, async () => { await delay(150) })
    await delay(40)
    const waiting = new AbortController()
    let waitingRan = false
    const pending = withGpuLock(waiting.signal, Date.now() + 3000, async () => { waitingRan = true })
    const cancelledWait = assert.rejects(pending, /cancelled/)
    waiting.abort(new Error('cancelled'))
    await cancelledWait
    await holder
    assert.equal(waitingRan, false)
    const interrupted = withGpuLock(quiet, Date.now() + 3000, activeSignal => runImageProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], activeSignal, 5000))
    const lostHelper = assert.rejects(interrupted, error => error.status === 503 && /lock helper/.test(error.message))
    let helperPid
    for (let attempt = 0; attempt < 100; attempt++) {
      const children = (await readFile(`/proc/self/task/${process.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean)
      for (const child of children) {
        const args = await readFile(`/proc/${child}/cmdline`, 'utf8').catch(() => '')
        if (args.includes('flock') && args.includes('gpu.lock')) helperPid = Number(child)
      }
      if (helperPid) break
      await delay(10)
    }
    assert.ok(helperPid, 'lock helper started')
    await delay(50)
    process.kill(helperPid, 'SIGKILL')
    await lostHelper
    await withGpuLock(quiet, Date.now() + 3000, async () => {})
    delete process.env.LOCAL_AI_GPU_LOCK_DIR
  }
  console.log('Local AI runtime checks passed: queue capacity, cancellation, deadlines, dimensions, process exit and OS lock')
} finally { await rm(directory, { recursive: true, force: true }) }
