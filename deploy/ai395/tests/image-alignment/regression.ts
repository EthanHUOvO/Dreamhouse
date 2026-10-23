import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from '/app/node_modules/sharp';
import {prepareImageForInteriorEdit,restoreInteriorFromAI} from '/app/lib/ai/server-image';
import {generateDreamHouseImage} from '/app/lib/ai/image-service';
import {imageResultKey,writeImageResult} from '/app/lib/ai/image-result-cache';
import {POST as renderView} from '/app/app/api/ai/render-view/route';
import {INTERIOR_STYLE_PRESETS} from '/app/config/interiorStyles';
const decode=(url:string)=>Buffer.from(url.slice(url.indexOf(',')+1),'base64');
const data=(bytes:Buffer)=>`data:image/png;base64,${bytes.toString('base64')}`;
const output:any={kind:'programmatic-no-model-inference',frames:[],integration:{}};
async function pattern(width:number,height:number){
 return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ede7d9"/><rect x="${width*.2}" width="${width*.04}" height="100%" fill="#e00000"/><rect x="${width*.7}" width="${width*.04}" height="100%" fill="#0050e0"/><path d="M0 ${height*.3}H${width} M0 ${height*.7}H${width}" stroke="#333" stroke-width="${Math.max(2,height*.008)}"/></svg>`)).png().toBuffer();
}
async function landmark(bytes:Buffer,kind:'red'|'blue'){
 const {data:raw,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});let sum=0,count=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels,r=raw[i],g=raw[i+1],b=raw[i+2];if(kind==='red'?r>130&&r>g*1.8&&r>b*1.8:b>130&&b>r*1.8&&b>g*1.8){sum+=x;count++;}}
 assert.ok(count>0);return sum/count;
}
async function main(){
const root='/workspace/tests/image-alignment/results';await mkdir(root,{recursive:true});
const previousMax=process.env.QWEN_INTERIOR_MAX_DIMENSION;
try{
 for(const max of [256,512])for(const [width,height] of [[1474,691],[1600,900],[900,1600],[1013,777]]){
  process.env.QWEN_INTERIOR_MAX_DIMENSION=String(max);const source=await pattern(width,height),prepared=await prepareImageForInteriorEdit(data(source));
  assert.equal(prepared.width!%32,0);assert.equal(prepared.height!%32,0);
  const bounds=prepared.contentBounds!;assert.ok(bounds);assert.ok(bounds.left>=0&&bounds.top>=0&&bounds.left+bounds.width<=prepared.width!&&bounds.top+bounds.height<=prepared.height!);
  const restored=await restoreInteriorFromAI(decode(prepared.dataUrl),prepared),meta=await sharp(restored).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);
  const tolerance=width/bounds.width/2+.75,errors=[];
  for(const kind of ['red','blue']as const){const error=Math.abs(await landmark(restored,kind)-await landmark(source,kind));assert.ok(error<=tolerance,`${width}x${height}/${max}/${kind}: ${error}`);errors.push(error);}
  output.frames.push({width,height,max,inputWidth:prepared.width,inputHeight:prepared.height,contentBounds:bounds,outputWidth:meta.width,outputHeight:meta.height,landmarkErrorPx:errors,status:'PASS'});
  if(width===1474&&max===512){await writeFile(`${root}/source.png`,source);await writeFile(`${root}/restored.png`,restored);await writeFile(`${root}/legacy-stretched.png`,await sharp(source).resize(384,192,{fit:'fill'}).png().toBuffer());}
  if(width===900&&max===512){await writeFile(`${root}/portrait-source.png`,source);await writeFile(`${root}/portrait-legacy.png`,await sharp(source).resize(192,384,{fit:'fill'}).png().toBuffer());}
 }
 await assert.rejects(()=>restoreInteriorFromAI(Buffer.from('invalid'),{dataUrl:''}),/INTERIOR_RESTORATION_METADATA_REQUIRED/);
}finally{if(previousMax===undefined)delete process.env.QWEN_INTERIOR_MAX_DIMENSION;else process.env.QWEN_INTERIOR_MAX_DIMENSION=previousMax;}

// A local HTTP stub tests the real image service, file normalization, cache
// revision and failure path. This server is NOT an AI model.
const directory=await mkdtemp('/tmp/capture-alignment-');let calls=0,corrupt=false;
const server=createServer(async(req,res)=>{try{
 let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);calls++;
 const [width,height]=input.size.split('*').map(Number),name=randomUUID()+'.png';
 const bytes=corrupt?Buffer.from('invalid PNG'):await sharp(decode(input.images[0])).modulate({brightness:.8}).resize(width/2,height/2,{fit:'fill'}).png().toBuffer();
 await writeFile(path.join(directory,name),bytes);res.setHeader('content-type','application/json');res.end(JSON.stringify({url:`/api/generated-images/${name}`,requestId:'stub-'+calls,model:input.model,width:width/2,height:height/2}));
}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const backend=`http://127.0.0.1:${(server.address()as any).port}`;
const keys=['AI_MODE','LOCAL_EDIT_IMAGE_BASE_URL','LOCAL_EDIT_IMAGE_MODEL','GENERATED_IMAGE_DIR','QWEN_INTERIOR_MAX_DIMENSION']as const,previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{AI_MODE:'local',LOCAL_EDIT_IMAGE_BASE_URL:backend,LOCAL_EDIT_IMAGE_MODEL:'Qwen-Image-2.1-Fun-Acc-4Step',GENERATED_IMAGE_DIR:directory,QWEN_INTERIOR_MAX_DIMENSION:'512'});
try{
 const source=data(await pattern(1474,691)),request={mode:'walkthrough-render' as const,pascalScreenshot:source,stylePrompt:'warm white paint'};
 const result=await generateDreamHouseImage(request),meta=await sharp(await readFile(path.join(directory,path.basename(result.url)))).metadata();
 assert.equal(meta.width,1474);assert.equal(meta.height,691);assert.equal(result.generation?.width,1474);assert.equal(result.generation?.height,691);assert.equal(result.generation?.frameVersion,'capture-padded/v1');
 const prepared=await prepareImageForInteriorEdit(source),cacheInput={mode:request.mode,source,prompt:result.prompt,size:prepared.size,model:'Qwen-Image-2.1-Fun-Acc-4Step',backend,steps:4},oldKey=imageResultKey(cacheInput),newKey=imageResultKey({...cacheInput,frameVersion:'capture-padded/v1'});
 assert.notEqual(oldKey,newKey);await rm(path.join(directory,'cache',newKey+'.json'));
 const legacyName=randomUUID()+'.png';await writeFile(path.join(directory,legacyName),await pattern(256,256));await writeImageResult(oldKey,{...result,url:'/api/generated-images/'+legacyName});
 const updated=await generateDreamHouseImage(request);assert.notEqual(updated.url,'/api/generated-images/'+legacyName);assert.equal(calls,2);
 const cached=await generateDreamHouseImage(request);assert.equal(cached.generation?.cacheHit,true);assert.equal(calls,2);
 const response=await renderView(new Request('http://alignment.test/api/ai/render-view',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceImage:source,sessionId:'alignment-test',captureId:'capture-test',sceneRevision:1,styleId:Object.keys(INTERIOR_STYLE_PRESETS)[0],fresh:true})}) as any);
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.captureId,'capture-test');assert.equal(body.sourceSceneRevision,1);assert.equal(body.image.generation.width,1474);assert.equal(body.image.generation.height,691);
 corrupt=true;await assert.rejects(()=>generateDreamHouseImage(request,{fresh:true}),(e:any)=>e.status===502);
 output.integration={status:'PASS',stubCalls:calls,realAiInference:false,outputWidth:meta.width,outputHeight:meta.height,renderViewHandler:'PASS',captureIdentityPreserved:true,legacyCacheRejected:true,newCacheReused:true,invalidOutputRejected:true};
}finally{
 for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
 server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});
}
await writeFile(`${root}/programmatic.json`,JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
