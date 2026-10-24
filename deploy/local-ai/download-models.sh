#!/usr/bin/env bash
set -euo pipefail

HF_MIRROR="${HF_MIRROR:-https://hf-mirror.com}"
MODEL_ROOT="${MODEL_ROOT:-/srv/ideal-home/models}"
TEXT_REPO="unsloth/Qwen3.8-27B-GGUF"
IMAGE_REPO="nihui-szyl/qwen-image-ncnn"
TEXT_REV="${TEXT_REV:-4ca720788d1e01f1bff70c033e0d0028fd02e502}"
IMAGE_REV="${IMAGE_REV:-7c869517fa769bb46bc76298b01261d4c68ec54e}"

mkdir -p "$MODEL_ROOT/text" "$MODEL_ROOT/qwen-image"

download() {
  local repo="$1" revision="$2" file="$3" destination="$4"
  local partial="${destination}.partial"
  mkdir -p "$(dirname "$destination")"
  if [[ -s "$destination" ]]; then
    echo "Already present: $destination"
    return
  fi
  echo "Downloading $repo@$revision/$file from $HF_MIRROR"
  curl -4 -fL --connect-timeout 30 --retry 12 --retry-all-errors --continue-at - \
    "$HF_MIRROR/$repo/resolve/$revision/$file" \
    -o "$partial"
  mv "$partial" "$destination"
}

download "$TEXT_REPO" "$TEXT_REV" "Qwen3.8-27B-UD-Q4_K_XL.gguf" "$MODEL_ROOT/text/Qwen3.8-27B-UD-Q4_K_XL.gguf"
download "$TEXT_REPO" "$TEXT_REV" "mmproj-F16.gguf" "$MODEL_ROOT/text/mmproj-F16.gguf"

mapfile -t image_files < <(
  curl -4 -fsSL --connect-timeout 30 --retry 8 "$HF_MIRROR/api/models/$IMAGE_REPO" \
    | python3 -c 'import json,sys; data=json.load(sys.stdin); print("\n".join(x["rfilename"] for x in data.get("siblings", []) if x["rfilename"].startswith("qwenimage21/") or x["rfilename"] == "LICENSE"))'
)
for file in "${image_files[@]}"; do
  download "$IMAGE_REPO" "$IMAGE_REV" "$file" "$MODEL_ROOT/qwen-image/$file"
done

cat > "$MODEL_ROOT/SOURCES.json" <<EOF
{
  "downloadedFrom": "$HF_MIRROR",
  "text": {"repository": "$TEXT_REPO", "revision": "$TEXT_REV", "quantization": "UD-Q4_K_XL", "visionProjector": "mmproj-F16.gguf"},
  "image": {"repository": "$IMAGE_REPO", "revision": "$IMAGE_REV", "runtime": "qwenimage-ncnn-vulkan"},
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

find "$MODEL_ROOT/text" "$MODEL_ROOT/qwen-image" -type f -print0 \
  | sort -z \
  | xargs -0 sha256sum > "$MODEL_ROOT/SHA256SUMS"
echo "Model manifest written to $MODEL_ROOT/SHA256SUMS"
