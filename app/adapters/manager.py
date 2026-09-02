from .device import DeviceAdapter
from concurrent.futures import ThreadPoolExecutor,as_completed
class IntegrationManager:
    def __init__(self,config): self.config=config; self.devices={k:DeviceAdapter(k,config[k]) for k in ('simulation','printer','robot')}
    def device_status(self,name): return self.devices[name].status()
    def command(self,name,action,payload=None): return self.devices[name].command(action,payload)
    def snapshot(self):
        out={}
        with ThreadPoolExecutor(max_workers=3) as pool:
            fut={pool.submit(a.status):(n,a) for n,a in self.devices.items()}
            for f in as_completed(fut):
                n,a=fut[f]
                try:out[n]=f.result()
                except Exception as e:out[n]={'status':'offline','progress':0,'connected':False,'error':str(e),'source':a.mode}
        return {'devices':out}
    def health(self):
        out={}
        for n,a in self.devices.items():
            try:r=a.health()
            except Exception as e:r={'ok':False,'connected':False,'error':str(e)}
            r['mode']=a.mode;r['name']=self.config[n].get('name',n);out[n]=r
        return {'ok':all(x.get('ok') for x in out.values()),'integrations':out}
    def emergency_stop(self):
        return {n:self.command(n,'emergency_stop') for n in self.devices}
