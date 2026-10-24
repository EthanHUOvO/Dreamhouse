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
}

/** Fractional bands along each edge that hold dimension rulers / annotations. */
export type FloorPlanAnnotationMargins = {
  top: number
  right: number
  bottom: number
  left: number
  /** Paint the bands flat before sending, so the model redraws only the interior. */
  mask: boolean
}

/**
 * Dimension rulers ring the drawing. They must survive the AI redraw verbatim,
 * otherwise the measured numbers blur and step 3 can no longer read them, so
 * only the interior between the rulers is regenerated and the original bands are
 * composited back on top. Defaults match a plan whose rulers sit on the top and
 * left edges (content therefore starts at their bottom-right corner).
 * Override per deployment without a rebuild:
 *   QWEN_FLOORPLAN_RULER_TOP / _BOTTOM / _LEFT / _RIGHT (0..0.49 fractions)
 *   QWEN_FLOORPLAN_RULER_MASK=0 to redraw over the rulers and only restore them.
 */
export function floorPlanAnnotationMargins(): FloorPlanAnnotationMargins {
  const read = (key: string, fallback: number) => {
    const value = Number(process.env[key])
    return Number.isFinite(value) && value >= 0 && value < 0.5 ? value : fallback
  }
  return {
    top: read('QWEN_FLOORPLAN_RULER_TOP', 0.12),
    right: read('QWEN_FLOORPLAN_RULER_RIGHT', 0),
    bottom: read('QWEN_FLOORPLAN_RULER_BOTTOM', 0),
    left: read('QWEN_FLOORPLAN_RULER_LEFT', 0.16),
    mask: process.env.QWEN_FLOORPLAN_RULER_MASK !== '0',
  }
}

type Rect = { left: number; top: number; width: number; height: number }

function annotationRects(w: number, h: number, margins: FloorPlanAnnotationMargins): Rect[] {
  if (!w || !h) return []
  const clamp = (v: number) => Math.max(0, Math.min(0.49, Number.isFinite(v) ? v : 0))
  const top = Math.round(h * clamp(margins.top))
  const bottom = Math.round(h * clamp(margins.bottom))
  const left = Math.round(w * clamp(margins.left))
  const right = Math.round(w * clamp(margins.right))
  const rects: Rect[] = []
  if (top > 0) rects.push({ left: 0, top: 0, width: w, height: top })
  if (bottom > 0) rects.push({ left: 0, top: h - bottom, width: w, height: bottom })
  if (left > 0) rects.push({ left: 0, top: 0, width: left, height: h })
  if (right > 0) rects.push({ left: w - right, top: 0, width: right, height: h })
  return rects
}

async function maskFloorPlanAnnotation(source: Buffer, rects: Rect[]): Promise<Buffer> {
  if (!rects.length) return source
  const overlays = rects.map(rect => ({
    input: { create: { width: rect.width, height: rect.height, channels: 3 as const, background: '#ffffff' } },
    left: rect.left,
    top: rect.top,
  }))
  return sharp(source).composite(overlays).png().toBuffer()
}

export type PreparedFloorPlanImage = PreparedInteriorImage & {
  bytes?: number
  /** Content rectangle inside the model canvas; padding must be removed afterwards. */
  contentBounds?: { left: number; top: number; width: number; height: number }
  /** Original pixels of the ruler bands plus where they sit, for the restore step. */
  annotation?: { source: Buffer; margins: FloorPlanAnnotationMargins }
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

  const margins=floorPlanAnnotationMargins()
  const rulerRects=annotationRects(sourceWidth,sourceHeight,margins)
  // The model must never see the rulers it is not allowed to redraw.
  const modelSource=rulerRects.length&&margins.mask?await maskFloorPlanAnnotation(source,rulerRects):source

  const configuredMax=Number(process.env.QWEN_FLOORPLAN_MAX_DIMENSION||1536)
  const maxDimension=Math.max(512,Math.min(1536,Number.isFinite(configuredMax)?Math.floor(configuredMax/32)*32:1536))
  // Keep compatibility with backends that require a 512px minimum edge.
  // Padding that edge preserves a panoramic/portrait plan's actual shape.
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
    annotation:rulerRects.length?{source,margins}:undefined,
    size:`${width}*${height}`,
    bytes:output.byteLength,
  }
}

/**
 * Restore the original pixel coordinates after generation on a padded canvas,
 * then paste the untouched ruler bands back so dimensions stay legible.
 */
export async function restoreFloorPlanFromAI(source:Buffer,prepared:PreparedFloorPlanImage):Promise<Buffer>{
  const bounds=prepared.contentBounds
  if(!bounds||!prepared.width||!prepared.height||!prepared.originalWidth||!prepared.originalHeight)
    throw new Error('FLOOR_PLAN_RESTORATION_METADATA_REQUIRED')
  const canvas=await sharp(source).resize(prepared.width,prepared.height,{fit:'fill'}).png().toBuffer()
  const restored=await sharp(canvas)
    .extract(bounds)
    .resize(prepared.originalWidth,prepared.originalHeight,{fit:'fill'})
    .png().toBuffer()
  const annotation=prepared.annotation
  if(!annotation)return restored
  const rects=annotationRects(prepared.originalWidth,prepared.originalHeight,annotation.margins)
  if(!rects.length)return restored
  const overlays=await Promise.all(rects.map(async rect=>({
    input:await sharp(annotation.source).extract(rect).png().toBuffer(),
    left:rect.left,
    top:rect.top,
  })))
  return sharp(restored).composite(overlays).png().toBuffer()
}

/**
 * Normalize a captured canvas image for Qwen I2I while preserving its aspect
 * ratio. The returned size is also used for the generated image so the model
 * does not crop a wide or portrait camera view into a square.
 */
export async function prepareImageForInteriorEdit(value:string):Promise<PreparedInteriorImage>{
  const resolved=await resolveImageInput(value)
  if(!resolved.startsWith('data:image/'))return{dataUrl:resolved}
  const comma=resolved.indexOf(',')
  if(comma<0)throw new Error('Invalid image data URL')
  const header=resolved.slice(0,comma)
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
  const finalWidth=round32(pixelScale<1?Math.max(1,Math.floor(width*pixelScale)):width)
  const finalHeight=round32(pixelScale<1?Math.max(1,Math.floor(height*pixelScale)):height)
  const needsResize=finalWidth!==sourceWidth||finalHeight!==sourceHeight||!/^data:image\/png/i.test(header)
  const output=needsResize
    ? await sharp(source).resize(finalWidth,finalHeight,{fit:'fill'}).png().toBuffer()
    : source
  return{
    dataUrl:`data:image/png;base64,${output.toString('base64')}`,
    width:finalWidth,
    height:finalHeight,
    originalWidth:sourceWidth,
    originalHeight:sourceHeight,
    size:`${finalWidth}*${finalHeight}`,
  }
}
