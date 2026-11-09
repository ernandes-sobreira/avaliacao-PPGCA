#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
rm -rf dist
mkdir -p dist/server dist/.openai
node scripts/build-worker.mjs
cp .openai/hosting.json dist/.openai/hosting.json
