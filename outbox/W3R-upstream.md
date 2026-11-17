# 上游交接摘要（只给结论与路径，不含 transcript）

### W0 / lead [done]
立项契约已定稿：个人博客系统（前台浏览+管理后台），规模判定 L；约束为 Cloudflare Workers 原生技术栈、本地验收不部署；W1 四切面（market/user/tech/compliance）已写入 brief#7；用户一次性授权 G1/G2。
产物: project/brief.md, project/gates.md

### W1 / research/compliance [done]
合规底线：个人技术/生活用途，内容由作者负责。安全要求：密码不落库明文、会话签名 cookie、D1 全参数化、前台 XSS 受控渲染。不做 GDPR/等保级评审；无第三方个人信息存储。
产物: project/research/compliance.md

### W1 / research/market [done]
竞品功能集：Hexo/Astro 缺在线后台；Halo/WordPress 重。最小完备集=文章列表详情/分类标签归档/搜索/登录后台发布/关于页。结论：按动态博客最小完备集裁剪，无需插件体系。
产物: project/research/market.md

### W1 / research/tech [done]
选型 Workers+Hono+D1+Assets（单 Worker 服务 API 与静态前端），否决 Pages Functions/OpenNext/Astro。关键点：wrangler dev local 模拟 D1 无需账号；binding 在 wrangler.jsonc；需 schema.sql+seed.sql 与 npm run setup 一键初始化。Node 24/npm 11 就绪。
产物: project/research/tech.md

### W1 / research/user [done]
单作者画像；作者旅程：登录→写 Markdown→草稿/发布→归类打标签；读者旅程：首页→详情→分类标签→归档→搜索。验收级诉求：发布即生效、草稿不可见、移动端可读、发布≤3步。
产物: project/research/user.md

### W2 / prd-writer [done]
PRD 定稿：F1 前台 7 项（列表分页/详情/分类/标签/归档/搜索/关于）+ F2 后台 4 项（登录/编辑器/管理列表/发布即生效）；数据模型 posts/categories/tags/post_tags；非功能：响应式、鉴权哈希、参数化 SQL、Workers 兼容；页面清单 10 个；验收清单 5 条可测。
产物: project/prd.md

### W3 / architect [done]
架构定稿：ADR-01 单 Worker 单体（Hono+D1+Assets，本地 wrangler dev）；ADR-02 env 密码+HMAC 签名 cookie；ADR-03 db.ts 全参数化；ADR-04 客户端 marked+hljs（vendor 离线打包）。契约覆盖 public 7 组+admin 6 端点；所有权表互斥无空洞；CI 五脚本骨架齐备。
产物: project/architecture.md, project/api-contract.yaml, project/ownership.yaml, project/ci/setup-db.sh, project/ci/typecheck.sh, project/ci/run-tests.sh, project/ci/run-dev.sh
