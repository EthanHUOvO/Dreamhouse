"""Run deterministic bedroom regressions in an isolated copy of the live image.

Windows host: python tests/bedroom-edit/run.py
No model network, production files, services or repository index are modified.
Requires the already authorised SSH access to the AI workstation.
"""
import json
import os
import shlex
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
HOST = os.environ.get("BEDROOM_TEST_SSH", "amd@172.21.16.36")
REMOTE = os.environ.get("BEDROOM_TEST_REMOTE", "/tmp/bedroom-programmatic-20261023")
OUT = Path(os.environ.get("BEDROOM_TEST_LOCAL_OUTPUT", ROOT.parent / "programmatic-output"))
SSH = ["ssh", "-o", "BatchMode=yes", "-o", "ClearAllForwardings=yes", HOST]
SCP = ["scp", "-q", "-o", "BatchMode=yes", "-o", "ClearAllForwardings=yes"]
OUT.mkdir(parents=True, exist_ok=True)

def run(command, timeout=900):
    return subprocess.run(SSH + [command], capture_output=True, text=True, encoding="utf-8", timeout=timeout)

def copy(source, destination):
    subprocess.run(SCP + [str(source), HOST + ":" + destination], check=True)

# Read only the image identifier, never production environment secrets.
result = run("docker inspect --format '{{.Image}}' ideal-home-rocm-migration-web-1")
if result.returncode:
    raise RuntimeError(result.stderr)
image = result.stdout.strip()
paths = ["tests/bedroom-edit", "public/preset/svg-v2"]
overlays = []
for line in (ROOT / "Dockerfile.web.rocm").read_text(encoding="utf-8").splitlines():
    words = shlex.split(line)
    if len(words) == 3 and words[0] == "COPY" and (ROOT / words[1]).is_file() and words[2].endswith((".ts", ".tsx")):
        paths.append(words[1])
        overlays.append((words[1], words[2]))
for module in ["bedroom-edit-geometry", "bedroom-scene-validation"]:
    source = "v2/step3-3d/" + module + ".ts"
    if (ROOT / source).is_file() and not any(src == source for src, _ in overlays):
        paths.append(source)
        overlays.append((source, "/app/lib/ai/" + module + ".ts"))
with tempfile.TemporaryDirectory(prefix="bedroom-regression-") as scratch:
    archive = Path(scratch) / "inputs.tar"
    with tarfile.open(archive, "w") as tar:
        for path in sorted(set(paths)):
            tar.add(ROOT / path, arcname=path)
    result = run("mkdir -p " + shlex.quote(REMOTE + "/workspace") + " " + shlex.quote(REMOTE + "/evidence"))
    if result.returncode:
        raise RuntimeError(result.stderr)
    copy(archive, REMOTE + "/inputs.tar")
    result = run("tar -xf " + shlex.quote(REMOTE + "/inputs.tar") + " -C " + shlex.quote(REMOTE + "/workspace"))
    if result.returncode:
        raise RuntimeError(result.stderr)
    commands = ["cp " + shlex.quote("/workspace/" + src) + " " + shlex.quote(dest) for src, dest in overlays]
    entry = os.environ.get("BEDROOM_TEST_ENTRY", "regression.ts")
    if entry not in ["regression.ts", "diagnose.ts", "source-furniture.ts"]:
        raise ValueError("Unsupported test entry")
    commands += ["export PASCAL_SCENE_DIR=/tmp/bedroom-scenes", "node --import tsx /workspace/tests/bedroom-edit/" + entry]
    args = ["docker", "run", "--rm", "--network", "none", "-v", REMOTE + "/workspace:/workspace:ro", "-v", REMOTE + "/evidence:/evidence", "-w", "/app", "-e", "NODE_PATH=/app/node_modules", image, "sh", "-ec", "\n".join(commands)]
    result = run(shlex.join(args))
    (OUT / "regression.log").write_text(result.stdout + result.stderr, encoding="utf-8")
    (OUT / "run.json").write_text(json.dumps({"image": image, "exitCode": result.returncode, "network": "none", "remoteScratch": REMOTE, "command": args, "overlays": overlays}, indent=2), encoding="utf-8")
    print((result.stdout + result.stderr)[-15000:])
    subprocess.run(SCP + [HOST + ":" + REMOTE + "/evidence/*", str(OUT)], check=True)
    print(json.dumps({"exitCode": result.returncode, "output": str(OUT)}, ensure_ascii=False))
    sys.exit(result.returncode)
