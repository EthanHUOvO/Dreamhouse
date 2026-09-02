from .http_json import HttpJsonClient
from .mock_device import MockDevice
class DeviceAdapter:
    def __init__(self,kind,config): self.kind=kind; self.config=config; self.client=HttpJsonClient(config); self.mock=MockDevice(kind)
    @property
    def mode(self): return str(self.config.get('mode','mock'))
    def health(self):
        if not self.config.get('enabled',True): return {'ok':False,'connected':False,'status':'disabled'}
        if self.mode=='mock': return self.mock.health()
        r=self.client.get(str(self.config.get('health_path','/health'))); return {'ok':bool(r.get('ok',True)),'connected':True,'status':'ready','raw':r}
    def status(self):
        if self.mode=='mock': return self.mock.status()
        r=self.client.get(str(self.config.get('status_path',f'/{self.kind}/status'))); r=r.get('state',r);r.setdefault('connected',True);r.setdefault('progress',0);r.setdefault('status','unknown');r['source']=self.mode;return r
    def command(self,action,payload=None):
        if self.mode=='mock': return self.mock.command(action,payload)
        r=self.client.post(str(self.config.get('command_path',f'/{self.kind}/command')),{'action':action,**(payload or {})});return r.get('state',r)
