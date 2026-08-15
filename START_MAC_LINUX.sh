#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js 22.13+ first."; exit 1; }
[ -d node_modules ] || npm install --no-audit --no-fund
npm run dev
