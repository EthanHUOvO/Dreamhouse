#!/usr/bin/env bash
cd "$(dirname "$0")"
python3 -m http.server 8080 --bind 0.0.0.0
