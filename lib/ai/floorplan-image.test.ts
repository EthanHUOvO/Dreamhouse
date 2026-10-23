import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import sharp from 'sharp'
import { prepareFloorPlanForAI, restoreFloorPlanFromAI } from './server-image'
import { qwenGenerateImage, resolveLocalImageSteps } from './qwen-image-client'

const asDataUrl=(buffer:Buffer)=>`data:image/png;base64,${buffer.toString('base64')}`
const decode=(url:string)=>Buffer.from(url.slice(url.indexOf(',')+1),'base64')

test('padding preserves pixels and restores the original non-multiple-of-32 plan',async()=>{
  const previous=process.env.QWEN_FLOORPLAN_MAX_DIMENSION
  process.env.QWEN_FLOORPLAN_MAX_DIMENSION='1536'
  try{
  const source=await sharp({create:{width:748,height:718,channels:3,background:'#baddef'}}).png().toBuffer()
  const prepared=await prepareFloorPlanForAI(asDataUrl(source))
  assert.equal(prepared.size,'768*736')
  assert.deepEqual(prepared.contentBounds,{left:10,top:9,width:748,height:718})
  const restored=await restoreFloorPlanFromAI(decode(prepared.dataUrl),prepared)
  assert.deepEqual(await sharp(restored).raw().toBuffer(),await sharp(source).raw().toBuffer())
  const metadata=await sharp(restored).metadata()
  assert.equal(metadata.width,748)
  assert.equal(metadata.height,718)
  }finally{
    if(previous===undefined)delete process.env.QWEN_FLOORPLAN_MAX_DIMENSION
    else process.env.QWEN_FLOORPLAN_MAX_DIMENSION=previous
  }
})

test('wide and tall plans retain aspect ratio inside the inference budget',async()=>{
  const previous=process.env.QWEN_FLOORPLAN_MAX_DIMENSION
  process.env.QWEN_FLOORPLAN_MAX_DIMENSION='768'
  try{
    for(const [width,height] of [[4000,800],[600,4000]]){
      const source=await sharp({create:{width,height,channels:3,background:'#2468ac'}}).png().toBuffer()
      const prepared=await prepareFloorPlanForAI(asDataUrl(source))
      assert.ok(prepared.width!<=768&&prepared.height!<=768)
      assert.equal(prepared.width!%32,0)
      assert.equal(prepared.height!%32,0)
      const bounds=prepared.contentBounds!
      assert.ok(Math.abs(bounds.width/bounds.height-width/height)<0.02)
      // A backend may render at a smaller uniform size. Restoration still
      // removes padding in model-canvas coordinates before restoring pixels.
      const halfCanvas=await sharp(decode(prepared.dataUrl)).resize(prepared.width!/2,prepared.height!/2).png().toBuffer()
      const restored=await restoreFloorPlanFromAI(halfCanvas,prepared)
      const metadata=await sharp(restored).metadata()
      assert.equal(metadata.width,width)
      assert.equal(metadata.height,height)
      const centre=await sharp(restored).extract({left:Math.floor(width/2),top:Math.floor(height/2),width:1,height:1}).removeAlpha().raw().toBuffer()
      assert.deepEqual([...centre],[0x24,0x68,0xac])
    }
  }finally{
    if(previous===undefined)delete process.env.QWEN_FLOORPLAN_MAX_DIMENSION
    else process.env.QWEN_FLOORPLAN_MAX_DIMENSION=previous
  }
})

test('base Qwen floorplan edits are not silently sampled as eight-step Turbo',()=>{
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1','floorplan-edit',undefined,{QWEN_IMAGE_STEPS:'8'}),40)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1','floorplan-edit',undefined,{QWEN_FLOORPLAN_STEPS:'32'}),32)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1-Turbo','floorplan-edit',undefined,{}),8)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1-Fun-Acc-4Step','floorplan-edit',undefined,{}),4)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1-Fun-Acc-4Step','walkthrough-render',undefined,{}),4)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1-Fun-Acc-4Step','walkthrough-render',undefined,{QWEN_IMAGE_STEPS:'8'}),4)
  assert.equal(resolveLocalImageSteps('Z-Image-Turbo','floorplan-edit',undefined,{}),8)
  assert.equal(resolveLocalImageSteps('Qwen-Image-2.1','walkthrough-render',undefined,{QWEN_IMAGE_STEPS:'8'}),8)
})

test('cancelled image requests close the upstream connection',async()=>{
  let markClosed:()=>void=()=>{}
  const closed=new Promise<void>(resolve=>{markClosed=resolve})
  const server=createServer(async(req,res)=>{
    for await(const _chunk of req){}
    res.on('close',markClosed)
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  const address=server.address() as {port:number}
  const keys=['NODE_ENV','AI_MODE','LOCAL_IMAGE_BASE_URL','LOCAL_IMAGE_MODEL'] as const
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]))
  process.env.NODE_ENV='test'
  process.env.AI_MODE='local'
  process.env.LOCAL_IMAGE_BASE_URL=`http://127.0.0.1:${address.port}`
  process.env.LOCAL_IMAGE_MODEL='Qwen-Image-2.1'
  try{
    const controller=new AbortController()
    const request=qwenGenerateImage({mode:'floorplan-edit',prompt:'Add a study',signal:controller.signal})
    const timer=setTimeout(()=>controller.abort(),50)
    await assert.rejects(request,{name:'AbortError'})
    clearTimeout(timer)
    await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(new Error('upstream did not close')),1000))])
  }finally{
    for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}
    server.closeAllConnections()
    await new Promise<void>(resolve=>server.close(()=>resolve()))
  }
})
