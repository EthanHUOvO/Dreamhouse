#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -f .env.local ] || cp .env.example .env.local
command -v node >/dev/null || { echo "Install Node.js 22.13+ first."; exit 1; }
[ -d node_modules ] || npm install
npm run doctor
npm run dev
