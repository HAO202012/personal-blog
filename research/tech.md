# research/tech 技术调研（Cloudflare 适配）

## 选型对比（面向 Cloudflare）
| 方案 | 适配度 | 本地开发 | 备注 |
|---|---|---|---|
| Workers + Hono + D1 + Assets | 高 | `wrangler dev`（local 模式，无需账号） | 单 Worker 同时服务 API 与静态前端 |
| Pages + Functions + D1 | 中 | wrangler pages dev | Pages 已并入 Workers Assets 路线 |
| OpenNext(Next.js) | 中 | 较重 | 对纯博客偏重 |
| Astro + Cloudflare adapter | 中 | 支持 | 无动态后台时合适；要后台仍需 API |

## 关键技术点（来源：S3 官方文档知识）
1. **D1**：SQLite 兼容；本地开发用 `wrangler d1 execute --local` 初始化 schema/seed；binding 在 `wrangler.jsonc` 的 `d1_databases`。
2. **Hono**：`new Hono().get(...)`；`app.route()` 分组 API；中间件做鉴权；TypeScript 原生支持。
3. **Workers Assets**：`assets.directory` 指向前端静态目录，`not_found_handling` + `run_worker_first` 控制静态/Worker 边界。
4. **本地运行**：`wrangler dev` 默认 local（Miniflare），D1/KV 均为本地模拟，部署命令为 `wrangler deploy`（本轮不执行）。
5. Markdown 渲染：用 marked + highlight.js（或客户端渐进增强），避免引入重依赖。

## 约束确认
- Node 24 / npm 11 已就绪；`npm create cloudflare` 非必需，手工脚手架更可控。
- 需提供 `schema.sql` + `seed.sql`，`npm run setup` 一键初始化本地 D1。
