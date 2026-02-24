#!/usr/bin/env bash
set -euo pipefail

# Requires web-ext: npm install -g web-ext

web-ext build \
  --source-dir . \
  --artifacts-dir ./web-ext-artifacts \
  --ignore-files "build.sh" "*.html" "*.md" \
  --overwrite-dest

echo "XPI built in ./web-ext-artifacts/"
