type RecordValue = Record<string, any>;
const TABLE = '__dreamHouseInlineImagesV1';
const REF = '__dreamHouseInlineImageRefV1';
const record = (v: any): v is RecordValue => !!v && typeof v === 'object' && !Array.isArray(v);
const inline = (v: any): v is string => typeof v === 'string' && /^data:image\//i.test(v);

function walk(value: any, map: (v: any) => any): any {
 const mapped = map(value);
 if (mapped !== value) return mapped;
 if (Array.isArray(value)) return value.map(v => walk(v, map));
 if (record(value)) return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,walk(v,map)]));
 return value;
}

/** Storage-only packing. All source URLs/bindings are restored before use. */
export function packInlineImages<T>(value: T): T {
 const input: any = value;
 if (!record(input) || Object.hasOwn(input, TABLE)) return value;
 const counts = new Map<string,number>();
 walk(input,v => { if (inline(v)) counts.set(v,(counts.get(v)||0)+1); return v; });
 const repeated = [...counts].filter(([,n]) => n > 1).map(([url]) => url);
 if (!repeated.length) return value;
 const ids = new Map(repeated.map((url,i) => [url,String(i)]));
 const packed = walk(input,v => inline(v) && ids.has(v) ? { [REF]: ids.get(v) } : v);
 packed[TABLE] = Object.fromEntries(repeated.map((url,i) => [String(i),url]));
 return packed;
}

export function unpackInlineImages<T>(value: T): T {
 const input: any = value;
 if (!record(input) || !Object.hasOwn(input, TABLE)) return value;
 const table = input[TABLE];
 if (!record(table) || Object.values(table).some(v => !inline(v))) throw new Error('Invalid persisted inline image table');
 const { [TABLE]: _table, ...metadata } = input;
 return walk(metadata,v => {
  if (!record(v) || Object.keys(v).length !== 1 || !Object.hasOwn(v, REF)) return v;
  if (typeof v[REF] !== 'string' || !Object.hasOwn(table,v[REF])) throw new Error('Missing persisted inline image payload');
  return table[v[REF]];
 });
}

const SCENES = '__dreamHouseScenesV1', SCENE_REF = '__dreamHouseSceneRefV1';
const scene = (v: any) => record(v) && record(v.nodes) && Array.isArray(v.rootNodeIds);

/** Intern only byte-equivalent JSON scenes; V1/V2 geometry stays separate. */
export function packModelSession<T>(value: T): T {
 const images: any = packInlineImages(value);
 if (!record(images) || Object.hasOwn(images, SCENES)) return images;
 const counts = new Map<string, { value: any; count: number }>();
 walk(images,v => {
  if (scene(v)) { const key=JSON.stringify(v), old=counts.get(key); counts.set(key,{value:v,count:(old?.count||0)+1}); }
  return v;
 });
 const repeated=[...counts].filter(([,v])=>v.count>1);
 if (!repeated.length) return images as T;
 const ids=new Map(repeated.map(([key],i)=>[key,String(i)]));
 const output=walk(images,v=>scene(v)&&ids.has(JSON.stringify(v))?{[SCENE_REF]:ids.get(JSON.stringify(v))}:v);
 output[SCENES]=Object.fromEntries(repeated.map(([,v],i)=>[String(i),v.value]));
 return output;
}

export function unpackModelSession<T>(value: T): T {
 const input: any = value;
 if (!record(input) || !Object.hasOwn(input, SCENES)) return unpackInlineImages(value);
 const table=input[SCENES];
 if (!record(table)||Object.values(table).some(v=>!scene(v))) throw new Error('Invalid persisted scene table');
 const {[SCENES]:_table,...metadata}=input;
 const restored=walk(metadata,v=>{
  if (!record(v)||Object.keys(v).length!==1||!Object.hasOwn(v,SCENE_REF))return v;
  if (typeof v[SCENE_REF]!=='string'||!Object.hasOwn(table,v[SCENE_REF]))throw new Error('Missing persisted scene payload');
  return table[v[SCENE_REF]];
 });
 return unpackInlineImages(restored);
}
