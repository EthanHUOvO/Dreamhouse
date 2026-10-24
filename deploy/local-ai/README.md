# Ideal Home local Vulkan deployment

This stack runs Qwen3.8-27B, its vision projector, Qwen-Image-2.1, Z-Image-Turbo, and Pascal MCP without cloud AI dependencies. The base model download script uses `https://hf-mirror.com`; the audited runtime and adapter below came from their official providers. Runtime containers share an internal Docker network, and only the two web ports are published.

## Install models

```bash
sudo mkdir -p /srv/ideal-home/models /srv/ideal-home/data/{generated,scenes}
sudo chown -R "$USER":"$USER" /srv/ideal-home
MODEL_ROOT=/srv/ideal-home/models ./deploy/local-ai/download-models.sh
```

The script pins both model repository revisions and writes `SOURCES.json` plus `SHA256SUMS`. Model volumes are mounted read-only by Compose.

## Build the dual-port stack

```bash
cd deploy/local-ai
cp .env.example .env
docker compose build
docker compose up -d
curl http://127.0.0.1:3000/api/ai/status
curl http://127.0.0.1:3001/api/ai/status
```

Both gateways and image workers use the same OS `flock` under `/data/gpu-lock`, so requests from ports 3000 and 3001 cannot run inference simultaneously on the shared GPU. Waiting jobs are bounded and removed on disconnect. Qwen3.8 remains loaded with one parallel slot and a 32K context; image CLI stages still load their own weights per request.

## Installed dual-port profile (2026-10-13)

- Port **3000**: Qwen-Image-2.1 with the dedicated **Fun Acc 4Step** adapter; both floorplan and interior requests use four steps.
- Port **3001**: Z-Image-Turbo; diffusion stays on Vulkan, while VAE runs on CPU to avoid the observed RADV VAE encode device reset.
- Floorplan inference is capped at 640 pixels on the longest side, uses aspect-preserving white padding, and restores the exact original output dimensions.
- Image responses are previews with `geometryVerified: false`. The controlled independent-study edit failed with base8, base40, Acc4 and a more explicit landmark prompt. Neither HTTP success nor added sampling steps establish wall/room correctness.
- Step3 recognizes **unchanged** catalog image bytes against server-owned assets and reuses the corresponding validated scene. Changed images use bounded geometry extraction, two model calls on the normal path, MCP validation, a ten-minute deadline, heartbeats, and propagated cancellation. Fallback previews are visibly marked as failed generation.

The installed standalone runtime is `qwenimage-ncnn-vulkan` **20261010**, under `/srv/ideal-home/src/qwenimage-ncnn-vulkan/20261010/`. The extracted executable SHA256 is `815e93efe8d0b65b364e4f826ab7a1df6e964370b56a05c0604024ed63dce34e`. The official [Linux release ZIP](https://github.com/nihui/qwenimage-ncnn-vulkan/releases/tag/20261010) SHA256 is `8bcc171133e4fa28cec621e56ccca20e2b2f4a92739b537bf39f2e2abd551e5b`; this archive hash was verified against the GitHub release asset digest.
The adapter is `/srv/ideal-home/models/qwen-image/lora/Qwen-Image-2.1-Fun-Acc-4Step.safetensors`; provider `alibaba-pai/Qwen-Image-2.1-Fun-Acc-LoRAs`, revision `f7545234760e1847cd8e89e52bd951cb0b7e327f`, asset `models/Qwen-Image-2.1-Fun-Acc-4Step.safetensors`, SHA256 `764c56ae94f330b6d06ccc322f95e1b8ce46424ddde5899a15432f95f720d558`.

On this installed server, offline rebuilds reuse the retained original runtime images:

```bash
docker build -f deploy/local-ai/Dockerfile.audit-web -t ideal-home-local:web-audit-20261013 .
docker build -f deploy/local-ai/Dockerfile.qwen-image -t ideal-home-local:sd-cpp-audit-20261013 .
docker build -f deploy/local-ai/Dockerfile.qwen-image-ncnn -t ideal-home-local:qwen-image-audit-20261013 .
docker compose -f deploy/local-ai/compose.yaml up -d --no-deps web web-qwen-image21 ai-gateway ai-gateway-qwen-image21 qwen-image qwen-image-21
```

Keep the adapter and runtime files present before starting this profile. To use the base Qwen profile instead, remove `QWEN_IMAGE_LORA`, label `LOCAL_IMAGE_MODEL` as `Qwen-Image-2.1`, and set floorplan/interior sampling to the base schedule rather than leaving four-step settings active.
Controlled 512x512 tests with identical input, prompt and seed measured 490.30 seconds for base40 and 144.83 seconds for Acc4; this is a speed comparison, not a claim of faithful architectural reconstruction.

## Restore the saved deployment

Ports 3000 and 3001 are concurrent profiles: `web-qwen-image21` publishes 3000, and `web` publishes 3001. The original image tags `ideal-home-local:web`, `ideal-home-local:sd-cpp`, and `ideal-home-local:qwen-image` are retained. The pre-audit Compose file is `/home/amd/Workspace/Ideal-house/.runtime/audit-20261013/compose-before.yaml`.

To restore those runtime images and settings on this server:

```bash
docker compose --project-directory /home/amd/Workspace/Ideal-house/deploy/local-ai \
  -f /home/amd/Workspace/Ideal-house/.runtime/audit-20261013/compose-before.yaml \
  up -d --no-build
```

Generated images and original model files stay in their existing bind-mounted data directories. Source changes are tracked separately in Git.

## Offline verification

The `local-ai` network is declared `internal: true`. After images and model files are present, recreate the stack and verify layout editing, Step 3 MCP scene creation, manual Pascal editing, renders, and BOM generation. `GET /api/ai/status` must report text, vision, image, MCP, and Vulkan as healthy.
