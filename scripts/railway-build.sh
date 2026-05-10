#!/usr/bin/env sh
# Railway / Docker: npm ci can hit EBUSY on apps/*/node_modules/.vite when Vite’s default
# cache lives under node_modules and a prior layer or cache mount still holds the dir.
# Vite cacheDir is set to tmp (see each app’s vite.config); this cleans hoisted workspaces.
set -eu
export NPM_CONFIG_PRODUCTION=false

for _ in 1 2 3 4 5 6 7 8; do
  chmod -Rf u+w node_modules apps packages 2>/dev/null || true
  rm -rf node_modules apps/*/node_modules packages/*/node_modules \
    apps/*/node_modules/.vite \
    packages/*/node_modules/.vite 2>/dev/null || true
  if ! [ -e apps/display/node_modules/.vite ]; then
    break
  fi
  sleep 1
done

if [ -e apps/display/node_modules/.vite ]; then
  echo "railway-build.sh: stale apps/display/node_modules/.vite could not be removed (EBUSY). Try clearing Railway build cache." >&2
  exit 1
fi

npm ci
npm run build
