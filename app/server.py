from __future__ import annotations
import argparse,json,mimetypes,os,threading,time,webbrowser
from copy import deepcopy
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse,unquote
from adapters import IntegrationManager
from exporters import build_stl_zip,build_simulation_zip

BASE=Path(__file__).resolve().parent; ROOT=BASE.parent; STATIC=BASE/'static'; PRESETS=BASE/'data'/'presets'; CONFIG_PATH=ROOT/'config'/'downstream.json'

def load_presets():
    return {p.stem:json.loads(p.read_text(encoding='utf-8')) for p in sorted(PRESETS.glob('*.json'))}
PRESET_DATA=load_presets(); DEFAULT=deepcopy(PRESET_DATA['three_bedroom'])
CONFIG=json.loads(CONFIG_PATH.read_text(encoding='utf-8')); MANAGER=IntegrationManager(CONFIG)
LOCK=threading.Lock(); STATE={'project':DEFAULT,'selected':False,'updated_at':time.time()}

def safe_name(s): return ''.join(c for c in str(s) if c.isalnum() or c in '-_')[:80] or 'project'
def public_config():
    out={'platform':CONFIG.get('platform',{})}
    for n in ('simulation','printer','robot'):
        q={k:v for k,v in CONFIG[n].items() if k!='token_env'};q['auth_configured']=bool(CONFIG[n].get('token_env') and os.environ.get(CONFIG[n]['token_env']));out[n]=q
    return out
class Handler(BaseHTTPRequestHandler):
    server_version='SemanticConstructionGateway/3.1'
    def log_message(self,fmt,*args): print(f'[{self.log_date_time_string()}] {fmt%args}')
    def js(self,obj,status=200):
        raw=json.dumps(obj,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def body(self):
        n=int(self.headers.get('Content-Length','0'));return json.loads(self.rfile.read(n).decode()) if n else {}
    def state(self):
        with LOCK:r=deepcopy(STATE)
        r.update(MANAGER.snapshot());return r
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/health':return self.js({'ok':True,'service':'semantic-construction-gateway','version':'3.1.0'})
        if path=='/api/presets':return self.js({'ok':True,'presets':list(PRESET_DATA.values())})
        if path=='/api/project':return self.js({'ok':True,**self.state()})
        if path=='/api/integrations':return self.js({'ok':True,'config':public_config()})
        if path=='/api/integrations/health':return self.js(MANAGER.health())
        if path.startswith('/api/devices/') and path.endswith('/status'):
            dev=path.strip('/').split('/')[2]
            try:return self.js({'ok':True,'device':dev,'state':MANAGER.device_status(dev)})
            except Exception as e:return self.js({'ok':False,'error':str(e)},502)
        if path=='/api/export/stl.zip':
            with LOCK:p=deepcopy(STATE['project'])
            raw=build_stl_zip(p);name=safe_name(p.get('preset_id'))+'_STL.zip';self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Disposition',f'attachment; filename="{name}"');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
        if path=='/api/export/simulation.zip':
            with LOCK:p=deepcopy(STATE['project'])
            raw=build_simulation_zip(p);name=safe_name(p.get('preset_id'))+'_SIMULATION.zip';self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Disposition',f'attachment; filename="{name}"');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
        if path=='/api/export/project.json':
            with LOCK:p=deepcopy(STATE['project'])
            raw=json.dumps(p,ensure_ascii=False,indent=2).encode();self.send_response(200);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Disposition',f'attachment; filename="{safe_name(p.get("preset_id"))}_semantic.json"');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
        return self.static(path)
    def do_POST(self):
        path=urlparse(self.path).path
        try:b=self.body()
        except Exception:return self.js({'ok':False,'error':'请求体必须是 JSON'},400)
        if path=='/api/preset/select':
            pid=str(b.get('preset_id',''))
            if pid not in PRESET_DATA:return self.js({'ok':False,'error':'未知户型预设'},404)
            with LOCK:STATE['project']=deepcopy(PRESET_DATA[pid]);STATE['selected']=True;STATE['updated_at']=time.time();p=deepcopy(STATE['project'])
            return self.js({'ok':True,'project':p})
        if path=='/api/emergency-stop':return self.js({'ok':True,'devices':MANAGER.emergency_stop()})
        if path.startswith('/api/devices/') and path.endswith('/command'):
            dev=path.strip('/').split('/')[2];action=str(b.get('action','start'))
            with LOCK:p=deepcopy(STATE['project'])
            public=str(CONFIG.get('platform',{}).get('public_base_url','http://127.0.0.1:8765')).rstrip('/')
            payload={**b,'project_id':p.get('id'),'preset_id':p.get('preset_id'),'semantic_project':p,'artifacts':{
              'stl_bundle_url':public+'/api/export/stl.zip','simulation_bundle_url':public+'/api/export/simulation.zip','semantic_project_url':public+'/api/export/project.json'}}
            try:return self.js({'ok':True,'device':dev,'state':MANAGER.command(dev,action,payload)})
            except Exception as e:return self.js({'ok':False,'error':str(e)},502)
        return self.js({'ok':False,'error':'接口不存在'},404)
    def static(self,path):
        rel='index.html' if path in ('','/') else unquote(path.lstrip('/'));cand=(STATIC/rel).resolve()
        try:cand.relative_to(STATIC.resolve())
        except ValueError:self.send_error(403);return
        if not cand.is_file():cand=STATIC/'index.html'
        raw=cand.read_bytes();mime=mimetypes.guess_type(str(cand))[0] or 'application/octet-stream'
        if mime.startswith('text/') or mime in {'application/javascript','application/json'}:mime+='; charset=utf-8'
        self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8765);parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    CONFIG['platform']['public_base_url']=CONFIG['platform'].get('public_base_url') or f'http://{args.host}:{args.port}'
    url=f'http://{args.host}:{args.port}';srv=ThreadingHTTPServer((args.host,args.port),Handler)
    print('='*72);print(' 语义户型 → 3D打印 / 仿真流水线 v3.1');print(' '+url);print(' 户型入口: 二居室 / 三居室 / 四居室固定预设');print('='*72)
    if not args.no_browser:threading.Timer(.7,lambda:webbrowser.open(url)).start()
    try:srv.serve_forever()
    except KeyboardInterrupt:pass
    finally:srv.server_close()
if __name__=='__main__':main()
