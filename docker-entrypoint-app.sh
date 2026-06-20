#!/bin/sh
set -e
# ponytail: backend started in background, not supervised; if node dies the
# container keeps running on nginx alone. Add a supervisor (s6/tini) if that matters.
node /app/backend/dist/index.js &
exec /docker-entrypoint.sh "$@"
