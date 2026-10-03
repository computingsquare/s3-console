#!/bin/sh
set -e
# Backend started in background, not supervised: if node dies, nginx keeps
# running alone. The chart's probes hit /healthz, which nginx proxies to the
# backend's /health, so Kubernetes restarts the container in that case.
node /app/backend/dist/index.js &
exec /docker-entrypoint.sh "$@"
