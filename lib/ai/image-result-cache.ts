import { createHash, randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rename,rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export function imageResultKey(input:Record<string,unknown>){
  return createHash('sha256').update(JSON.stringify({schema:'local-i2i-v1',...input})).digest('hex')
}
export function generatedImageFile(url:string,directory=process.env.GENERATED_IMAGE_DIR||path.join(process.cwd(),'data','generated')){
  if(typeof url!=='string'||!/^\/api\/generated-images\/[a-f0-9-]+\.(?:png|jpg|jpeg|webp)$/i.test(url))return null
  return path.join(directory,path.basename(url))
}
/** Metadata alone can accept a truncated header; stats decodes the pixels. */
export async function readGeneratedImage(url:string,directory?:string){
  const file=generatedImageFile(url,directory)
  if(!file)throw Object.assign(new Error('本地图像服务返回了无效的生成图片地址。'),{status:502})
  try{
    const bytes=await readFile(file)
    if(!bytes.length)throw new Error('empty generated image')
    await sharp(bytes).stats()
    return bytes
  }catch(error){throw Object.assign(new Error('图像服务未返回可读取、可解码的生成图片。'),{status:502,cause:error})}
}
export async function readImageResult(key:string,directory?:string){
  const root=directory||process.env.GENERATED_IMAGE_DIR||path.join(process.cwd(),'data','generated')
  try{
    const entry=JSON.parse(await readFile(path.join(root,'cache',`${key}.json`),'utf8'))
    if(Date.now()-entry.savedAt>24*60*60*1000||entry.result?.fallback||entry.result?.provider!=='qwen')return null
    await readGeneratedImage(entry.result?.url||'',root)
    return{...entry.result,generation:{...entry.result.generation,cacheHit:true}}
  }catch{return null}
}
export async function writeImageResult(key:string,result:unknown,directory?:string,signal?:AbortSignal){
  signal?.throwIfAborted()
  const root=path.join(directory||process.env.GENERATED_IMAGE_DIR||path.join(process.cwd(),'data','generated'),'cache')
  await mkdir(root,{recursive:true})
  const temp=path.join(root,`${key}-${randomUUID()}.tmp`)
  try{await writeFile(temp,JSON.stringify({savedAt:Date.now(),result}));signal?.throwIfAborted();await rename(temp,path.join(root,`${key}.json`))}
  finally{await rm(temp,{force:true}).catch(()=>undefined)}
}
const pending=new Set<string>()
export function reserveImageResult(key:string){
  if(pending.has(key))throw Object.assign(new Error('相同图片和要求正在生成，请等待当前任务完成。'),{status:409})
  pending.add(key)
  return()=>pending.delete(key)
}
/** A pixel-change check detects a returned copy, not semantic edit correctness. */
export async function measureImageChange(source:Buffer,output:Buffer){
  const pixels=async(buffer:Buffer)=>sharp(buffer).flatten({background:'#fff'}).removeAlpha().toColourspace('srgb').resize(128,128,{fit:'fill'}).raw().toBuffer()
  const [a,b]=await Promise.all([pixels(source),pixels(output)])
  let changed=0,total=0
  for(let i=0;i<a.length;i+=3){let peak=0;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);total+=d;peak=Math.max(peak,d)}if(peak>=12)changed++}
  const changedRatio=changed/(a.length/3),meanAbsoluteDifference=total/a.length
  return{changedRatio,meanAbsoluteDifference,changed:changedRatio>=0.002&&meanAbsoluteDifference>=0.15}
}
