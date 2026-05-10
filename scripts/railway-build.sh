#!/usr/bin/env sh
# Railway Railpack runs an “install” step before this “build” step. The build step mounts
# read-only-ish BuildKit caches at each Vite workspace’s default path:
#   /app/apps/<workspace>/node_modules/.vite
# (see railwayapp/railpack core/providers/node/node.go addCachesToBuildStep).
# Those paths MUST NOT be deleted here — removal always yields EBUSY.
# Likewise, do not run `npm ci` in this step: npm tries to replace node_modules and hits the same mounts.
# Our Vite configs set cacheDir under the OS temp dir, so pre-bundling does not need those mounts, but
# the empty cache directories are still managed by Railpack.
set -eu
export NPM_CONFIG_PRODUCTION=false

npm run build
