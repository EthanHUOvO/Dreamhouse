import sharp from 'sharp';

/** Original image stays first; enlarged dimension strips come from its pixels. */
export async function model3dDimensionViews(dataUrl: string) {
 const comma=dataUrl.indexOf(','),bytes=Buffer.from(dataUrl.slice(comma+1),'base64');
 const meta=await sharp(bytes).metadata();if(!meta.width||!meta.height)throw new Error('Cannot decode source drawing');
 const w=meta.width,h=meta.height;
 const regions=[
  {name:'原图上侧尺寸条',left:0,top:0,width:w,height:Math.max(1,Math.round(h*.14)),rotate:0},
  {name:'原图下侧尺寸条',left:0,top:Math.floor(h*.86),width:w,height:h-Math.floor(h*.86),rotate:0},
  {name:'原图左侧尺寸条，已旋转便于读数',left:0,top:0,width:Math.max(1,Math.round(w*.2)),height:h,rotate:90},
  {name:'原图右侧尺寸条，已旋转便于读数',left:Math.floor(w*.8),top:0,width:w-Math.floor(w*.8),height:h,rotate:90},
 ];
 const views=[];
 for(const {name,rotate,...region} of regions){
  // Materialize the crop: Sharp applies rotation before extraction within one
  // pipeline, which would otherwise address the original right strip wrongly.
  const crop=await sharp(bytes).extract(region).png().toBuffer();
  const image=await sharp(crop).rotate(rotate).resize({width:Math.min(1536,Math.max(region.width,region.height)*2)}).png().toBuffer();
  views.push({name,dataUrl:`data:image/png;base64,${image.toString('base64')}`});
 }
 return views;
}

export function validateModelDimensionEvidence(args: Record<string,any>) {
 if(args.scaleMethod!=='drawing-dimensions')return;
 const evidence=args.dimensionEvidence;
 if(!evidence||evidence.unit!=='mm')throw new Error('drawing-dimensions requires dimensionEvidence read from the image, unit mm');
 const chains=(value:any)=>Array.isArray(value)?value.filter((c:any)=>Array.isArray(c)&&c.length&&c.every((v:any)=>Number.isFinite(v)&&v>0)):[];
 const horizontal=chains(evidence.horizontalChains),vertical=chains(evidence.verticalChains);
 if(!horizontal.length||!vertical.length)throw new Error('Read at least one horizontal and vertical printed dimension chain');
 const points=args.outerPolygon||[],width=Math.max(...points.map((p:any)=>p[0]))-Math.min(...points.map((p:any)=>p[0])),depth=Math.max(...points.map((p:any)=>p[1]))-Math.min(...points.map((p:any)=>p[1]));
 const widths=horizontal.map((c:number[])=>c.reduce((a,b)=>a+b,0)/1000),depths=vertical.map((c:number[])=>c.reduce((a,b)=>a+b,0)/1000);
 if(widths.some((v:number)=>Math.abs(v-width)>.12)||Math.abs(Math.max(...depths)-depth)>.12)
  throw new Error(`Polygon bounds ${width.toFixed(3)}x${depth.toFixed(3)}m disagree with printed mm chains ${widths.join('/')} x max(${depths.join('/')}); reread dimensions, never use area labels as lengths`);
}
