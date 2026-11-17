#!/usr/bin/env bash
# test/contract 模块自测：契约测试套件
set -e
cd "$(dirname "$0")/../.."
node --test tests/
