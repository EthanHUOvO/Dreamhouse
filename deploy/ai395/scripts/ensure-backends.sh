#!/bin/sh
set -eu

# Existing deployment only: preserve models, mounts, networks and container args.
# Docker is already enabled at boot on this host; restart policies persist there.
containers="gufo-serve ideal-home-rocm-migration-qwen-image-1 ideal-home-rocm-migration-pascal-mcp-1 ideal-home-rocm-migration-ai-gateway-1 ideal-home-rocm-migration-web-1"
for name in $containers; do
  docker inspect "$name" >/dev/null
done
for name in $containers; do
  docker update --restart=unless-stopped "$name" >/dev/null
  docker start "$name" >/dev/null
  docker inspect -f '{{.Name}}: {{.State.Status}}, restart={{.HostConfig.RestartPolicy.Name}}' "$name"
done
