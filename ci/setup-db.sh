#!/usr/bin/env bash
# W5/W6 执行：初始化本地 D1（schema + seed）。骨架由 W3 architect 建立，实现细节由 dev/a 补充说明。
set -e
cd "$(dirname "$0")/.."
npx wrangler d1 execute blog-db --local --file=schema.sql
npx wrangler d1 execute blog-db --local --file=seed.sql 2>/dev/null || echo "seed.sql 不存在或已初始化，跳过"
