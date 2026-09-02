from __future__ import annotations
import json, os
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
class HttpJsonClient:
    def __init__(self,config): self.config=config; self.base_url=str(config.get('base_url','')).rstrip('/'); self.timeout=float(config.get('timeout_seconds',10))
    def _headers(self):
        h={'Accept':'application/json','Content-Type':'application/json'}; env=self.config.get('token_env'); token=os.environ.get(str(env),'') if env else ''
        if token: h['Authorization']=f'Bearer {token}'
        return h
    def request(self,method,path,payload=None):
        if not self.base_url: raise RuntimeError('未配置 base_url')
        body=None if payload is None else json.dumps(payload,ensure_ascii=False).encode('utf-8')
        req=Request(f"{self.base_url}/{str(path).lstrip('/')}",data=body,method=method.upper(),headers=self._headers())
        try:
            with urlopen(req,timeout=self.timeout) as r:
                raw=r.read(); return json.loads(raw.decode('utf-8')) if raw else {'ok':True,'http_status':r.status}
        except HTTPError as e: raise RuntimeError(f'外部接口 HTTP {e.code}: '+e.read().decode('utf-8','replace')[:300]) from e
        except URLError as e: raise RuntimeError(f'外部接口不可达: {e.reason}') from e
    def get(self,path): return self.request('GET',path)
    def post(self,path,payload): return self.request('POST',path,payload)
