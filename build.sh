#!/usr/bin/env bash
set -euo pipefail

# Requires web-ext: npm install -g web-ext

rm -rf ./web-ext-artifacts

web-ext build \
  --source-dir . \
  --artifacts-dir ./web-ext-artifacts \
  --ignore-files "build.sh" "*.html" "*.md" \
  --overwrite-dest

cd ./web-ext-artifacts && mv *.zip "$(basename *.zip .zip).xpi"

echo "XPI built in ./web-ext-artifacts/"
