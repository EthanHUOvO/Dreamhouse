#!/bin/sh
set -eu
# This runs in a disposable image, never in the serving container.
cd /workspace
while read -r action source destination extra; do
  if [ "$action" = COPY ] && [ -f "$source" ]; then cp "$source" "$destination"; fi
done < Dockerfile.web.rocm
cd /app
export PASCAL_SCENE_DIR=/tmp/svg-adapter-test-scenes
exec node --import tsx /workspace/tests/svg-adapter/${1:-regression}.ts
