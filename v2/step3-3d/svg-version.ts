/** Browser-safe identity helpers. An older version must never inherit the
 * most recently edited XML merely because its PNG is still available. */
type Version = {id:string;sourceVariantId:string;svgSource?:string;result:{model?:string}};
export function selectedSvgSource(versions:Version[],versionId:string|null|undefined,variantId:string,original:string){
  if(!versionId)return original;
  const version=versions.find(v=>v.id===versionId&&v.sourceVariantId===variantId);
  if(!version)throw new Error("SVG_VERSION_NOT_FOUND:所选版本不存在，请重新选择");
  if(version.result.model==='svg-edit'&&!version.svgSource)throw new Error("SVG_VERSION_SOURCE_MISSING:旧版本只保存了预览图，未保存对应SVG，请重新生成；不会使用其他版本的结构");
  return version.svgSource||'';
}
export function svgDataUrl(xml:string){
  const bytes=new TextEncoder().encode(xml);let binary='';
  for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.slice(start,start+8192));
  return 'data:image/svg+xml;base64,'+btoa(binary);
}
export function svgFromDataUrl(url:string){
  if(!/^data:image\/svg\+xml/i.test(url))return '';
  const payload=url.slice(url.indexOf(',')+1);
  return /;base64,/i.test(url)?new TextDecoder().decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0))):decodeURIComponent(payload);
}
export function acceptsSvgScene(result:any,expectedHash:string){
  const metadata=result?.scene?.nodes?.building_house?.metadata;
  return result?.validation?.valid===true && result?.sourceImageHash===expectedHash && metadata?.floorplanSource==='svg-deterministic/v1' && metadata?.model===null;
}
