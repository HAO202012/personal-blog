# 架构文档（W3 · architect）

> 输入：project/brief.md + project/prd.md

## 1. 总体架构（ADR-01：单 Worker 单体）
```
浏览器 ──HTTP──> Cloudflare Worker (Hono)
                  ├─ Worker Assets: public/ 静态前端（HTML/CSS/JS，fetch 调 API）
                  ├─ /api/*       REST JSON（前台公开）
                  ├─ /api/admin/* 鉴权中间件保护的 JSON
                  └─ D1 binding (DB) ← schema.sql / seed.sql
本地运行：wrangler dev（Miniflare，local D1，无需账号）
```
- 否决「Pages + Functions」：与 Workers Assets 路线重复，维护两套配置无收益。
- 否决「SSR 渲染」：纯博客读多写少，静态页 + 客户端 fetch 足够，省去 HTML 模板绑定与 hydrate 复杂度。
- 否决「KV 存文章」：需要关系查询（分类/标签/归档/搜索），D1 是唯一合理选型。

## 2. 目录结构与所有权
```
project/
  wrangler.jsonc        # Worker + D1 binding + assets 配置
  package.json          # hono / wrangler / miniflare / typescript
  tsconfig.json
  schema.sql, seed.sql  # D1 初始化
  src/
    index.ts            # Worker 入口：挂 assets + 路由
    routes/api.ts       # 前台公开 API
    routes/admin.ts     # 管理 API（登录 + CRUD）
    auth.ts             # 密码哈希校验 + HMAC cookie 会话
    db.ts               # 查询封装（全参数化）
    types.ts
  public/               # 前端（dev/b）：index/post/category/tags/archive/search/about/admin*.html + css/js
  tests/contract.test.mjs  # Miniflare 集成契约测试（test/contract）
```

## 3. 关键设计
- **鉴权（ADR-02）**：`ADMIN_PASSWORD` 来自 env（本地默认 `admin123`，部署时 `wrangler secret put`）。登录成功下发 `blog_session` cookie = `payload.hmac`（HMAC-SHA256，secret = `SESSION_SECRET` env，本地默认值）。中间件校验 /api/admin/*（login 除外）。
- **数据访问（ADR-03）**：db.ts 统一封装，全部 `.bind()` 参数化；slug 唯一索引；列表查询只取 summary 不取全文。
- **Markdown 渲染（ADR-04）**：前台客户端用 marked + highlight.js（CDN-free：本地 vendor 到 public/vendor/ 以保证离线可用）；XSS 由 marked 默认转义 + 前台 DOM 注入仅限渲染结果容器。
- **前端路由**：静态页 + query 参数（/post.html?slug=x），避免 Worker 参与前台路由，`not_found_handling: single-page-application` 兜底。
- **错误约定**：4xx/5xx 统一 `{ error: string }`；成功为裸 JSON 或 `{ items, total, page }`。

## 4. CI 脚本（W3 建骨架，W4 dev 只补 modules/<self>.sh）
| 脚本 | 职责 | 执行者 |
|---|---|---|
| ci/setup-db.sh | 初始化本地 D1（schema + seed） | W5 lead |
| ci/typecheck.sh | tsc --noEmit | W5 lead |
| ci/run-tests.sh | 契约测试（node --test） | W5 lead |
| ci/run-dev.sh | 启动 wrangler dev | W6 release / 人 |
| ci/modules/*.sh | 各模块自测命令 | dev/* |

## 5. 部署预留（本轮不执行）
- `wrangler deploy` 即可上线；生产资源：`wrangler d1 create blog-db`、`wrangler secret put ADMIN_PASSWORD / SESSION_SECRET`；清单写入 deploy.md。
