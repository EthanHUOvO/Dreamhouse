#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install Node.js 22, then run this file again."
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 20 ]; then
  echo "Node.js 20 or newer is required. Install Node.js 22, then run this file again."
  exit 1
fi

[ -f .env.local ] || cp .env.example .env.local
npm ci --no-audit --no-fund
export DREAMHOUSE_LAUNCHER_AUTO_START=1
export DREAMHOUSE_LAUNCHER_NO_BROWSER=1
echo "DreamHouse configuration: http://127.0.0.1:3210"
exec node launcher/server.cjs
