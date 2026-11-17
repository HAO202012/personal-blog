# 个人博客系统（Personal Blog）

运行在 **Cloudflare Workers** 上的单作者博客：前台浏览 + 在线 Markdown 管理后台，本地零配置可跑，一条命令可部署到边缘。

> 本项目由 [agent-team-skeleton](../) 多 agent 流水线开发（W0 立项 → W1 调研 → W2 PRD → W3 架构 → W4 开发 → W5 集成 → W6 部署 → W7 流水线固化），完整过程产物见 `docs/` 与各流程文件。

## 功能

- 前台：文章列表（分页）/ 详情（Markdown + 代码高亮 + 阅读时间）/ 分类 / 标签云 / 归档 / 搜索 / 关于
- 后台：密码登录、Markdown 编辑器（双栏实时预览）、草稿/发布、文章管理（增删改）
- 发布即生效，草稿前台不可见

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Cloudflare Workers |
| Web 框架 | Hono（TypeScript） |
| 数据库 | D1（SQLite），全参数化查询 |
| 鉴权 | HMAC-SHA256 签名会话 cookie |
| 静态资产 | Workers Assets（离线 vendor：marked + highlight.js） |
| 测试 | 契约测试 14 用例（node:test，不依赖 workerd） |

## 快速开始

```bash
npm install
npm run dev:local     # 本地启动 http://localhost:8787
```

- 管理后台：http://localhost:8787/admin-login.html ，默认密码 `admin123`（仅本地）
- 本地数据库：`local-data/blog.db`（首次启动自动建表 + 演示数据；删除即重置）
- 契约测试：`npm test`

## 部署到 Cloudflare

```bash
wrangler d1 create blog-db                       # database_id 填回 wrangler.jsonc
wrangler d1 migrations apply blog-db --remote    # 或首次用 schema.sql/seed.sql
wrangler secret put ADMIN_PASSWORD               # 生产密码（勿用本地默认值）
wrangler secret put SESSION_SECRET               # 随机长字符串
wrangler deploy
```

> `wrangler.jsonc` 中的 `vars` 默认值仅限本地开发，生产必须走 Secrets。

## 文档索引

| 文档 | 内容 |
|---|---|
| `prd.md` | 产品需求（功能编号 F1/F2，验收清单） |
| `architecture.md` | 架构决策（ADR-01~04） |
| `api-contract.yaml` | REST 契约（frozen） |
| `deploy.md` | 部署记录 + 生产 Secrets 清单 |
| `design/` | UI 规格 + 设计 tokens |
| `tests/contract.test.mjs` | 契约测试套件 |

## License

[MIT](LICENSE)
