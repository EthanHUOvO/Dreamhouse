import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getAiMode } from './config'

const round32=(n:number)=>Math.max(32,Math.round(n/32)*32)

function mime(file:string){const ext=path.extname(file).toLowerCase();if(ext==='.jpg'||ext==='.jpeg')return'image/jpeg';if(ext==='.webp')return'image/webp';if(ext==='.gif')return'image/gif';return'image/png'}

export async function resolveImageInput(value:string):Promise<string>{
  if(!value)throw new Error('image input is empty')
  if(/^https?:\/\//i.test(value)||value.startsWith('data:image/'))return value
  if(!value.startsWith('/'))throw new Error('Only public paths, HTTP(S) URLs, or image data URLs are supported')
  const full=path.join(process.cwd(),'public',value.replace(/^\//,''))
  const data=await fs.readFile(full)
  if(data.byteLength>10*1024*1024)throw new Error('Image input exceeds Qwen Image 10MB limit')
  return `data:${mime(full)};base64,${data.toString('base64')}`
}

export type PreparedInteriorImage = {
  dataUrl: string
  width?: number
  height?: number
  size?: string
  originalWidth?: number
  originalHeight?: number
  contentBounds?: { left: number; top: number; width: number; height: number }
}

type Rect = { left: number; top: number; width: number; height: number }
type WallBounds = { top: number; bottom: number; left: number; right: number }

/**
 * Detect the outer wall rectangle. Plan walls are drawn as medium-gray thick
 * lines; dimension chains are thin black lines and floors are light or tinted,
 * so an R≈G≈B mid-gray mask isolates the walls. The ruler bands are then simply
 * the region between the image edge and the detected wall — no fixed fractions,
 * so any input geometry works. Returns null when detection is not confident.
 */
async function detectWallBounds(buffer: Buffer): Promise<WallBounds | null> {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, C = info.channels
  const gray = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2]
    if (Math.abs(r - g) < 14 && Math.abs(g - b) < 14 && r > 95 && r < 205) gray[i] = 1
  }
  const rowTh = Math.round(W * 0.12), colTh = Math.round(H * 0.12)
  const rowSum = new Uint32Array(H), colSum = new Uint32Array(W)
  for (let y = 0; y < H; y++) {
    const base = y * W
    let acc = 0
    for (let x = 0; x < W; x++) acc += gray[base + x]
    rowSum[y] = acc
  }
  for (let x = 0; x < W; x++) {
    let acc = 0
    for (let y = 0; y < H; y++) acc += gray[y * W + x]
    colSum[x] = acc
  }
  let top = -1, bot = -1, left = -1, right = -1
  for (let y = 0; y < H; y++) if (rowSum[y] >= rowTh) { if (top < 0) top = y; bot = y }
  for (let x = 0; x < W; x++) if (colSum[x] >= colTh) { if (left < 0) left = x; right = x }
  if (top < 0 || left < 0 || bot <= top || right <= left) return null
  // sanity: walls must not hug the edges nor sit in the outer third
  if (top > H * 0.3 || (H - 1 - bot) > H * 0.3 || left > W * 0.3 || (W - 1 - right) > W * 0.3) return null
  return { top, bottom: bot, left, right }
}

/** Ruler bands: everything between the image edge and the outer wall. */
function bandsFromWalls(W: number, H: number, w: WallBounds): Rect[] {
  const rects: Rect[] = []
  if (w.top > 4) rects.push({ left: 0, top: 0, width: W, height: w.top })
  if (H - w.bottom - 1 > 4) rects.push({ left: 0, top: w.bottom + 1, width: W, height: H - w.bottom - 1 })
  if (w.left > 4) rects.push({ left: 0, top: 0, width: w.left, height: H })
  if (W - w.right - 1 > 4) rects.push({ left: w.right + 1, top: 0, width: W - w.right - 1, height: H })
  return rects
}

function bandsFromMargins(W: number, H: number, m: { top: number; right: number; bottom: number; left: number }): Rect[] {
  const clamp = (v: number) => Math.max(0, Math.min(0.45, Number.isFinite(v) ? v : 0))
  const rects: Rect[] = []
  const t = Math.round(H * clamp(m.top)), b = Math.round(H * clamp(m.bottom))
  const l = Math.round(W * clamp(m.left)), r = Math.round(W * clamp(m.right))
  if (t > 0) rects.push({ left: 0, top: 0, width: W, height: t })
  if (b > 0) rects.push({ left: 0, top: H - b, width: W, height: b })
  if (l > 0) rects.push({ left: 0, top: 0, width: l, height: H })
  if (r > 0) rects.push({ left: W - r, top: 0, width: r, height: H })
  return rects
}

async function whiteRect(w: number, h: number): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } }).png().toBuffer()
}


function unionRect(a: Rect, b: Rect): Rect {
  const l = Math.min(a.left, b.left), t = Math.min(a.top, b.top)
  return { left: l, top: t, width: Math.max(a.left + a.width, b.left + b.width) - l, height: Math.max(a.top + a.height, b.top + b.height) - t }
}
function nearRect(a: Rect, b: Rect, gap: number): boolean {
  return a.left - gap <= b.left + b.width && b.left - gap <= a.left + a.width &&
         a.top - gap <= b.top + b.height && b.top - gap <= a.top + a.height
}
/** Merge text-stroke blobs into label clusters so a whole label can be erased. */
function clusterRects(rects: Rect[], gap: number): Rect[] {
  const cur = rects.slice()
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < cur.length && !changed; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        if (nearRect(cur[i], cur[j], gap)) { cur[i] = unionRect(cur[i], cur[j]); cur.splice(j, 1); changed = true; break }
      }
    }
  }
  return cur
}
async function solidRect(w: number, h: number, color: string): Promise<Buffer> {
  return sharp({ create: { width: Math.max(1, w), height: Math.max(1, h), channels: 3, background: color } }).png().toBuffer()
}
/**
 * Sample the floor colour from a RING around the rect, never from inside it —
 * the inside contains the model's bright hallucination halo, which is exactly
 * what must not leak into the fill. Mid-tone ring pixels average to the local
 * floor colour, so erasures blend into wood, tile and plain floors alike.
 */
async function sampleBackgroundColor(buffer: Buffer, W: number, H: number, rect: Rect): Promise<string> {
  try {
    const pad = 14
    const l = Math.max(0, rect.left - pad), t = Math.max(0, rect.top - pad)
    const r = Math.min(W, rect.left + rect.width + pad), b = Math.min(H, rect.top + rect.height + pad)
    if (r - l < 3 || b - t < 3) return '#ffffff'
    const { data, info } = await sharp(buffer).extract({ left: l, top: t, width: r - l, height: b - t }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    let cr = 0, cg = 0, cb = 0, n = 0
    const C = info.channels, w = info.width, h = info.height
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // skip the inner rect: only the surrounding ring votes
        if (x >= rect.left - l && x < rect.left - l + rect.width && y >= rect.top - t && y < rect.top - t + rect.height) continue
        const i = (y * w + x) * C
        const pr = data[i], pg = data[i + 1], pb = data[i + 2]
        if (pr + pg + cb + pb - pb > 420 && pr + pg + pb > 420 && pr + pg + pb < 745) { cr += pr; cg += pg; cb += pb; n++ }
      }
    }
    if (!n) return '#ffffff'
    const hex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    return '#' + hex(cr / n) + hex(cg / n) + hex(cb / n)
  } catch { return '#ffffff' }
}

/**
 * Turn a source label crop into a stroke-only RGBA stamp: dark pixels become
 * opaque ink, the floor background becomes fully transparent. Stamping this way
 * leaves no rectangle boundary, so labels sit on any redrawn floor colour.
 */
async function textStamp(buffer: Buffer, rect: Rect): Promise<Buffer> {
  const { data, info } = await sharp(buffer).extract(rect).greyscale().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const g = data[i]
    let a = Math.round((232 - g) * 255 / 170)
    a = a < 0 ? 0 : a > 255 ? 255 : a
    rgba[i * 4] = 38; rgba[i * 4 + 1] = 38; rgba[i * 4 + 2] = 38
    rgba[i * 4 + 3] = a
  }
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
}

async function maskRects(source: Buffer, rects: Rect[]): Promise<Buffer> {
  if (!rects.length) return source
  const overlays = []
  for (const rect of rects) overlays.push({ input: await whiteRect(rect.width, rect.height), left: rect.left, top: rect.top })
  return sharp(source).composite(overlays).png().toBuffer()
}

/**
 * Small, isolated ink clusters (room names, area labels). Walls, doors and
 * windows belong to one giant connected outline whose bounding box is far
 * larger than maxBox, so they are never matched — newly added openings stay.
 */
async function detectTextRegions(buffer: Buffer, maxBoxArg?: number, minBox = 4, cap = 400): Promise<Rect[]> {
  const { data, info } = await sharp(buffer).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const maxBox = maxBoxArg ?? Math.max(44, Math.round(Math.min(W, H) * 0.07))
  const ink = (x: number, y: number) => data[y * W + x] < 150
  const visited = new Uint8Array(W * H)
  const rects: Rect[] = []
  const stack: number[] = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (visited[idx] || !ink(x, y)) continue
      let minX = x, maxX = x, minY = y, maxY = y
      visited[idx] = 1; stack.length = 0; stack.push(idx)
      while (stack.length) {
        const cur = stack.pop()!
        const cx = cur % W, cy = (cur / W) | 0
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
        if (cx + 1 < W && !visited[cur + 1] && ink(cx + 1, cy)) { visited[cur + 1] = 1; stack.push(cur + 1) }
        if (cx - 1 >= 0 && !visited[cur - 1] && ink(cx - 1, cy)) { visited[cur - 1] = 1; stack.push(cur - 1) }
        if (cy + 1 < H && !visited[cur + W] && ink(cx, cy + 1)) { visited[cur + W] = 1; stack.push(cur + W) }
        if (cy - 1 >= 0 && !visited[cur - W] && ink(cx, cy - 1)) { visited[cur - W] = 1; stack.push(cur - W) }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1
      if (w >= minBox && h >= minBox && w <= maxBox && h <= maxBox) {
        rects.push({ left: minX, top: minY, width: w, height: h })
        if (rects.length >= cap) return rects
      }
    }
  }
  return rects
}

export type PreparedFloorPlanImage = PreparedInteriorImage & {
  bytes?: number
  contentBounds?: { left: number; top: number; width: number; height: number }
  annotation?: {
    source: Buffer
    walls: WallBounds | null
    margins: { top: number; right: number; bottom: number; left: number }
    textRects: Rect[]
  }
}

export async function prepareFloorPlanForAI(value:string):Promise<PreparedFloorPlanImage>{
  if(!value)throw new Error('SOURCE_FLOOR_PLAN_REQUIRED')
  const resolved=await resolveImageInput(value)
  if(!resolved.startsWith('data:image/'))throw new Error('SOURCE_FLOOR_PLAN_INVALID')
  const comma=resolved.indexOf(',')
  if(comma<0)throw new Error('SOURCE_FLOOR_PLAN_INVALID')
  const source=Buffer.from(resolved.slice(comma+1),'base64')
  if(!source.length)throw new Error('SOURCE_FLOOR_PLAN_INVALID')
  if(source.byteLength>10*1024*1024)throw new Error('SOURCE_FLOOR_PLAN_TOO_LARGE')
  const metadata=await sharp(source).metadata()
  const sourceWidth=metadata.width,sourceHeight=metadata.height
  if(!sourceWidth||!sourceHeight)throw new Error('SOURCE_FLOOR_PLAN_INVALID')

  // Interior text is erased so the model redraws geometry only; rulers stay
  // visible (masking them cut the outer wall and broke reconstruction). Blobs
  // sitting on the walls are corner/tick marks, not labels — masking them
  // punched holes in the walls, so they are kept out of the text layer.
  const walls=await detectWallBounds(source)
  let textRects=await detectTextRegions(source)
  if(walls){
    const m=8
    textRects=textRects.filter(r=>r.left>=walls.left+m&&r.top>=walls.top+m&&r.left+r.width<=walls.right-m&&r.top+r.height<=walls.bottom-m)
  }
  // Drop lone tiny marks: real label strokes travel in packs, while a single
  // small dark blob far from any other text is a door tick or detail mark —
  // erasing those punched clean holes in floors and walls.
  textRects=textRects.filter(r=>{
    if(r.width>=12||r.height>=12)return true
    return textRects.some(o=>o!==r&&Math.abs(o.left+o.width/2-r.left-r.width/2)<40&&Math.abs(o.top+o.height/2-r.top-r.height/2)<40)
  })
  const modelSource=textRects.length?await maskRects(source,textRects):source

  const configuredMax=Number(process.env.QWEN_FLOORPLAN_MAX_DIMENSION||1536)
  const maxDimension=Math.max(512,Math.min(1536,Number.isFinite(configuredMax)?Math.floor(configuredMax/32)*32:1536))
  const minDimension=512
  const resized=await sharp(modelSource)
    .flatten({background:'#ffffff'})
    .resize({width:maxDimension,height:maxDimension,fit:'inside',withoutEnlargement:true})
    .png().toBuffer({resolveWithObject:true})
  const contentWidth=resized.info.width,contentHeight=resized.info.height
  const width=Math.max(minDimension,Math.ceil(contentWidth/32)*32)
  const height=Math.max(minDimension,Math.ceil(contentHeight/32)*32)
  const left=Math.floor((width-contentWidth)/2),top=Math.floor((height-contentHeight)/2)
  const output=await sharp(resized.data)
    .extend({left,top,right:width-contentWidth-left,bottom:height-contentHeight-top,background:'#ffffff'})
    .png().toBuffer()
  return{
    dataUrl:`data:image/png;base64,${output.toString('base64')}`,
    width,
    height,
    originalWidth:sourceWidth,
    originalHeight:sourceHeight,
    contentBounds:{left,top,width:contentWidth,height:contentHeight},
    annotation:{
      source,
      walls,
      margins:{
        top: Number(process.env.QWEN_FLOORPLAN_RULER_TOP ?? 0.12),
        right: Number(process.env.QWEN_FLOORPLAN_RULER_RIGHT ?? 0.23),
        bottom: Number(process.env.QWEN_FLOORPLAN_RULER_BOTTOM ?? 0.10),
        left: Number(process.env.QWEN_FLOORPLAN_RULER_LEFT ?? 0.23),
      },
      textRects,
    },
    size:`${width}*${height}`,
    bytes:output.byteLength,
  }
}

/**
 * Restore original pixel coordinates, then rebuild the annotation layer:
 * the ruler bands (auto-detected wall bounds, fallback to margins) are
 * overwritten with original pixels, the model's hallucinated text is erased
 * around every known label, and the crisp original labels are stamped back.
 */
export async function restoreFloorPlanFromAI(source:Buffer,prepared:PreparedFloorPlanImage):Promise<Buffer>{
  const bounds=prepared.contentBounds
  if(!bounds||!prepared.width||!prepared.height||!prepared.originalWidth||!prepared.originalHeight)
    throw new Error('FLOOR_PLAN_RESTORATION_METADATA_REQUIRED')
  const canvas=await sharp(source).removeAlpha().resize(prepared.width,prepared.height,{fit:'fill'}).png().toBuffer()
  let restored=await sharp(canvas)
    .extract(bounds)
    .resize(prepared.originalWidth,prepared.originalHeight,{fit:'fill'})
    .png().toBuffer()
  const annotation=prepared.annotation
  if(annotation){
    const W=prepared.originalWidth, H=prepared.originalHeight
    const wallRects=annotation.walls?bandsFromWalls(W,H,annotation.walls):bandsFromMargins(W,H,annotation.margins)
    const overlays:any[]=[]
    const inner = annotation.walls
      ? { l: annotation.walls.left + 2, t: annotation.walls.top + 2, r: annotation.walls.right - 2, b: annotation.walls.bottom - 2 }
      : null
    const clip=(r:Rect)=>{ let l=r.left,t=r.top,rr=r.left+r.width,bb=r.top+r.height
      if(inner){l=Math.max(l,inner.l);t=Math.max(t,inner.t);rr=Math.min(rr,inner.r);bb=Math.min(bb,inner.b)}
      return {left:l,top:t,width:rr-l,height:bb-t} }
    // 1) erase ONLY around the clustered original labels, with a bounded halo.
    //    Chasing the model's hallucinated text across the room needed ever
    //    bigger patches that showed worse than the blur itself; a bounded halo
    //    covers the near-label drift and keeps every patch small.
    const labelGap=Math.round(Math.min(W,H)*0.008)
    const labels=clusterRects(annotation.textRects,labelGap)
    const erase:any[]=[]
    for(const c of labels){
      const pad=Math.max(20,Math.round(Math.max(c.width,c.height)*0.45))
      const r=clip({left:Math.max(0,c.left-pad),top:Math.max(0,c.top-pad),width:c.width+pad*2,height:c.height+pad*2})
      if(r.width>2&&r.height>2)erase.push(r)
    }
    for(const r of erase){
      const bg=await sampleBackgroundColor(restored,W,H,r)
      overlays.push({input:await solidRect(r.width,r.height,bg),left:r.left,top:r.top})
    }
    // 3) ruler bands verbatim
    for(const rect of wallRects){
      overlays.push({input:await sharp(annotation.source).extract(rect).png().toBuffer(),left:rect.left,top:rect.top})
    }
    // 4) crisp original labels on top, as stroke-only stamps (no rectangle seam)
    for(const rect of annotation.textRects){
      try{ overlays.push({input:await textStamp(annotation.source,rect),left:rect.left,top:rect.top}) }catch{}
    }
    if(overlays.length)restored=await sharp(restored).composite(overlays).png().toBuffer()
  }
  return sharp(restored).flatten({background:'#ffffff'}).png().toBuffer()
}

/**
 * Keep the camera frame intact. Scale once, then pad to the model's 32-pixel
 * grid instead of stretching the two axes independently. contentBounds is
 * inverted after inference, so model padding never becomes part of the photo.
 */
export async function prepareImageForInteriorEdit(value:string):Promise<PreparedInteriorImage>{
  const resolved=await resolveImageInput(value)
  if(!resolved.startsWith('data:image/'))return{dataUrl:resolved}
  const comma=resolved.indexOf(',')
  if(comma<0)throw new Error('Invalid image data URL')
  const encoded=resolved.slice(comma+1)
  const source=Buffer.from(encoded,'base64')
  const metadata=await sharp(source).metadata()
  const sourceWidth=metadata.width,sourceHeight=metadata.height
  if(!sourceWidth||!sourceHeight)throw new Error('Unable to read source image dimensions')

  const local=getAiMode()==='local'
  const configuredMax=Number(process.env.QWEN_INTERIOR_MAX_DIMENSION||(local?512:2048))
  const maxDimension=Math.max(256,Math.min(2048,Number.isFinite(configuredMax)?configuredMax:512))
  const minArea=local?256*256:512*512
  const maxArea=2048*2048
  let scale=Math.min(1,maxDimension/Math.max(sourceWidth,sourceHeight))
  if(sourceWidth*sourceHeight*scale*scale<minArea)
    scale=Math.sqrt(minArea/(sourceWidth*sourceHeight))
  const width=Math.max(1,Math.round(sourceWidth*scale))
  const height=Math.max(1,Math.round(sourceHeight*scale))
  const pixelScale=Math.sqrt(maxArea/(width*height))
  // Keep the existing inference pixel budget; fit the camera image inside
  // that grid-aligned canvas rather than increasing model resolution.
  const finalWidth=round32(pixelScale<1?Math.max(1,Math.floor(width*pixelScale)):width)
  const finalHeight=round32(pixelScale<1?Math.max(1,Math.floor(height*pixelScale)):height)
  const contentScale=Math.min(finalWidth/sourceWidth,finalHeight/sourceHeight)
  const contentWidth=Math.min(finalWidth,Math.max(1,Math.round(sourceWidth*contentScale)))
  const contentHeight=Math.min(finalHeight,Math.max(1,Math.round(sourceHeight*contentScale)))
  const left=Math.floor((finalWidth-contentWidth)/2),top=Math.floor((finalHeight-contentHeight)/2)
  const output=await sharp(source)
    .resize(contentWidth,contentHeight,{fit:'fill'})
    .extend({left,top,right:finalWidth-contentWidth-left,bottom:finalHeight-contentHeight-top,extendWith:'copy'})
    .png().toBuffer()
  return{
    dataUrl:`data:image/png;base64,${output.toString('base64')}`,
    width:finalWidth,
    height:finalHeight,
    originalWidth:sourceWidth,
    originalHeight:sourceHeight,
    contentBounds:{left,top,width:contentWidth,height:contentHeight},
    size:`${finalWidth}*${finalHeight}`,
  }
}

/** Undo only our sampling/padding transform; do not crop or zoom the camera. */
export async function restoreInteriorFromAI(source:Buffer,prepared:PreparedInteriorImage):Promise<Buffer>{
  const bounds=prepared.contentBounds
  if(!bounds||!prepared.width||!prepared.height||!prepared.originalWidth||!prepared.originalHeight)
    throw new Error('INTERIOR_RESTORATION_METADATA_REQUIRED')
  const canvas=await sharp(source).resize(prepared.width,prepared.height,{fit:'fill'}).png().toBuffer()
  return sharp(canvas).extract(bounds)
    .resize(prepared.originalWidth,prepared.originalHeight,{fit:'fill'}).png().toBuffer()
}
