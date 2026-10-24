#!/bin/bash
set -euo pipefail
kill -TERM 1556863 1556753 1556750 1556751 2>/dev/null || true
mkdir -p /srv/ideal-home/rocm-image/cmake-offline/{bin,lib,share}
cp /usr/bin/cmake /srv/ideal-home/rocm-image/cmake-offline/bin/
cp -a /usr/share/cmake-3.28 /srv/ideal-home/rocm-image/cmake-offline/share/
ldd /usr/bin/cmake | awk '/=> \/(lib|usr)/ {print $3}' | while read -r dependency; do
  case "$(basename "$dependency")" in libc.so.*|libm.so.*|libgcc_s.so.*|libstdc++.so.*) continue ;; esac
  cp -L "$dependency" /srv/ideal-home/rocm-image/cmake-offline/lib/
done
docker tag ideal-home-local:web ideal-home-local:web-before-rocm
cat > /srv/ideal-home/rocm-image/Dockerfile.web.offline <<'EOF'
FROM ideal-home-local:web-before-rocm AS builder
WORKDIR /app
COPY . .
RUN npm run verify && npm run build
EXPOSE 3000
CMD ["npm","start"]
EOF
cd /home/aup/apps/ideal-home-local/deploy/local-ai
nohup docker compose -f compose.yaml -f /srv/ideal-home/rocm-image/compose.rocm.yaml build --progress plain web > /srv/ideal-home/logs/web-rocm-build.log 2>&1 </dev/null &
echo "webBuildPid=$!"
nohup docker compose -f compose.yaml -f /srv/ideal-home/rocm-image/compose.rocm.yaml build --progress plain qwen-text > /srv/ideal-home/logs/llama-rocm-build.log 2>&1 </dev/null &
echo "textBuildPid=$!"
