"""Validate saved real HTTP output against the final image, without inference."""
import json
import os
import shlex
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parents[2]
HOST=os.environ.get("BEDROOM_TEST_SSH", "amd@172.21.16.36")
REMOTE="/tmp/bedroom-live-validation-20261023"
LIVE=os.environ.get("BEDROOM_LIVE_REMOTE", "/tmp/natural-bedroom-20261023/evidence/live-final")
IMAGE=os.environ.get("BEDROOM_LIVE_IMAGE", "ideal-home-local:web-bedroom-20261023")
OUT=ROOT.parent/"programmatic-output"
OUT.mkdir(exist_ok=True)
SSH=["ssh","-o","BatchMode=yes","-o","ClearAllForwardings=yes",HOST]
SCP=["scp","-q","-o","BatchMode=yes","-o","ClearAllForwardings=yes"]

def run(command):
    return subprocess.run(SSH+[command],capture_output=True,text=True,encoding="utf-8",timeout=120)

image=run("docker image inspect --format '{{.Id}}' "+shlex.quote(IMAGE))
if image.returncode:
    raise RuntimeError(image.stderr)
result=run("mkdir -p "+shlex.quote(REMOTE+"/tests")+" "+shlex.quote(REMOTE+"/evidence"))
if result.returncode:
    raise RuntimeError(result.stderr)
with tempfile.TemporaryDirectory(prefix="bedroom-live-validation-") as scratch:
    archive=Path(scratch)/"tests.tar"
    with tarfile.open(archive,"w") as tar:
        for name in ["assertions.ts","live-result.ts"]:
            tar.add(ROOT/"tests"/"bedroom-edit"/name,arcname=name)
    subprocess.run(SCP+[str(archive),HOST+":"+REMOTE+"/tests.tar"],check=True)
    result=run("tar -xf "+shlex.quote(REMOTE+"/tests.tar")+" -C "+shlex.quote(REMOTE+"/tests"))
    if result.returncode:
        raise RuntimeError(result.stderr)
command=["docker","run","--rm","--network","none","-v",REMOTE+"/tests:/tests:ro","-v",REMOTE+"/evidence:/evidence","-v",LIVE+":/live:ro","-v","/srv/ideal-home/rocm-migration/public/preset/svg-v2:/source:ro","-w","/app","-e","NODE_PATH=/app/node_modules","-e","BEDROOM_LIVE_SOURCE=/source/one/option-01.svg","-e","PASCAL_SCENE_DIR=/tmp/bedroom-live-validation-scenes",image.stdout.strip(),"node","--import","tsx","/tests/live-result.ts"]
result=run(shlex.join(command))
(OUT/"live-result.log").write_text(result.stdout+result.stderr,encoding="utf-8")
(OUT/"live-result-run.json").write_text(json.dumps({"image":image.stdout.strip(),"exitCode":result.returncode,"network":"none","command":command},indent=2),encoding="utf-8")
print(result.stdout+result.stderr)
subprocess.run(SCP+[HOST+":"+REMOTE+"/evidence/live-result-validation.json",str(OUT/"live-result-validation.json")],check=True)
sys.exit(result.returncode)
