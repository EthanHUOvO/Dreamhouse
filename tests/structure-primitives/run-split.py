"""Run only deterministic split regressions inside a disposable image copy."""
import json,os,shlex,subprocess,sys,tarfile,tempfile
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
HOST=os.environ.get('SPLIT_TEST_SSH','amd@172.21.16.36')
REMOTE='/tmp/structure-primitives-split-20261023'
OUT=ROOT.parent/'split-output';OUT.mkdir(parents=True,exist_ok=True)
SSH=['ssh','-o','BatchMode=yes','-o','ClearAllForwardings=yes',HOST]
SCP=['scp','-q','-o','BatchMode=yes','-o','ClearAllForwardings=yes']
def run(cmd,timeout=900):return subprocess.run(SSH+[cmd],capture_output=True,text=True,encoding='utf-8',timeout=timeout)
image=run("docker inspect --format '{{.Image}}' ideal-home-rocm-migration-web-1").stdout.strip()
paths=['tests/structure-primitives','tests/bedroom-edit','public/preset/svg-v2'];overlays=[]
for line in (ROOT/'Dockerfile.web.rocm').read_text(encoding='utf-8').splitlines():
 words=shlex.split(line)
 if len(words)==3 and words[0]=='COPY' and (ROOT/words[1]).is_file() and words[2].endswith(('.ts','.tsx')):paths.append(words[1]);overlays.append((words[1],words[2]))
for module in ['room-split-primitives','structure-svg']:
 source='v2/step3-3d/'+module+'.ts'
 if not any(src==source for src,_ in overlays):paths.append(source);overlays.append((source,'/app/lib/ai/'+module+'.ts'))
with tempfile.TemporaryDirectory(prefix='split-regression-')as scratch:
 archive=Path(scratch)/'inputs.tar'
 with tarfile.open(archive,'w')as tar:
  for path in sorted(set(paths)):tar.add(ROOT/path,arcname=path)
 r=run('mkdir -p '+shlex.quote(REMOTE+'/workspace')+' '+shlex.quote(REMOTE+'/evidence'));r.check_returncode()
 subprocess.run(SCP+[str(archive),HOST+':'+REMOTE+'/inputs.tar'],check=True)
 r=run('tar -xf '+shlex.quote(REMOTE+'/inputs.tar')+' -C '+shlex.quote(REMOTE+'/workspace'));r.check_returncode()
 commands=['cp '+shlex.quote('/workspace/'+src)+' '+shlex.quote(dst)for src,dst in overlays]
 entry=os.environ.get('SPLIT_TEST_ENTRY','split-regression.ts')
 if entry not in ['split-regression.ts','split-budget.ts']:raise ValueError('Unsupported split test entry')
 commands+=['export PASCAL_SCENE_DIR=/tmp/structure-split-scenes','node --import tsx /workspace/tests/structure-primitives/'+entry]
 args=['docker','run','--rm','--network','none','-v',REMOTE+'/workspace:/workspace:ro','-v',REMOTE+'/evidence:/evidence','-w','/app','-e','NODE_PATH=/app/node_modules']
 for name in ['SPLIT_TEST_ONLY','SPLIT_TEST_DIAGNOSTIC','SPLIT_TEST_DIRECTION','SPLIT_TEST_TARGET','SPLIT_TEST_RESTORE_ONLY']:args+=['-e',name+'='+os.environ.get(name,'')]
 args += [image,'sh','-ec','\n'.join(commands)]
 result=run(shlex.join(args));(OUT/'split.log').write_text(result.stdout+result.stderr,encoding='utf-8')
 print((result.stdout+result.stderr)[-18000:]);subprocess.run(SCP+[HOST+':'+REMOTE+'/evidence/*',str(OUT)],check=True)
 (OUT/'run.json').write_text(json.dumps({'image':image,'exitCode':result.returncode,'network':'none'},indent=2),encoding='utf-8');sys.exit(result.returncode)
