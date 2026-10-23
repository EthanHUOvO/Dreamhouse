"""Deterministic regressions in a disposable image with network disabled.

python tests/structure-primitives/run-regression.py IMAGE [scene-validation|catalog-restore|svg-adapter|portal-transaction|edit-persistence|portal-handlers]
Requires the existing SSH/Docker setup; no model deployment, package install,
production service restart or repository mutation is performed.
"""
import sys,json,shlex,tarfile,subprocess,os
from pathlib import Path
REPO=Path(__file__).resolve().parents[2]
BASE=REPO.parent
HOST=os.environ.get('STRUCTURE_TEST_SSH','amd@172.21.16.36')
def run(command,timeout=900):
 return subprocess.run(['ssh','-o','BatchMode=yes','-o','ClearAllForwardings=yes',HOST,command],capture_output=True,text=True,encoding='utf-8',timeout=timeout)
def copy(source,destination):
 subprocess.run(['scp','-q','-o','BatchMode=yes','-o','ClearAllForwardings=yes',str(source),HOST+':'+destination],check=True)
sys.stdout.reconfigure(encoding='utf-8')
REMOTE=os.environ.get('STRUCTURE_TEST_REMOTE','/tmp/structure-primitives-regression-20261023')
OUT=Path(os.environ.get('STRUCTURE_TEST_OUTPUT',str(BASE/'structure-test-output')));OUT.mkdir(parents=True,exist_ok=True)
image=sys.argv[1] if len(sys.argv)>1 else 'ideal-home-local:web-primitives-20261023'
entry=sys.argv[2] if len(sys.argv)>2 else 'scene-validation'
assert entry in ['scene-validation','catalog-restore','svg-adapter','portal-transaction','edit-persistence','portal-handlers','route-geometry','intent-plan-unit','svg-raster']
overlays=[];paths={'tests/structure-primitives/scene-validation.ts','tests/bedroom-edit/assertions.ts','tests/bedroom-edit/fixtures/one01-bottom-door.svg','public/preset/svg-v2/one/option-01.svg'}
paths.add('v2-svg-option1-1.svg')
paths.add('Dockerfile.web.rocm')
for directory in ['tests/svg-adapter','tests/structure-primitives','tests/bedroom-edit','tests/edit-persistence','public/preset/svg-v2']:
 paths.update(p.relative_to(REPO).as_posix() for p in (REPO/directory).rglob('*') if p.is_file())
for line in (REPO/'Dockerfile.web.rocm').read_text(encoding='utf-8').splitlines():
 words=shlex.split(line)
 if len(words)==3 and words[0]=='COPY' and (REPO/words[1]).is_file() and words[2].endswith(('.ts','.tsx')):paths.add(words[1]);overlays.append((words[1],words[2]))
archive=OUT/'inputs.tar'
with tarfile.open(archive,'w') as t:
 for src in sorted(paths):t.add(REPO/src,arcname=src)
r=run('mkdir -p '+REMOTE+'/workspace '+REMOTE+'/evidence');assert r.returncode==0,r.stderr
copy(archive,REMOTE+'/inputs.tar');r=run('tar -xf '+REMOTE+'/inputs.tar -C '+REMOTE+'/workspace');assert r.returncode==0,r.stderr
applied_overlays=[] if os.environ.get('STRUCTURE_TEST_IMAGE_ONLY')=='1' else overlays
commands=['cp '+shlex.quote('/workspace/'+src)+' '+shlex.quote(dest) for src,dest in applied_overlays]
scripts={'svg-adapter':'tests/svg-adapter/regression.ts','portal-transaction':'tests/bedroom-edit/portal-transaction.ts','edit-persistence':'tests/edit-persistence/regression.ts','portal-handlers':'tests/edit-persistence/portal-handlers.ts','route-geometry':'tests/structure-primitives/route-geometry.cjs','intent-plan-unit':'tests/structure-primitives/intent-plan-unit.cjs'}
script='/workspace/'+scripts.get(entry,'tests/structure-primitives/'+entry+'.ts')
if entry=='route-geometry':commands += ['export STRUCTURE_TEST_RUNTIME_ROOT=/app']
commands += ['export PASCAL_SCENE_DIR=/tmp/structure-intent-scene-store','node --import tsx '+script]
if entry=='svg-adapter':commands += ['cp /workspace/tests/svg-adapter/results/programmatic.json /evidence/svg-adapter-regression.json']
args=['docker','run','--rm','--network','none','-v',REMOTE+'/workspace:/workspace','-v',REMOTE+'/evidence:/evidence','-w','/app','-e','NODE_PATH=/app/node_modules',image,'sh','-ec','\n'.join(commands)]
r=run(shlex.join(args),timeout=900);(OUT/(entry+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8');print((r.stdout+r.stderr)[-20000:]);print(json.dumps({'image':image,'exitCode':r.returncode,'network':'none','remote':REMOTE,'overlays':applied_overlays},ensure_ascii=False))
(OUT/(entry+'-run.json')).write_text(json.dumps({'image':image,'exitCode':r.returncode,'network':'none','remote':REMOTE,'overlays':applied_overlays},ensure_ascii=False,indent=2),encoding='utf-8')
if entry not in ['portal-transaction','portal-handlers','route-geometry','intent-plan-unit']:
 name={'scene-validation':'structure-scene-validation','svg-adapter':'svg-adapter-regression'}.get(entry,entry)
 subprocess.run(['scp','-q','-o','BatchMode=yes','-o','ClearAllForwardings=yes',HOST+':'+REMOTE+'/evidence/'+name+'.json',str(OUT)],check=False)
sys.exit(r.returncode)
