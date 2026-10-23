"""Actual local-model HTTP inference and isolated Pascal MCP, no image model."""
import base64,hashlib,json,pathlib,sys,time,urllib.request,urllib.error,os,struct
ROOT=pathlib.Path(os.environ.get('PRIMITIVES_PROJECT','/srv/ideal-home/rocm-migration'))
OUT=pathlib.Path(os.environ.get('PRIMITIVES_EVIDENCE','/tmp/structure-primitives-20261023/evidence'))/os.environ.get('PRIMITIVES_RUN','live-primitives-run1')
OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('PRIMITIVES_BASE_URL','http://127.0.0.1:13024')
SVG=(ROOT/'public/preset/svg-v2/one/option-01.svg').read_text()
CASES={
 'merge':'将与主卧相连的阳台并入主卧，移除两者之间的隔墙和推拉门，保留入户通道、厨房和卫生间的位置。',
 'move':'将主卧与客餐厅之间的隔墙向客餐厅方向移动0.2米，扩大主卧，保留入户通道、厨房和卫生间的位置。',
 'multi':'先将与主卧相连的阳台并入主卧，再将主卧与客餐厅之间的隔墙向客餐厅方向移动0.2米以扩大主卧。保留入户通道、厨房和卫生间的位置。',
 'study':'在客餐厅上侧新增一个独立书房，保留入户通道、厨房、卫生间及其余房间的位置。',
 'bedroom':'在客餐厅上侧新增一个卧室，保留入户通道和厨房、卫生间的位置。',
 'negative-multi':'先将与主卧相连的阳台并入主卧，再将主卧与客餐厅之间的隔墙向客餐厅方向移动2米以扩大主卧。保留入户通道、厨房和卫生间的位置。',
}
def post(path,data):
 req=urllib.request.Request(BASE+path,data=json.dumps(data,ensure_ascii=False).encode(),headers={'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=300) as r:return r.status,r.read()
 except urllib.error.HTTPError as e:return e.code,e.read()
def mcp(key,svg):
 source='data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode();sha=hashlib.sha256(source.encode()).hexdigest()
 sid=f'primitives-live-{key}-{time.time_ns()}'
 started=time.monotonic();code,stream=post('/api/ai/model3d/stream',{'sessionId':sid,'sourceImageHash':sha,'sourceImage':f'/{sid}.svg','sourceImageDataUrl':source,'fallbackScene':{'nodes':{}},'reconstructionMode':'auto'})
 (OUT/f'{key}.sse').write_bytes(stream);events=[]
 for part in stream.decode().replace('\r\n','\n').split('\n\n'):
  event=None;body=[]
  for line in part.splitlines():
   if line.startswith('event:'):event=line[6:].strip()
   if line.startswith('data:'):body.append(line[5:].strip())
  if body:
   try:events.append((event,json.loads('\n'.join(body))))
   except json.JSONDecodeError:pass
 complete=next((d.get('result',d) for e,d in reversed(events) if e=='complete'),None)
 record={'httpStatus':code,'elapsedMs':round((time.monotonic()-started)*1000),'sourceImageHash':sha,'sessionId':sid,'tools':[d.get('name') for e,d in events if e=='tool' and d.get('status')=='complete'],'complete':bool(complete),'validation':complete.get('validation') if complete else None,'error':[d for e,d in events if e in ['error','fallback']]}
 if complete and complete.get('scene'):
  scene=complete['scene'];(OUT/f'{key}-scene.json').write_text(json.dumps(scene,ensure_ascii=False))
  record['sceneMetrics']={kind:sum(n.get('type')==kind for n in scene.get('nodes',{}).values()) for kind in ['wall','door','window','zone','item']}
 return record
for key in sys.argv[1:] or ['source','merge','move','multi']:
 if key=='source':
  result={'key':key,'actualInference':False,'kind':'original-svg-through-real-mcp','mcp':mcp(key,SVG)};(OUT/f'{key}.svg').write_text(SVG)
 else:
  instruction=CASES[key];start=time.monotonic();status,raw=post('/api/ai/svg-edit',{'svgText':SVG,'instruction':instruction});data=json.loads(raw)
  (OUT/f'{key}-response.json').write_bytes(raw)
  result={'key':key,'instruction':instruction,'httpStatus':status,'elapsedMs':round((time.monotonic()-start)*1000),'actualInference':data.get('provenance',{}).get('actualInference'),'responseHasSvg':'svg' in data,**{a:data[a] for a in ['error','message','rolledBack','intent','selection','candidate','candidateCount','validation','provenance','feasibility','failedOperationId','completedOperationCount'] if a in data}}
  if status==200:
   edited=data['svg'];(OUT/f'{key}.svg').write_text(edited)
   code,png=post('/api/ai/svg-render',{'svgText':edited});result['pngStatus']=code
   if code==200:
    (OUT/f'{key}.png').write_bytes(png)
    if png.startswith(b'\x89PNG\r\n\x1a\n'):
     width,height=struct.unpack('>II',png[16:24]);result['png']={'width':width,'height':height,'bytes':len(png)}
   result['mcp']=mcp(key,edited)
 (OUT/f'{key}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps({k:result[k] for k in ['key','httpStatus','elapsedMs','actualInference','error','message','mcp'] if k in result},ensure_ascii=False),flush=True)
