#!/usr/bin/env bash
# dev/a 模块自测：类型检查
set -e
cd "$(dirname "$0")/../.."
npx tsc --noEmit
