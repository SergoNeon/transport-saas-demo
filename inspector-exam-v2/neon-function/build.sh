#!/usr/bin/env sh
set -eu
# Build a self-contained Neon Function from the canonical GitHub source.
# Run from the inspector-exam-v2 directory with Node.js 24 and npm available.
cd "$(dirname "$0")/.."
npm ci --omit=dev
npm install --no-save esbuild@0.25.12
mkdir -p dist
npx esbuild neon-function/server.mjs --bundle --platform=node --target=node24 --minify --outfile=dist/index.mjs
(cd dist && zip -9 -q afikim-api.zip index.mjs)
echo "Created dist/afikim-api.zip"
echo "Deploy with Neon CLI (authorized project): neon functions deploy afikimstage --src dist/index.mjs"
echo "Verify HTTPS /health returns ok:true, questions:30, storage:postgresql"
