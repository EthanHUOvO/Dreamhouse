from __future__ import annotations
import threading,time
from copy import deepcopy
class MockDevice:
    def __init__(self,kind): self.kind=kind; self.lock=threading.Lock(); self.gen=0; self.state=self.initial()
    def initial(self):
        s={'status':'ready','progress':0,'source':'mock','connected':True,'task':'等待任务'}
        if self.kind=='printer': s.update({'temperature':26,'layer':0,'total_layers':180})
        if self.kind=='simulation': s.update({'collision':'未检测'})
        if self.kind=='robot': s.update({'phase':0,'safety':'safe'})
        return s
    def health(self): return {'ok':True,'connected':True,'mode':'mock','kind':self.kind}
    def status(self):
        with self.lock:return deepcopy(self.state)
    def command(self,action,payload=None):
        action=action.lower(); payload=payload or {}
        if action in {'stop','cancel','emergency_stop'}:
            with self.lock:self.gen+=1;self.state.update({'status':'stopped','task':'已停止'})
            return self.status()
        if action not in {'start','run','submit'}: raise ValueError(f'不支持动作: {action}')
        with self.lock:self.gen+=1;g=self.gen;self.state.update({'status':'running','progress':0,'project_id':payload.get('project_id')})
        threading.Thread(target=self._run,args=(g,),daemon=True).start();return self.status()
    def _run(self,g):
        duration={'simulation':2.6,'printer':3.8,'robot':4.0}.get(self.kind,3)
        for step in range(51):
            time.sleep(duration/50)
            with self.lock:
                if g!=self.gen or self.state.get('status')=='stopped':return
                p=step*2;self.state['progress']=p
                if self.kind=='simulation':self.state.update({'task':'导入语义模型并执行碰撞验证','collision':'通过' if p>=88 else '检测中'})
                elif self.kind=='printer':self.state.update({'task':'打印 Floor / Walls / Furniture','temperature':round(26+min(190,p*2.1)),'layer':round(p*self.state['total_layers']/100)})
                elif self.kind=='robot':
                    tasks=['抓取地板','安装墙体','布置家具','视觉复检'];phase=min(3,p//26);self.state.update({'task':tasks[phase],'phase':phase})
        with self.lock:self.state.update({'status':'completed','progress':100,'task':'任务完成'}); self.state['collision']='通过' if self.kind=='simulation' else self.state.get('collision')
