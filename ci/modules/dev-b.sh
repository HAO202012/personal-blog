#!/usr/bin/env bash
# dev/b 模块自测：构建前端 vendor 包（marked + highlight.js 离线 bundle）
set -e
cd "$(dirname "$0")/../.."
node scripts/build-vendor.mjs
