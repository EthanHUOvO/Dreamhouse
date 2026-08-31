import http from 'node:http'
import fs from 'node:fs'
import tls from 'node:tls'
import { spawn } from 'node:child_process'
import mqtt from 'mqtt'

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

const port = Number(process.env.BAMBU_API_PORT || 3030)
const printerModel = (process.env.BAMBU_PRINTER_MODEL || 'A1_MINI').toUpperCase()
const profileValue = (key) => printerModel === 'H2C' ? process.env[`BAMBU_H2C_${key}`] || '' : process.env[`BAMBU_${key}`] || ''
const host = profileValue('PRINTER_IP')
const accessCode = profileValue('ACCESS_CODE')
let serial = profileValue('SERIAL')
const mqttPort = Number(process.env.BAMBU_MQTT_PORT || 8883)
const cameraUrl = profileValue('CAMERA_URL')
let resolvedCameraUrl = cameraUrl
const modelFile = profileValue('MODEL_FILE')

const configured = Boolean(host && accessCode)
const json = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.BAMBU_ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(JSON.stringify(body))
}

function withCameraCredentials(rawUrl) {
  if (!rawUrl || rawUrl === 'disable') return ''
  try {
    const parsed = new URL(rawUrl)
    if (!parsed.username) parsed.username = 'bblp'
    if (!parsed.password) parsed.password = accessCode
    return parsed.toString()
  } catch { return rawUrl }
}

function openMjpegResponse(res) {
  res.writeHead(200, { 'content-type': 'multipart/x-mixed-replace; boundary=ffmpeg', 'cache-control': 'no-store, no-transform', 'connection': 'keep-alive', 'x-accel-buffering': 'no', 'access-control-allow-origin': process.env.BAMBU_ALLOWED_ORIGIN || '*' })
}

function streamA1Camera(req, res) {
  const auth = Buffer.alloc(80)
  auth.writeUInt32LE(0x40, 0)
  auth.writeUInt32LE(0x3000, 4)
  Buffer.from('bblp').copy(auth, 16, 0, 32)
  Buffer.from(accessCode).copy(auth, 48, 0, 32)
  const socket = tls.connect({ host, port: 6000, servername: host, rejectUnauthorized: false })
  let buffered = Buffer.alloc(0)
  let frameSize = 0
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    socket.destroy()
    if (!res.writableEnded) res.end()
  }
  openMjpegResponse(res)
  socket.setTimeout(15000, close)
  socket.once('secureConnect', () => socket.write(auth))
  socket.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk])
    while (true) {
      if (!frameSize) {
        if (buffered.length < 16) return
        frameSize = buffered.readUInt32LE(0)
        buffered = buffered.subarray(16)
      }
      if (buffered.length < frameSize) return
      const frame = buffered.subarray(0, frameSize)
      buffered = buffered.subarray(frameSize)
      frameSize = 0
      if (frame[0] === 0xff && frame[1] === 0xd8 && frame.at(-2) === 0xff && frame.at(-1) === 0xd9) {
        res.write(`--ffmpeg\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`)
        res.write(frame)
        res.write('\r\n')
      }
    }
  })
  socket.once('error', close)
  socket.once('close', close)
  req.once('close', close)
}

function snapshotA1Camera(req, res) {
  const auth = Buffer.alloc(80)
  auth.writeUInt32LE(0x40, 0)
  auth.writeUInt32LE(0x3000, 4)
  Buffer.from('bblp').copy(auth, 16, 0, 32)
  Buffer.from(accessCode).copy(auth, 48, 0, 32)
  const socket = tls.connect({ host, port: 6000, servername: host, rejectUnauthorized: false })
  let buffered = Buffer.alloc(0)
  let frameSize = 0
  let complete = false
  const fail = () => {
    if (complete) return
    complete = true
    socket.destroy()
    if (!res.writableEnded) json(res, 502, { error: '摄像头未返回画面' })
  }
  socket.setTimeout(10000, fail)
  socket.once('secureConnect', () => socket.write(auth))
  socket.on('data', (chunk) => {
    if (complete) return
    buffered = Buffer.concat([buffered, chunk])
    while (true) {
      if (!frameSize) {
        if (buffered.length < 16) return
        frameSize = buffered.readUInt32LE(0)
        buffered = buffered.subarray(16)
      }
      if (buffered.length < frameSize) return
      const frame = buffered.subarray(0, frameSize)
      buffered = buffered.subarray(frameSize)
      frameSize = 0
      if (frame[0] !== 0xff || frame[1] !== 0xd8 || frame.at(-2) !== 0xff || frame.at(-1) !== 0xd9) continue
      complete = true
      socket.destroy()
      res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': frame.length, 'cache-control': 'no-store', 'access-control-allow-origin': process.env.BAMBU_ALLOWED_ORIGIN || '*' })
      return res.end(frame)
    }
  })
  socket.once('error', fail)
  socket.once('close', () => { if (!complete) fail() })
  res.once('close', () => { complete = true; socket.destroy() })
}

function createRtspStreamManager() {
  const clients = new Set()
  let ffmpeg = null
  let restartTimer = null
  let watchdogTimer = null
  let retryDelay = 1000
  let sourceBuffer = Buffer.alloc(0)
  let lastFrameAt = 0

  const writeLatest = (client, frame) => {
    if (client.closed) return
    client.pending = frame
    if (client.writing) return
    const send = () => {
      if (client.closed) return
      const next = client.pending
      client.pending = null
      if (!next) { client.writing = false; return }
      client.writing = true
      const payload = Buffer.concat([
        Buffer.from(`--ffmpeg\r\nContent-Type: image/jpeg\r\nContent-Length: ${next.length}\r\n\r\n`),
        next,
        Buffer.from('\r\n'),
      ])
      try {
        if (client.res.write(payload)) {
          client.writing = false
          if (client.pending) send()
        } else {
          client.res.once('drain', () => {
            client.writing = false
            send()
          })
        }
      } catch {
        client.writing = false
        client.closed = true
        clients.delete(client)
      }
    }
    send()
  }

  const broadcast = (frame) => {
    for (const client of clients) writeLatest(client, frame)
  }

  const parseFrames = (chunk) => {
    sourceBuffer = Buffer.concat([sourceBuffer, chunk])
    if (sourceBuffer.length > 4 * 1024 * 1024) {
      const start = sourceBuffer.lastIndexOf(Buffer.from([0xff, 0xd8]))
      sourceBuffer = start >= 0 ? sourceBuffer.subarray(start) : Buffer.alloc(0)
    }
    while (true) {
      const start = sourceBuffer.indexOf(Buffer.from([0xff, 0xd8]))
      if (start < 0) { sourceBuffer = sourceBuffer.subarray(Math.max(0, sourceBuffer.length - 1)); return }
      const end = sourceBuffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2)
      if (end < 0) { sourceBuffer = sourceBuffer.subarray(start); return }
      lastFrameAt = Date.now()
      retryDelay = 1000
      broadcast(sourceBuffer.subarray(start, end + 2))
      sourceBuffer = sourceBuffer.subarray(end + 2)
    }
  }

  const scheduleRestart = () => {
    if (!clients.size || restartTimer) return
    restartTimer = setTimeout(() => {
      restartTimer = null
      start()
    }, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 15000)
  }

  const start = () => {
    if (ffmpeg || !clients.size || !resolvedCameraUrl) return
    sourceBuffer = Buffer.alloc(0)
    lastFrameAt = Date.now()
    ffmpeg = spawn('ffmpeg', [
      '-nostdin', '-hide_banner', '-loglevel', 'error', '-rtsp_transport', 'tcp',
      '-i', resolvedCameraUrl, '-an', '-vf', 'fps=6,scale=960:-2',
      '-q:v', '5', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, http_proxy: '', https_proxy: '', HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '', all_proxy: '' },
    })
    ffmpeg.stdout.on('data', parseFrames)
    ffmpeg.stderr.on('data', chunk => console.error(`Bambu camera: ${chunk.toString().trim()}`))
    ffmpeg.once('error', () => {})
    watchdogTimer = setInterval(() => {
      if (ffmpeg && Date.now() - lastFrameAt > 20000) {
        console.error('Bambu camera source stalled; restarting')
        ffmpeg.kill('SIGTERM')
      }
    }, 5000)
    ffmpeg.once('close', (code, signal) => {
      if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null }
      ffmpeg = null
      if (clients.size) {
        console.error(`Bambu camera source ended (code=${code}, signal=${signal || 'none'}); reconnecting`)
        scheduleRestart()
      }
    })
  }

  const remove = (client) => {
    if (client.closed) return
    client.closed = true
    clients.delete(client)
    client.pending = null
    if (!clients.size) {
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }
      if (ffmpeg) {
        const process = ffmpeg
        ffmpeg = null
        if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null }
        process.kill('SIGTERM')
      }
    }
  }

  return {
    add(req, res) {
      if (!resolvedCameraUrl) return json(res, 409, { error: '摄像头地址尚未从 H2C 上报中获取，请先刷新状态' })
      openMjpegResponse(res)
      const client = { req, res, pending: null, writing: false, closed: false }
      clients.add(client)
      req.once('close', () => remove(client))
      res.once('close', () => remove(client))
      start()
    },
    updateUrl() {
      if (ffmpeg) {
        const process = ffmpeg
        ffmpeg = null
        process.kill('SIGTERM')
      }
      if (clients.size) scheduleRestart()
    },
  }
}

const rtspStream = createRtspStreamManager()

function streamRtspCamera(req, res) {
  return rtspStream.add(req, res)
}

function streamCamera(req, res) {
  if (printerModel === 'A1_MINI' || printerModel === 'A1') return streamA1Camera(req, res)
  return streamRtspCamera(req, res)
}

function normalizeReport(report) {
  const print = report?.print || {}
  const state = String(print.gcode_state || report?.print?.stg_cur || 'UNKNOWN').toUpperCase()
  const status = state === 'RUNNING' ? '运行中' : state === 'PAUSE' ? '已暂停' : ['FINISH', 'FINISHED'].includes(state) ? '完成' : ['IDLE', 'INIT'].includes(state) ? '待机' : state === 'FAILED' ? '故障' : '未知'
  const progress = Number(print.mc_percent ?? print.percent ?? 0)
  return { status, state, progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0, task: print.subtask_name || print.gcode_file || '未上报任务' }
}

function withPrinter(action) {
  if (!configured) return Promise.resolve({ configured: false, error: '请配置 BAMBU_PRINTER_IP、BAMBU_ACCESS_CODE' })
  if (action.type === 'command' && !serial) return Promise.resolve({ configured: true, connected: false, error: '尚未发现序列号；请先刷新状态，或配置 BAMBU_SERIAL' })
  if (action.type === 'command' && action.command === 'start' && !modelFile) return Promise.resolve({ configured: true, connected: false, error: '请配置 BAMBU_MODEL_FILE（打印机存储卡上的 3MF/G-code 文件名）' })
  return new Promise((resolve) => {
    const topic = serial ? `device/${serial}/report` : 'device/+/report'
    const client = mqtt.connect(`mqtts://${host}:${mqttPort}`, {
      username: 'bblp', password: accessCode, rejectUnauthorized: false,
      connectTimeout: 6000, clientId: `dreamhouse-${Date.now()}`,
    })
    let settled = false
    const finish = (value) => { if (!settled) { settled = true; client.end(true); resolve(value) } }
    const timeoutMessage = action.type === 'command'
      ? `打印机未确认${action.command === 'pause' ? '暂停' : action.command === 'resume' ? '继续' : action.command === 'stop' ? '停止' : '开始'}命令；请确认 H2C 的局域网控制已启用`
      : '连接拓竹超时，请确认局域网模式、IP 和访问码'
    const timer = setTimeout(() => finish({ configured: true, connected: false, error: timeoutMessage }), 8000)
    let commandPublished = false
    client.once('error', (error) => { clearTimeout(timer); finish({ configured: true, connected: false, error: error.message }) })
    client.once('connect', () => {
      if (action.type === 'status') {
        client.subscribe(topic, { qos: 0 }, () => {
          const request = JSON.stringify({ pushing: { sequence_id: String(Date.now()), command: 'pushall' } })
          client.publish(`device/${serial}/request`, request, { qos: 0 })
        })
      }
      else {
        const print = action.command === 'start'
          ? { command: 'project_file', url: `file:///sdcard/${modelFile}`, param: 'Metadata/plate_1.gcode', bed_type: 'auto', timelapse: false, use_ams: false, flow_cali: false, layer_inspect: false, sequence_id: String(Date.now()) }
          : { command: action.command, sequence_id: '0' }
        client.subscribe(topic, { qos: 0 }, (subscribeError) => {
          if (subscribeError) {
            clearTimeout(timer)
            return finish({ configured: true, connected: false, error: subscribeError.message })
          }
          client.publish(`device/${serial}/request`, JSON.stringify({ print }), { qos: 1 }, (publishError) => {
            if (publishError) {
              clearTimeout(timer)
              finish({ configured: true, connected: false, error: publishError.message })
            }
            else commandPublished = true
          })
        })
      }
    })
    client.on('message', (receivedTopic, message) => {
      try {
        const discovered = receivedTopic.match(/^device\/([^/]+)\/report$/)?.[1]
        if (discovered) serial = serial || discovered
        const report = JSON.parse(message.toString())
        const print = report?.print || {}
        if (print.ipcam?.rtsp_url && print.ipcam.rtsp_url !== 'disable') {
          const nextCameraUrl = withCameraCredentials(print.ipcam.rtsp_url)
          if (nextCameraUrl !== resolvedCameraUrl) {
            resolvedCameraUrl = nextCameraUrl
            rtspStream.updateUrl()
          }
        }
        if (!print.gcode_state && print.mc_percent === undefined && !print.gcode_file) return
        if (action.type === 'command') {
          if (!commandPublished) return
          const state = normalizeReport(report).state
          const confirmed = action.command === 'pause'
            ? state === 'PAUSE'
            : action.command === 'resume' || action.command === 'start'
              ? state === 'RUNNING'
              : !['RUNNING', 'PAUSE'].includes(state)
          if (!confirmed) return
          clearTimeout(timer)
          return finish({ configured: true, connected: true, serial, command: action.command, printer: normalizeReport(report) })
        }
        clearTimeout(timer); finish({ configured: true, connected: true, serial, printer: normalizeReport(report) })
      }
      catch { /* Ignore malformed MQTT reports. */ }
    })
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  if (url.pathname === '/health') return json(res, 200, { ok: true, configured })
  if (url.pathname === '/api/bambu/status' && req.method === 'GET') {
    const result = await withPrinter({ type: 'status' })
    return json(res, 200, { ...result, device: { model: printerModel }, camera: { configured: Boolean(resolvedCameraUrl), url: resolvedCameraUrl || null }, model: { configured: Boolean(modelFile), file: modelFile || null } })
  }
  if (url.pathname === '/api/bambu/camera' && req.method === 'GET') return json(res, 200, { configured: Boolean(resolvedCameraUrl), url: resolvedCameraUrl || null, message: resolvedCameraUrl ? '摄像头地址已就绪；H2C 使用打印机上报的 RTSP 地址。' : '请配置摄像头地址或先刷新设备状态。' })
  if (url.pathname === '/api/bambu/camera/stream' && req.method === 'GET') return streamCamera(req, res)
  if (url.pathname === '/api/bambu/camera/snapshot' && req.method === 'GET') {
    if (printerModel === 'A1_MINI' || printerModel === 'A1') return snapshotA1Camera(req, res)
    return json(res, 501, { error: '当前机型请使用摄像头流接口' })
  }
  if (url.pathname === '/api/bambu/command' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const command = JSON.parse(body).command
        if (!['start', 'pause', 'resume', 'stop'].includes(command)) return json(res, 400, { error: '仅支持 start、pause、resume、stop' })
        return json(res, 200, await withPrinter({ type: 'command', command }))
      } catch { return json(res, 400, { error: '请求体必须是 JSON' }) }
    })
    return
  }
  return json(res, 404, { error: 'Not found' })
})

server.listen(port, () => console.log(`DreamHouse Bambu bridge listening on http://localhost:${port}`))
