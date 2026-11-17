# 部署记录（W6 · release）

## 本次范围
**仅本地部署验收，未部署到 Cloudflare**（用户要求）。

## 本地启动步骤
```powershell
cd agent-team-skeleton-develop/project
npm install        # 安装依赖（已执行）
npm run dev:local  # 启动本地服务器
```
- 首页：http://localhost:8787
- 管理后台：http://localhost:8787/admin-login.html ，密码 `admin123`（env `ADMIN_PASSWORD`）
- 本地数据：`local-data/blog.db`（首次启动自动执行 schema.sql + seed.sql；删除该文件即可重置）

## 本地验收结果
| 验收项 | 结果 |
|---|---|
| `npm run dev:local` 本地启动成功，首页可访问 | ✅ 200 |
| 前台页面：首页/详情/分类/标签/归档/搜索/关于 | ✅ 全部 200 |
| 契约测试 14/14（含登录/发文/草稿不可见/slug 冲突/删除） | ✅ tests_green |
| wrangler.jsonc 含 D1 binding + assets，未执行 deploy | ✅ |
| 管理后台登录→发文→前台立即可见（HTTP 层） | ✅ 契约测试覆盖（HTTP 端到端命令被终端审批拦截，未单独重跑） |

## 架构变更记录（W5 团长裁决）
本机 workerd 启动崩溃（Windows VC++ 运行库问题，`wrangler dev` 报 access violation）。裁决：
- **契约与业务代码不变**（Hono 应用天然可移植）；
- 新增 `scripts/local-server.mjs`：Node 24 内置 `node:sqlite` 提供 D1 兼容 binding + `@hono/node-server` 提供静态资产服务（等价 Workers Assets）；
- `npm run dev:local` = 本地预览入口；`npm run dev`（wrangler dev）为 Cloudflare 路径，修复 VC++ 运行库后可用。

## 未来部署到 Cloudflare（本轮不执行）
```bash
npm i -g wrangler
wrangler d1 create blog-db                    # 把返回的 database_id 填入 wrangler.jsonc
wrangler d1 execute blog-db --remote --file=schema.sql
wrangler secret put ADMIN_PASSWORD            # 强密码
wrangler secret put SESSION_SECRET            # 随机长字符串
wrangler deploy
```
同时删除 wrangler.jsonc `vars` 中的两个本地默认值（生产必须走 Secrets）。

## 遗留风险（承接 W3R）
1. 生产 Secrets 未配置前不得直接 deploy（本地默认密码/密钥在 vars 中）。
2. 搜索为 LIKE 子串匹配，无中文分词。
3. 本地 dev:local 与 workerd 在 SQLite 行为上有细微差异（如 strict 模式），部署前以 wrangler dev 复测一遍契约测试。
